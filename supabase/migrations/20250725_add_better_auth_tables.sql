-- Migration: Add Better Auth tables to existing Supabase database
-- This migration adds user authentication tables while preserving existing data

-- ============================================================================
-- Better Auth Tables
-- ============================================================================

-- Users table for Better Auth
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email TEXT UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    name TEXT,
    image TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Custom fields from your current Clerk setup
    arena_api_key TEXT,
    tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'starter', 'pro')),
    polar_customer_id TEXT,
    
    -- Better Auth specific
    password_hash TEXT
);

-- Sessions table for Better Auth
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Accounts table for OAuth providers (future extensibility)
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique provider accounts per user
    UNIQUE(provider_id, account_id)
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_polar_customer_id ON users(polar_customer_id) WHERE polar_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);

-- ============================================================================
-- Migration Support Tables
-- ============================================================================

-- Track session migrations during transition period
CREATE TABLE IF NOT EXISTS session_migrations (
    id SERIAL PRIMARY KEY,
    old_session_id TEXT UNIQUE NOT NULL, -- Anonymous session ID
    new_user_id TEXT REFERENCES users(id),
    migrated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_migrations_old_session_id ON session_migrations(old_session_id);

-- ============================================================================
-- Add temporary column for migration
-- ============================================================================

-- Add column to track new user IDs during migration
-- This allows gradual migration without breaking existing functionality
ALTER TABLE channels ADD COLUMN IF NOT EXISTS new_user_id TEXT REFERENCES users(id);
ALTER TABLE channel_usage ADD COLUMN IF NOT EXISTS new_user_id TEXT REFERENCES users(id);
ALTER TABLE monthly_usage ADD COLUMN IF NOT EXISTS new_user_id TEXT REFERENCES users(id);
ALTER TABLE channel_limits ADD COLUMN IF NOT EXISTS new_user_id TEXT REFERENCES users(id);

-- ============================================================================
-- Updated timestamp triggers
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for new tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLS Policies for Better Auth Tables
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_migrations ENABLE ROW LEVEL SECURITY;

-- Users table policies
-- Service role bypass for Better Auth server operations
CREATE POLICY "Service role full access to users" ON users
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (id = auth.uid()::text);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (id = auth.uid()::text);

-- Sessions table policies
-- Service role bypass for Better Auth server operations
CREATE POLICY "Service role full access to sessions" ON sessions
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Accounts table policies
-- Service role bypass for Better Auth server operations
CREATE POLICY "Service role full access to accounts" ON accounts
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Session migrations - service role only
CREATE POLICY "Service role full access to session_migrations" ON session_migrations
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- Notes for post-migration cleanup (DO NOT RUN YET)
-- ============================================================================

-- After successful migration and testing:
-- 1. Update all references from user_id to new_user_id
-- 2. Drop old user_id columns
-- 3. Rename new_user_id to user_id
-- 4. Update RLS policies to use Better Auth session management

-- Example cleanup (RUN ONLY AFTER MIGRATION IS COMPLETE):
-- UPDATE channels SET user_id = new_user_id WHERE new_user_id IS NOT NULL;
-- ALTER TABLE channels DROP COLUMN new_user_id;
-- ... repeat for other tables
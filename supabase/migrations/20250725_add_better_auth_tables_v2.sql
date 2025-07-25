-- Drop existing Better Auth tables if they exist
DROP TABLE IF EXISTS public.verification CASCADE;
DROP TABLE IF EXISTS public.session CASCADE;
DROP TABLE IF EXISTS public.account CASCADE;
DROP TABLE IF EXISTS public.user CASCADE;

-- Create Better Auth user table (avoiding conflict with auth.users)
CREATE TABLE IF NOT EXISTS public."user" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email TEXT UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    name TEXT,
    image TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Better Auth session table
CREATE TABLE IF NOT EXISTS public.session (
    id TEXT PRIMARY KEY,
    expires_at TIMESTAMPTZ NOT NULL,
    token TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT,
    user_id TEXT NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE
);

-- Create Better Auth account table
CREATE TABLE IF NOT EXISTS public.account (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    account_id TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    access_token TEXT,
    refresh_token TEXT,
    id_token TEXT,
    expires_at TIMESTAMPTZ,
    password TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Better Auth verification table
CREATE TABLE IF NOT EXISTS public.verification (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    identifier TEXT NOT NULL,
    value TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_session_user_id ON public.session(user_id);
CREATE INDEX IF NOT EXISTS idx_session_token ON public.session(token);
CREATE INDEX IF NOT EXISTS idx_account_user_id ON public.account(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_identifier ON public.verification(identifier);

-- Add RLS policies (disabled by default for Better Auth)
ALTER TABLE public."user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification ENABLE ROW LEVEL SECURITY;

-- Create policies that allow Better Auth to manage these tables
CREATE POLICY "Better Auth can manage users" ON public."user" FOR ALL USING (true);
CREATE POLICY "Better Auth can manage sessions" ON public.session FOR ALL USING (true);
CREATE POLICY "Better Auth can manage accounts" ON public.account FOR ALL USING (true);
CREATE POLICY "Better Auth can manage verifications" ON public.verification FOR ALL USING (true);
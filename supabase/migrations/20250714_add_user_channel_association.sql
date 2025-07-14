-- Fix critical security issue: Associate channels with users who sync them
-- This prevents private channels from being visible to other users

-- First, handle existing channels with NULL user_id
-- Delete orphaned channels (safest for security)
DELETE FROM channels WHERE user_id IS NULL;

-- Add constraint to require user_id (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'channels_user_id_check'
    ) THEN
        ALTER TABLE channels 
        ADD CONSTRAINT channels_user_id_check 
        CHECK (user_id IS NOT NULL);
    END IF;
END $$;

-- Add index for efficient user-specific channel queries (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_channels_user_id'
    ) THEN
        CREATE INDEX idx_channels_user_id ON channels(user_id);
    END IF;
END $$;

-- RLS is already enabled, just add policies

-- Policy: Users can only see channels they synced
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Users can only see their own channels'
    ) THEN
        CREATE POLICY "Users can only see their own channels" ON channels
        FOR SELECT USING (auth.jwt() ->> 'sub' = user_id);
    END IF;
END $$;

-- Policy: Users can only insert channels for themselves
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Users can only insert their own channels'
    ) THEN
        CREATE POLICY "Users can only insert their own channels" ON channels
        FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = user_id);
    END IF;
END $$;

-- Policy: Users can only update their own channels
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Users can only update their own channels'
    ) THEN
        CREATE POLICY "Users can only update their own channels" ON channels
        FOR UPDATE USING (auth.jwt() ->> 'sub' = user_id);
    END IF;
END $$;
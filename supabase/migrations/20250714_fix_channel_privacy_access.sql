-- Fix channel access: public channels should be visible to all users
-- Private channels should only be visible to the user who synced them

-- Add privacy tracking column
ALTER TABLE channels ADD COLUMN is_private BOOLEAN DEFAULT false;

-- Update existing RLS policies to allow public channel access

-- Drop the overly restrictive policy
DROP POLICY IF EXISTS "Users can only see their own channels" ON channels;

-- New policy: Users can see public channels OR their own private channels
CREATE POLICY "Channel access policy" ON channels
FOR SELECT USING (
  is_private = false OR auth.jwt() ->> 'sub' = user_id
);

-- Update insert policy to set privacy based on Are.na channel status
DROP POLICY IF EXISTS "Users can only insert their own channels" ON channels;

CREATE POLICY "Users can insert channels for themselves" ON channels
FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = user_id);

-- Update policy remains the same
-- Users can only update their own channels
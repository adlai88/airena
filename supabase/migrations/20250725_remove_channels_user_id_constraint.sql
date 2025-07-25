-- Remove the CHECK constraint that requires user_id to be NOT NULL
-- This allows anonymous users to sync channels without authentication
ALTER TABLE channels DROP CONSTRAINT IF EXISTS channels_user_id_check;

-- Add a comment explaining why user_id can be NULL
COMMENT ON COLUMN channels.user_id IS 'User ID who owns this channel. NULL for channels synced by anonymous users.';
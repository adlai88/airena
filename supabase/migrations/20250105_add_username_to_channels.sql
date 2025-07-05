-- Add username column to channels table for proper Are.na URL construction
ALTER TABLE channels ADD COLUMN username TEXT;

-- Add index for username lookups
CREATE INDEX idx_channels_username ON channels(username);
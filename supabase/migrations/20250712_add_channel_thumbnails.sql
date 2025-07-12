-- Add thumbnail_url column to channels table
-- This enables visual channel identification in the UI

ALTER TABLE channels ADD COLUMN thumbnail_url TEXT;

COMMENT ON COLUMN channels.thumbnail_url IS 'URL of the channel thumbnail image, typically from the first image block in the channel';
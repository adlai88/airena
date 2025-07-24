-- Add thumbnail_url column to blocks table
-- This enables fast thumbnail loading from Supabase instead of Are.na API calls

ALTER TABLE blocks ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

COMMENT ON COLUMN blocks.thumbnail_url IS 'URL of the block thumbnail image from Are.na (thumb, square, or display URL)';

-- Update RLS policies to include thumbnail_url
-- The existing policies already use SELECT * so they will automatically include the new column
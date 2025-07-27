-- Add lifetime_blocks_used column to user table
ALTER TABLE "user" 
ADD COLUMN IF NOT EXISTS lifetime_blocks_used INTEGER DEFAULT 0;

-- Create RPC function for atomic increment
CREATE OR REPLACE FUNCTION increment_lifetime_blocks(
  user_id TEXT,
  blocks_to_add INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE "user"
  SET 
    lifetime_blocks_used = COALESCE(lifetime_blocks_used, 0) + blocks_to_add,
    updated_at = NOW()
  WHERE id = user_id;
END;
$$;
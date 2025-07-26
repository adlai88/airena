-- Create RPC function for atomic increment of lifetime blocks
CREATE OR REPLACE FUNCTION increment_lifetime_blocks(
  user_id TEXT,
  blocks_to_add INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE users 
  SET 
    lifetime_blocks_used = COALESCE(lifetime_blocks_used, 0) + blocks_to_add,
    updated_at = NOW()
  WHERE id = user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_lifetime_blocks(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_lifetime_blocks(TEXT, INTEGER) TO service_role;
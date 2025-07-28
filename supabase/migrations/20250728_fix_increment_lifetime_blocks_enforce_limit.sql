-- Update increment_lifetime_blocks function to enforce 50-block limit for free tier
CREATE OR REPLACE FUNCTION increment_lifetime_blocks(
  user_id TEXT,
  blocks_to_add INTEGER
)
RETURNS INTEGER -- Changed to return actual blocks added
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_blocks INTEGER;
  user_tier TEXT;
  actual_blocks_to_add INTEGER;
BEGIN
  -- Get current usage and tier with row lock to prevent race conditions
  SELECT 
    COALESCE(lifetime_blocks_used, 0),
    COALESCE(tier, 'free')
  INTO current_blocks, user_tier
  FROM "user"
  WHERE id = user_id::UUID
  FOR UPDATE;
  
  -- If user not found, return 0
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Calculate actual blocks to add
  actual_blocks_to_add := blocks_to_add;
  
  -- For free tier, cap at 50 blocks total
  IF user_tier = 'free' AND current_blocks + blocks_to_add > 50 THEN
    actual_blocks_to_add := GREATEST(0, 50 - current_blocks);
  END IF;
  
  -- Update only if there are blocks to add
  IF actual_blocks_to_add > 0 THEN
    UPDATE "user"
    SET 
      lifetime_blocks_used = current_blocks + actual_blocks_to_add,
      updated_at = NOW()
    WHERE id = user_id::UUID;
  END IF;
  
  -- Return actual blocks added
  RETURN actual_blocks_to_add;
END;
$$;

-- Grant execute permission to authenticated users and service role
GRANT EXECUTE ON FUNCTION increment_lifetime_blocks(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_lifetime_blocks(TEXT, INTEGER) TO service_role;

-- Add helpful comment
COMMENT ON FUNCTION increment_lifetime_blocks(TEXT, INTEGER) IS 
'Atomically increments lifetime_blocks_used for a user, enforcing 50-block limit for free tier. Returns actual blocks added.';
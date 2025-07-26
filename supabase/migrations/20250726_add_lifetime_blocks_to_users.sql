-- Add lifetime blocks used column to users table for simplified usage tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS lifetime_blocks_used INTEGER DEFAULT 0;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_lifetime_blocks_used ON users(lifetime_blocks_used);

-- Migrate existing usage data to lifetime_blocks_used
-- This aggregates all historical usage from channel_usage table
UPDATE users u 
SET lifetime_blocks_used = (
  SELECT COALESCE(SUM(cu.total_blocks_processed), 0)
  FROM channel_usage cu
  WHERE cu.user_id = u.id
)
WHERE EXISTS (
  SELECT 1 FROM channel_usage cu WHERE cu.user_id = u.id
);

-- Add comment explaining the column
COMMENT ON COLUMN users.lifetime_blocks_used IS 'Total blocks processed by user across all time. Free tier limit is 50 blocks lifetime.';
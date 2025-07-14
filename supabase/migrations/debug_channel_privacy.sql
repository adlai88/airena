-- Debug query to check current channel privacy status
-- Run this first to see what's in the database

SELECT 
  slug,
  title,
  is_private,
  user_id,
  last_sync,
  created_at
FROM channels 
ORDER BY last_sync DESC 
LIMIT 20;

-- Check if is_private column exists and what values it has
SELECT 
  is_private,
  COUNT(*) as count
FROM channels 
GROUP BY is_private;

-- See all channels with user association
SELECT 
  slug,
  user_id IS NOT NULL as has_user,
  is_private,
  COUNT(*) OVER() as total_channels
FROM channels;
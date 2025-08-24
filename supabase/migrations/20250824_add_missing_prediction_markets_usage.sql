-- Add missing channel_usage record for a-prediction-markets channel
-- This channel was processed but no usage record was created

INSERT INTO channel_usage (
  channel_id,
  user_id,
  session_id,
  ip_address,
  total_blocks_processed,
  first_processed_at,
  last_processed_at,
  is_free_tier,
  created_at,
  updated_at
) VALUES (
  88, -- a-prediction-markets channel ID
  'XJCq6JtCBI8EVrxKNuMttJyr9E3JLHmk',
  NULL, -- No session ID since it was processed with authenticated user
  '::1',
  35, -- 35 blocks processed for this channel
  NOW(),
  NOW(),
  false, -- No longer free tier (now pro)
  NOW(),
  NOW()
);
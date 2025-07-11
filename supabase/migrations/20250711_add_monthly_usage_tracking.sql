-- Create monthly usage tracking table for paid tier limits
CREATE TABLE monthly_usage (
  id SERIAL PRIMARY KEY,
  user_id TEXT, -- For authenticated users
  session_id TEXT, -- For anonymous users during trial/upgrade
  month TEXT NOT NULL, -- YYYY-MM format
  total_blocks_processed INTEGER NOT NULL DEFAULT 0,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'starter', 'pro')),
  limit_blocks INTEGER NOT NULL DEFAULT 25,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX idx_monthly_usage_user_id ON monthly_usage(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_monthly_usage_session_id ON monthly_usage(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_monthly_usage_month ON monthly_usage(month);
CREATE INDEX idx_monthly_usage_tier ON monthly_usage(tier);

-- Create composite index for finding existing usage records
CREATE UNIQUE INDEX idx_monthly_usage_unique_user_month ON monthly_usage(user_id, month) 
WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX idx_monthly_usage_unique_session_month ON monthly_usage(session_id, month) 
WHERE user_id IS NULL AND session_id IS NOT NULL;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_monthly_usage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_monthly_usage_updated_at
    BEFORE UPDATE ON monthly_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_monthly_usage_updated_at();

-- Create chat and generation limits table for free tier
CREATE TABLE channel_limits (
  id SERIAL PRIMARY KEY,
  channel_id INTEGER NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id TEXT, -- For authenticated users
  session_id TEXT, -- For anonymous users
  month TEXT NOT NULL, -- YYYY-MM format
  chat_messages_used INTEGER NOT NULL DEFAULT 0,
  generations_used INTEGER NOT NULL DEFAULT 0,
  chat_messages_limit INTEGER NOT NULL DEFAULT 10,
  generations_limit INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for channel limits
CREATE INDEX idx_channel_limits_channel_id ON channel_limits(channel_id);
CREATE INDEX idx_channel_limits_user_id ON channel_limits(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_channel_limits_session_id ON channel_limits(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_channel_limits_month ON channel_limits(month);

-- Create composite indexes for finding existing limit records
CREATE UNIQUE INDEX idx_channel_limits_unique_user_channel_month ON channel_limits(user_id, channel_id, month) 
WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX idx_channel_limits_unique_session_channel_month ON channel_limits(session_id, channel_id, month) 
WHERE user_id IS NULL AND session_id IS NOT NULL;

-- Add trigger to update updated_at timestamp
CREATE TRIGGER trigger_update_channel_limits_updated_at
    BEFORE UPDATE ON channel_limits
    FOR EACH ROW
    EXECUTE FUNCTION update_monthly_usage_updated_at();
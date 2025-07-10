-- Create channel usage tracking table
CREATE TABLE channel_usage (
  id SERIAL PRIMARY KEY,
  channel_id INTEGER NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id TEXT, -- For authenticated users (future)
  session_id TEXT, -- For anonymous users
  ip_address INET, -- Additional tracking for anonymous users
  total_blocks_processed INTEGER NOT NULL DEFAULT 0,
  first_processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  is_free_tier BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX idx_channel_usage_channel_id ON channel_usage(channel_id);
CREATE INDEX idx_channel_usage_session_id ON channel_usage(session_id);
CREATE INDEX idx_channel_usage_user_id ON channel_usage(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_channel_usage_ip_address ON channel_usage(ip_address);

-- Create composite index for finding existing usage records
CREATE UNIQUE INDEX idx_channel_usage_unique_session ON channel_usage(channel_id, session_id) 
WHERE user_id IS NULL;

-- Create composite index for authenticated users (future)
CREATE UNIQUE INDEX idx_channel_usage_unique_user ON channel_usage(channel_id, user_id) 
WHERE user_id IS NOT NULL;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_channel_usage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_channel_usage_updated_at
    BEFORE UPDATE ON channel_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_channel_usage_updated_at();
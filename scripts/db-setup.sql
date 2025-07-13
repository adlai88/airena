-- Airena Database Setup Script
-- This script creates the complete database schema for self-hosting
-- Schema matches production database exactly

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Channels table - stores Are.na channel information
CREATE TABLE IF NOT EXISTS channels (
  id SERIAL PRIMARY KEY,
  arena_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  user_id TEXT,
  last_sync TIMESTAMP WITHOUT TIME ZONE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  username TEXT,
  thumbnail_url TEXT
);

-- Blocks table - stores processed content from Are.na blocks
CREATE TABLE IF NOT EXISTS blocks (
  id SERIAL PRIMARY KEY,
  arena_id INTEGER NOT NULL,
  channel_id INTEGER NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  content TEXT,
  url TEXT,
  block_type TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  embedding vector(1536)
);

-- Channel usage table - tracks usage for free tier limits
CREATE TABLE IF NOT EXISTS channel_usage (
  id SERIAL PRIMARY KEY,
  channel_id INTEGER NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id TEXT,
  session_id TEXT,
  ip_address INET,
  total_blocks_processed INTEGER NOT NULL DEFAULT 0,
  first_processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  is_free_tier BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Monthly usage table - for paid tier tracking
CREATE TABLE IF NOT EXISTS monthly_usage (
  id SERIAL PRIMARY KEY,
  user_id TEXT,
  session_id TEXT,
  month TEXT NOT NULL,
  total_blocks_processed INTEGER NOT NULL DEFAULT 0,
  tier TEXT NOT NULL DEFAULT 'free'::text,
  limit_blocks INTEGER NOT NULL DEFAULT 25,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Channel limits table - tracks chat and generation usage per channel
CREATE TABLE IF NOT EXISTS channel_limits (
  id SERIAL PRIMARY KEY,
  channel_id INTEGER NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id TEXT,
  session_id TEXT,
  month TEXT NOT NULL,
  chat_messages_used INTEGER NOT NULL DEFAULT 0,
  generations_used INTEGER NOT NULL DEFAULT 0,
  chat_messages_limit INTEGER NOT NULL DEFAULT 10,
  generations_limit INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- UNIQUE CONSTRAINTS
-- ============================================================================

-- Channels unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS channels_arena_id_key ON channels(arena_id);

-- Blocks unique constraints  
CREATE UNIQUE INDEX IF NOT EXISTS blocks_arena_id_key ON blocks(arena_id);

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- Blocks indexes
CREATE INDEX IF NOT EXISTS idx_blocks_channel_id ON blocks(channel_id);
CREATE INDEX IF NOT EXISTS idx_blocks_block_type ON blocks(block_type);

-- Channels indexes
CREATE INDEX IF NOT EXISTS idx_channels_slug ON channels(slug);
CREATE INDEX IF NOT EXISTS idx_channels_user_id ON channels(user_id);
CREATE INDEX IF NOT EXISTS idx_channels_username ON channels(username);

-- Channel usage indexes
CREATE INDEX IF NOT EXISTS idx_channel_usage_channel_id ON channel_usage(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_usage_session_id ON channel_usage(session_id);
CREATE INDEX IF NOT EXISTS idx_channel_usage_ip_address ON channel_usage(ip_address);
CREATE INDEX IF NOT EXISTS idx_channel_usage_user_id ON channel_usage(user_id) WHERE (user_id IS NOT NULL);

-- Monthly usage indexes
CREATE INDEX IF NOT EXISTS idx_monthly_usage_month ON monthly_usage(month);
CREATE INDEX IF NOT EXISTS idx_monthly_usage_session_id ON monthly_usage(session_id) WHERE (session_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_monthly_usage_tier ON monthly_usage(tier);
CREATE INDEX IF NOT EXISTS idx_monthly_usage_user_id ON monthly_usage(user_id) WHERE (user_id IS NOT NULL);

-- Channel limits indexes
CREATE INDEX IF NOT EXISTS idx_channel_limits_channel_id ON channel_limits(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_limits_month ON channel_limits(month);
CREATE INDEX IF NOT EXISTS idx_channel_limits_session_id ON channel_limits(session_id) WHERE (session_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_channel_limits_user_id ON channel_limits(user_id) WHERE (user_id IS NOT NULL);

-- ============================================================================
-- UNIQUE CONSTRAINTS FOR USER/SESSION HANDLING
-- ============================================================================

-- Channel usage unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS idx_channel_usage_unique_user ON channel_usage(channel_id, user_id) WHERE (user_id IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS idx_channel_usage_unique_session ON channel_usage(channel_id, session_id) WHERE (user_id IS NULL);

-- Monthly usage unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_usage_unique_user_month ON monthly_usage(user_id, month) WHERE (user_id IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_usage_unique_session_month ON monthly_usage(session_id, month) WHERE ((user_id IS NULL) AND (session_id IS NOT NULL));

-- Channel limits unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS idx_channel_limits_unique_user_channel_month ON channel_limits(user_id, channel_id, month) WHERE (user_id IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS idx_channel_limits_unique_session_channel_month ON channel_limits(session_id, channel_id, month) WHERE ((user_id IS NULL) AND (session_id IS NOT NULL));

-- ============================================================================
-- VECTOR SIMILARITY SEARCH INDEX
-- ============================================================================

-- Vector similarity search index (may take time on large datasets)
CREATE INDEX IF NOT EXISTS blocks_embedding_idx ON blocks 
USING ivfflat (embedding vector_cosine_ops);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- ============================================================================

-- Function for updating updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic updated_at
CREATE TRIGGER IF NOT EXISTS update_channels_updated_at 
    BEFORE UPDATE ON channels 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_blocks_updated_at 
    BEFORE UPDATE ON blocks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_channel_usage_updated_at 
    BEFORE UPDATE ON channel_usage 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_monthly_usage_updated_at 
    BEFORE UPDATE ON monthly_usage 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_channel_limits_updated_at 
    BEFORE UPDATE ON channel_limits 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function for vector similarity search
CREATE OR REPLACE FUNCTION search_blocks(
  query_embedding vector(1536),
  channel_id_filter integer DEFAULT NULL,
  match_count integer DEFAULT 10,
  similarity_threshold float DEFAULT 0.7
)
RETURNS TABLE (
  id integer,
  arena_id integer,
  title text,
  content text,
  url text,
  block_type text,
  similarity float
)
LANGUAGE sql
AS $$
  SELECT
    b.id,
    b.arena_id,
    b.title,
    b.content,
    b.url,
    b.block_type,
    1 - (b.embedding <=> query_embedding) AS similarity
  FROM blocks b
  WHERE 
    (channel_id_filter IS NULL OR b.channel_id = channel_id_filter)
    AND b.embedding IS NOT NULL
    AND 1 - (b.embedding <=> query_embedding) > similarity_threshold
  ORDER BY b.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Function to get channel statistics
CREATE OR REPLACE FUNCTION get_channel_stats(channel_id_input integer)
RETURNS TABLE (
  total_blocks bigint,
  embedded_blocks bigint,
  block_types json,
  last_updated timestamp without time zone
)
LANGUAGE sql
AS $$
  SELECT
    COUNT(*) as total_blocks,
    COUNT(embedding) as embedded_blocks,
    json_object_agg(block_type, type_count) as block_types,
    MAX(updated_at) as last_updated
  FROM (
    SELECT 
      block_type,
      COUNT(*) as type_count,
      embedding,
      updated_at
    FROM blocks 
    WHERE channel_id = channel_id_input
    GROUP BY block_type, embedding, updated_at
  ) block_stats;
$$;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Airena database setup completed successfully!';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Tables created: channels, blocks, channel_usage, monthly_usage, channel_limits';
  RAISE NOTICE 'Unique constraints: arena_id uniqueness for channels and blocks';
  RAISE NOTICE 'Performance indexes: All production indexes created';
  RAISE NOTICE 'User/Session handling: Conditional unique constraints created';
  RAISE NOTICE 'Functions created: search_blocks, get_channel_stats';
  RAISE NOTICE 'Triggers created: Automatic updated_at handling';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Ready for Airena deployment!';
  RAISE NOTICE '============================================================================';
END
$$;
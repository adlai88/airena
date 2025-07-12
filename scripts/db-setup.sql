-- Airena Database Setup Script
-- This script creates the complete database schema for self-hosting

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Channels table - stores Are.na channel information
CREATE TABLE IF NOT EXISTS channels (
  id SERIAL PRIMARY KEY,
  arena_id INTEGER UNIQUE NOT NULL,
  slug TEXT NOT NULL,
  title TEXT,
  username TEXT,
  user_id TEXT, -- For authenticated users (hosted service)
  last_sync TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Blocks table - stores processed content from Are.na blocks
CREATE TABLE IF NOT EXISTS blocks (
  id SERIAL PRIMARY KEY,
  arena_id INTEGER NOT NULL,
  channel_id INTEGER NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT,
  source_url TEXT,
  block_type TEXT NOT NULL, -- 'Link', 'Image', 'Video', 'PDF', 'Text'
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Channel usage table - tracks usage for free tier limits
CREATE TABLE IF NOT EXISTS channel_usage (
  id SERIAL PRIMARY KEY,
  channel_id INTEGER NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  ip_address INET,
  total_blocks_processed INTEGER DEFAULT 0,
  is_free_tier BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Monthly usage table - for paid tier tracking (hosted service)
CREATE TABLE IF NOT EXISTS monthly_usage (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  month TEXT NOT NULL, -- Format: YYYY-MM
  total_blocks_processed INTEGER DEFAULT 0,
  tier TEXT DEFAULT 'free', -- 'free', 'starter', 'pro'
  limit_blocks INTEGER DEFAULT 25,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, month)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_blocks_channel_id ON blocks(channel_id);
CREATE INDEX IF NOT EXISTS idx_blocks_arena_id ON blocks(arena_id);
CREATE INDEX IF NOT EXISTS idx_channels_arena_id ON channels(arena_id);
CREATE INDEX IF NOT EXISTS idx_channels_slug ON channels(slug);
CREATE INDEX IF NOT EXISTS idx_channel_usage_channel_id ON channel_usage(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_usage_session_id ON channel_usage(session_id);
CREATE INDEX IF NOT EXISTS idx_monthly_usage_user_month ON monthly_usage(user_id, month);

-- Vector similarity search index
-- Note: This may take time on large datasets
CREATE INDEX IF NOT EXISTS idx_blocks_embedding ON blocks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_channels_updated_at 
    BEFORE UPDATE ON channels 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blocks_updated_at 
    BEFORE UPDATE ON blocks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_channel_usage_updated_at 
    BEFORE UPDATE ON channel_usage 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monthly_usage_updated_at 
    BEFORE UPDATE ON monthly_usage 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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
  source_url text,
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
    b.source_url,
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
  last_updated timestamp with time zone
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

-- Sample data for development (optional)
-- Uncomment to insert test channel

/*
INSERT INTO channels (arena_id, slug, title, username) 
VALUES (123456, 'test-channel', 'Test Channel', 'testuser')
ON CONFLICT (arena_id) DO NOTHING;
*/

-- Display setup completion
DO $$
BEGIN
  RAISE NOTICE 'Airena database setup completed successfully!';
  RAISE NOTICE 'Tables created: channels, blocks, channel_usage, monthly_usage';
  RAISE NOTICE 'Indexes created for performance optimization';
  RAISE NOTICE 'Functions created: search_blocks, get_channel_stats';
  RAISE NOTICE 'Ready for Airena deployment!';
END
$$;
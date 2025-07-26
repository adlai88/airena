-- Migration: Switch from OpenAI embeddings (1536) to Supabase AI embeddings (384)
-- Date: 2025-07-26
-- Description: Clears all data and updates schema for Supabase AI's 384-dimension embeddings

-- Step 1: Clear all existing data
DELETE FROM blocks;
DELETE FROM channels;

-- Step 2: Drop and recreate embedding column with 384 dimensions
ALTER TABLE blocks DROP COLUMN IF EXISTS embedding;
ALTER TABLE blocks ADD COLUMN embedding vector(384);

-- Step 3: Drop existing RPC functions
DROP FUNCTION IF EXISTS search_blocks;
DROP FUNCTION IF EXISTS match_blocks;
DROP FUNCTION IF EXISTS search_blocks_hybrid;

-- Step 4: Recreate search_blocks function with 384 dimensions
CREATE OR REPLACE FUNCTION search_blocks(
  query_embedding vector(384),
  similarity_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE(
  id int,
  arena_id int,
  channel_id int,
  title text,
  description text,
  content text,
  url text,
  thumbnail_url text,
  block_type text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.arena_id,
    b.channel_id,
    b.title,
    b.description,
    b.content,
    b.url,
    b.thumbnail_url,
    b.block_type,
    1 - (b.embedding <=> query_embedding) AS similarity
  FROM blocks b
  WHERE b.embedding IS NOT NULL
    AND 1 - (b.embedding <=> query_embedding) > similarity_threshold
  ORDER BY b.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Step 5: Recreate match_blocks function with 384 dimensions (if it exists)
CREATE OR REPLACE FUNCTION match_blocks(
  query_embedding vector(384),
  filter jsonb DEFAULT '{}',
  match_count int DEFAULT 10
)
RETURNS TABLE(
  id int,
  arena_id int,
  channel_id int,
  title text,
  description text,
  content text,
  url text,
  thumbnail_url text,
  block_type text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.arena_id,
    b.channel_id,
    b.title,
    b.description,
    b.content,
    b.url,
    b.thumbnail_url,
    b.block_type,
    1 - (b.embedding <=> query_embedding) AS similarity
  FROM blocks b
  WHERE b.embedding IS NOT NULL
    AND (
      filter->>'channel_id' IS NULL OR 
      b.channel_id = (filter->>'channel_id')::int
    )
  ORDER BY b.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Step 6: Recreate hybrid search function with 384 dimensions
CREATE OR REPLACE FUNCTION search_blocks_hybrid (
  query_text text,
  query_embedding vector(384),
  channel_filter int DEFAULT NULL,
  similarity_threshold float DEFAULT 0.3,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id int,
  arena_id int,
  channel_id int,
  title text,
  description text,
  content text,
  url text,
  block_type text,
  created_at timestamp,
  updated_at timestamp,
  similarity float,
  title_similarity float,
  semantic_similarity float,
  hybrid_score float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    b.id,
    b.arena_id,
    b.channel_id,
    b.title,
    b.description,
    b.content,
    b.url,
    b.block_type,
    b.created_at,
    b.updated_at,
    GREATEST(
      similarity(lower(b.title), lower(query_text)),
      (1 - (b.embedding <=> query_embedding))
    ) AS similarity,
    similarity(lower(b.title), lower(query_text)) AS title_similarity,
    (1 - (b.embedding <=> query_embedding)) AS semantic_similarity,
    GREATEST(
      similarity(lower(b.title), lower(query_text)) * 3.0,
      (1 - (b.embedding <=> query_embedding)) * 1.0
    ) AS hybrid_score
  FROM blocks b
  WHERE b.embedding IS NOT NULL
    AND (channel_filter IS NULL OR b.channel_id = channel_filter)
    AND (
      similarity(lower(b.title), lower(query_text)) > 0.1
      OR (1 - (b.embedding <=> query_embedding)) > similarity_threshold
    )
  ORDER BY GREATEST(
    similarity(lower(b.title), lower(query_text)) * 3.0,
    (1 - (b.embedding <=> query_embedding)) * 1.0
  ) DESC
  LIMIT match_count;
$$;

-- Step 7: Verify the migration
SELECT 
    '✅ Migration to Supabase AI complete!' as status,
    (SELECT COUNT(*) FROM channels) as channels_count,
    (SELECT COUNT(*) FROM blocks) as blocks_count,
    pg_typeof(embedding)::text as embedding_type,
    octet_length(embedding::text) as embedding_dimensions
FROM blocks
LIMIT 1;
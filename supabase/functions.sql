-- Enable trigram similarity extension for text matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Vector similarity search function (legacy)
CREATE OR REPLACE FUNCTION search_blocks (
  query_embedding vector(1536),
  channel_filter int DEFAULT NULL,
  similarity_threshold float DEFAULT 0.7,
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
  similarity float
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
    1 - (b.embedding <=> query_embedding) AS similarity
  FROM blocks b
  WHERE b.embedding IS NOT NULL
    AND (channel_filter IS NULL OR b.channel_id = channel_filter)
    AND 1 - (b.embedding <=> query_embedding) > similarity_threshold
  ORDER BY b.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Hybrid search function combining title similarity + semantic similarity
CREATE OR REPLACE FUNCTION search_blocks_hybrid (
  query_text text,
  query_embedding vector(1536),
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
-- Migration: Add hybrid search combining title matching + semantic similarity
-- Date: 2025-07-08
-- Description: Creates search_blocks_hybrid function that prioritizes title matches while maintaining semantic search capabilities

-- Enable trigram similarity extension for text matching (optional, fallback to LIKE if not available)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

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
      CASE 
        WHEN lower(b.title) LIKE '%' || lower(query_text) || '%' THEN 0.9
        WHEN lower(query_text) LIKE '%' || lower(b.title) || '%' THEN 0.8
        ELSE 0.0
      END,
      (1 - (b.embedding <=> query_embedding))
    ) AS similarity,
    CASE 
      WHEN lower(b.title) LIKE '%' || lower(query_text) || '%' THEN 0.9
      WHEN lower(query_text) LIKE '%' || lower(b.title) || '%' THEN 0.8
      ELSE 0.0
    END AS title_similarity,
    (1 - (b.embedding <=> query_embedding)) AS semantic_similarity,
    GREATEST(
      CASE 
        WHEN lower(b.title) LIKE '%' || lower(query_text) || '%' THEN 0.9 * 3.0
        WHEN lower(query_text) LIKE '%' || lower(b.title) || '%' THEN 0.8 * 3.0
        ELSE 0.0
      END,
      (1 - (b.embedding <=> query_embedding)) * 1.0
    ) AS hybrid_score
  FROM blocks b
  WHERE b.embedding IS NOT NULL
    AND (channel_filter IS NULL OR b.channel_id = channel_filter)
    AND (
      lower(b.title) LIKE '%' || lower(query_text) || '%'
      OR lower(query_text) LIKE '%' || lower(b.title) || '%'
      OR (1 - (b.embedding <=> query_embedding)) > similarity_threshold
    )
  ORDER BY GREATEST(
    CASE 
      WHEN lower(b.title) LIKE '%' || lower(query_text) || '%' THEN 0.9 * 3.0
      WHEN lower(query_text) LIKE '%' || lower(b.title) || '%' THEN 0.8 * 3.0
      ELSE 0.0
    END,
    (1 - (b.embedding <=> query_embedding)) * 1.0
  ) DESC
  LIMIT match_count;
$$;
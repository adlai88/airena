-- Fix function search path security warnings by dropping specific versions
-- Based on the query result, we need to drop these specific function signatures

-- Drop specific versions of search_blocks_hybrid function
DROP FUNCTION IF EXISTS search_blocks_hybrid(text, text, integer, double precision);
DROP FUNCTION IF EXISTS search_blocks_hybrid(text, vector, integer, double precision, integer);

-- Drop specific versions of search_blocks function
DROP FUNCTION IF EXISTS search_blocks(vector, integer, double precision, integer);
DROP FUNCTION IF EXISTS search_blocks(vector, text, integer, double precision);
DROP FUNCTION IF EXISTS search_blocks(vector, double precision, integer);

-- Now recreate with proper security
CREATE OR REPLACE FUNCTION search_blocks_hybrid(
    query_text text,
    channel_slug text,
    match_count integer DEFAULT 10,
    match_threshold double precision DEFAULT 0.5
)
RETURNS TABLE (
    id integer,
    title text,
    description text,
    content text,
    url text,
    block_type text,
    similarity double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        b.title,
        b.description,
        b.content,
        b.url,
        b.block_type,
        1 - (b.embedding <=> embedding(query_text)) as similarity
    FROM blocks b
    JOIN channels c ON b.channel_id = c.id
    WHERE c.slug = channel_slug
    AND 1 - (b.embedding <=> embedding(query_text)) > match_threshold
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION search_blocks(
    query_embedding vector,
    channel_slug text,
    match_count integer DEFAULT 10,
    match_threshold double precision DEFAULT 0.5
)
RETURNS TABLE (
    id integer,
    title text,
    description text,
    content text,
    url text,
    block_type text,
    similarity double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        b.title,
        b.description,
        b.content,
        b.url,
        b.block_type,
        1 - (b.embedding <=> query_embedding) as similarity
    FROM blocks b
    JOIN channels c ON b.channel_id = c.id
    WHERE c.slug = channel_slug
    AND 1 - (b.embedding <=> query_embedding) > match_threshold
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;

-- Verification: Check that only our new functions exist with proper security
SELECT 
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as parameters,
    p.prosecdef as is_security_definer
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname IN ('search_blocks_hybrid', 'search_blocks')
ORDER BY function_name, parameters;
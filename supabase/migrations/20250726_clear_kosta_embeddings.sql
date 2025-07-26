-- Migration: Clear embeddings for kosta channel to test Supabase AI
-- Date: 2025-07-26
-- Description: Clears all embeddings for the kosta channel to allow testing with Supabase AI

-- Step 1: Check how many blocks we're about to update
SELECT 
    c.slug as channel_slug,
    c.title as channel_title,
    COUNT(*) as block_count,
    SUM(CASE WHEN b.embedding IS NOT NULL THEN 1 ELSE 0 END) as blocks_with_embeddings
FROM blocks b
JOIN channels c ON b.channel_id = c.id
WHERE c.slug = 'kosta'
GROUP BY c.slug, c.title;

-- Step 2: Clear the embeddings for kosta channel
UPDATE blocks 
SET embedding = NULL 
WHERE channel_id = (SELECT id FROM channels WHERE slug = 'kosta');

-- Step 3: Verify embeddings are cleared
SELECT 
    'Embeddings cleared for kosta channel' as status,
    COUNT(*) as total_blocks,
    SUM(CASE WHEN embedding IS NULL THEN 1 ELSE 0 END) as blocks_without_embeddings
FROM blocks b
JOIN channels c ON b.channel_id = c.id
WHERE c.slug = 'kosta';
-- Migration: Delete all blocks for kosta channel to force full resync
-- Date: 2025-07-26
-- Description: Deletes all blocks for the kosta channel to test Supabase AI embeddings

-- Step 1: Check how many blocks we're about to delete
SELECT 
    c.slug as channel,
    COUNT(*) as blocks_to_delete
FROM blocks b
JOIN channels c ON b.channel_id = c.id
WHERE c.slug = 'kosta'
GROUP BY c.slug;

-- Step 2: Delete all blocks for kosta channel
DELETE FROM blocks 
WHERE channel_id = (SELECT id FROM channels WHERE slug = 'kosta');

-- Step 3: Verify blocks are deleted
SELECT 
    'Blocks deleted for kosta channel' as status,
    COUNT(*) as remaining_blocks
FROM blocks b
JOIN channels c ON b.channel_id = c.id
WHERE c.slug = 'kosta';
-- Fix foreign key constraint for blocks table
-- The channel_id should reference channels.id (primary key), not channels.arena_id

-- First, drop the incorrect foreign key constraint
ALTER TABLE blocks DROP CONSTRAINT IF EXISTS fk_blocks_channel_id;

-- Clean up orphaned blocks that reference non-existent channels
-- This removes any blocks where channel_id doesn't exist in channels.id
DELETE FROM blocks 
WHERE channel_id NOT IN (SELECT id FROM channels);

-- Add the correct foreign key constraint
ALTER TABLE blocks 
ADD CONSTRAINT fk_blocks_channel_id 
FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE;
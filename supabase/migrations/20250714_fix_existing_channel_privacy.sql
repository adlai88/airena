-- Fix privacy status for existing channels
-- This will check each channel against Are.na's public API to determine if it's actually private

-- For now, we'll update the known private channel manually
-- In the future, we could build a script to check all channels

-- Update the specific channel that we know is private
UPDATE channels 
SET is_private = true 
WHERE slug = 'a-consumer-crypto';

-- Alternative: If you want to mark ALL existing channels as needing re-detection,
-- you could set a flag and then re-sync them. But for now, manual update is safer.

-- Verify the update worked
SELECT slug, title, is_private, user_id 
FROM channels 
WHERE slug = 'a-consumer-crypto';
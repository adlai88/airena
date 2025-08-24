-- Fix channel_usage records with null user_id for the authenticated user
-- This associates existing channel processing history with the correct user account

UPDATE channel_usage 
SET user_id = 'XJCq6JtCBI8EVrxKNuMttJyr9E3JLHmk' 
WHERE user_id IS NULL 
AND session_id = 'anon_1753542218682_bxk7bn9r4';

-- Clean up any other orphaned channel_usage records that might belong to this user
-- (This is a more conservative approach for future cases)
-- UPDATE channel_usage 
-- SET user_id = 'XJCq6JtCBI8EVrxKNuMttJyr9E3JLHmk' 
-- WHERE user_id IS NULL 
-- AND ip_address = '::1' 
-- AND created_at > '2025-07-25';  -- Only recent records
-- Migration script to update user data from Clerk to Better Auth
-- This updates all references from the old Clerk user ID to the new Better Auth user ID

-- Store the IDs for clarity
DO $$
DECLARE
    old_clerk_id TEXT := 'user_2zsET1V7s6Gb4R0GpyfyvO3011X';
    new_better_auth_id TEXT := 'XJCq6JtCBI8EVrxKNuMttJyr9E3JLHmk';
BEGIN
    -- Update channels table
    UPDATE channels 
    SET user_id = new_better_auth_id,
        new_user_id = new_better_auth_id,
        updated_at = NOW()
    WHERE user_id = old_clerk_id;
    
    -- Update channel_usage table
    UPDATE channel_usage 
    SET user_id = new_better_auth_id,
        new_user_id = new_better_auth_id,
        updated_at = NOW()
    WHERE user_id = old_clerk_id;
    
    -- Update monthly_usage table
    UPDATE monthly_usage 
    SET user_id = new_better_auth_id,
        new_user_id = new_better_auth_id,
        updated_at = NOW()
    WHERE user_id = old_clerk_id;
    
    -- Update channel_limits table
    UPDATE channel_limits 
    SET user_id = new_better_auth_id,
        new_user_id = new_better_auth_id,
        updated_at = NOW()
    WHERE user_id = old_clerk_id;
    
    -- Log the migration
    RAISE NOTICE 'Migrated user data from Clerk ID % to Better Auth ID %', old_clerk_id, new_better_auth_id;
END $$;

-- Verify the migration
SELECT 
    'channels' as table_name,
    COUNT(*) as migrated_count
FROM channels 
WHERE user_id = 'XJCq6JtCBI8EVrxKNuMttJyr9E3JLHmk'
UNION ALL
SELECT 
    'channel_usage' as table_name,
    COUNT(*) as migrated_count
FROM channel_usage 
WHERE user_id = 'XJCq6JtCBI8EVrxKNuMttJyr9E3JLHmk'
UNION ALL
SELECT 
    'monthly_usage' as table_name,
    COUNT(*) as migrated_count
FROM monthly_usage 
WHERE user_id = 'XJCq6JtCBI8EVrxKNuMttJyr9E3JLHmk'
UNION ALL
SELECT 
    'channel_limits' as table_name,
    COUNT(*) as migrated_count
FROM channel_limits 
WHERE user_id = 'XJCq6JtCBI8EVrxKNuMttJyr9E3JLHmk';
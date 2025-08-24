-- Refactor tier system from 3 tiers (free/starter/pro) to 2 tiers (free/founding)

-- Step 1: Drop the old constraint first
ALTER TABLE "user" DROP CONSTRAINT user_tier_check;

-- Step 2: Convert all existing starter and pro users to founding tier
UPDATE "user" 
SET tier = 'founding', updated_at = NOW()
WHERE tier IN ('starter', 'pro');

-- Step 3: Set adlai88@gmail.com to founding tier for unlimited access
UPDATE "user" 
SET tier = 'founding', updated_at = NOW()
WHERE email = 'adlai88@gmail.com';

-- Step 4: Add new constraint with only free and founding tiers (after data is clean)
ALTER TABLE "user" ADD CONSTRAINT user_tier_check 
CHECK (tier = ANY (ARRAY['free'::text, 'founding'::text]));

-- Add a comment to track the migration
COMMENT ON COLUMN "user".tier IS 'User tier: free (50 blocks lifetime limit) or founding (unlimited)';
-- Add Airena-specific fields to the Better Auth user table
ALTER TABLE public."user" 
ADD COLUMN IF NOT EXISTS arena_api_key TEXT,
ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'starter', 'pro')),
ADD COLUMN IF NOT EXISTS polar_customer_id TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_polar_customer_id ON public."user"(polar_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_tier ON public."user"(tier);

-- Add comment for clarity
COMMENT ON COLUMN public."user".arena_api_key IS 'Are.na API key for syncing channels';
COMMENT ON COLUMN public."user".tier IS 'Subscription tier: free, starter, or pro';
COMMENT ON COLUMN public."user".polar_customer_id IS 'Polar.sh customer ID for billing';
-- Enable Row Level Security (RLS) on usage tracking tables
-- This fixes the security advisor warnings for:
-- - channel_usage table
-- - monthly_usage table  
-- - channel_limits table

-- Enable RLS on channel_usage table
ALTER TABLE channel_usage ENABLE ROW LEVEL SECURITY;

-- Enable RLS on monthly_usage table  
ALTER TABLE monthly_usage ENABLE ROW LEVEL SECURITY;

-- Enable RLS on channel_limits table
ALTER TABLE channel_limits ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for channel_usage table
-- Users can only see their own usage records (by user_id or session_id)
CREATE POLICY "Users can view their own channel usage" ON channel_usage
    FOR SELECT
    USING (
        user_id = auth.uid()::text 
        OR session_id = current_setting('request.jwt.claims', true)::json->>'session_id'
    );

CREATE POLICY "Users can insert their own channel usage" ON channel_usage
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()::text
        OR user_id IS NULL  -- Allow anonymous users
    );

CREATE POLICY "Users can update their own channel usage" ON channel_usage
    FOR UPDATE
    USING (
        user_id = auth.uid()::text
        OR session_id = current_setting('request.jwt.claims', true)::json->>'session_id'
    );

-- Create RLS policies for monthly_usage table
-- Users can only see their own monthly usage records
CREATE POLICY "Users can view their own monthly usage" ON monthly_usage
    FOR SELECT
    USING (
        user_id = auth.uid()::text
        OR session_id = current_setting('request.jwt.claims', true)::json->>'session_id'
    );

CREATE POLICY "Users can insert their own monthly usage" ON monthly_usage
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()::text
        OR user_id IS NULL  -- Allow anonymous users
    );

CREATE POLICY "Users can update their own monthly usage" ON monthly_usage
    FOR UPDATE
    USING (
        user_id = auth.uid()::text
        OR session_id = current_setting('request.jwt.claims', true)::json->>'session_id'
    );

-- Create RLS policies for channel_limits table  
-- Users can only see their own channel limits
CREATE POLICY "Users can view their own channel limits" ON channel_limits
    FOR SELECT
    USING (
        user_id = auth.uid()::text
        OR session_id = current_setting('request.jwt.claims', true)::json->>'session_id'
    );

CREATE POLICY "Users can insert their own channel limits" ON channel_limits
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()::text
        OR user_id IS NULL  -- Allow anonymous users
    );

CREATE POLICY "Users can update their own channel limits" ON channel_limits
    FOR UPDATE
    USING (
        user_id = auth.uid()::text
        OR session_id = current_setting('request.jwt.claims', true)::json->>'session_id'
    );

-- Create service role policies (for backend operations)
-- These allow the service role to manage all records for system operations

-- Service role policies for channel_usage
CREATE POLICY "Service role can manage all channel usage" ON channel_usage
    FOR ALL
    USING (auth.role() = 'service_role');

-- Service role policies for monthly_usage  
CREATE POLICY "Service role can manage all monthly usage" ON monthly_usage
    FOR ALL
    USING (auth.role() = 'service_role');

-- Service role policies for channel_limits
CREATE POLICY "Service role can manage all channel limits" ON channel_limits
    FOR ALL
    USING (auth.role() = 'service_role');

-- Verification queries (optional - run these to verify the policies work)
-- SELECT * FROM channel_usage; -- Should only show user's own records
-- SELECT * FROM monthly_usage; -- Should only show user's own records  
-- SELECT * FROM channel_limits; -- Should only show user's own records
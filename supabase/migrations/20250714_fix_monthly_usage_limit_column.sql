-- Fix monthly_usage table: rename limit_blocks to limit for consistency with code
ALTER TABLE monthly_usage RENAME COLUMN limit_blocks TO "limit";
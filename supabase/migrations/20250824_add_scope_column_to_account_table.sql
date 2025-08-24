-- Add missing scope column to account table for Better Auth OAuth support
-- This fixes the "column 'scope' of relation 'account' does not exist" error

ALTER TABLE "account" ADD COLUMN "scope" text;
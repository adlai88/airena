-- Set admin/unlimited tier for the app developer
-- This gives unlimited block processing for development and testing

UPDATE "user" 
SET tier = 'pro' 
WHERE email = 'adlai88@gmail.com';
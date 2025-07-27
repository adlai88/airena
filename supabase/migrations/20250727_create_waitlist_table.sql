-- Create waitlist table for founding member signups
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  plan_interested TEXT DEFAULT 'founding',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notified_at TIMESTAMPTZ,
  notes TEXT
);

-- Create index on email for fast lookups
CREATE INDEX idx_waitlist_email ON waitlist(email);

-- Create index on created_at for sorting
CREATE INDEX idx_waitlist_created_at ON waitlist(created_at DESC);

-- Enable RLS
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- No public access - only service role can access
CREATE POLICY "Service role only" ON waitlist
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE waitlist IS 'Stores email signups for the founding member waitlist';
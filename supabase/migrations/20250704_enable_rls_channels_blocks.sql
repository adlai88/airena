-- Migration: Enable RLS and add permissive policy for channels and blocks tables
-- Date: 2025-07-04

-- Enable RLS on channels table
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

-- Add permissive policy to channels table (temporary, insecure)
CREATE POLICY "Allow all" ON public.channels FOR ALL USING (true);

-- Enable RLS on blocks table
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- Add permissive policy to blocks table (temporary, insecure)
CREATE POLICY "Allow all" ON public.blocks FOR ALL USING (true); 
-- Lead capture table for demo requests / waitlist
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.leads (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name   text NOT NULL,
  email       text NOT NULL,
  company     text NOT NULL,
  job_title   text NOT NULL,
  message     text,
  status      text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'demo_done', 'converted', 'rejected')),
  created_at  timestamptz DEFAULT now()
);

-- Allow anonymous inserts (landing page visitors are not authenticated)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a lead"
  ON public.leads
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Only authenticated (admin) users can read/update leads
CREATE POLICY "Authenticated users can view leads"
  ON public.leads
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update leads"
  ON public.leads
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

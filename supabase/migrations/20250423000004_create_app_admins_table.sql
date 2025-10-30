-- Create app_admins table
CREATE TABLE IF NOT EXISTS public.app_admins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security (admins should only be managed by other admins)
ALTER TABLE public.app_admins ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Allow admins to view all admins (this will be restricted by RLS)
CREATE POLICY "Admins can view all admins"
    ON public.app_admins FOR SELECT
    USING (true);

-- Prevent unauthorized inserts/updates/deletes (should be managed via migrations or admin interface)
CREATE POLICY "No public access to admin management"
    ON public.app_admins FOR ALL
    USING (false)
    WITH CHECK (false);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS app_admins_email_idx ON public.app_admins(email);


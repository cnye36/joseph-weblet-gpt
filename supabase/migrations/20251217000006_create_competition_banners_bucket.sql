-- Create storage bucket for competition banners
INSERT INTO storage.buckets (id, name, public)
VALUES ('competition-banners', 'competition-banners', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for competition-banners bucket
CREATE POLICY "Competition banners are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'competition-banners');

CREATE POLICY "Anyone can upload competition banners"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'competition-banners');

CREATE POLICY "Anyone can update competition banners"
ON storage.objects FOR UPDATE
USING (bucket_id = 'competition-banners');

CREATE POLICY "Anyone can delete competition banners"
ON storage.objects FOR DELETE
USING (bucket_id = 'competition-banners');



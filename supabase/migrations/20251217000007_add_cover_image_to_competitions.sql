-- Add cover image URL for competitions
ALTER TABLE competitions
ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

COMMENT ON COLUMN competitions.cover_image_url IS 'Large marketing/cover image used on competition cards and featured sections';



-- Add allowed_bot_ids field to competitions table
-- This allows competitions to specify multiple allowed bots, or null/empty array to use bot_id
ALTER TABLE competitions
ADD COLUMN allowed_bot_ids JSONB DEFAULT '[]'::jsonb;

-- Add comment
COMMENT ON COLUMN competitions.allowed_bot_ids IS 'Array of bot IDs allowed for this competition. If empty or null, uses bot_id. Example: ["bot1", "bot2"]';

-- Create index for JSONB queries
CREATE INDEX idx_competitions_allowed_bot_ids ON competitions USING GIN (allowed_bot_ids);

-- Update existing competitions to have empty array (they'll use bot_id)
UPDATE competitions SET allowed_bot_ids = '[]'::jsonb WHERE allowed_bot_ids IS NULL;


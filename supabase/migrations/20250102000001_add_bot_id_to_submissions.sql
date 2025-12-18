-- Add bot_id to competition_submissions table
-- This tracks which bot was used for each submission
ALTER TABLE competition_submissions
ADD COLUMN bot_id TEXT;

-- Add comment
COMMENT ON COLUMN competition_submissions.bot_id IS 'The bot ID used for this submission. Required when competition allows multiple bots.';

-- Create index for queries
CREATE INDEX idx_submissions_bot_id ON competition_submissions(bot_id);


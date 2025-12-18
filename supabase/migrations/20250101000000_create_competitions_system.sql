-- ============================================================================
-- Competition System Migration
-- ============================================================================
-- This migration creates a comprehensive competition system where users can
-- compete using specific weblets/bots from the platform.
-- ============================================================================

-- Create enum for competition status
CREATE TYPE competition_status AS ENUM (
  'draft',        -- Admin is still setting up
  'active',       -- Open for submissions
  'closed',       -- Submissions closed, awaiting evaluation
  'judging',      -- Evaluation in progress
  'completed'     -- Results published
);

-- ============================================================================
-- COMPETITIONS TABLE
-- ============================================================================
-- Core table storing competition metadata
CREATE TABLE competitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Which bot/weblet is used for this competition
  bot_id TEXT NOT NULL,

  -- Basic information
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  rules TEXT,
  instructions TEXT,

  -- Status and timeline
  status competition_status NOT NULL DEFAULT 'draft',
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  submission_deadline TIMESTAMPTZ NOT NULL,
  results_date TIMESTAMPTZ, -- When results will be announced

  -- Competition rules
  max_submissions_per_user INTEGER DEFAULT 3,
  allow_team_submissions BOOLEAN DEFAULT false,

  -- Rewards
  reward_description TEXT, -- e.g., "$1000 for 1st place, $500 for 2nd..."
  top_winners_count INTEGER DEFAULT 10, -- How many winners get rewards

  -- Admin baseline evaluation (visible to all participants)
  baseline_title TEXT,
  baseline_description TEXT,
  baseline_prompts TEXT, -- Example prompts that produce good results
  baseline_output JSONB, -- Example output/product
  baseline_evaluation_notes TEXT, -- Admin's notes on what makes a good submission

  -- Evaluation criteria (JSONB for flexibility)
  evaluation_criteria JSONB DEFAULT '[]'::jsonb,
  -- Example: [
  --   {"name": "Scientific Accuracy", "weight": 0.4, "description": "..."},
  --   {"name": "Prompt Quality", "weight": 0.3, "description": "..."},
  --   {"name": "Innovation", "weight": 0.3, "description": "..."}
  -- ]

  -- Banner/featured image
  banner_url TEXT,

  -- Metadata
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_dates CHECK (start_date < end_date),
  CONSTRAINT valid_submission_deadline CHECK (submission_deadline <= end_date),
  CONSTRAINT valid_top_winners CHECK (top_winners_count > 0)
);

-- Indexes for performance
CREATE INDEX idx_competitions_bot_id ON competitions(bot_id);
CREATE INDEX idx_competitions_status ON competitions(status);
CREATE INDEX idx_competitions_dates ON competitions(start_date, end_date);
CREATE INDEX idx_competitions_created_by ON competitions(created_by);

-- ============================================================================
-- COMPETITION SPONSORS TABLE
-- ============================================================================
-- Stores sponsor information for competitions
CREATE TABLE competition_sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  logo_url TEXT NOT NULL,
  website_url TEXT,
  description TEXT,

  -- Display order
  display_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(competition_id, display_order)
);

CREATE INDEX idx_sponsors_competition ON competition_sponsors(competition_id);

-- ============================================================================
-- COMPETITION SUBMISSIONS TABLE
-- ============================================================================
-- Stores user submissions for competitions
CREATE TABLE competition_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Submission content
  title TEXT NOT NULL,
  product_output JSONB NOT NULL, -- The generated output/product (flexible format)
  prompts_used TEXT NOT NULL, -- The exact prompts used to generate the output
  methodology_notes TEXT, -- Optional: How they approached the problem

  -- Optional link to the chat where it was created
  chat_id UUID REFERENCES chats(id) ON DELETE SET NULL,

  -- Metadata
  submission_number INTEGER NOT NULL, -- Which submission is this for the user (1, 2, 3, etc.)
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(competition_id, user_id, submission_number),
  CONSTRAINT valid_submission_number CHECK (submission_number > 0)
);

-- Indexes
CREATE INDEX idx_submissions_competition ON competition_submissions(competition_id);
CREATE INDEX idx_submissions_user ON competition_submissions(user_id);
CREATE INDEX idx_submissions_submitted_at ON competition_submissions(submitted_at);
CREATE INDEX idx_submissions_competition_user ON competition_submissions(competition_id, user_id);

-- ============================================================================
-- COMPETITION EVALUATIONS TABLE
-- ============================================================================
-- Stores evaluations/scores for submissions
CREATE TABLE competition_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES competition_submissions(id) ON DELETE CASCADE,
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,

  -- Evaluator (admin/judge)
  evaluator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Scores
  product_score NUMERIC(5,2) CHECK (product_score >= 0 AND product_score <= 100),
  prompt_score NUMERIC(5,2) CHECK (prompt_score >= 0 AND prompt_score <= 100),

  -- Detailed criteria scores (matches competition.evaluation_criteria)
  criteria_scores JSONB DEFAULT '{}'::jsonb,
  -- Example: {"Scientific Accuracy": 85, "Prompt Quality": 90, "Innovation": 75}

  -- Total weighted score
  total_score NUMERIC(5,2) NOT NULL CHECK (total_score >= 0 AND total_score <= 100),

  -- Feedback
  feedback TEXT,
  strengths TEXT,
  areas_for_improvement TEXT,

  -- Metadata
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One evaluation per submission per evaluator
  UNIQUE(submission_id, evaluator_id)
);

-- Indexes
CREATE INDEX idx_evaluations_submission ON competition_evaluations(submission_id);
CREATE INDEX idx_evaluations_competition ON competition_evaluations(competition_id);
CREATE INDEX idx_evaluations_evaluator ON competition_evaluations(evaluator_id);
CREATE INDEX idx_evaluations_total_score ON competition_evaluations(total_score DESC);

-- ============================================================================
-- COMPETITION RANKINGS VIEW
-- ============================================================================
-- Materialized view for fast leaderboard queries
CREATE MATERIALIZED VIEW competition_rankings AS
WITH ranked_submissions AS (
  SELECT
    cs.id AS submission_id,
    cs.competition_id,
    cs.user_id,
    cs.title AS submission_title,
    cs.submitted_at,

    -- Average scores across all evaluators
    AVG(ce.total_score) AS avg_total_score,
    AVG(ce.product_score) AS avg_product_score,
    AVG(ce.prompt_score) AS avg_prompt_score,
    COUNT(ce.id) AS evaluation_count,

    -- Rankings
    RANK() OVER (PARTITION BY cs.competition_id ORDER BY AVG(ce.total_score) DESC) AS overall_rank,
    RANK() OVER (PARTITION BY cs.competition_id ORDER BY AVG(ce.product_score) DESC) AS product_rank,
    RANK() OVER (PARTITION BY cs.competition_id ORDER BY AVG(ce.prompt_score) DESC) AS prompt_rank

  FROM competition_submissions cs
  LEFT JOIN competition_evaluations ce ON cs.id = ce.submission_id
  GROUP BY cs.id, cs.competition_id, cs.user_id, cs.title, cs.submitted_at
)
SELECT
  rs.*,
  c.top_winners_count,
  (rs.overall_rank <= c.top_winners_count) AS is_winner
FROM ranked_submissions rs
JOIN competitions c ON rs.competition_id = c.id;

-- Indexes on materialized view
CREATE INDEX idx_rankings_competition ON competition_rankings(competition_id);
CREATE INDEX idx_rankings_user ON competition_rankings(user_id);
CREATE INDEX idx_rankings_overall ON competition_rankings(competition_id, overall_rank);
CREATE UNIQUE INDEX idx_rankings_submission ON competition_rankings(submission_id);

-- ============================================================================
-- HELPER FUNCTION TO REFRESH RANKINGS
-- ============================================================================
CREATE OR REPLACE FUNCTION refresh_competition_rankings()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY competition_rankings;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_evaluations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- COMPETITIONS POLICIES
-- ============================================================================

-- Public can view active and completed competitions
CREATE POLICY "Public can view active competitions"
  ON competitions FOR SELECT
  USING (status IN ('active', 'completed'));

-- Admins can view all competitions
CREATE POLICY "Admins can view all competitions"
  ON competitions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM app_admins
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Admins can insert competitions
CREATE POLICY "Admins can create competitions"
  ON competitions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_admins
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Admins can update competitions
CREATE POLICY "Admins can update competitions"
  ON competitions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM app_admins
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Admins can delete competitions
CREATE POLICY "Admins can delete competitions"
  ON competitions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM app_admins
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- ============================================================================
-- SPONSORS POLICIES
-- ============================================================================

-- Public can view sponsors for visible competitions
CREATE POLICY "Public can view sponsors"
  ON competition_sponsors FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM competitions
      WHERE id = competition_id
      AND status IN ('active', 'completed')
    )
  );

-- Admins can manage sponsors
CREATE POLICY "Admins can manage sponsors"
  ON competition_sponsors FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM app_admins
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- ============================================================================
-- SUBMISSIONS POLICIES
-- ============================================================================

-- Users can view their own submissions
CREATE POLICY "Users can view own submissions"
  ON competition_submissions FOR SELECT
  USING (auth.uid() = user_id);

-- Public can view submissions for completed competitions
CREATE POLICY "Public can view submissions for completed competitions"
  ON competition_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM competitions
      WHERE id = competition_id
      AND status = 'completed'
    )
  );

-- Admins can view all submissions
CREATE POLICY "Admins can view all submissions"
  ON competition_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM app_admins
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Users can create submissions for active competitions
CREATE POLICY "Users can create submissions"
  ON competition_submissions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM competitions
      WHERE id = competition_id
      AND status = 'active'
      AND NOW() <= submission_deadline
    )
    -- Check submission limit
    AND (
      SELECT COUNT(*)
      FROM competition_submissions
      WHERE competition_id = competition_submissions.competition_id
      AND user_id = auth.uid()
    ) < (
      SELECT max_submissions_per_user
      FROM competitions
      WHERE id = competition_submissions.competition_id
    )
  );

-- Users can update their own submissions (before deadline)
CREATE POLICY "Users can update own submissions"
  ON competition_submissions FOR UPDATE
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM competitions
      WHERE id = competition_id
      AND status = 'active'
      AND NOW() <= submission_deadline
    )
  );

-- Users can delete their own submissions (before deadline)
CREATE POLICY "Users can delete own submissions"
  ON competition_submissions FOR DELETE
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM competitions
      WHERE id = competition_id
      AND status = 'active'
      AND NOW() <= submission_deadline
    )
  );

-- ============================================================================
-- EVALUATIONS POLICIES
-- ============================================================================

-- Admins can view all evaluations
CREATE POLICY "Admins can view evaluations"
  ON competition_evaluations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM app_admins
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Users can view evaluations for their submissions (after competition completed)
CREATE POLICY "Users can view own evaluations"
  ON competition_evaluations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM competition_submissions cs
      WHERE cs.id = submission_id
      AND cs.user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM competitions
        WHERE id = cs.competition_id
        AND status = 'completed'
      )
    )
  );

-- Public can view evaluations for completed competitions
CREATE POLICY "Public can view evaluations for completed competitions"
  ON competition_evaluations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM competitions
      WHERE id = competition_id
      AND status = 'completed'
    )
  );

-- Admins can create evaluations
CREATE POLICY "Admins can create evaluations"
  ON competition_evaluations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_admins
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
    AND auth.uid() = evaluator_id
  );

-- Admins can update evaluations
CREATE POLICY "Admins can update evaluations"
  ON competition_evaluations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM app_admins
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp for competitions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_competitions_updated_at
  BEFORE UPDATE ON competitions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_submissions_updated_at
  BEFORE UPDATE ON competition_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_evaluations_updated_at
  BEFORE UPDATE ON competition_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-refresh rankings when evaluations change
CREATE OR REPLACE FUNCTION trigger_refresh_rankings()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM refresh_competition_rankings();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER refresh_rankings_on_evaluation
  AFTER INSERT OR UPDATE OR DELETE ON competition_evaluations
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_rankings();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get user's submission count for a competition
CREATE OR REPLACE FUNCTION get_user_submission_count(
  p_competition_id UUID,
  p_user_id UUID
)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM competition_submissions
    WHERE competition_id = p_competition_id
    AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check if user can submit
CREATE OR REPLACE FUNCTION can_user_submit(
  p_competition_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_competition RECORD;
  v_submission_count INTEGER;
BEGIN
  -- Get competition details
  SELECT * INTO v_competition
  FROM competitions
  WHERE id = p_competition_id;

  -- Check if competition exists and is active
  IF v_competition IS NULL OR v_competition.status != 'active' THEN
    RETURN FALSE;
  END IF;

  -- Check if deadline has passed
  IF NOW() > v_competition.submission_deadline THEN
    RETURN FALSE;
  END IF;

  -- Check submission count
  v_submission_count := get_user_submission_count(p_competition_id, p_user_id);

  IF v_submission_count >= v_competition.max_submissions_per_user THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get competition leaderboard
CREATE OR REPLACE FUNCTION get_competition_leaderboard(p_competition_id UUID)
RETURNS TABLE (
  rank INTEGER,
  user_id UUID,
  user_email TEXT,
  submission_id UUID,
  submission_title TEXT,
  total_score NUMERIC,
  product_score NUMERIC,
  prompt_score NUMERIC,
  is_winner BOOLEAN,
  submitted_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cr.overall_rank::INTEGER,
    cr.user_id,
    u.email,
    cr.submission_id,
    cr.submission_title,
    cr.avg_total_score,
    cr.avg_product_score,
    cr.avg_prompt_score,
    cr.is_winner,
    cr.submitted_at
  FROM competition_rankings cr
  JOIN auth.users u ON cr.user_id = u.id
  WHERE cr.competition_id = p_competition_id
  ORDER BY cr.overall_rank;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INITIAL DATA / EXAMPLES (OPTIONAL - COMMENT OUT IF NOT NEEDED)
-- ============================================================================

-- Example: Insert a sample competition (commented out)
/*
INSERT INTO competitions (
  bot_id,
  title,
  description,
  rules,
  status,
  start_date,
  end_date,
  submission_deadline,
  reward_description,
  baseline_prompts,
  baseline_evaluation_notes
) VALUES (
  'poster-creator-gpt',
  'Scientific Poster Excellence Challenge',
  'Create the most informative and visually appealing scientific poster using our Poster Creator GPT.',
  '1. Use only the Poster Creator GPT\n2. Submit your final poster and all prompts used\n3. Maximum 3 submissions per participant',
  'active',
  NOW(),
  NOW() + INTERVAL '30 days',
  NOW() + INTERVAL '28 days',
  '$500 for 1st place, $300 for 2nd place, $200 for 3rd place',
  'Example prompt: "Create a poster about CRISPR gene editing, highlighting mechanisms, applications, and ethical considerations. Use a modern layout with clear sections."',
  'Good posters should: 1) Have clear visual hierarchy, 2) Balance text and graphics, 3) Present data accurately, 4) Be scientifically rigorous'
);
*/

-- ============================================================================
-- COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE competitions IS 'Stores competition metadata and configuration';
COMMENT ON TABLE competition_sponsors IS 'Sponsor information for competitions';
COMMENT ON TABLE competition_submissions IS 'User submissions to competitions';
COMMENT ON TABLE competition_evaluations IS 'Judge evaluations and scores for submissions';
COMMENT ON MATERIALIZED VIEW competition_rankings IS 'Computed rankings and leaderboard data';

COMMENT ON COLUMN competitions.evaluation_criteria IS 'JSON array defining scoring criteria and weights';
COMMENT ON COLUMN competition_submissions.product_output IS 'Flexible JSON storage for submission output (charts, images, text, etc.)';
COMMENT ON COLUMN competition_evaluations.criteria_scores IS 'JSON object mapping criteria names to scores';

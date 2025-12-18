import { Page, expect } from '@playwright/test';

/**
 * Competition test helper functions
 */

export interface CompetitionData {
  title: string;
  description: string;
  bot_id: string;
  rules?: string;
  instructions?: string;
  status?: 'draft' | 'active' | 'closed' | 'judging' | 'completed';
  reward_description?: string;
  baseline_prompts?: string;
  baseline_evaluation_notes?: string;
  max_submissions_per_user?: number;
}

export interface SubmissionData {
  title: string;
  product_output: string;
  prompts_used: string;
  methodology_notes?: string;
}

export interface EvaluationData {
  product_score: number;
  prompt_score: number;
  feedback?: string;
  strengths?: string;
  areas_for_improvement?: string;
}

/**
 * Create a new competition as admin
 */
export async function createCompetition(
  page: Page,
  competitionData: CompetitionData
): Promise<void> {
  await page.goto('/app/admin/competitions/new', { waitUntil: 'networkidle' });
  await page.waitForSelector('form', { timeout: 10000 });

  // Fill required fields
  await page.selectOption('select[name="bot_id"]', competitionData.bot_id);
  await page.fill('input[name="title"]', competitionData.title);
  await page.fill('textarea[name="description"]', competitionData.description);

  // Fill optional fields
  if (competitionData.rules) {
    await page.fill('textarea[name="rules"]', competitionData.rules);
  }

  if (competitionData.instructions) {
    await page.fill('textarea[name="instructions"]', competitionData.instructions);
  }

  // Set dates (default to today -> 30 days from now)
  const today = new Date().toISOString().split('T')[0];
  const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  await page.fill('input[name="start_date"]', today);
  await page.fill('input[name="end_date"]', futureDate);
  await page.fill('input[name="submission_deadline"]', futureDate);

  // Set status
  if (competitionData.status) {
    await page.selectOption('select[name="status"]', competitionData.status);
  }

  // Set max submissions
  if (competitionData.max_submissions_per_user) {
    await page.fill(
      'input[name="max_submissions_per_user"]',
      competitionData.max_submissions_per_user.toString()
    );
  }

  // Fill rewards
  if (competitionData.reward_description) {
    await page.fill(
      'textarea[name="reward_description"]',
      competitionData.reward_description
    );
  }

  // Fill baseline
  if (competitionData.baseline_prompts) {
    await page.fill(
      'textarea[name="baseline_prompts"]',
      competitionData.baseline_prompts
    );
  }

  if (competitionData.baseline_evaluation_notes) {
    await page.fill(
      'textarea[name="baseline_evaluation_notes"]',
      competitionData.baseline_evaluation_notes
    );
  }

  // Submit form
  await page.getByRole('button', { name: /create competition/i }).click();
  await page.waitForURL(/\/app\/admin\/competitions$/, { timeout: 15000 });

  // Verify competition was created
  await expect(page.getByText(competitionData.title)).toBeVisible({
    timeout: 10000,
  });
}

/**
 * Navigate to a specific competition by title
 */
export async function navigateToCompetition(
  page: Page,
  title: string
): Promise<void> {
  await page.goto('/app/competitions', { waitUntil: 'networkidle' });

  const competitionCard = page
    .locator('a[href^="/app/competitions/"]')
    .filter({ hasText: title })
    .first();

  await competitionCard.click();
  await page.waitForURL(/\/app\/competitions\/.*/, { timeout: 10000 });
}

/**
 * Submit an entry to a competition
 */
export async function submitEntry(
  page: Page,
  submissionData: SubmissionData
): Promise<void> {
  // Scroll to submission form
  const submissionForm = page.getByText(/submit your entry/i);
  await submissionForm.scrollIntoViewIfNeeded();

  // Fill form
  await page.fill('input[name="title"]', submissionData.title);
  await page.fill('textarea[name="product_output"]', submissionData.product_output);
  await page.fill('textarea[name="prompts_used"]', submissionData.prompts_used);

  if (submissionData.methodology_notes) {
    await page.fill(
      'textarea[name="methodology_notes"]',
      submissionData.methodology_notes
    );
  }

  // Submit
  await page.getByRole('button', { name: /submit entry/i }).click();

  // Wait for success
  await expect(page.getByText(/submission successful/i)).toBeVisible({
    timeout: 10000,
  });
}

/**
 * Navigate to competition submissions as admin
 */
export async function navigateToSubmissions(
  page: Page,
  competitionTitle: string
): Promise<void> {
  await page.goto('/app/admin/competitions', { waitUntil: 'networkidle' });

  // Find competition and click edit
  const editButton = page
    .getByText(competitionTitle)
    .locator('..')
    .locator('..')
    .getByTitle(/edit competition/i);

  await editButton.click();
  await page.waitForURL(/\/app\/admin\/competitions\/.*/, { timeout: 10000 });

  // Click on Submissions tab
  await page.getByRole('link', { name: /submissions/i }).click();
  await page.waitForTimeout(1000);
}

/**
 * Evaluate a submission
 */
export async function evaluateSubmission(
  page: Page,
  submissionTitle: string,
  evaluationData: EvaluationData
): Promise<void> {
  // Find and expand submission
  const submission = page
    .locator('[class*="bg-white"]')
    .filter({ hasText: submissionTitle })
    .first();

  await submission.click();
  await page.waitForTimeout(1000);

  // Fill evaluation form
  await page.fill(
    'input[name="product_score"]',
    evaluationData.product_score.toString()
  );
  await page.fill(
    'input[name="prompt_score"]',
    evaluationData.prompt_score.toString()
  );

  if (evaluationData.feedback) {
    await page.fill('textarea[name="feedback"]', evaluationData.feedback);
  }

  if (evaluationData.strengths) {
    await page.fill('textarea[name="strengths"]', evaluationData.strengths);
  }

  if (evaluationData.areas_for_improvement) {
    await page.fill(
      'textarea[name="areas_for_improvement"]',
      evaluationData.areas_for_improvement
    );
  }

  // Wait for total score calculation
  await page.waitForTimeout(500);

  // Submit evaluation
  await page.getByRole('button', { name: /submit evaluation|update evaluation/i }).click();
  await page.waitForTimeout(2000);
}

/**
 * Change competition status
 */
export async function updateCompetitionStatus(
  page: Page,
  competitionTitle: string,
  newStatus: 'draft' | 'active' | 'closed' | 'judging' | 'completed'
): Promise<void> {
  await page.goto('/app/admin/competitions', { waitUntil: 'networkidle' });

  // Navigate to edit page
  const editButton = page
    .getByText(competitionTitle)
    .locator('..')
    .locator('..')
    .getByTitle(/edit competition/i);

  await editButton.click();
  await page.waitForURL(/\/app\/admin\/competitions\/.*/, { timeout: 10000 });

  // Make sure we're on Edit Details tab
  const editTab = page.getByRole('link', { name: /edit details/i });
  if (await editTab.isVisible()) {
    await editTab.click();
    await page.waitForTimeout(1000);
  }

  // Change status
  await page.selectOption('select[name="status"]', newStatus);

  // Submit
  await page.getByRole('button', { name: /update competition/i }).click();
  await page.waitForURL(/\/app\/admin\/competitions$/, { timeout: 15000 });

  // Verify status changed
  await expect(
    page
      .getByText(competitionTitle)
      .locator('..')
      .locator('..')
      .getByText(new RegExp(newStatus, 'i'))
  ).toBeVisible({ timeout: 10000 });
}

/**
 * Delete a competition
 */
export async function deleteCompetition(
  page: Page,
  competitionTitle: string
): Promise<void> {
  await page.goto('/app/admin/competitions', { waitUntil: 'networkidle' });

  const deleteButton = page
    .getByText(competitionTitle)
    .locator('..')
    .locator('..')
    .getByTitle(/delete competition/i);

  // Handle confirmation dialog
  page.on('dialog', (dialog) => dialog.accept());

  await deleteButton.click();
  await page.waitForTimeout(2000);

  // Verify deletion
  await expect(page.getByText(competitionTitle)).not.toBeVisible();
}

/**
 * Verify leaderboard entry exists
 */
export async function verifyLeaderboardEntry(
  page: Page,
  submissionTitle: string,
  expectedRank?: number
): Promise<void> {
  // Look for the submission in leaderboard
  const entry = page
    .locator('[class*="hover:bg"]')
    .filter({ hasText: submissionTitle })
    .first();

  await expect(entry).toBeVisible();

  if (expectedRank) {
    // Verify rank
    const rankElement = entry.locator(`text=/rank.*${expectedRank}/i, text=/${expectedRank}/`);
    await expect(rankElement).toBeVisible();
  }
}

/**
 * Expand leaderboard entry to view details
 */
export async function expandLeaderboardEntry(
  page: Page,
  submissionTitle: string
): Promise<void> {
  const entry = page
    .locator('[class*="hover:bg"]')
    .filter({ hasText: submissionTitle })
    .first();

  await entry.click();
  await page.waitForTimeout(500);

  // Verify expanded content is visible
  await expect(page.getByText(/prompts used/i)).toBeVisible();
  await expect(page.getByText(/product score|prompt score/i)).toBeVisible();
}

/**
 * Get competition submission count
 */
export async function getSubmissionCount(
  page: Page,
  competitionTitle: string
): Promise<number> {
  await page.goto('/app/admin/competitions', { waitUntil: 'networkidle' });

  const submissionText = page
    .getByText(competitionTitle)
    .locator('..')
    .locator('..')
    .getByText(/\d+ submission/i);

  const text = await submissionText.textContent();
  const match = text?.match(/(\d+)/);

  return match ? parseInt(match[1]) : 0;
}

/**
 * Verify submission appears in user's submission list
 */
export async function verifyUserSubmission(
  page: Page,
  submissionTitle: string
): Promise<void> {
  // Should be on competition detail page
  const submissionSection = page.getByText(/your submissions/i);

  if (await submissionSection.isVisible()) {
    await submissionSection.scrollIntoViewIfNeeded();

    // Verify submission appears
    await expect(
      page.locator('[class*="bg-"]').filter({ hasText: submissionTitle })
    ).toBeVisible();
  }
}

/**
 * Check if submission form is available
 */
export async function isSubmissionFormAvailable(page: Page): Promise<boolean> {
  const submissionForm = page.getByText(/submit your entry/i);
  return await submissionForm.isVisible();
}

/**
 * Verify baseline section is visible
 */
export async function verifyBaselineVisible(page: Page): Promise<void> {
  const baselineSection = page.getByText(/admin baseline evaluation|baseline/i);
  await expect(baselineSection).toBeVisible();

  // Check for example prompts
  await expect(page.getByText(/example prompts/i)).toBeVisible();
}

/**
 * Verify competition stats on dashboard
 */
export async function verifyCompetitionStats(page: Page): Promise<void> {
  await page.goto('/app/competitions', { waitUntil: 'networkidle' });

  // Check for stats cards
  await expect(page.getByText(/active competitions/i)).toBeVisible();
  await expect(page.getByText(/your submissions/i)).toBeVisible();
  await expect(page.getByText(/total community entries/i)).toBeVisible();
}

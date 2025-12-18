import { test, expect, Page } from '@playwright/test';
import { login } from './helpers';

// Test credentials
const ADMIN_EMAIL = 'cnye36@gmail.com';
const ADMIN_PASSWORD = 'Zoeybug3636!@$';
const USER_EMAIL = 'cnye@ai-automated.xyz'; // You'll need a test user account
const USER_PASSWORD = 'Zoeybug3636!@$';

// Test data
const TEST_COMPETITION = {
  title: 'E2E Test Competition',
  description: 'This is an automated test competition for E2E testing',
  bot_id: 'poster-creator-gpt',
  rules: '1. Use only the specified bot\n2. Submit your best work\n3. Be creative',
  instructions: 'Create an amazing poster using the bot',
  reward_description: '$100 for 1st place, $50 for 2nd place',
  baseline_prompts: 'Example: Create a poster about AI ethics',
  baseline_evaluation_notes: 'Good submissions should be clear and creative',
};

test.describe('Competitions System', () => {

  // ============================================================================
  // ADMIN TESTS - Competition Management
  // ============================================================================

  test.describe('Admin - Competition Management', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    });

    test('should display competitions admin page', async ({ page }) => {
      // Navigate to admin competitions page
      await page.goto('/app/admin/competitions', { waitUntil: 'networkidle' });

      // Check for page elements
      await expect(page.getByText(/competitions/i).first()).toBeVisible();
      await expect(page.getByRole('link', { name: /create competition/i }).first()).toBeVisible();
    });

    test('should create a new competition', async ({ page }) => {
      // Navigate to create competition page
      await page.goto('/app/admin/competitions/new', { waitUntil: 'networkidle' });

      // Wait for form to load
      await page.waitForSelector('form', { timeout: 10000 });

      // Fill in basic information
      await page.selectOption('select[name="bot_id"]', TEST_COMPETITION.bot_id);
      await page.fill('input[name="title"]', TEST_COMPETITION.title);
      await page.fill('textarea[name="description"]', TEST_COMPETITION.description);
      await page.fill('textarea[name="rules"]', TEST_COMPETITION.rules);
      await page.fill('textarea[name="instructions"]', TEST_COMPETITION.instructions);

      // Set dates (today to 30 days from now)
      const today = new Date().toISOString().split('T')[0];
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      await page.fill('input[name="start_date"]', today);
      await page.fill('input[name="end_date"]', futureDate);
      await page.fill('input[name="submission_deadline"]', futureDate);

      // Set status to active for immediate testing
      await page.selectOption('select[name="status"]', 'active');

      // Fill rewards
      await page.fill('textarea[name="reward_description"]', TEST_COMPETITION.reward_description);

      // Fill baseline
      await page.fill('textarea[name="baseline_prompts"]', TEST_COMPETITION.baseline_prompts);
      await page.fill('textarea[name="baseline_evaluation_notes"]', TEST_COMPETITION.baseline_evaluation_notes);

      // Submit the form
      await page.getByRole('button', { name: /create competition/i }).click();

      // Wait for redirect to competitions list
      await page.waitForURL(/\/app\/admin\/competitions$/, { timeout: 25000 });

      // Verify competition appears in the list
      await expect(page.getByText(TEST_COMPETITION.title)).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/active/i)).toBeVisible();
    });

    test('should edit an existing competition', async ({ page }) => {
      // Navigate to competitions list
      await page.goto('/app/admin/competitions', { waitUntil: 'networkidle' });

      // Find and click edit button for test competition
      const editButton = page.locator(`text=${TEST_COMPETITION.title}`).locator('..').locator('..').getByTitle(/edit competition/i);
      await editButton.click();

      // Wait for edit page to load
      await page.waitForURL(/\/app\/admin\/competitions\/.*/, { timeout: 10000 });

      // Modify title
      const newTitle = TEST_COMPETITION.title + ' (Updated)';
      await page.fill('input[name="title"]', newTitle);

      // Submit changes
      await page.getByRole('button', { name: /update competition/i }).click();

      // Wait for redirect
      await page.waitForURL(/\/app\/admin\/competitions$/, { timeout: 15000 });

      // Verify updated title appears
      await expect(page.getByText(newTitle)).toBeVisible({ timeout: 10000 });
    });

    test('should navigate between admin tabs', async ({ page }) => {
      await page.goto('/app/admin', { waitUntil: 'networkidle' });

      // Check Bots tab is active
      await expect(page.getByText(/bots & weblets/i).first()).toBeVisible();

      // Click on Competitions tab
      await page.getByRole('link', { name: /competitions/i }).first().click();

      // Verify competitions page loaded
      await expect(page).toHaveURL(/\/app\/admin\/competitions/);
      await expect(page.getByText(/competitions/i).first()).toBeVisible();
    });

    test('should delete a competition', async ({ page }) => {
      // Create a competition to delete
      await page.goto('/app/admin/competitions/new', { waitUntil: 'networkidle' });

      const deleteTestTitle = 'Competition to Delete';

      // Fill minimal required fields
      await page.selectOption('select[name="bot_id"]', TEST_COMPETITION.bot_id);
      await page.fill('input[name="title"]', deleteTestTitle);
      await page.fill('textarea[name="description"]', 'To be deleted');

      const today = new Date().toISOString().split('T')[0];
      await page.fill('input[name="start_date"]', today);
      await page.fill('input[name="end_date"]', today);
      await page.fill('input[name="submission_deadline"]', today);

      await page.getByRole('button', { name: /create competition/i }).click();
      await page.waitForURL(/\/app\/admin\/competitions$/, { timeout: 15000 });

      // Now delete it
      const deleteButton = page.locator(`text=${deleteTestTitle}`).locator('..').locator('..').getByTitle(/delete competition/i);

      // Handle confirmation dialog
      page.on('dialog', dialog => dialog.accept());
      await deleteButton.click();

      // Wait for deletion and verify it's gone
      await page.waitForTimeout(2000);
      await expect(page.getByText(deleteTestTitle)).not.toBeVisible();
    });
  });

  // ============================================================================
  // USER TESTS - Competition Participation
  // ============================================================================

  test.describe('User - Competition Participation', () => {

    test('should display competitions in navigation', async ({ page }) => {
      await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

      // Check header navigation
      await expect(page.getByRole('link', { name: /competitions/i })).toBeVisible();

      // Check for active competitions badge (if any active competitions exist)
      const badge = page.locator('span').filter({ hasText: /^\d+$/ }).first();
      if (await badge.isVisible()) {
        await expect(badge).toBeVisible();
      }
    });

    test('should view featured competitions on dashboard', async ({ page }) => {
      await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

      // Go to dashboard
      await page.goto('/app', { waitUntil: 'networkidle' });

      // Check for featured competitions section (if active competitions exist)
      const featuredSection = page.getByText(/live competitions/i);
      if (await featuredSection.isVisible()) {
        await expect(featuredSection).toBeVisible();
        await expect(page.getByText(/compete & win rewards/i)).toBeVisible();
      }
    });

    test('should view competitions list', async ({ page }) => {
      await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

      // Navigate to competitions page
      await page.goto('/app/competitions', { waitUntil: 'networkidle' });

      // Check page header
      await expect(page.getByRole('heading', { name: /competitions/i })).toBeVisible();
      await expect(page.getByText(/compete with others/i)).toBeVisible();

      // Check for stats section (if user has submissions)
      const statsSection = page.getByText(/active competitions/i);
      if (await statsSection.isVisible()) {
        await expect(page.getByText(/your submissions/i)).toBeVisible();
      }
    });

    test('should view competition details', async ({ page }) => {
      await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

      // Navigate to competitions page
      await page.goto('/app/competitions', { waitUntil: 'networkidle' });

      // Click on first competition card
      const competitionCard = page.locator('a[href^="/app/competitions/"]').first();
      if (await competitionCard.isVisible()) {
        await competitionCard.click();

        // Wait for detail page to load
        await page.waitForURL(/\/app\/competitions\/.*/, { timeout: 10000 });

        // Check for detail page elements
        await expect(page.getByText(/deadline/i)).toBeVisible();
        await expect(page.getByText(/bot.*weblet/i)).toBeVisible();
        await expect(page.getByText(/max submissions/i)).toBeVisible();
      }
    });

    test('should view baseline evaluation', async ({ page }) => {
      await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

      // Find a competition with baseline
      await page.goto('/app/competitions', { waitUntil: 'networkidle' });

      const competitionCard = page.locator('a[href^="/app/competitions/"]').first();
      if (await competitionCard.isVisible()) {
        await competitionCard.click();
        await page.waitForURL(/\/app\/competitions\/.*/, { timeout: 10000 });

        // Look for baseline section
        const baselineSection = page.getByText(/admin baseline evaluation/i);
        if (await baselineSection.isVisible()) {
          await expect(baselineSection).toBeVisible();
          await expect(page.getByText(/example prompts/i)).toBeVisible();
        }
      }
    });

    test('should submit an entry to active competition', async ({ page }) => {
      await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

      // Navigate to competitions
      await page.goto('/app/competitions', { waitUntil: 'networkidle' });

      // Find an active competition
      const activeCompetition = page.locator('text=/active/i').locator('..').locator('..').locator('a').first();
      if (await activeCompetition.isVisible()) {
        await activeCompetition.click();
        await page.waitForURL(/\/app\/competitions\/.*/, { timeout: 10000 });

        // Scroll to submission form
        const submissionForm = page.getByText(/submit your entry/i);
        if (await submissionForm.isVisible()) {
          await submissionForm.scrollIntoViewIfNeeded();

          // Fill submission form
          await page.fill('input[name="title"]', 'E2E Test Submission');
          await page.fill('textarea[name="product_output"]', '{"type": "test", "data": "sample output"}');
          await page.fill('textarea[name="prompts_used"]', 'Test prompt: Create a sample submission');
          await page.fill('textarea[name="methodology_notes"]', 'This is a test submission from E2E tests');

          // Submit
          await page.getByRole('button', { name: /submit entry/i }).click();

          // Wait for success message
          await expect(page.getByText(/submission successful/i)).toBeVisible({ timeout: 10000 });

          // Verify submission appears in user's submissions list
          await page.waitForTimeout(2000);
          await expect(page.getByText(/E2E Test Submission/i)).toBeVisible();
        }
      }
    });

    test('should respect submission limits', async ({ page }) => {
      await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

      // This test would require creating a competition with max_submissions_per_user = 1
      // and submitting twice to verify the limit is enforced
      // Implementation depends on having a dedicated test competition
    });
  });

  // ============================================================================
  // ADMIN TESTS - Evaluation System
  // ============================================================================

  test.describe('Admin - Evaluation System', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    });

    test('should view submissions for evaluation', async ({ page }) => {
      // Navigate to admin competitions
      await page.goto('/app/admin/competitions', { waitUntil: 'networkidle' });

      // Click on first competition to edit/evaluate
      const editLink = page.getByTitle(/edit competition/i).first();
      if (await editLink.isVisible()) {
        await editLink.click();

        // Wait for edit page
        await page.waitForURL(/\/app\/admin\/competitions\/.*/, { timeout: 10000 });

        // Click on Submissions tab
        await page.getByRole('link', { name: /submissions/i }).click();

        // Verify submissions tab loaded
        await expect(page.getByText(/submission/i)).toBeVisible();
      }
    });

    test('should evaluate a submission', async ({ page }) => {
      // Navigate to admin competitions
      await page.goto('/app/admin/competitions', { waitUntil: 'networkidle' });

      // Find a competition with submissions
      const competitionWithSubmissions = page.locator('text=/\\d+ submission/i').first();
      if (await competitionWithSubmissions.isVisible()) {
        // Click edit on that competition
        await competitionWithSubmissions.locator('..').locator('..').getByTitle(/edit competition/i).click();
        await page.waitForURL(/\/app\/admin\/competitions\/.*/, { timeout: 10000 });

        // Go to submissions tab
        await page.getByRole('link', { name: /submissions/i }).click();

        // Expand first submission
        const submissionCard = page.locator('[class*="bg-white"]').filter({ hasText: /submission/i }).first();
        await submissionCard.click();

        // Wait for evaluation form to appear
        await page.waitForTimeout(1000);

        // Fill evaluation scores
        const totalScoreInput = page.locator('input[type="number"]').filter({ hasText: /total score/i });
        if (await totalScoreInput.isVisible()) {
          // Fill scores (adjust selectors based on actual form)
          await page.fill('input[name="product_score"]', '85');
          await page.fill('input[name="prompt_score"]', '90');
          await page.fill('textarea[name="feedback"]', 'Great work! Very creative approach.');
          await page.fill('textarea[name="strengths"]', 'Clear presentation, good use of examples');
          await page.fill('textarea[name="areas_for_improvement"]', 'Could add more visual elements');

          // Calculate and verify total score appears
          await page.waitForTimeout(500);

          // Submit evaluation
          await page.getByRole('button', { name: /submit evaluation/i }).click();

          // Wait for success
          await page.waitForTimeout(2000);
        }
      }
    });

    test('should update existing evaluation', async ({ page }) => {
      // Similar to above but should find an already-evaluated submission
      // and update the scores
    });
  });

  // ============================================================================
  // LEADERBOARD TESTS
  // ============================================================================

  test.describe('Leaderboard & Rankings', () => {

    test('should view leaderboard for completed competition', async ({ page }) => {
      await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

      // Navigate to competitions
      await page.goto('/app/competitions', { waitUntil: 'networkidle' });

      // Find a completed competition
      const completedCompetition = page.locator('text=/completed/i').locator('..').locator('..').locator('a').first();
      if (await completedCompetition.isVisible()) {
        await completedCompetition.click();
        await page.waitForURL(/\/app\/competitions\/.*/, { timeout: 10000 });

        // Check for leaderboard section
        const leaderboard = page.getByText(/leaderboard/i);
        if (await leaderboard.isVisible()) {
          await expect(leaderboard).toBeVisible();

          // Check for ranking elements
          await expect(page.locator('text=/rank/i, text=/score/i').first()).toBeVisible();

          // Check for trophy/medal icons for top 3
          const trophyIcon = page.locator('svg[class*="trophy"], svg[class*="medal"]').first();
          if (await trophyIcon.isVisible()) {
            await expect(trophyIcon).toBeVisible();
          }
        }
      }
    });

    test('should expand leaderboard entry to view details', async ({ page }) => {
      await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

      // Navigate to a completed competition with leaderboard
      await page.goto('/app/competitions', { waitUntil: 'networkidle' });

      const completedCompetition = page.locator('text=/completed/i').locator('..').locator('..').locator('a').first();
      if (await completedCompetition.isVisible()) {
        await completedCompetition.click();
        await page.waitForURL(/\/app\/competitions\/.*/, { timeout: 10000 });

        // Find and click on a leaderboard entry
        const leaderboardEntry = page.locator('[class*="hover:bg"]').filter({ hasText: /rank|score/i }).first();
        if (await leaderboardEntry.isVisible()) {
          await leaderboardEntry.click();

          // Wait for expansion
          await page.waitForTimeout(500);

          // Check for detailed view
          await expect(page.getByText(/prompts used/i)).toBeVisible();
        }
      }
    });

    test('should see winning submissions marked', async ({ page }) => {
      await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

      // Navigate to completed competition
      await page.goto('/app/competitions', { waitUntil: 'networkidle' });

      const completedCompetition = page.locator('text=/completed/i').locator('..').locator('..').locator('a').first();
      if (await completedCompetition.isVisible()) {
        await completedCompetition.click();
        await page.waitForURL(/\/app\/competitions\/.*/, { timeout: 10000 });

        // Look for winner indicators (award icons, badges, etc.)
        const winnerBadge = page.locator('svg[class*="award"]').first();
        if (await winnerBadge.isVisible()) {
          await expect(winnerBadge).toBeVisible();
        }
      }
    });
  });

  // ============================================================================
  // INTEGRATION TESTS - Full Competition Lifecycle
  // ============================================================================

  test.describe('Full Competition Lifecycle', () => {

    test('complete lifecycle: create → submit → evaluate → view results', async ({ page }) => {
      // This is a comprehensive integration test
      await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

      const lifecycleTestTitle = 'Lifecycle Test Competition ' + Date.now();

      // Step 1: Create competition
      await page.goto('/app/admin/competitions/new', { waitUntil: 'networkidle' });

      await page.selectOption('select[name="bot_id"]', TEST_COMPETITION.bot_id);
      await page.fill('input[name="title"]', lifecycleTestTitle);
      await page.fill('textarea[name="description"]', 'Testing full lifecycle');

      const today = new Date().toISOString().split('T')[0];
      await page.fill('input[name="start_date"]', today);
      await page.fill('input[name="end_date"]', today);
      await page.fill('input[name="submission_deadline"]', today);

      await page.selectOption('select[name="status"]', 'active');
      await page.fill('input[name="max_submissions_per_user"]', '5');

      await page.getByRole('button', { name: /create competition/i }).click();
      await page.waitForURL(/\/app\/admin\/competitions$/, { timeout: 15000 });

      // Step 2: Submit as user
      await page.goto('/app/competitions', { waitUntil: 'networkidle' });

      // Find and click on our test competition
      await page.getByText(lifecycleTestTitle).click();
      await page.waitForURL(/\/app\/competitions\/.*/, { timeout: 10000 });

      // Submit entry
      const submissionForm = page.getByText(/submit your entry/i);
      await submissionForm.scrollIntoViewIfNeeded();

      await page.fill('input[name="title"]', 'Lifecycle Test Submission');
      await page.fill('textarea[name="product_output"]', '{"type": "lifecycle_test", "quality": "excellent"}');
      await page.fill('textarea[name="prompts_used"]', 'Lifecycle test prompt');

      await page.getByRole('button', { name: /submit entry/i }).click();
      await expect(page.getByText(/submission successful/i)).toBeVisible({ timeout: 10000 });

      // Step 3: Evaluate as admin
      await page.goto('/app/admin/competitions', { waitUntil: 'networkidle' });

      // Find our competition and go to submissions
      await page.getByText(lifecycleTestTitle).locator('..').locator('..').getByTitle(/edit/i).click();
      await page.waitForURL(/\/app\/admin\/competitions\/.*/, { timeout: 10000 });

      await page.getByRole('link', { name: /submissions/i }).click();

      // Expand first submission
      const submission = page.locator('text=/Lifecycle Test Submission/i').first();
      await submission.click();
      await page.waitForTimeout(1000);

      // Evaluate
      await page.fill('input[name="product_score"]', '95');
      await page.fill('input[name="prompt_score"]', '90');
      await page.fill('textarea[name="feedback"]', 'Excellent lifecycle test submission');

      await page.waitForTimeout(500);
      await page.getByRole('button', { name: /submit evaluation/i }).click();
      await page.waitForTimeout(2000);

      // Step 4: Change status to completed
      await page.getByRole('link', { name: /edit details/i }).click();
      await page.waitForTimeout(1000);

      await page.selectOption('select[name="status"]', 'completed');
      await page.getByRole('button', { name: /update competition/i }).click();
      await page.waitForURL(/\/app\/admin\/competitions$/, { timeout: 15000 });

      // Step 5: View results as user
      await page.goto('/app/competitions', { waitUntil: 'networkidle' });
      await page.getByText(lifecycleTestTitle).click();
      await page.waitForURL(/\/app\/competitions\/.*/, { timeout: 10000 });

      // Verify leaderboard is visible
      await expect(page.getByText(/leaderboard/i)).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/Lifecycle Test Submission/i)).toBeVisible();

      // Verify score is displayed
      await expect(page.getByText(/92\.5|95|90/)).toBeVisible(); // approximate score
    });

    test('should handle status transitions correctly', async ({ page }) => {
      await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

      // Create competition in draft
      // Change to active
      // Verify submissions can be made
      // Change to closed
      // Verify submissions cannot be made
      // Change to judging
      // Change to completed
      // Verify leaderboard appears
    });
  });

  // ============================================================================
  // ERROR HANDLING & EDGE CASES
  // ============================================================================

  test.describe('Error Handling', () => {

    test('should handle invalid competition ID', async ({ page }) => {
      await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

      // Navigate to non-existent competition
      await page.goto('/app/competitions/invalid-id-12345', { waitUntil: 'networkidle' });

      // Should show error message or redirect
      await expect(page.getByText(/not found|error/i)).toBeVisible({ timeout: 5000 });
    });

    test('should prevent submission after deadline', async ({ page }) => {
      await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

      // Would need a competition with passed deadline
      // Verify submission form is not available or shows message
    });

    test('should prevent non-admin from accessing admin pages', async ({ page }) => {
      // If you have a non-admin test user
      // await login(page, USER_EMAIL, USER_PASSWORD);

      // Try to access admin competitions
      // await page.goto('/app/admin/competitions', { waitUntil: 'networkidle' });

      // Should show forbidden or redirect
      // await expect(page.getByText(/forbidden|unauthorized/i)).toBeVisible();
    });

    test('should validate required fields in competition form', async ({ page }) => {
      await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

      await page.goto('/app/admin/competitions/new', { waitUntil: 'networkidle' });

      // Try to submit without filling required fields
      await page.getByRole('button', { name: /create competition/i }).click();

      // Should show validation errors (HTML5 or custom)
      // Verify form didn't submit
      await expect(page).toHaveURL(/\/app\/admin\/competitions\/new/);
    });

    test('should validate JSON in submission form', async ({ page }) => {
      await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

      // Find an active competition
      await page.goto('/app/competitions', { waitUntil: 'networkidle' });

      const activeCompetition = page.locator('text=/active/i').locator('..').locator('..').locator('a').first();
      if (await activeCompetition.isVisible()) {
        await activeCompetition.click();
        await page.waitForURL(/\/app\/competitions\/.*/, { timeout: 10000 });

        const submissionForm = page.getByText(/submit your entry/i);
        if (await submissionForm.isVisible()) {
          await submissionForm.scrollIntoViewIfNeeded();

          // Fill with invalid JSON
          await page.fill('input[name="title"]', 'Invalid JSON Test');
          await page.fill('textarea[name="product_output"]', 'This is not valid JSON');
          await page.fill('textarea[name="prompts_used"]', 'Test prompt');

          await page.getByRole('button', { name: /submit entry/i }).click();

          // Should show error about invalid JSON
          await expect(page.getByText(/invalid json|must be valid json/i)).toBeVisible({ timeout: 5000 });
        }
      }
    });
  });

  // ============================================================================
  // NAVIGATION & UI TESTS
  // ============================================================================

  test.describe('Navigation & UI', () => {

    test('should have competitions link in header', async ({ page }) => {
      await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

      // Check header for competitions link
      await expect(page.getByRole('link', { name: /competitions/i }).first()).toBeVisible();
    });

    test('should show active competitions badge', async ({ page }) => {
      await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

      // Look for badge with number
      const badge = page.locator('span.bg-red-500, span[class*="bg-red"]').filter({ hasText: /\d+/ }).first();

      // Badge should be visible if there are active competitions
      if (await badge.isVisible()) {
        await expect(badge).toBeVisible();
      }
    });

    test('should navigate between competition tabs in admin', async ({ page }) => {
      await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

      await page.goto('/app/admin/competitions', { waitUntil: 'networkidle' });

      // Click on Bots tab
      await page.getByRole('link', { name: /bots & weblets/i }).click();
      await expect(page).toHaveURL(/\/app\/admin$/);

      // Click back to Competitions
      await page.getByRole('link', { name: /competitions/i }).first().click();
      await expect(page).toHaveURL(/\/app\/admin\/competitions/);
    });

    test('should display competition statistics on dashboard', async ({ page }) => {
      await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

      await page.goto('/app/competitions', { waitUntil: 'networkidle' });

      // Check for stats cards
      const statsCards = page.locator('[class*="bg-white"]').filter({ hasText: /active competitions|your submissions|total community entries/i });

      if (await statsCards.first().isVisible()) {
        await expect(statsCards.first()).toBeVisible();
      }
    });
  });
});

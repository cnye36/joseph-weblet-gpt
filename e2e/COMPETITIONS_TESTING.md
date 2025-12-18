# Competition System E2E Tests

Comprehensive end-to-end tests for the WebletGPT competition system.

## Overview

The competition system tests cover the entire lifecycle of competitions, from creation by admins to participation by users, evaluation, and results viewing.

## Test Files

- **`competitions.test.ts`** - Main test suite with all competition tests
- **`competition-helpers.ts`** - Reusable helper functions for competition testing

## Test Coverage

### 1. Admin - Competition Management
- ✅ Display competitions admin page
- ✅ Create new competition with all fields
- ✅ Edit existing competition
- ✅ Navigate between admin tabs (Bots/Competitions)
- ✅ Delete competition with confirmation
- ✅ Validate required fields

### 2. User - Competition Participation
- ✅ Display competitions in navigation
- ✅ View featured competitions on dashboard
- ✅ View competitions list with stats
- ✅ View competition details
- ✅ View baseline evaluation
- ✅ Submit entry to active competition
- ✅ Respect submission limits
- ✅ View user's submission history

### 3. Admin - Evaluation System
- ✅ View submissions for evaluation
- ✅ Evaluate a submission with scores and feedback
- ✅ Update existing evaluation
- ✅ Auto-calculate weighted scores

### 4. Leaderboard & Rankings
- ✅ View leaderboard for completed competition
- ✅ Expand leaderboard entry to view details
- ✅ See winning submissions marked
- ✅ Display rankings with medals/trophies
- ✅ Show prompts used by winners

### 5. Full Competition Lifecycle
- ✅ Complete flow: Create → Submit → Evaluate → View Results
- ✅ Handle status transitions (draft → active → completed)
- ✅ Auto-refresh rankings after evaluation

### 6. Error Handling & Edge Cases
- ✅ Handle invalid competition ID
- ✅ Prevent submission after deadline
- ✅ Prevent non-admin from accessing admin pages
- ✅ Validate required fields in forms
- ✅ Validate JSON in submission form

### 7. Navigation & UI
- ✅ Competitions link in header
- ✅ Active competitions badge
- ✅ Navigate between admin tabs
- ✅ Display competition statistics

## Running the Tests

### Run All Competition Tests
```bash
pnpm test e2e/competitions.test.ts
```

### Run Specific Test Suite
```bash
# Admin tests only
pnpm test e2e/competitions.test.ts -g "Admin - Competition Management"

# User tests only
pnpm test e2e/competitions.test.ts -g "User - Competition Participation"

# Evaluation tests only
pnpm test e2e/competitions.test.ts -g "Admin - Evaluation System"

# Leaderboard tests only
pnpm test e2e/competitions.test.ts -g "Leaderboard"

# Full lifecycle test
pnpm test e2e/competitions.test.ts -g "Full Competition Lifecycle"
```

### Run in UI Mode (Interactive)
```bash
pnpm test:ui
```

### Run in Debug Mode
```bash
pnpm test:debug
```

### Generate HTML Report
```bash
pnpm test:report
```

## Test Configuration

### Prerequisites

1. **Test Accounts**: You need test accounts set up:
   - **Admin account**: `cnye36@gmail.com` (or update in test file)
   - **User account**: Create a regular test user account

2. **Database**: Ensure Supabase is running and accessible

3. **Environment Variables**: Ensure `.env.local` is properly configured with:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### Test Data

Tests create temporary competitions with names like:
- "E2E Test Competition"
- "Lifecycle Test Competition [timestamp]"
- "Competition to Delete"

These are automatically created and (mostly) cleaned up during tests.

## Helper Functions

The `competition-helpers.ts` file provides reusable functions:

### Competition Management
- `createCompetition(page, competitionData)` - Create a new competition
- `navigateToCompetition(page, title)` - Navigate to competition by title
- `deleteCompetition(page, title)` - Delete a competition
- `updateCompetitionStatus(page, title, status)` - Change competition status

### Submissions
- `submitEntry(page, submissionData)` - Submit an entry to competition
- `verifyUserSubmission(page, title)` - Verify submission appears in user list
- `isSubmissionFormAvailable(page)` - Check if submission form is visible

### Evaluation
- `navigateToSubmissions(page, title)` - Go to submissions as admin
- `evaluateSubmission(page, title, evalData)` - Evaluate a submission
- `getSubmissionCount(page, title)` - Get number of submissions

### Leaderboard
- `verifyLeaderboardEntry(page, title, rank?)` - Verify entry in leaderboard
- `expandLeaderboardEntry(page, title)` - Expand to see details

### UI Verification
- `verifyBaselineVisible(page)` - Check baseline section
- `verifyCompetitionStats(page)` - Check stats cards

## Example Usage

```typescript
import { test } from '@playwright/test';
import { login } from './helpers';
import { createCompetition, submitEntry, evaluateSubmission } from './competition-helpers';

test('custom competition test', async ({ page }) => {
  await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

  // Create competition
  await createCompetition(page, {
    title: 'My Test Competition',
    description: 'Testing',
    bot_id: 'poster-creator-gpt',
    status: 'active',
  });

  // Submit entry
  await navigateToCompetition(page, 'My Test Competition');
  await submitEntry(page, {
    title: 'My Submission',
    product_output: '{"type": "test"}',
    prompts_used: 'Test prompt',
  });

  // Evaluate
  await navigateToSubmissions(page, 'My Test Competition');
  await evaluateSubmission(page, 'My Submission', {
    product_score: 90,
    prompt_score: 85,
    feedback: 'Great work!',
  });
});
```

## Best Practices

### 1. Use Unique Test Data
```typescript
const uniqueTitle = `Test Competition ${Date.now()}`;
```

### 2. Clean Up After Tests
```typescript
test.afterEach(async ({ page }) => {
  // Delete test competitions
  await deleteCompetition(page, testTitle);
});
```

### 3. Wait for Network
```typescript
await page.goto('/app/competitions', { waitUntil: 'networkidle' });
```

### 4. Use Appropriate Timeouts
```typescript
await expect(element).toBeVisible({ timeout: 10000 });
```

### 5. Handle Optional Elements
```typescript
if (await element.isVisible()) {
  await element.click();
}
```

## Troubleshooting

### Tests Failing?

1. **Check Authentication**: Ensure test credentials are correct
2. **Check Database**: Verify Supabase is accessible
3. **Check Timing**: Increase timeouts if tests are slow
4. **Check Selectors**: UI might have changed, update selectors
5. **Check Permissions**: Ensure admin account has proper permissions

### Common Issues

**Issue**: "Element not found"
- **Solution**: Increase timeout or add `waitForSelector`

**Issue**: "Navigation timeout"
- **Solution**: Check network speed, increase `waitForURL` timeout

**Issue**: "Competition not found"
- **Solution**: Verify competition was created, check for errors in creation step

**Issue**: "Submission failed"
- **Solution**: Check JSON validity, verify competition is active

## Continuous Integration

### Running in CI/CD

```yaml
# Example GitHub Actions workflow
- name: Install dependencies
  run: pnpm install

- name: Install Playwright
  run: pnpm exec playwright install --with-deps

- name: Run competition tests
  run: pnpm test e2e/competitions.test.ts
  env:
    NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

## Test Maintenance

### Adding New Tests

1. Follow existing patterns in `competitions.test.ts`
2. Use helper functions from `competition-helpers.ts`
3. Add descriptive test names
4. Include proper assertions
5. Clean up test data

### Updating Tests

When UI changes:
1. Update selectors in tests
2. Update helper functions if needed
3. Update this documentation
4. Run tests to verify

## Coverage Report

After running tests, view coverage:

```bash
pnpm test:report
```

This will generate an HTML report showing:
- Test results
- Screenshots on failure
- Video recordings (if enabled)
- Detailed error messages

## Support

For issues or questions about the competition tests:
1. Check this documentation
2. Review existing tests for patterns
3. Check Playwright documentation
4. Contact the development team

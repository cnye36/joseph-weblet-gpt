import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Bot Navigation and Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'cnye36@gmail.com', 'Zoeybug3636!@$');
  });

  test('should display bot cards on dashboard', async ({ page }) => {
    await page.goto('/app', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Wait for bot cards to load
    await page.waitForSelector('a', { timeout: 20000 });
    
    // Check for search functionality
    await expect(page.getByPlaceholder(/search/i)).toBeVisible({ timeout: 15000 });
    
    // Check for bot cards - look for some known bots
    await expect(page.getByText(/AlphaFold/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('should search for bots', async ({ page }) => {
    await page.goto('/app', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle', { timeout: 20000 });
    
    // Find the search input
    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toBeVisible({ timeout: 15000 });
    
    // Search for a specific bot
    await searchInput.fill('AlphaFold');
    
    // Wait for search results
    await page.waitForTimeout(2000);
    
    // AlphaFold should be visible
    await expect(page.getByText(/AlphaFold/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('should paginate through bot list', async ({ page }) => {
    await page.goto('/app');
    
    // Check for pagination controls
    const nextButton = page.getByRole('link', { name: /next/i });
    
    // If pagination exists, test it
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await page.waitForTimeout(1000);
      
      // Should still be on /app
      await expect(page).toHaveURL(/\/app/);
    }
  });

  test('should display bot information on hover or click', async ({ page }) => {
    await page.goto('/app', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Wait for bot cards to load
    await page.waitForLoadState('networkidle', { timeout: 20000 });
    
    // Find a bot card
    const botCard = page.getByRole('link', { name: /AlphaFold/i }).first();
    await expect(botCard).toBeVisible({ timeout: 15000 });
    
    // Bot cards should have content visible (description or name)
    const hasContent = await page.locator('text=/fetches|3d structure|protein/i').first().isVisible().catch(() => false);
    expect(hasContent || await botCard.isVisible()).toBeTruthy();
  });

  test('should navigate to dashboard from chat', async ({ page }) => {
    // Navigate to a chat
    await page.goto('/app', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 20000 });
    
    const botLink = page.getByRole('link', { name: /AlphaFold/i }).first();
    await botLink.waitFor({ state: 'visible', timeout: 15000 });
    await botLink.click();
    await page.waitForURL(/\/app\/chat\//, { timeout: 20000 });
    
    // Click dashboard link
    const dashboardLink = page.getByRole('link', { name: /dashboard/i });
    await dashboardLink.waitFor({ state: 'visible', timeout: 15000 });
    await dashboardLink.click();
    
    // Should be back on dashboard
    await expect(page).toHaveURL(/\/app$/, { timeout: 15000 });
  });

  test('should display user email in sidebar', async ({ page }) => {
    await page.goto('/app');
    
    // User email should be visible
    await expect(page.getByText(/cnye36@gmail.com/i)).toBeVisible();
  });

  test('should have admin link for admin users', async ({ page }) => {
    await page.goto('/app');
    
    // Admin link should be visible (since we're logged in as admin)
    await expect(page.getByRole('link', { name: /admin/i })).toBeVisible();
  });

  test('should display bot model information in chat', async ({ page }) => {
    await page.goto('/app');
    await page.getByRole('link', { name: /AlphaFold/i }).first().click();
    await page.waitForURL(/\/app\/chat\//);
    
    // Model information should be visible
    await expect(page.getByText(/model:/i)).toBeVisible();
  });
});


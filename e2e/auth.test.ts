import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should display the login page', async ({ page }) => {
    await page.goto('/login');
    
    // Check for login form elements
    await expect(page.getByPlaceholder(/you@example.com/i)).toBeVisible();
    await expect(page.getByPlaceholder(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });
    
    // Fill in credentials
    await page.getByPlaceholder(/you@example.com/i).fill('cnye36@gmail.com');
    await page.getByPlaceholder(/password/i).fill('Zoeybug3636!@$');
    
    // Click sign in and wait for navigation
    await Promise.all([
      page.waitForURL(/\/app/, { timeout: 20000 }),
      page.getByRole('button', { name: /sign in/i }).click()
    ]);
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle', { timeout: 20000 });
    
    // Verify we're on the dashboard
    await expect(page).toHaveURL(/\/app/);
    
    // Verify dashboard content is loaded - look for search input or any bot content
    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toBeVisible({ timeout: 15000 });
  });

  test('should redirect to /app when accessing /login while authenticated', async ({ page }) => {
    // First login
    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.getByPlaceholder(/you@example.com/i).fill('cnye36@gmail.com');
    await page.getByPlaceholder(/password/i).fill('Zoeybug3636!@$');
    await Promise.all([
      page.waitForURL(/\/app/, { timeout: 20000 }),
      page.getByRole('button', { name: /sign in/i }).click()
    ]);
    await page.waitForLoadState('networkidle', { timeout: 20000 });
    
    // Now try to access /login again
    await page.goto('/login', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Should redirect back to /app
    await expect(page).toHaveURL(/\/app/, { timeout: 15000 });
  });

  test('should protect /app routes when not authenticated', async ({ page }) => {
    // Clear any existing cookies/storage
    await page.context().clearCookies();
    
    // Try to access /app without being logged in
    await page.goto('/app');
    
    // Should redirect to /login
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/login/);
  });
});


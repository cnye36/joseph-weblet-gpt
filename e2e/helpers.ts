import { Page, expect } from '@playwright/test';

/**
 * Login helper function
 * Logs in a user with the provided credentials
 */
export async function login(page: Page, email: string, password: string) {
  // Navigate to login page
  await page.goto('/login', { waitUntil: 'networkidle' });
  
  // Fill in the login form
  await page.getByPlaceholder(/you@example.com/i).fill(email);
  await page.getByPlaceholder(/password/i).fill(password);
  
  // Click the sign in button and wait for navigation
  await Promise.all([
    page.waitForURL(/\/app/, { timeout: 20000 }),
    page.getByRole('button', { name: /sign in/i }).click()
  ]);
  
  // Give the dashboard a moment to load
  await page.waitForLoadState('networkidle', { timeout: 20000 });
  
  // Verify we're on the dashboard
  await expect(page).toHaveURL(/\/app/);
}

/**
 * Navigate to a specific bot's chat page
 */
export async function navigateToBot(page: Page, botName: string) {
  // Go to dashboard if not already there
  const currentUrl = page.url();
  if (!currentUrl.includes('/app')) {
    await page.goto('/app', { waitUntil: 'networkidle' });
  }
  
  // Wait for bot cards to load
  await page.waitForSelector('a', { timeout: 15000 });
  
  // Find and click on the bot card
  const botLink = page.getByRole('link', { name: new RegExp(botName, 'i') }).first();
  await botLink.waitFor({ state: 'visible', timeout: 15000 });
  await botLink.click();
  
  // Wait for chat page to load
  await page.waitForURL(/\/app\/chat\//, { timeout: 20000 });
  await page.waitForLoadState('networkidle', { timeout: 20000 });
}

/**
 * Send a message in the chat
 */
export async function sendMessage(page: Page, message: string) {
  // Find the message input
  const input = page.getByPlaceholder(/type a message/i);
  
  // Fill and send the message
  await input.fill(message);
  await input.press('Enter');
  
  // Wait a moment for the message to be sent
  await page.waitForTimeout(1000);
}

/**
 * Wait for a bot response
 */
export async function waitForBotResponse(page: Page, timeout: number = 30000) {
  // Wait for any text content to appear in the chat area
  // This is a simple check - in a real scenario you might want to be more specific
  await page.waitForTimeout(timeout);
}

/**
 * Logout helper function
 */
export async function logout(page: Page) {
  // Click on the user menu
  await page.getByRole('button', { name: /cnye36@gmail.com/i }).click();
  
  // Click logout (if available)
  // Note: Adjust this based on your actual logout implementation
  await page.getByRole('menuitem', { name: /logout|sign out/i }).click();
}


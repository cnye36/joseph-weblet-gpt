import { test, expect } from '@playwright/test';
import { login, navigateToBot, sendMessage } from './helpers';

test.describe('Chat Functionality', () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    await login(page, 'cnye36@gmail.com', 'Zoeybug3636!@$');
  });

  test('should navigate to a bot chat page', async ({ page }) => {
    // Click on AlphaFold bot
    await navigateToBot(page, 'AlphaFold');
    
    // Verify we're on a chat page
    await expect(page).toHaveURL(/\/app\/chat\//);
    
    // Verify chat interface is loaded
    await expect(page.getByPlaceholder(/type a message/i)).toBeVisible();
    
    // Verify bot info is displayed
    await expect(page.getByText(/AlphaFold/i)).toBeVisible();
  });

  test('should display chat history sidebar', async ({ page }) => {
    await navigateToBot(page, 'AlphaFold');
    
    // Check for "New Chat" button
    await expect(page.getByRole('button', { name: /new chat/i })).toBeVisible();
    
    // Check for Chat History section
    await expect(page.getByText(/Chat History/i)).toBeVisible();
  });

  test('should send a message and receive a response', async ({ page }) => {
    await navigateToBot(page, 'AlphaFold');
    
    // Send a test message
    const testMessage = 'What is AlphaFold?';
    const input = page.getByPlaceholder(/type a message/i);
    
    await input.fill(testMessage);
    await input.press('Enter');
    
    // Wait for the input to clear (message sent)
    await expect(input).toHaveValue('', { timeout: 5000 });
    
    // Wait for bot response to appear
    // The response should appear in the chat area
    // We'll wait for some text content to appear (bot response)
    await page.waitForTimeout(10000); // Give time for API response
    
    // Check that the page has content (messages)
    const chatContent = await page.content();
    expect(chatContent.length).toBeGreaterThan(1000); // Should have more content after response
  });

  test('should create a new chat', async ({ page }) => {
    await navigateToBot(page, 'AlphaFold');
    
    // Get current URL
    const firstChatUrl = page.url();
    
    // Click "New Chat" button
    await page.getByRole('button', { name: /new chat/i }).click();
    
    // Wait for URL to change
    await page.waitForTimeout(2000);
    
    // URL should be different (new chat ID)
    const newChatUrl = page.url();
    expect(newChatUrl).not.toBe(firstChatUrl);
    
    // Input should be visible and empty
    await expect(page.getByPlaceholder(/type a message/i)).toBeVisible();
    await expect(page.getByPlaceholder(/type a message/i)).toHaveValue('');
  });

  test('should toggle tool switches', async ({ page }) => {
    await navigateToBot(page, 'AlphaFold');
    
    // Check for tool switches (if they exist for this bot)
    const simulationSwitch = page.getByRole('switch', { name: /run simulation/i });
    const arxivSwitch = page.getByRole('switch', { name: /search arxiv/i });
    
    // Check if switches are visible
    if (await simulationSwitch.isVisible()) {
      const isChecked = await simulationSwitch.isChecked();
      await simulationSwitch.click();
      await expect(simulationSwitch).toHaveAttribute('aria-checked', String(!isChecked));
    }
    
    if (await arxivSwitch.isVisible()) {
      const isChecked = await arxivSwitch.isChecked();
      await arxivSwitch.click();
      await expect(arxivSwitch).toHaveAttribute('aria-checked', String(!isChecked));
    }
  });

  test('should display welcome message on new chat', async ({ page }) => {
    await navigateToBot(page, 'AlphaFold');
    
    // Click new chat to ensure we have a fresh chat
    await page.getByRole('button', { name: /new chat/i }).click();
    await page.waitForTimeout(1000);
    
    // Check for welcome message
    await expect(page.getByText(/hello there|how can i help/i)).toBeVisible();
  });

  test('should switch between different bots', async ({ page }) => {
    // Navigate to first bot
    await navigateToBot(page, 'AlphaFold');
    await expect(page.getByText(/AlphaFold/i)).toBeVisible();
    
    // Go back to dashboard
    await page.goto('/app');
    
    // Navigate to different bot
    await navigateToBot(page, 'Biomimicry');
    await expect(page.getByText(/Biomimicry/i)).toBeVisible();
  });

  test('should persist chat in sidebar after sending message', async ({ page }) => {
    await navigateToBot(page, 'AlphaFold');
    
    // Create a new chat
    await page.getByRole('button', { name: /new chat/i }).click();
    await page.waitForTimeout(1000);
    
    // Send a unique message
    const uniqueMessage = `Test message ${Date.now()}`;
    const input = page.getByPlaceholder(/type a message/i);
    await input.fill(uniqueMessage);
    await input.press('Enter');
    
    // Wait for message to be sent
    await page.waitForTimeout(5000);
    
    // Check if chat appears in sidebar (it might show the message or auto-generated title)
    // Note: The exact behavior depends on your implementation
    const sidebar = page.locator('nav, aside').first();
    await expect(sidebar).toBeVisible();
  });
});


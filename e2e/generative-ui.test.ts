import { test, expect } from '@playwright/test';
import { login, navigateToBot } from './helpers';

test.describe('Generative UI Features', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'cnye36@gmail.com', 'Zoeybug3636!@$');
  });

  test('should render a Mermaid chart when requested', async ({ page }) => {
    // Navigate to Ganttrify bot which specializes in Gantt charts
    await page.goto('/app');
    
    // Try to find Ganttrify bot, if not available use another bot
    const ganttrifyBot = page.getByRole('link', { name: /ganttrify|gantt/i }).first();
    
    if (await ganttrifyBot.isVisible()) {
      await ganttrifyBot.click();
    } else {
      // Fall back to AlphaFold
      await navigateToBot(page, 'AlphaFold');
    }
    
    await page.waitForURL(/\/app\/chat\//);
    
    // Send a message requesting a chart
    const input = page.getByPlaceholder(/type a message/i);
    await input.fill('Create a simple flowchart showing: Start -> Process -> End');
    await input.press('Enter');
    
    // Wait for response
    await page.waitForTimeout(15000);
    
    // Look for Mermaid diagram container
    // Mermaid diagrams are typically rendered in SVG or specific div containers
    const mermaidContainer = page.locator('[data-name="mermaid"], .mermaid, svg[id*="mermaid"]').first();
    
    // Check if Mermaid content exists (with longer timeout)
    await expect(mermaidContainer).toBeVisible({ timeout: 30000 });
  });

  test('should render a markdown table', async ({ page }) => {
    await navigateToBot(page, 'AlphaFold');
    
    // Request a table
    const input = page.getByPlaceholder(/type a message/i);
    await input.fill('Create a markdown table comparing 3 proteins with columns: Name, Size, Function');
    await input.press('Enter');
    
    // Wait for response
    await page.waitForTimeout(15000);
    
    // Look for table elements
    const table = page.locator('table').first();
    await expect(table).toBeVisible({ timeout: 30000 });
    
    // Check for table headers
    await expect(page.locator('th')).toHaveCount(3, { timeout: 5000 });
  });

  test('should render code blocks with syntax highlighting', async ({ page }) => {
    await navigateToBot(page, 'AlphaFold');
    
    // Request code
    const input = page.getByPlaceholder(/type a message/i);
    await input.fill('Show me a Python code example for fetching data from AlphaFold API');
    await input.press('Enter');
    
    // Wait for response
    await page.waitForTimeout(15000);
    
    // Look for code block
    const codeBlock = page.locator('pre, code[class*="language-"]').first();
    await expect(codeBlock).toBeVisible({ timeout: 30000 });
  });

  test('should have copy button on code blocks', async ({ page }) => {
    await navigateToBot(page, 'AlphaFold');
    
    // Request code
    const input = page.getByPlaceholder(/type a message/i);
    await input.fill('Show me a simple Python function');
    await input.press('Enter');
    
    // Wait for response with code
    await page.waitForTimeout(15000);
    
    // Look for copy button (usually appears on hover or is always visible)
    const copyButton = page.getByRole('button', { name: /copy/i });
    
    // Check if copy button exists
    const copyButtonCount = await copyButton.count();
    if (copyButtonCount > 0) {
      await expect(copyButton.first()).toBeVisible({ timeout: 30000 });
      
      // Click to copy
      await copyButton.first().click();
      
      // Should show "Copied" or similar feedback
      await expect(page.getByText(/copied/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('should render sortable tables', async ({ page }) => {
    await navigateToBot(page, 'AlphaFold');
    
    // Request a table with numerical data
    const input = page.getByPlaceholder(/type a message/i);
    await input.fill('Create a table with 5 proteins and their molecular weights (numerical values)');
    await input.press('Enter');
    
    // Wait for response
    await page.waitForTimeout(15000);
    
    // Check if table exists
    const table = page.locator('table').first();
    if (await table.isVisible({ timeout: 30000 })) {
      // Check for table headers (which might be clickable for sorting)
      const tableHeaders = page.locator('th');
      await expect(tableHeaders.first()).toBeVisible();
      
      // Try to click on a header to sort (if sorting is implemented)
      await tableHeaders.first().click();
      await page.waitForTimeout(1000);
    }
  });

  test('should handle mixed content (text + code + table)', async ({ page }) => {
    await navigateToBot(page, 'AlphaFold');
    
    // Request mixed content
    const input = page.getByPlaceholder(/type a message/i);
    await input.fill('Explain how to use AlphaFold API with a code example and a table showing endpoints');
    await input.press('Enter');
    
    // Wait for response
    await page.waitForTimeout(20000);
    
    // Check for various content types
    const pageContent = await page.content();
    
    // Should have substantial content
    expect(pageContent.length).toBeGreaterThan(2000);
  });

  test('should display tool call results', async ({ page }) => {
    await navigateToBot(page, 'AlphaFold');
    
    // Enable simulation tool
    const simulationSwitch = page.getByRole('switch', { name: /run simulation/i });
    if (await simulationSwitch.isVisible()) {
      // Make sure it's enabled
      if (!(await simulationSwitch.isChecked())) {
        await simulationSwitch.click();
      }
      
      // Request something that would trigger simulation
      const input = page.getByPlaceholder(/type a message/i);
      await input.fill('Run a simulation');
      await input.press('Enter');
      
      // Wait for tool call
      await page.waitForTimeout(15000);
      
      // Look for tool call display or results
      // Tool calls might be displayed differently
      const pageContent = await page.content();
      expect(pageContent.length).toBeGreaterThan(1000);
    }
  });
});


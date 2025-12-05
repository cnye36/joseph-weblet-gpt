# E2E Tests for Weblet GPT

This directory contains end-to-end (E2E) tests for the Weblet GPT application using Playwright.

## Setup

### Prerequisites

1. **Node.js and pnpm**: Ensure you have Node.js and pnpm installed.
2. **System Dependencies (WSL2/Linux)**: Playwright's Chromium browser requires certain system libraries. If you're running on WSL2 or Linux, you'll need to install them:

```bash
sudo apt-get update
sudo apt-get install -y \
  libnspr4 \
  libnss3 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libpango-1.0-0 \
  libcairo2 \
  libasound2
```

Alternatively, you can install all dependencies at once using Playwright:

```bash
pnpm exec playwright install-deps
```

3. **Install Playwright Browsers**:

```bash
pnpm exec playwright install chromium
```

### Environment Variables

Make sure you have a `.env.local` file with the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENROUTER_API_KEY=your_openrouter_key
# ... other required environment variables
```

## Running Tests

### Run all tests

```bash
pnpm test
```

### Run tests with UI mode (interactive)

```bash
pnpm test:ui
```

### Run tests in debug mode

```bash
pnpm test:debug
```

### View test report

```bash
pnpm test:report
```

### Run specific test file

```bash
pnpm exec playwright test e2e/auth.test.ts
```

### Run tests in headed mode (see browser)

```bash
pnpm exec playwright test --headed
```

## Test Structure

### Test Files

- **`helpers.ts`**: Shared utility functions for tests (login, navigation, etc.)
- **`auth.test.ts`**: Authentication and authorization tests
- **`bots.test.ts`**: Bot navigation and dashboard tests
- **`chat.test.ts`**: Chat functionality tests
- **`generative-ui.test.ts`**: Tests for generative UI features (Mermaid charts, tables, code blocks)

### Test Credentials

The tests use the following credentials by default:
- **Email**: `cnye36@gmail.com`
- **Password**: `Zoeybug3636!@$`

**Note**: These are the credentials provided by the user for testing purposes.

## Test Coverage

### Authentication Tests (`auth.test.ts`)
- ✅ Display login page
- ✅ Successful login with valid credentials
- ✅ Redirect to /app when accessing /login while authenticated
- ✅ Protect /app routes when not authenticated

### Bot Navigation Tests (`bots.test.ts`)
- ✅ Display bot cards on dashboard
- ✅ Search for bots
- ✅ Paginate through bot list
- ✅ Display bot information
- ✅ Navigate to dashboard from chat
- ✅ Display user email in sidebar
- ✅ Show admin link for admin users
- ✅ Display bot model information

### Chat Tests (`chat.test.ts`)
- ✅ Navigate to bot chat page
- ✅ Display chat history sidebar
- ✅ Send message and receive response
- ✅ Create new chat
- ✅ Toggle tool switches
- ✅ Display welcome message
- ✅ Switch between different bots
- ✅ Persist chat in sidebar

### Generative UI Tests (`generative-ui.test.ts`)
- ✅ Render Mermaid charts
- ✅ Render markdown tables
- ✅ Render code blocks with syntax highlighting
- ✅ Copy button on code blocks
- ✅ Sortable tables
- ✅ Mixed content (text + code + tables)
- ✅ Tool call results display

## Configuration

The Playwright configuration is in `playwright.config.ts`. Key settings:

- **Base URL**: `http://localhost:3000`
- **Browser**: Chromium (headless by default)
- **Parallel Execution**: Tests run in parallel
- **Retries**: 2 retries on CI, 0 locally
- **Screenshots**: Captured on failure
- **Videos**: Retained on failure
- **Traces**: Captured on first retry

## Development Server

The tests automatically start the development server before running (`pnpm dev`). If the server is already running, it will reuse it.

## Troubleshooting

### Tests Timing Out

If tests are timing out, it could be due to:
1. Slow API responses from OpenRouter
2. Network issues
3. Dev server not starting properly

You can increase timeouts in individual tests or in the Playwright config.

### Browser Launch Errors on WSL2

If you see errors like "error while loading shared libraries: libnspr4.so", you need to install the system dependencies listed in the Setup section above.

### Authentication Failures

Make sure:
1. The Supabase credentials in `.env.local` are correct
2. The test user account exists in your Supabase database
3. The user has an active subscription or is an admin

## CI/CD Integration

These tests can be integrated into your CI/CD pipeline. On CI:
- Tests automatically retry twice on failure
- Tests run serially (not in parallel)
- Screenshots, videos, and traces are captured for debugging

Example GitHub Actions workflow:

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm exec playwright install --with-deps
      - run: pnpm test
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Best Practices

1. **Keep tests independent**: Each test should be able to run in isolation
2. **Use helpers**: Reuse common operations via helper functions
3. **Clear test names**: Use descriptive test names that explain what is being tested
4. **Wait appropriately**: Use proper waits instead of fixed timeouts when possible
5. **Clean up**: Tests automatically clean up browser contexts between runs

## Contributing

When adding new tests:
1. Follow the existing structure and naming conventions
2. Add helper functions for reusable operations
3. Ensure tests can run independently
4. Update this README if you add new test files or change the structure


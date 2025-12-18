# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Weblet GPT is a multi-agent chat application built with Next.js 15 App Router, featuring authenticated users, specialized bot assistants with generative UI capabilities, and tools integration. The app uses Supabase for auth/database, OpenRouter for AI models, and PayPal for subscription management.

## Development Commands

```bash
# Development
pnpm dev          # Start dev server with Turbopack (localhost:3000)
pnpm build        # Production build with Turbopack
pnpm start        # Start production server

# Code Quality
pnpm lint         # Run ESLint
pnpm typecheck    # TypeScript type checking (no emit)

# Testing
pnpm test         # Run Playwright E2E tests
pnpm test:ui      # Run tests in interactive UI mode
pnpm test:debug   # Run tests in debug mode
pnpm test:report  # Show HTML test report
```

## Architecture

### Authentication & Authorization Flow
- **Middleware** (middleware.ts): Handles all route protection with built-in timeout handling (5 seconds)
  - Unauthenticated users accessing `/app/*` → redirect to `/login`
  - Authenticated users on `/login` or `/signup` → redirect to `/app` (if admin OR active subscription)
  - Admin check: Environment vars (`ADMIN_EMAILS`, `ADMIN_EMAIL`, `ADMIN_EMAIL_2`, or `NEXT_PUBLIC_*` versions) OR `app_admins` table
  - Subscription check: `subscriptions` table with `status='active'` AND valid `next_billing_date` for day passes
  - On timeout/error: Allows request through (auth checks happen at page level)
- **Admin Emails**:
  - Primary method: `ADMIN_EMAILS` (comma-separated list) or `NEXT_PUBLIC_ADMIN_EMAILS`
  - Legacy method: Individual vars `ADMIN_EMAIL`, `ADMIN_EMAIL_2`, `NEXT_PUBLIC_ADMIN_EMAIL`, `NEXT_PUBLIC_ADMIN_EMAIL_2`
  - Also checked in `app_admins` table via lib/admin.ts

### Bot System Architecture
Bots are AI assistants with specialized system prompts and tool-based generative UI capabilities.

- **Static Bots**: Defined in lib/bots.ts - default bots shipped with the app
  - `poster-creator-gpt`: Research Article to Poster Converter
  - `ganttrify-gpt`: Advanced Gantt Chart Generator
  - `microbial-biochemistry-gpt`: Microbial Biochemistry Assistant
- **Dynamic Bots**: Stored in Supabase `bots` table (overrides static definitions if present)
- **Bot System Prompts**: All bots include `GENERATIVE_UI_INSTRUCTIONS` which instructs the model to use the `generate_chart` tool
- **Admin Functions**: Avatar generation (DALL-E), prompt enhancement, CRUD operations at `/app/admin`

### Chat Streaming Architecture

- **Node.js Runtime**: app/api/chat/route.ts uses Node.js runtime (not Edge) for streaming
- **AI SDK v4**: Uses `ai` and `@ai-sdk/react` packages
  - Dynamic body values via ref pattern and custom fetch function
  - `convertToCoreMessages` for message normalization
- **Message Normalization**: API converts UI messages (with `parts`) to `CoreMessage[]`
  - Handles text, images, and file attachments
  - Flattens multi-part messages into text content
- **OpenRouter Provider**: Custom provider in lib/openrouter.ts using `@openrouter/ai-sdk-provider`
  - Model slug handling: Adds `openai/` prefix if no slash present
- **Tools Integration**:
  - `generate_chart` tool (always available) - Creates charts and diagrams
  - `simulate_model` tool (optional) - Runs scientific simulations (SIR, Logistic, Projectile)
  - `arxiv_search_papers` / `arxiv_get_paper_details` tools (optional) - Search ArXiv papers
- **Default Model**: `openai/gpt-4o` (can be overridden per-bot)

### Generative UI System

The app renders rich UI components from AI tool calls via components/chat/ChartToolRenderer.tsx:

- **Charts & Diagrams**: Rendered via `generate_chart` tool
  - **Quantitative Charts**: Line, Bar, Pie, Area (using Recharts)
  - **Diagrams**: Flowchart, Gantt (using Mermaid)
- **Enhanced Tables**: Sortable markdown tables with numeric/alphabetic sorting (MessageRenderer.tsx)
- **Code Blocks**: Syntax highlighting with copy button (100+ languages via react-syntax-highlighter)
- **Simulation Visualizations**: Interactive charts for simulation results (SimulationRenderer.tsx)
- **Chart Modal**: Fullscreen modal for enlarging charts (ChartModal.tsx)

**Implementation Pattern**:
1. Bot system prompt includes `GENERATIVE_UI_INSTRUCTIONS` that instructs model to use `generate_chart` tool
2. Model invokes `generate_chart` tool with structured chart configuration (defined in lib/chart-schemas.ts)
3. Tool result rendered by `ChartToolRenderer` component which delegates to:
   - `RechartsRenderer` for quantitative charts (line, bar, pie, area)
   - `MermaidRenderer` for diagrams (flowchart, gantt)
4. Charts are interactive with hover states, tooltips, and fullscreen capability

**Critical**: Models must use the `generate_chart` TOOL, NOT output Mermaid markdown blocks

### Database Schema (Supabase)

Key tables with RLS (Row Level Security):

- `chats`: User chat sessions
  - `user_id`, `bot_id`, `title`, `created_at`

- `messages`: Chat message history
  - `chat_id`, `role`, `content`, `parts` (JSONB for multi-part messages)

- `bots`: Custom bot definitions (admin-managed)
  - `id`, `name`, `description`, `model`, `system`, `temperature`, `avatar_url`

- `subscriptions`: PayPal subscription tracking
  - `user_id`, `subscription_id`, `plan_name`, `status`, `next_billing_date`

- `app_admins`: Admin user emails
  - `email` (checked in middleware alongside env vars)

- `avatars`: Storage bucket for bot avatars (public bucket)

### File Attachment System

File uploads handled client-side before sending to chat API:

- **Supported Formats**: Images (base64) - displayed inline in chat
- **Processing**: Images converted to base64 data URLs
- **Message Format**: Images added as `parts` in UI messages with type "image"
- **API Handling**: app/api/chat/route.ts converts parts to CoreMessage format for AI SDK

Note: The codebase has infrastructure for PDF/Excel/Word processing (pdfjs-dist, xlsx, mammoth dependencies) but these features are not actively implemented in the current Chat.tsx.

### PayPal Subscription Flow

- **Products/Plans**: Managed via PayPal API (app/api/paypal/create-product/route.ts, app/api/paypal/create-plan/route.ts)
- **Subscription Setup**: app/api/paypal/setup-subscription/route.ts creates subscription in PayPal
- **Webhooks**: app/api/webhooks/paypal/route.ts handles events:
  - `BILLING.SUBSCRIPTION.ACTIVATED` → Update `subscriptions` table
  - `BILLING.SUBSCRIPTION.CANCELLED` → Set status to cancelled
  - `PAYMENT.SALE.COMPLETED` → Update billing date
- **Frontend**: components/PricingModal.tsx - PayPal SDK integration with subscription button
- **Environment Variables**:
  - `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET`: API credentials
  - `NEXT_PUBLIC_PAYPAL_CLIENT_ID`: Frontend SDK
  - `PAYPAL_MODE`: `live` or `sandbox`

### Scientific Simulation System

The app includes a simulation engine for scientific models:

- **Engine**: lib/simulation/core.ts
- **Supported Models**:
  - `SIR`: Epidemiology model (Susceptible-Infected-Recovered)
  - `Logistic`: Population growth model
  - `Projectile`: Physics projectile motion
- **Activation**: Toggle "Run Simulation" switch in chat UI
- **Renderer**: SimulationRenderer.tsx displays interactive charts with Recharts
- **Tool**: `simulate_model` - AI models can invoke this to run simulations

### ArXiv Integration

Academic paper search via ArXiv API:

- **Tools**: lib/tools/arxiv.ts
  - `arxiv_search_papers`: Search for papers by query
  - `arxiv_get_paper_details`: Get detailed information about a specific paper
- **Activation**: Toggle "Search Arxiv" switch in chat UI
- **Usage**: AI models can search and retrieve academic papers during conversations

## Common Patterns

### Reading User Session
```typescript
// Server Component
import { createClient } from '@/lib/supabase/server';
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();

// Client Component
import { createClient } from '@/lib/supabase/client';
const supabase = createClient();
const { data: { user } } = await supabase.auth.getUser();
```

### Checking Admin Status
```typescript
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user || !(await isAdmin())) {
  return new Response('Unauthorized', { status: 401 });
}
```

### Creating New Bot System Prompt
When modifying bot system prompts in lib/bots.ts:
1. DO NOT remove `+ GENERATIVE_UI_INSTRUCTIONS` at end
2. Keep workflow structured with numbered steps
3. Specify when to use the `generate_chart` tool
4. Include clear instructions on tool usage vs text responses

### Adding New Tools to Chat API
In app/api/chat/route.ts:
1. Import tool from lib/tools/
2. Add tool definition with `tool()` function from AI SDK
3. Define parameters with Zod schema
4. Implement execute function
5. Add to tools object (conditionally or always)
6. Handle tool results in Chat.tsx if custom rendering needed

## Important Notes

### Next.js 15 Compatibility
- Use `NextRequest` for API routes (not `Request` from fetch API)
- Dynamic route params accessed via `context.params` not route signature

### Turbopack
- Both `dev` and `build` use `--turbopack` flag
- Faster builds and HMR compared to webpack

### Environment Variables
All environment variables are defined in `.env.local`:
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- OpenRouter: `OPENROUTER_API_KEY`, `OPENROUTER_BASE_URL`
- OpenAI: `OPENAI_API_KEY` (for admin avatar generation)
- PayPal: Multiple variables (see [PayPal Subscription Flow](#paypal-subscription-flow))
- Admin: `ADMIN_EMAILS` (comma-separated) or individual `ADMIN_EMAIL`, `ADMIN_EMAIL_2`, `NEXT_PUBLIC_ADMIN_EMAIL`, `NEXT_PUBLIC_ADMIN_EMAIL_2`

### Supabase Migrations
Database schema changes are tracked in `supabase/migrations/`. Apply new migrations via Supabase CLI or dashboard.

### Model Selection
Default model: `openai/gpt-4o` via OpenRouter. Can be overridden per-bot in database or lib/bots.ts.

### Testing
- **Framework**: Playwright
- **Location**: e2e/ directory
- **Configuration**: playwright.config.ts
- **Test Files**:
  - e2e/auth.test.ts - Authentication flows
  - e2e/bots.test.ts - Bot management
  - e2e/chat.test.ts - Chat functionality
  - e2e/generative-ui.test.ts - Generative UI features

## File Structure Reference

```
app/
├── api/
│   ├── chat/route.ts              # Main streaming chat endpoint (Node.js runtime)
│   ├── chats/                     # Chat CRUD
│   │   ├── route.ts               # List/create chats
│   │   ├── [id]/route.ts          # Update/delete chat
│   │   └── title/route.ts         # Auto-generate chat title
│   ├── messages/route.ts          # Message CRUD
│   ├── bots/                      # Bot management
│   │   ├── route.ts               # List/create bots
│   │   ├── [id]/route.ts          # Update/delete bot
│   │   └── check/route.ts         # Check bot existence
│   ├── paypal/                    # PayPal integration
│   │   ├── create-product/route.ts
│   │   ├── create-plan/route.ts
│   │   └── setup-subscription/route.ts
│   ├── webhooks/paypal/route.ts   # PayPal webhook handler
│   ├── cancel-subscription/route.ts
│   └── admin/                     # Admin-only endpoints
│       ├── enhance-prompt/route.ts
│       ├── generate-avatars/route.ts
│       └── bots/[id]/
│           ├── upload-avatar/route.ts
│           └── generate-avatar/route.ts
├── app/                           # Authenticated app routes
│   ├── page.tsx                   # Dashboard with bot cards
│   ├── chat/
│   │   ├── page.tsx               # Chat redirect
│   │   ├── [bot]/page.tsx         # Chat interface
│   │   └── layout.tsx             # Chat layout with sidebar
│   ├── admin/                     # Admin panel
│   │   ├── page.tsx               # Admin dashboard
│   │   ├── layout.tsx             # Admin layout
│   │   └── bots/
│   │       ├── new/page.tsx       # Create new bot
│   │       └── [id]/page.tsx      # Edit bot
│   └── layout.tsx                 # App layout
├── login/page.tsx                 # Login page
├── signup/                        # Signup flow
│   ├── page.tsx
│   └── SignupForm.tsx
├── pricing/page.tsx               # Pricing page
├── features/page.tsx              # Features page
└── layout.tsx                     # Root layout

components/
├── chat/
│   ├── Chat.tsx                   # Main chat component (streaming, tools, toggles)
│   ├── MessageRenderer.tsx        # Markdown renderer with enhanced tables/code
│   ├── ChartToolRenderer.tsx      # Chart tool result renderer
│   ├── ChartModal.tsx             # Fullscreen chart modal
│   ├── RechartsRenderer.tsx       # Quantitative chart renderer
│   ├── MermaidRenderer.tsx        # Diagram renderer (flowchart, gantt)
│   ├── EnhancedTable.tsx          # Sortable table component
│   ├── CodeBlock.tsx              # Syntax-highlighted code blocks
│   └── SimulationRenderer.tsx     # Simulation visualization
├── sidebar/                       # Chat sidebar components
│   ├── Sidebar.tsx
│   ├── MainSidebar.tsx
│   ├── ChatSidebar.tsx
│   ├── ChatList.tsx
│   ├── ChatListItemActions.tsx
│   ├── NewChatButton.tsx
│   ├── GPTsAccordion.tsx
│   ├── NavUser.tsx
│   ├── LogoutButton.tsx
│   └── SubscriptionCountdown.tsx
├── PricingModal.tsx               # PayPal subscription modal
└── ui/                            # shadcn/ui components

lib/
├── supabase/
│   ├── server.ts                  # Server-side Supabase client
│   └── client.ts                  # Client-side Supabase client
├── simulation/
│   └── core.ts                    # Simulation engine (SIR, Logistic, Projectile)
├── tools/
│   └── arxiv.ts                   # ArXiv search tools
├── openrouter.ts                  # OpenRouter provider config
├── bots.ts                        # Bot catalog and system prompts
├── admin.ts                       # Admin utility functions
├── avatar-generation.ts           # DALL-E avatar generation
├── chart-schemas.ts               # Zod schemas for chart tool
└── utils.ts                       # Utility functions

e2e/                               # Playwright E2E tests
├── auth.test.ts
├── bots.test.ts
├── chat.test.ts
└── generative-ui.test.ts

supabase/migrations/               # Database migrations

middleware.ts                      # Route protection & auth
playwright.config.ts               # Playwright configuration
```

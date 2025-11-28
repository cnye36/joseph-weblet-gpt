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


## Architecture

### Authentication & Authorization Flow
- **Middleware** ([middleware.ts:20-103](middleware.ts#L20-L103)): Handles all route protection
  - Unauthenticated users accessing `/app/*` → redirect to `/login`
  - Authenticated users on `/login` or `/signup` → redirect to `/app` (if admin OR active subscription)
  - Admin check: Environment vars (`NEXT_PUBLIC_ADMIN_EMAIL`, `NEXT_PUBLIC_ADMIN_EMAIL_2`) OR `app_admins` table
  - Subscription check: `subscriptions` table with `status='active'` AND valid `next_billing_date` for day passes
- **Admin Emails**: Configured in `.env.local` as `NEXT_PUBLIC_ADMIN_EMAIL` and `NEXT_PUBLIC_ADMIN_EMAIL_2`

### Bot System Architecture
Bots are AI assistants with specialized system prompts and generative UI capabilities.

- **Static Bots**: Defined in [lib/bots.ts](lib/bots.ts) - default bots shipped with the app
  - `poster-creator-gpt`: Research Article to Poster Converter
  - `ganttrify-gpt`: Advanced Gantt Chart Generator (strict Mermaid syntax)
  - `microbial-biochemistry-gpt`: Microbial Biochemistry Assistant
- **Dynamic Bots**: Stored in Supabase `bots` table (overrides static definitions if present)
- **Bot System Prompts**: All bots include `GENERATIVE_UI_INSTRUCTIONS` ([lib/bots.ts:4-73](lib/bots.ts#L4-L73)) for Mermaid diagrams, tables, and code blocks
- **Admin Functions**: Avatar generation (DALL-E), prompt enhancement, CRUD operations at `/app/admin`



### Chat Streaming Architecture

- **Edge Runtime**: [app/api/chat/route.ts](app/api/chat/route.ts) uses Edge runtime for streaming
- **AI SDK v5**: Uses `@ai-sdk/react` with `DefaultChatTransport` pattern
  - Dynamic body values via ref pattern ([components/chat/Chat.tsx:33-39](components/chat/Chat.tsx#L33-L39))
- **Message Normalization**: API converts UI messages (with `parts`) to `CoreMessage[]` ([app/api/chat/route.ts:66-97](app/api/chat/route.ts#L66-L97))
  - Handles text, images, and file attachments
  - Flattens multi-part messages into single text content
- **OpenRouter Provider**: Custom provider in [lib/openrouter.ts](lib/openrouter.ts) using `@openrouter/ai-sdk-provider`
  - Model slug handling: Strips `openrouter/` prefix if present

### Generative UI System

The app renders rich UI components from AI responses via [components/chat/MessageRenderer.tsx](components/chat/MessageRenderer.tsx):

- **Mermaid Diagrams**: Gantt charts, flowcharts, sequence diagrams, etc.
- **Enhanced Tables**: Sortable markdown tables with numeric/alphabetic sorting
- **Code Blocks**: Syntax highlighting with copy button (100+ languages)
- **Simulation Visualizations**: Interactive charts for MCP simulation results

**Implementation Pattern**:
1. Bot system prompt includes `GENERATIVE_UI_INSTRUCTIONS` ([lib/bots.ts:4-73](lib/bots.ts#L4-L73))
2. Model outputs markdown with special syntax (e.g., ` ```mermaid`)
3. `MessageRenderer` detects patterns and renders custom components
4. Components use Recharts for charts, react-markdown for text, react-syntax-highlighter for code

**Critical for Ganttrify Bot**: Strict Mermaid syntax enforcement ([lib/bots.ts:94-149](lib/bots.ts#L94-L149))
- Each directive on own line with newline
- Task IDs: lowercase letters only (no dashes/underscores)
- Dates: `YYYY-MM-DD` format only
- No text after duration parameter

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

- **Supported Formats**: Images (base64), PDF (text extraction), Excel (sheet conversion), Word (text extraction)
- **Processing**:
  - PDFs: [components/chat/Chat.tsx](components/chat/Chat.tsx) uses `pdfjs-dist` for text extraction
  - Excel: Uses `xlsx` library to convert sheets to markdown tables
  - Word: Uses `mammoth` for DOCX to text conversion
- **Message Format**: Files converted to text and added as `parts` in UI messages
- **API Handling**: [app/api/chat/route.ts](app/api/chat/route.ts) flattens parts into single text content for AI model

### PayPal Subscription Flow

- **Products/Plans**: Managed via PayPal API ([app/api/paypal/create-product/route.ts](app/api/paypal/create-product/route.ts), [app/api/paypal/create-plan/route.ts](app/api/paypal/create-plan/route.ts))
- **Subscription Setup**: [app/api/paypal/setup-subscription/route.ts](app/api/paypal/setup-subscription/route.ts) creates subscription in PayPal
- **Webhooks**: [app/api/webhooks/paypal/route.ts](app/api/webhooks/paypal/route.ts) handles events:
  - `BILLING.SUBSCRIPTION.ACTIVATED` → Update `subscriptions` table
  - `BILLING.SUBSCRIPTION.CANCELLED` → Set status to cancelled
  - `PAYMENT.SALE.COMPLETED` → Update billing date
- **Frontend**: [components/PricingModal.tsx](components/PricingModal.tsx) - PayPal SDK integration with subscription button
- **Environment Variables**:
  - `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET`: API credentials
  - `NEXT_PUBLIC_PAYPAL_CLIENT_ID`: Frontend SDK
  - `PAYPAL_MODE`: `live` or `sandbox`

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
if (!user || !(await isAdmin(user.email))) {
  return new Response('Unauthorized', { status: 401 });
}
```

### Creating New Bot System Prompt
When modifying bot system prompts in [lib/bots.ts](lib/bots.ts):
1. DO NOT remove `+ GENERATIVE_UI_INSTRUCTIONS` at end
2. Keep workflow structured with numbered steps
3. Specify expected output format (tables, charts, diagrams)
4. For Ganttrify: Preserve strict Mermaid syntax rules



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
- Admin: `NEXT_PUBLIC_ADMIN_EMAIL`, `NEXT_PUBLIC_ADMIN_EMAIL_2`

### Supabase Migrations
Database schema changes are tracked in `supabase/migrations/`. Apply new migrations via Supabase CLI or dashboard.

### Model Selection
Default model: `openai/gpt-4.1` via OpenRouter. Can be overridden per-bot in database or [lib/bots.ts](lib/bots.ts).

## File Structure Reference

```
app/
├── api/
│   ├── chat/route.ts              # Main streaming chat endpoint (Edge)
│   ├── chats/                     # Chat CRUD
│   │   ├── route.ts               # List/create chats
│   │   ├── [id]/route.ts          # Update/delete chat
│   │   └── title/route.ts         # Auto-generate chat title
│   ├── messages/route.ts          # Message CRUD
│   ├── bots/                      # Bot management
│   ├── paypal/                    # PayPal integration
│   ├── webhooks/paypal/route.ts   # PayPal webhook handler
│   └── admin/                     # Admin-only endpoints
├── app/                           # Authenticated app routes
│   ├── page.tsx                   # Dashboard with bot cards
│   ├── chat/[bot]/page.tsx        # Chat interface
│   └── admin/                     # Admin panel
├── login/page.tsx                 # Login page
└── signup/page.tsx                # Signup page

components/
├── chat/
│   ├── Chat.tsx                   # Main chat component (file uploads, streaming)
│   ├── MessageRenderer.tsx        # Generative UI orchestrator
│   ├── MermaidChart.tsx           # Mermaid diagram renderer
│   ├── EnhancedTable.tsx          # Sortable table component
│   ├── CodeBlock.tsx              # Syntax-highlighted code
│   ├── SimulationRenderer.tsx     # Simulation visualization
│   └── ToolCallDisplay.tsx        # Tool call display
├── sidebar/                       # Chat sidebar (chat list, new chat)
├── PricingModal.tsx               # PayPal subscription modal
└── ui/                            # shadcn/ui components

lib/
├── supabase/
│   ├── server.ts                  # Server-side Supabase client
│   └── client.ts                  # Client-side Supabase client
├── openrouter.ts                  # OpenRouter provider config
├── bots.ts                        # Bot catalog and system prompts
├── admin.ts                       # Admin utility functions
└── avatar-generation.ts           # DALL-E avatar generation

docs/
├── 
supabase/migrations/               # Database migrations
```

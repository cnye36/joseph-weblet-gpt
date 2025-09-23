## Weblet GPT

Multi‑agent assistants for research, planning, and technical workflows. Built with Next.js App Router, Supabase auth/storage, and OpenRouter models via AI SDK streaming.

### Tech Stack
- **Framework**: Next.js 15 (App Router, Edge runtime for chat)
- **UI**: Tailwind CSS 4, shadcn/ui primitives
- **State/UX**: `@ai-sdk/react`, streaming responses, file attachments
- **Auth/DB**: Supabase (RLS, SSR helpers)
- **Models**: OpenRouter with OpenAI-compatible models

### Features
- Authenticated app shell with redirect middleware (`/login`, `/signup`, `/app`)
- Chat UI with streaming, markdown, and image/file attachments
- Bot catalog with curated assistants:
  - Poster Creator GPT
  - Ganttrify Pro
  - Microbial Biochemistry GPT
- Persisted chats/messages in Supabase with RLS
- Auto chat title generation via model

## Getting Started

### Prerequisites
- Node 18+ (or 20+ recommended)
- pnpm (preferred)
- A Supabase project (URL + anon key)
- OpenRouter API key

### Installation
```bash
pnpm install
```

### Environment Variables
Create `.env.local` at the repo root:
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

OPENROUTER_API_KEY=your_openrouter_api_key
# Optional override
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

### Run Dev Server
```bash
pnpm dev
```
Visit `http://localhost:3000`.

## App Structure
- `app/page.tsx`: marketing/landing
- `app/app/page.tsx`: dashboard + bot cards
- `app/app/chat/[bot]/page.tsx`: chat surface with sidebar
- `components/chat/Chat.tsx`: full chat UI, streaming, attachments
- `app/api/chat/route.ts`: edge streaming proxy to OpenRouter via AI SDK
- `app/api/chats/*`: CRUD for chats (title generation at `chats/title`)
- `app/api/messages/*`: list/create messages per chat
- `middleware.ts`: auth redirects using Supabase SSR client
- `lib/openrouter.ts`: OpenRouter provider config
- `lib/supabase/*`: server/browser clients
- `lib/bots.ts`: built-in bots catalog and default bot id

## Built-in Bots
Defined in `lib/bots.ts` and displayed in `/app`:
- Poster Creator GPT (openai/gpt-4.1)
- Ganttrify Pro (openai/gpt-4.1)
- Microbial Biochemistry GPT (openai/gpt-4.1)

## API Overview
- `POST /api/chat` — stream model responses
  - body: `{ botId?: string, messages: Array<{ role: 'user'|'assistant'|'system', parts?|content? }> }`
- `GET /api/chats` — list chats for current user
- `POST /api/chats` — create chat `{ botId, title }`
- `PATCH /api/chats/[id]` — update chat title
- `POST /api/chats/title` — generate short chat title
- `GET /api/messages?chatId=...` — list messages
- `POST /api/messages` — create message `{ chatId, role, content }`
- `GET|PATCH /api/bots/[id]` — fetch/update a bot (requires admin)

## Authentication
Email/password using Supabase. Middleware restricts `/app` to authenticated users and redirects `/login` when already signed in.

## Deployment
- Set env vars in your host (Vercel, etc.)
- Ensure Edge runtime is supported for `app/api/chat/route.ts`

## Troubleshooting
- Next.js 15 route typing error on dynamic API routes (context.params type): ensure your route signatures use `(_: NextRequest, context: { params: { id: string } })` or stay with the Request signature but align your Next.js version/types. If you see:
  - `Type '(_: Request, { params }: { params: { id: string; }; }) => ...' is not assignable ...` 
  Update imports to use `NextRequest` and `context: { params: { id: string } }` in handlers, or pin Next/typings consistently.
- 401 from APIs: verify Supabase URL/key and that you are logged in.
- Empty chat stream: confirm `OPENROUTER_API_KEY` and selected model availability.

## Scripts
```bash
pnpm dev        # start dev server (turbopack)
pnpm build      # production build
pnpm start      # start production server
pnpm lint       # eslint
pnpm typecheck  # ts project check
```

## License
Proprietary – internal project README.

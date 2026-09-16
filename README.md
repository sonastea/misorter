# misorter

A ranking and sorting application built with React, Vite, TanStack Router, and tRPC.

## Tech Stack

- **Frontend**: React 19, Vite, TanStack Router
- **Backend**: tRPC, Prisma
- **Database**: PostgreSQL
- **Styling**: TailwindCSS
- **State Management**: TanStack Query (React Query)

## Getting Started

First, install dependencies:

```bash
npm install
```

### Development Mode

For local development, you need to run both frontend and backend:

```bash
npm run dev
```

This will start:

- **Frontend** (Vite): [http://localhost:3000](http://localhost:3000) - React app with hot reload
- **Worker** (Wrangler): [http://localhost:8787](http://localhost:8787) - Cloudflare Worker runtime

You can also run them separately:

```bash
# Run only the frontend
npm run dev:client

# Run only the worker
npm run dev:worker
```

**Note:** The development setup uses Wrangler to run your Worker locally in the edge runtime, matching production exactly. The Vite dev server proxies `/trpc` requests to the Worker.

You can start editing the page by modifying `src/routes/index.tsx`. The page auto-updates as you edit the file.

## Testing

Keep most functional coverage in fast Bun unit/contract tests, with a small
Playwright suite for critical browser workflows. Use the narrowest layer that can
prove the behavior:

- **Unit/contract tests:** parsing, validation boundaries, content preservation,
  and replace/append logic.
- **API/database integration tests:** server-side enforcement, persistence, and
  transaction rollback. Database guarantees require an isolated real database.
- **Playwright:** file uploads/downloads, latest edits reaching exported content,
  cancellation and URL behavior, and targeted asynchronous UI regressions. Check
  that validation errors block UI actions without repeating every validation case.

The current Playwright suite runs the real frontend with mocked tRPC responses.
It verifies UI integration and outgoing requests; real persistence verification
is still pending in the [import/export checklist](specs/list-import-export-todo.md).

Install dependencies with `bun install`, then use:

```bash
# Fast feedback during development
bun test

# Focused list-transfer unit/contract tests
bun run test:list-transfer

# Install Chromium before the first browser run
bunx playwright install chromium

# Browser workflows; Playwright starts Vite automatically when needed
bun run test:browser

# Complete current suite: Bun tests followed by Playwright
bun run test
```

Use the fast suite during development, run browser tests for relevant UI changes,
and run both in CI. See the [test-writing guide](specs/test-writing-prompt.md) for
contract-first case design and coverage ownership.

## Build

To create a production build:

```bash
npm run build
```

To preview the production build:

```bash
npm run preview
```

## Environment Variables

Copy `.env.example` to `.env` and fill in the required values:

### Frontend (Client-side)

- `VITE_API_URL` - (Optional) API endpoint URL for production. If not set, uses relative URLs
- `VITE_CLIENT_ID` - Twitch API client ID (public)

### Backend (Worker)

- `DATABASE_URL` - PostgreSQL database URL
- `REDIS_URL` - Redis connection URL
- `UPSTASH_REDIS_REST_URL` - Upstash Redis REST URL
- `UPSTASH_REDIS_REST_TOKEN` - Upstash Redis token
- `TWITCH_CLIENT_ID` - Twitch API client ID (same value as `VITE_CLIENT_ID`)
- `TWITCH_CLIENT_SECRET` - Twitch API client secret (server-only)

## Deployment

### Production Options

#### Option 1: Cloudflare Workers + Pages (Recommended)

This project is configured for Cloudflare deployment.

**Deploy to Cloudflare:**

```bash
# Deploy production (worker + pages)
npm run deploy

# Deploy preview/staging
npm run deploy:preview
```

This deploys:

- **Worker**: Your tRPC API to `misorter.com/trpc/*` (or `preview.misorter.com/trpc/*` for preview)
- **Pages**: Your frontend to `misorter.com`

**Benefits:**

- ✅ No server management
- ✅ Global edge deployment
- ✅ Automatic scaling
- ✅ No CORS issues (same subdomain)
- ✅ Pay per use

See `DEPLOYMENT.md` for detailed deployment instructions.

**Note:** This project is optimized for Cloudflare deployment. For other platforms, you may need to adapt the Worker code accordingly.

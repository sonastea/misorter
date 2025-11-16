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
- `VITE_CLIENT_ID` - Twitch API client ID
- `VITE_CLIENT_SECRET` - Twitch API client secret

### Backend (Worker)

- `DATABASE_URL` - PostgreSQL database URL
- `REDIS_URL` - Redis connection URL
- `UPSTASH_REDIS_REST_URL` - Upstash Redis REST URL
- `UPSTASH_REDIS_REST_TOKEN` - Upstash Redis token

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

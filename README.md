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

For local development, you need to run both frontend and backend servers:

```bash
npm run dev
```

This will start:

- **Frontend** (Vite): [http://localhost:3000](http://localhost:3000) - React app with hot reload
- **Backend** (tRPC): [http://localhost:4000](http://localhost:4000) - API server

You can also run them separately:

```bash
# Run only the frontend
npm run dev:client

# Run only the backend
npm run dev:server
```

**Note:** The concurrent server setup is **only for development**. In production (Cloudflare Workers, Vercel, etc.), you don't need to run both servers - the platform handles this automatically.

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

### Backend (Server-side)

- `DATABASE_URL` - PostgreSQL database URL
- `REDIS_URL` - Redis connection URL
- `PORT` - Server port (default: 4000)

## Deployment

### Production Options

#### Option 1: Cloudflare Workers + Pages (Recommended)

Deploy the frontend to Cloudflare Pages and backend as a Cloudflare Worker.

**Frontend (Cloudflare Pages):**

```bash
npm run build
# Deploy dist/ folder to Cloudflare Pages
```

**Backend (Cloudflare Worker):**
You'll need to adapt `server.ts` to Cloudflare Worker format. The Worker will:

- Run your tRPC router serverlessly
- Auto-scale based on traffic
- No need for concurrent servers!

Set `VITE_API_URL` to your Worker URL (e.g., `https://api.your-domain.workers.dev`)

**Benefits:**

- ✅ No server management
- ✅ Global edge deployment
- ✅ Automatic scaling
- ✅ Pay per use

#### Option 2: Traditional VPS/Server

Deploy frontend and backend together on the same domain.

1. Build frontend: `npm run build`
2. Serve `dist/` folder with a static file server
3. Run `server.ts` with Node.js
4. Use nginx to proxy `/api/trpc` to the Node.js server
5. No `VITE_API_URL` needed (uses relative URLs)

#### Option 3: Vercel

Deploy to [Vercel Platform](https://vercel.com).

1. Deploy frontend to Vercel
2. Add Vercel Serverless Functions for tRPC endpoints
3. Configure environment variables in Vercel dashboard

**Note:** The `npm run dev` concurrent server setup is **only for local development**. In production, the platform (Cloudflare, Vercel, etc.) handles running your services automatically.

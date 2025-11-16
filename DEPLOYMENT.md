# Cloudflare Deployment Guide

This guide explains how to deploy the misorter app to Cloudflare.

## Overview

The app is split into **TWO** separate deployments:

1. **Frontend** → Cloudflare Pages (static site)
2. **Backend** → Cloudflare Worker (serverless API)

```
┌─────────────────────┐
│ Cloudflare Pages    │
│ (Frontend)          │
│ your-domain.com     │
└──────────┬──────────┘
           │
           │ API calls to /api/trpc
           ▼
┌─────────────────────┐
│ Cloudflare Worker   │
│ (Backend tRPC)      │
│ api.your-domain.com │
└─────────────────────┘
```

---

## Prerequisites

1. Install Wrangler CLI:

   ```bash
   npm install -g wrangler
   ```

2. Login to Cloudflare:

   ```bash
   wrangler login
   ```

3. Set up your database (PostgreSQL) and Redis (Upstash recommended)

---

## Part 1: Deploy Backend (Cloudflare Worker)

### Step 1: Configure Wrangler

Edit `wrangler.toml` and update:

- `account_id` - Your Cloudflare account ID
- `routes` - Your custom domain for the API

### Step 2: Set Environment Variables

The backend API requires:

- `DATABASE_URL` - PostgreSQL connection string
- `UPSTASH_REDIS_REST_URL` - Upstash Redis REST URL
- `UPSTASH_REDIS_REST_TOKEN` - Upstash Redis REST token

**Option A: Manual setup**

Set secrets one by one using Wrangler (you'll be prompted to paste each value):

```bash
# Database
wrangler secret put DATABASE_URL

# Redis
wrangler secret put UPSTASH_REDIS_REST_URL
wrangler secret put UPSTASH_REDIS_REST_TOKEN
```

**Option B: From .env file (one-liners)**

```bash
# Load from .env and pipe to wrangler
source .env && echo "$DATABASE_URL" | wrangler secret put DATABASE_URL
source .env && echo "$UPSTASH_REDIS_REST_URL" | wrangler secret put UPSTASH_REDIS_REST_URL
source .env && echo "$UPSTASH_REDIS_REST_TOKEN" | wrangler secret put UPSTASH_REDIS_REST_TOKEN
```

To view existing secrets:

```bash
wrangler secret list
```

To delete a secret:

```bash
wrangler secret delete SECRET_NAME
```

### Step 3: Deploy the Worker

```bash
# Deploy to production
wrangler deploy

# Or deploy to staging
wrangler deploy --env staging
```

Your API will be available at:

- Development: `https://misorter-api.your-account.workers.dev`
- Production: `https://api.your-domain.com` (with custom domain)

### Step 4: Test the Worker

```bash
curl https://misorter-api.your-account.workers.dev/
```

---

## Part 2: Deploy Frontend (Cloudflare Pages)

### Step 1: Configure Environment Variables

The frontend requires:

- `VITE_API_URL` - URL to your deployed backend API
- `VITE_CLIENT_ID` - OAuth client ID
- `VITE_CLIENT_SECRET` - OAuth client secret

**Option A: Via Cloudflare Dashboard**

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages** → Your Pages project
3. Go to **Settings** → **Environment variables**
4. Add variables for **Production** environment:
   - `VITE_API_URL` = `https://api.your-domain.com`
   - `VITE_CLIENT_ID` = `your_client_id`
   - `VITE_CLIENT_SECRET` = `your_client_secret`
5. Save

**Option B: Via GitHub Integration**

When setting up GitHub integration (see Step 3, Option C), add these environment variables during the setup process.

**Option C: Local .env file (for local builds only)**

Create a `.env.production` file (this won't be used by Pages deployments):

```bash
# Point to your deployed Cloudflare Worker
VITE_API_URL=https://api.your-domain.com

# OAuth for twitch integration with polls
VITE_CLIENT_ID=your_client_id
VITE_CLIENT_SECRET=your_client_secret
```

### Step 2: Build the Frontend

```bash
npm run build
```

This creates a `dist/` folder with your static files.

### Step 3: Deploy to Cloudflare Pages

**Option A: Via Wrangler CLI**

```bash
wrangler pages deploy dist --project-name=misorter
```

**Option B: Via Cloudflare Dashboard**

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages**
3. Click **Create application** → **Pages**
4. Connect your GitHub repo or upload the `dist/` folder
5. Set build settings:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
6. Add environment variables in the Pages settings

**Option C: Via GitHub Integration (Recommended)**

1. Push your code to GitHub
2. In Cloudflare Dashboard → **Workers & Pages**
3. Click **Create application** → **Pages** → **Connect to Git**
4. Select your repository
5. Configure:
   - **Framework preset**: Vite
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
6. Add environment variables:
   - `VITE_API_URL`
   - `VITE_CLIENT_ID`
   - `VITE_CLIENT_SECRET`

Your frontend will be available at:

- `https://misorter.pages.dev` (Cloudflare subdomain)
- `https://your-domain.com` (custom domain)

---

## Part 3: Connect Frontend to Backend

### Update CORS Settings

Edit `worker/index.ts` and update the `Access-Control-Allow-Origin` header:

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://your-domain.com", // Your frontend domain
  // ...
};
```

### Verify the Connection

1. Open your frontend: `https://your-domain.com`
2. Open browser DevTools → Network tab
3. Interact with the app
4. Verify API calls to `https://api.your-domain.com` are successful

---

## Custom Domains

### For the Frontend (Pages)

1. Go to your Pages project
2. Click **Custom domains**
3. Add your domain (e.g., `your-domain.com`)
4. Update your DNS records as instructed

### For the Backend (Worker)

1. Go to your Worker
2. Click **Triggers** → **Custom domains**
3. Add your API subdomain (e.g., `api.your-domain.com`)
4. Update your DNS records as instructed

---

## Environment-Specific Deployments

### Staging Environment

**Backend:**

```bash
wrangler deploy --env staging
```

**Frontend:**

```bash
# Create .env.staging
VITE_API_URL=https://misorter-api-staging.your-account.workers.dev

# Build and deploy
npm run build
wrangler pages deploy dist --project-name=misorter-staging
```

### Production Environment

Use the production steps above.

---

## Monitoring & Logs

### View Worker Logs

```bash
wrangler tail
```

Or in the Cloudflare Dashboard → **Workers & Pages** → Your Worker → **Logs**

### View Pages Deployment Logs

Cloudflare Dashboard → **Workers & Pages** → Your Pages project → **Deployments**

---

## Troubleshooting

### Frontend can't reach backend

1. Check `VITE_API_URL` is set correctly
2. Verify CORS headers in `worker/index.ts`
3. Check Worker logs: `wrangler tail`

### Worker errors

1. Check environment variables are set: `wrangler secret list`
2. View logs: `wrangler tail`
3. Test locally: `wrangler dev worker/index.ts`

### Database connection issues

- Ensure `DATABASE_URL` is set
- Verify your database accepts connections from Cloudflare IPs
- Consider using Cloudflare Workers database (D1) or connection pooling

---

## Cost Estimate

**Cloudflare Workers (Backend):**

- Free tier: 100,000 requests/day
- Paid: $5/month for 10M requests

**Cloudflare Pages (Frontend):**

- Free tier: 500 builds/month, unlimited requests
- Paid: $20/month for unlimited builds

**Total:** Likely **FREE** for small to medium traffic! 🎉

---

## Alternative: Deploy Both on Same Domain

If you want to serve both from the same domain (e.g., `your-domain.com`):

1. Deploy Worker to handle API routes
2. Configure Worker to serve static files from Pages
3. Update `wrangler.toml` routes to handle both

This avoids CORS issues but is more complex.

---

## Need Help?

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [tRPC Fetch Adapter](https://trpc.io/docs/server/adapters/fetch)

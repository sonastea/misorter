# AGENTS Guide

## General Principles

### Type Safety and Error Handling

- Avoid using the `any` type.
- Use `TRPCError` for expected client-facing API failures, and reserve raw thrown errors for unexpected/internal faults.

### Runtime and Infrastructure

- Keep Cloudflare Workers runtime constraints in mind (the app is hosted on Workers): avoid long-lived request-bound I/O assumptions, and follow `src/db/client.ts` by using `getDb()` per request.
- Keep external service clients (for example Redis, Resend, and rate limiters) lazily initialized in module-level getters, and validate required env vars before first use.
- For non-blocking side effects (cache updates, emails, analytics), prefer `ctx.waitUntil(...)` so mutations can return quickly; log and swallow background failures.

### API and Imports

- Validate tRPC inputs with schema-based validation (`zod`/`drizzle-zod`) and derive types from schemas where possible.
- Prefer `@/` path aliases for internal imports instead of long relative paths.

### CSS Consistency

- In `src/styles/globals.css`, keep dark-theme overrides and responsive `@media` rules near their related base styles, and avoid splitting them into distant duplicate sections when possible.

## Project Structure

- `src/client/`: frontend entrypoint and router bootstrap.
- `src/routes/`: TanStack Router file-based routes.
- `src/components/`: reusable UI components.
- `src/styles/globals.css`: global tokens, light/dark theme variables, and shared component classes.
- `src/backend/`: tRPC context and routers.
- `src/server/`: worker-side server handlers.
- `src/utils/`: shared utilities.
- `src/db/`: database schema and data helpers.

## Routing and Generated Files

- Add and update pages under `src/routes/`.
- Do not hand-edit generated route artifacts; treat `src/routeTree.gen.ts` as generated output.

## Styling and Theme Rules

- Follow the existing theme variables from `src/styles/globals.css`.
- Prefer existing color tokens (for example `--color-text-primary`, `--color-bg-secondary`, `--color-text-once`) over hard-coded colors.
- Build light/dark-compatible UI by using existing variables and adding dark overrides when necessary.
- Avoid inline styles for new route screens and components; add prefixed classes in `src/styles/globals.css`.

## Component Rules

- Use `@headlessui/react` primitives for interactive UI (dialogs, tabs, popovers, buttons, fields/inputs).
- Keep behavior in TSX and visual styling in shared CSS classes aligned with existing naming conventions.

## Auth Route Expectations

- For protected routes, validate auth with Supabase `auth.getUser()` instead of cookie existence alone.
- Preserve redirect intent with `/login?redirect=<path>` when access is denied.

## Adding New Environment Variables

When adding new environment variables:

1. Add them to `.env.example` with a descriptive comment
2. Update `DEPLOYMENT.md`:
   - Backend-only vars: add to "Part 1: Deploy Backend" → "Step 2: Set Environment Variables"
   - Frontend vars: add to "Part 2: Deploy Frontend" → "Step 1: Configure Environment Variables"
   - Include both wrangler secret commands and Cloudflare Dashboard instructions

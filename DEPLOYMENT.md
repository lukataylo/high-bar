# High Bar Deployment Guide

## Overview

High Bar is a Next.js application in a pnpm monorepo. The landing page and expert PWA are in `apps/web/`.

## Quick Deploy to Vercel

### 1. Prerequisites
- Node.js 18+ (see `.nvmrc`)
- pnpm 10.25.0
- Vercel account

### 2. Deploy Steps

#### Option A: Deploy via Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from project root
vercel

# Follow prompts to link to Vercel project
# For production deployment:
vercel --prod
```

#### Option B: Deploy via Vercel Dashboard
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the GitHub repository: `lukataylo/high-bar`
3. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (monorepo root)
   - **Build Command**: `cd apps/web && pnpm install && pnpm build`
   - **Output Directory**: `apps/web/.next`
   - **Install Command**: `pnpm install`
4. Add environment variables (see below)
5. Click "Deploy"

### 3. Environment Variables

Add these in Vercel Dashboard → Settings → Environment Variables:

**Required for demo mode:**
```
NODE_ENV=production
```

**Optional (for full functionality):**
```
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
AUTH_SECRET=<generated-with-openssl-rand-base64-32>
```

See `.env.example` for the complete list.

### 4. Custom Domain (Optional)

In Vercel Dashboard → Settings → Domains:
- Add `highbar.dev`
- Add `www.highbar.dev`

The PWA will be accessible at `/pwa`

## Local Development

```bash
# Install dependencies
pnpm install

# Run dev server (web app only)
pnpm dev

# Build all packages
pnpm build

# Lint
pnpm lint

# Type check
pnpm typecheck
```

## Application Structure

```
apps/
  web/              Landing page + Expert PWA (Next.js)
  agent-gateway/    Hermes agent runtime (optional, not needed for web deploy)
  api/              Backend API (optional, not needed for web deploy)
packages/
  core/             Shared domain models
  payments/         Stripe integration
  mcp-expert-network/  MCP server for AI agents
```

## URLs After Deployment

- **Landing page**: `https://your-domain.vercel.app/`
- **Expert PWA**: `https://your-domain.vercel.app/pwa`
- **Ask page**: `https://your-domain.vercel.app/ask`

## Troubleshooting

### Build fails with "Module not found"
Ensure `pnpm install` runs in monorepo root before build:
```bash
pnpm install --frozen-lockfile
cd apps/web && pnpm build
```

### PWA not loading
Check that `apps/web/public/` contains:
- `logo.svg`
- `hero.svg`

### Environment variables not working
1. Ensure variables are added in Vercel Dashboard
2. Redeploy after adding new variables
3. Check variable names match `.env.example`

## Railway Deployment (Alternative)

The project also supports Railway for deploying the full stack:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Deploy
railway up
```

Configure services in `railway.json` (if needed).

## Next Steps

After deploying:
1. Test landing page at root URL
2. Test PWA at `/pwa`
3. Configure custom domain
4. Set up monitoring (Vercel Analytics)
5. Enable Vercel Speed Insights

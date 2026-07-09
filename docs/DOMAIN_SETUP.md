 s# Setting up `highbar.dev` (fast path)

Goal: point `highbar.dev` (apex) and `www.highbar.dev` at the Railway **web** service over HTTPS.

> ⚠️ `.dev` is on the browser **HSTS preload** list — it *only* works over HTTPS. Railway issues TLS certs automatically, so this is handled once DNS resolves. Don't try to serve `.dev` over plain HTTP.

---

## Prerequisites (one-time)
The `apps/web` service must exist in the Railway project `high-bar` and have a deployment. If it doesn't yet, that happens in the deploy step — ping me and I'll create it via the Railway MCP. Once it exists:

## Step 1 — Add the custom domain in Railway
In the Railway dashboard → project **high-bar** → **web** service → **Settings → Networking → Custom Domain**, add:
- `highbar.dev`
- `www.highbar.dev`

Railway shows a **DNS target** for each (looks like `abc123.up.railway.app`). Copy them.

> I can also do this for you with one command once the web service is deployed:
> `railway domain --service web` (or the `generate_domain` MCP tool).

## Step 2 — Add DNS records at your registrar

**The apex (`highbar.dev`) is the tricky part** — classic DNS can't put a `CNAME` on a root domain. Two options:

### Option A — Cloudflare (recommended, free, handles apex cleanly)
1. Add `highbar.dev` to Cloudflare (free plan) → it gives you 2 nameservers.
2. At the registrar where you bought the domain, set the domain's **nameservers** to those Cloudflare ones.
3. In Cloudflare → **DNS**, add:
   | Type | Name | Target | Proxy |
   |------|------|--------|-------|
   | CNAME | `@` (highbar.dev) | `<railway-target-for-apex>` | DNS only (grey cloud) |
   | CNAME | `www` | `<railway-target-for-www>` | DNS only (grey cloud) |
   - Cloudflare "CNAME flattening" makes the apex CNAME legal.
   - **Set proxy to DNS-only (grey cloud)** so Railway can issue its own cert. (You can enable the orange proxy later once everything is verified, with SSL mode = Full.)

### Option B — Registrar with ALIAS/ANAME support (no Cloudflare)
If your registrar supports `ALIAS`/`ANAME` at the root:
| Type | Host | Value |
|------|------|-------|
| ALIAS/ANAME | `@` | `<railway-target-for-apex>` |
| CNAME | `www` | `<railway-target-for-www>` |

If it supports neither, use Option A.

## Step 3 — Wait + verify
- DNS propagation: usually minutes, up to ~1 hour.
- Check: `dig +short highbar.dev` and `dig +short www.highbar.dev` should resolve to the Railway target.
- Railway will flip the domain to **Active** and provision TLS automatically.
- Visit `https://highbar.dev` — should load the app over HTTPS.

## Step 4 — Tell the app its public URL
Add to Railway env (production) for the web + api services:
```
NEXT_PUBLIC_APP_URL=https://highbar.dev
AUTH_URL=https://highbar.dev          # if/when auth is wired
```
And set Stripe webhook + OAuth redirect URLs to the `highbar.dev` origin when those go live.

---

## Quick checklist
- [ ] `apps/web` deployed on Railway
- [ ] Custom domains `highbar.dev` + `www.highbar.dev` added in Railway (targets copied)
- [ ] DNS records added (Cloudflare apex CNAME flattening, or ALIAS at registrar)
- [ ] `dig` resolves both to the Railway target
- [ ] Railway shows domains **Active** with TLS
- [ ] `NEXT_PUBLIC_APP_URL` set
- [ ] `https://highbar.dev` loads

> Want me to drive the Railway side? Once `apps/web` is deployed I can add the domains and read back the exact DNS targets for you to paste at the registrar.

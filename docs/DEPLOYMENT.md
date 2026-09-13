# Deploy game-gift

## Architecture

- **Vercel:** Vite frontend and static game runtime, with `/api/:path*` rewritten to the Render HTTPS origin.
- **Render:** Node 24 LTS Express API. Build with `npm ci --include=dev && npm run build`, start with `npm start`, and health check `/api/health`.
- **Supabase:** PostgreSQL through a server-only connection string, and the private `game-gift-media` storage bucket. The application manages its own accounts and sessions; do not expose its tables through public API policies.

## Required configuration

Create a Supabase project and a **private** `game-gift-media` bucket, allowing JPEG, PNG, WebP, and the audio MIME types accepted by the API. Use a 10 MB object limit. Set the following only on Render:

| Variable                  | Value                                                     |
| ------------------------- | --------------------------------------------------------- |
| NODE_VERSION              | 24                                                        |
| NODE_ENV                  | production                                                |
| DATABASE_URL              | Supabase PostgreSQL session-pooler URL with TLS           |
| APP_ORIGIN                | Exact canonical frontend HTTPS origin; no trailing slash  |
| TRUST_PROXY               | 1 for direct Render; verify forwarding when adding Vercel |
| REGISTRATION_CODE         | Random secret of at least 32 characters                   |
| SUPABASE_URL              | Exact project HTTPS origin                                |
| SUPABASE_SERVICE_ROLE_KEY | Server-only service role credential                       |
| SUPABASE_STORAGE_BUCKET   | game-gift-media                                           |

The storage key never reaches the browser. The API checks asset ownership or active publication before returning private media. Account deletion queues media removal for retry. When switching from local storage to Supabase, migrate all existing objects before setting the storage variables; the application does not copy them automatically.

Without Supabase storage, use a paid Render service with a persistent disk mounted at `/var/data` and `DATA_DIR=/var/data`. Free Render instances have ephemeral filesystems and are unsuitable for local uploaded media. Free services also sleep; choose an always-on plan for production latency.

## Vercel routing

Run `node scripts/configure-vercel.mjs https://YOUR-API.onrender.com` after creating the backend. This validates the backend URL and writes `vercel.json` with the API proxy, SPA fallback, and security headers. Deploy the repository as a Vite project (build `npm run build`, output `dist`). Set Render's `APP_ORIGIN` to the canonical Vercel/custom domain and verify authentication through that exact domain. Do not trust arbitrary preview origins.

Vercel external rewrites keep API calls on the browser's origin: [official routing documentation](https://vercel.com/docs/routing/rewrites).

## Optional integrations

Set `OPENAI_API_KEY` and `OPENAI_MODEL` on Render to enable reviewed AI changes. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to enable Google login, with the redirect URI `https://YOUR-FRONTEND/api/auth/google/callback`. New accounts still require an invitation and recovery password. Live provider flows require verification with configured credentials.

## Release checklist

Run unit/API tests, the production build, formatting checks, and desktop/mobile browser tests before deploying. Verify the live health endpoint, signup, save/reopen, media upload, publish/play/unpublish, and logs. Check that private media returns 404 to a different account. Confirm media survives a backend restart. Back up PostgreSQL and the storage bucket independently and test restoration.

This release supports invitation-only creator workspaces. Public self-service billing, automated password recovery, abuse reporting, distributed rate limits, and multiple API replicas require additional implementation.

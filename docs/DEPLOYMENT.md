# Deploy Gamegift

## Architecture

- **Vercel:** Vite frontend and static game runtime, with `/api/:path*` rewritten to the Render HTTPS origin.
- **Render:** Node 24 LTS Express API. Build with `npm ci --include=dev && npm run build`, start with `npm start`, and health check `/api/health`.
- **Supabase:** Email/password authentication, PostgreSQL through a server-only connection string, and the private `game-gift-media` storage bucket. The browser uses only the public anon/publishable key; the API verifies each bearer token with Supabase and owns all application data access.

## Required configuration

Create a Supabase project and a **private** `game-gift-media` bucket, allowing JPEG, PNG, WebP, and the audio MIME types accepted by the API. Use a 10 MB object limit. Set the following only on Render:

| Variable                  | Value                                                         |
| ------------------------- | ------------------------------------------------------------- |
| NODE_VERSION              | 24                                                            |
| NODE_ENV                  | production                                                    |
| DATABASE_URL              | Supabase PostgreSQL session-pooler URL with TLS               |
| DATABASE_SSL_CA           | Optional mounted CA path; bundled certificate is the fallback |
| DATABASE_SSL_CA_PEM       | Optional full PEM value; escaped `\\n` is supported           |
| APP_ORIGIN                | Exact canonical frontend HTTPS origin; no trailing slash      |
| TRUST_PROXY               | 1 for direct Render; verify forwarding when adding Vercel     |
| SUPABASE_URL              | Exact project HTTPS origin                                    |
| SUPABASE_ANON_KEY         | Public anon/publishable key used by browser auth              |
| SUPABASE_SERVICE_ROLE_KEY | Server-only service role credential                           |
| SUPABASE_STORAGE_BUCKET   | game-gift-media                                               |

The service-role storage key never reaches the browser. The anon/publishable key is intentionally public. The API checks asset ownership or active publication before returning private media. Account deletion queues media and Supabase Auth user removal for retry. When switching from local storage to Supabase, migrate all existing objects before setting the storage variables; the application does not copy them automatically.

Without Supabase storage, use a paid Render service with a persistent disk mounted at `/var/data` and `DATA_DIR=/var/data`. Free Render instances have ephemeral filesystems and are unsuitable for local uploaded media. Free services also sleep; choose an always-on plan for production latency.

## Supabase Auth

1. In **Authentication > Providers > Email**, enable email/password signup and require email confirmation. Disable anonymous sign-ins.
2. In **Authentication > URL Configuration**, set Site URL to `https://game-gift.shop`. Add exact redirect URLs `https://game-gift.shop/auth/callback` and `http://localhost:5173/auth/callback` (development only). In the confirmation email template, use `{{ .RedirectTo }}` rather than `{{ .SiteURL }}` so the email honors the callback selected by the app.
3. In **Authentication > Providers > Google**, enable Google and add the client ID and secret from Google Cloud. In Google Cloud, use the Supabase callback shown on that provider page (normally `https://<project-ref>.supabase.co/auth/v1/callback`) as the authorized redirect URI; do not use the Gamegift callback there.
4. Configure custom SMTP before launch and enable CAPTCHA/bot protection for public signup.
5. Put `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` on Render. Never put the service-role key on Vercel or in a `VITE_` variable.
6. Keep `AUTH_PROVIDER=supabase`. Production validation rejects legacy auth, and legacy login/registration endpoints return 404 in this mode.

The studio obtains public Supabase configuration from `/api/config`, so Vercel needs no duplicate Supabase variables. Confirmation and Google OAuth links return to `/auth/callback`; the SPA consumes the Supabase response, moves the signed-in user to `/my-games`, and sends the access token with API requests.

## Custom domain: game-gift.shop

The canonical domain belongs to the Vercel frontend; keep the Render `onrender.com` URL as the API proxy target in `vercel.json`.

1. Add `game-gift.shop` under the Vercel project's **Settings > Domains**. Add `www.game-gift.shop` and redirect it to the apex domain.
2. Run `vercel domains inspect game-gift.shop` and create the exact DNS records it reports at your DNS provider. The general defaults are apex `A @ 76.76.21.21` and `CNAME www cname.vercel-dns-0.com`, but project-specific values win.
3. Wait for Vercel to verify DNS and issue TLS, then assign `game-gift.shop` to the production deployment.
4. On Render set `APP_ORIGIN=https://game-gift.shop` and, if used, `CORS_ORIGINS=https://game-gift.shop`—without trailing slashes.
5. Redeploy Render and Vercel. Through the custom domain, verify `/api/health`, signup confirmation, sign-in, media upload, and a published `/play/...` link.

## Vercel routing

Run `node scripts/configure-vercel.mjs https://YOUR-API.onrender.com` after creating the backend. This validates the backend URL and writes `vercel.json` with the API proxy, SPA fallback, and security headers. Deploy the repository as a Vite project (build `npm run build`, output `dist`). Set Render's `APP_ORIGIN` to `https://game-gift.shop` and verify authentication through that exact domain. Do not trust arbitrary preview origins.

Vercel external rewrites keep API calls on the browser's origin: [official routing documentation](https://vercel.com/docs/routing/rewrites).

## Optional integrations

Set `OPENAI_API_KEY` and `OPENAI_MODEL` on Render to enable reviewed AI changes. Google/legacy authentication is intentionally disabled in production; Supabase Auth is the only sign-in path.

## Release checklist

Run unit/API tests, the production build, formatting checks, and desktop/mobile browser tests before deploying. Verify the live health endpoint, signup, save/reopen, media upload, publish/play/unpublish, and logs. Check that private media returns 404 to a different account. Confirm media survives a backend restart. Back up PostgreSQL and the storage bucket independently and test restoration.

Anyone can create a creator account. Public self-service billing, automated password recovery, abuse reporting, distributed rate limits, and multiple API replicas require additional implementation.

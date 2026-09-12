# Deploy from GitHub to your domain

Recommended setup: **GitHub Actions → Render Node web service → Supabase PostgreSQL**. The same Render service serves the React build, API, sessions, and uploaded media. Google sign-in is implemented directly in the API. Supabase supplies the database; you do not need Supabase Auth or a Supabase service-role API key.

No local Docker, Caddy, or database containers are required. Render requires a paid service for the persistent upload disk. Keep one instance: uploads and pending Google sign-ins are local to that instance.

## 1. Push the code

The repository is `https://github.com/pundarikaksha7/game-gift`. Use Node 24 or newer locally.

```sh
npm ci
npm run check
npm run format:check
npm run test:e2e
git add .
git commit -m "Guide game creation and add managed deployment"
git push origin main
```

Never add `.env` or `.data`; both are ignored. If this change has already been committed and pushed, skip the commit commands. The GitHub check job validates the app, browser workflow, and PostgreSQL migrations. The deployment job requires the production secret configured in step 4; its first run will fail clearly until that secret exists.

## 2. Create Supabase PostgreSQL

1. Create a Supabase project in a region close to your Render service and save its database password.
2. In the project **Connect** dialog choose **Session pooler** (port **5432**, IPv4 compatible). Copy the exact connection URI, replacing the password placeholder with your URL-encoded database password. Do not use the transaction pooler on port 6543.
3. Append `?sslmode=verify-full` (or `&sslmode=verify-full` when the URI already has query parameters). If your project requires a custom CA, configure the Supabase CA with `NODE_EXTRA_CA_CERTS`; do not disable certificate verification.
4. **Disable the Supabase Data API** in the project's API settings for this dedicated project. This app accesses Postgres only from its server, and its migrations create application tables in the default schema. Do not expose those tables through a public REST API. No browser database credentials are needed.
5. Set this URI as `DATABASE_URL` in Render. The API runs versioned migrations on startup. Existing local SQLite games do not automatically migrate; export their data and upload media again on the hosted account.

Reference: [Supabase database connections](https://supabase.com/docs/guides/database/connecting-to-postgres).

## 3. Create the hosted Node service

1. In Render choose **New → Blueprint**, connect GitHub, and select `pundarikaksha7/game-gift`, branch `main`. Render reads `render.yaml`.
2. Confirm the paid plan and 1 GB persistent disk. Set `DATABASE_URL` from step 2. For `APP_ORIGIN`, enter the exact assigned HTTPS service origin, for example `https://gamegift-studio-xxxx.onrender.com`, without a trailing slash. If the assigned URL is not yet available, set a placeholder, then replace it with the assigned origin and redeploy before signing in.
3. Leave `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` empty until step 6, or enter existing web-client credentials. The sign-in button appears only when both are configured.
4. The blueprint generates `REGISTRATION_CODE`. Copy it privately from Render's environment settings; new users need it to register, including through Google. Keep `TRUST_PROXY=1`, `DATA_DIR=/var/data`, and `NODE_ENV=production`.
5. Build command: `npm ci --include=dev && npm run build`. Start command: `npm start`. Runtime: Node 24. Health path: `/api/health`. Render sets `PORT` automatically. Do not change the runtime to Docker or Static Site.
6. Check the deployment logs and open `https://YOUR-SERVICE.onrender.com/api/health`; expect `{"ok":true}`. Create an invited account, upload a PNG, save a game, publish it, and open the link in a private browser window.

The blueprint turns off automatic deployments, so subsequent application deployments come from the checked GitHub Actions workflow. The initial Blueprint creation provisions and deploys the service once.

References: [Render web services](https://render.com/docs/web-services), [persistent disks](https://render.com/docs/disks), [Blueprint configuration](https://render.com/docs/blueprint-spec).

## 4. Wire GitHub Actions to Render

1. Render service → **Settings → Deploy Hook**: copy its secret URL.
2. GitHub repository → **Settings → Environments → New environment**: name it `production`. Limit deployment branches to `main`.
3. Add environment secret **`RENDER_DEPLOY_HOOK_URL`** containing the complete URL.
4. Push a commit to `main`. `.github/workflows/ci.yml` runs tests and the production build, then triggers Render with that exact checked commit SHA. Pull requests run checks without deploying.
5. GitHub Actions → **Gamegift checks**: confirm the check and deploy jobs succeed. Then confirm the matching commit becomes **Live** in Render. A successful hook request means deployment was requested; it does not prove the subsequent Render build finished.

Do not put the deploy hook in source code. If a deploy fails, inspect Render logs and redeploy the last working commit in Render. Database migrations are forward-only: inspect schema compatibility before rolling back application code. Back up Supabase and the Render media disk independently; a database backup does not include uploaded images/audio.

Reference: [Render deploy hooks and GitHub Actions](https://render.com/docs/deploy-hooks).

## 5. Connect a domain

1. Buy or use a domain you control. Start with a subdomain such as `games.example.com`.
2. Render service → **Settings → Custom Domains → Add Custom Domain**: enter `games.example.com`.
3. At your DNS provider add a **CNAME** record with name `games` and value `YOUR-SERVICE.onrender.com` (no `https://` and no path). For an apex domain, follow Render's displayed ALIAS/ANAME or A-record instructions instead.
4. Return to Render, verify DNS, and wait for the HTTPS certificate to become active.
5. Change Render's `APP_ORIGIN` to `https://games.example.com` and redeploy. Use this as the canonical app URL thereafter. Requests from a different production origin are intentionally rejected.
6. Add the custom-domain Google callback URI in step 6 before testing Google sign-in on this domain.

References: [custom domains](https://render.com/docs/custom-domains), [DNS records](https://render.com/docs/configure-other-dns), [managed HTTPS](https://render.com/docs/tls).

## 6. Enable Google sign-in

1. Open Google Cloud Console, select/create a project, then configure **Google Auth Platform** branding, audience, and contact details. In testing mode, add your intended Google accounts as test users.
2. Create an **OAuth client ID → Web application**.
3. Add these exact **Authorized redirect URIs**, replacing the example host:
   - `http://localhost:5173/api/auth/google/callback`
   - `https://YOUR-SERVICE.onrender.com/api/auth/google/callback`
   - `https://games.example.com/api/auth/google/callback`
4. Copy the client ID and secret to Render's `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, then redeploy. For local testing, put them in the ignored `.env`, keep `APP_ORIGIN=http://localhost:5173`, restart `npm run dev`, and open that exact URL.
5. Open the app's sign-in dialog. For the first Google registration, fill a recovery password of at least 10 characters and the invitation code, then choose **Continue with Google**. Returning Google users can switch to **Sign in** and use the button without a password.
6. Complete consent in a regular browser. The server validates a one-time, browser-bound OAuth state, exchanges the code, verifies Google's email, and creates the app's HTTP-only session. The recovery password supports password login, password changes, and account deletion.
7. Existing password accounts are not automatically linked by matching email; use their existing password login. This avoids silently changing ownership. Google sign-in state expires after 10 minutes or an app restart; simply restart sign-in if needed.
8. Before a public launch, complete Google's audience/publication requirements for your app. This application still uses invitations; publishing a Google consent screen does not remove the invitation requirement.

Do not configure Supabase's Google provider for this implementation: it uses Google's web-server OAuth flow directly. Switching to Supabase Auth would require migrating the app's sessions and account ownership.

References: [Google web-server OAuth](https://developers.google.com/identity/protocols/oauth2/web-server), [Google identity profile](https://developers.google.com/identity/openid-connect/reference).

## Local sign-in troubleshooting

```sh
nvm use 26 # or any installed Node 24+ version
npm ci
# Only if .env does not exist:
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`. Local SQLite and uploads remain in `.data`. The API runs on 3001; Vite forwards `/api` requests. Development accepts exact HTTP loopback origins (`localhost`, `127.0.0.1`, and IPv6 loopback), including alternate ports. Vite now fails clearly if 5173 is occupied rather than silently choosing another port. Stop the old dev process if needed. Production still accepts only `APP_ORIGIN` and requires the app request header for writes.

## Other hosting choices

Railway can run the Node app with a persistent volume and Supabase connection; configure the same build/start commands and variables, then use a Railway-specific GitHub Actions deployment. The included workflow is for Render only. A static-only host cannot run this Express API. Deploying to Vercel/Netlify functions would first require moving uploads to object storage and adapting the server lifecycle and OAuth-state storage. Supabase alone hosts the database/auth/storage services, not this Node app.

## Verification and limits

Run `npm run check`, `npm run format:check`, and `npm run test:e2e` before pushing. CI also runs HTTP integration tests against PostgreSQL. Live Google consent and an actual Render/Supabase deployment require your credentials and must be verified after configuration. A deploy hook returning success is not a completed deployment.

Levels still use a continuous floor and predefined platformer rules. Playtest every chapter: the editor does not prove reachability. Account recovery by email, distributed rate limiting, shared object storage, automatic backups, and multi-instance hosting are not implemented. Operators can reset a recovery password using `npm run account:reset -- email@example.com` from the service shell.

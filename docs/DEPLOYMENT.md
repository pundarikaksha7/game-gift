# Deployment and operations

## 1. Prepare a server

Use a Linux server with Docker Engine and Docker Compose v2. Point an owned domain's A/AAAA records at it. Allow inbound TCP 80/443 (and optionally UDP 443 for HTTP/3). Do not expose PostgreSQL or the application's port directly. Keep this directory as the application's repository/build root.

The included Caddy configuration obtains and renews TLS certificates and redirects HTTP to HTTPS when the hostname resolves correctly. See [Caddy automatic HTTPS](https://caddyserver.com/docs/automatic-https).

## 2. Configure

```sh
cp .env.production.example .env
openssl rand -hex 32
```

Edit `.env`: set `DOMAIN` to your hostname and `POSTGRES_PASSWORD` to the generated value. Generate a second random value with `openssl rand -hex 32` for `REGISTRATION_CODE`. Production refuses to start without an invitation code of at least 32 characters. Give this code only to invited creators; public game visitors do not need it. The password is interpolated into a PostgreSQL URI, so use the recommended hexadecimal format. Leave AI values blank initially. Protect the file with `chmod 600 .env` and keep it out of Git and image builds.

Compose passes variables explicitly into containers; `.env` by itself is used for interpolation. See [Compose environment precedence](https://docs.docker.com/compose/how-tos/environment-variables/envvars-precedence/).

## 3. Build and start

```sh
npm ci
npm run check
# On the deployment server:
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 app
```

Node 24 is required when running tests outside Docker. The build container includes Node 24. Migrations run transactionally at application startup; PostgreSQL uses an advisory lock to coordinate migrations.

Visit `https://YOUR_DOMAIN/api/health`; expect `{"ok":true}`. Visit the root URL, register with your invitation code, save a test adventure and reopen it under **My games**. Publish that test game and verify its link in a signed-out browser.

Persistent volumes:

- `database`: PostgreSQL data.
- `media`: normalized image/audio files, mounted at `/app/.data`.
- `certificates` and `caddy_config`: Caddy state.

Never use `docker compose down -v` on an installation whose data you want to keep.

## 4. Enable optional AI

Set `OPENAI_API_KEY` and `OPENAI_MODEL` in the server `.env`. Choose a model available to your account that supports Responses and Structured Outputs. Restart with `docker compose up -d app`. Keys never go into frontend variables, game documents or browser bundles.

The implementation uses the [official Structured Outputs contract](https://developers.openai.com/api/docs/guides/structured-outputs), a 45-second timeout, no tools, `store:false`, at most 30 changes, and independent application validation. The current game text and user prompt are sent to the provider when **Suggest changes** is pressed; uploaded media bytes are not sent. `store:false` is not a blanket zero-retention guarantee. Review your provider's data terms for your deployment.

The app currently allows 20 AI requests/hour/IP. Configure an independent provider project spending cap. Rate limiting is process-local, so deploy one application instance unless you replace the limiter with a shared store.

## 5. Staging acceptance checklist

- [ ] Run `npm run check` and `npm run format:check` on Node 24.
- [ ] Set `TEST_DATABASE_URL` to a disposable PostgreSQL database and run `npm test`. Its role needs permission to create/drop schemas.
- [ ] Register two accounts; verify each sees only its own projects and private media.
- [ ] Edit each of the five content categories. Save, reload, reopen and verify.
- [ ] Upload valid art and audio; try an unsupported file and an oversized image.
- [ ] Open a project in two tabs and confirm a stale save reports a conflict.
- [ ] Restore a historical version, save it and verify a new revision appears.
- [ ] Play all chapters on desktop and a real touch device; verify audio after a user gesture.
- [ ] Publish, change the draft, verify the public link remains unchanged, then republish.
- [ ] Unpublish and verify both the public game and exclusively public asset access disappear.
- [ ] Check Secure/HttpOnly/SameSite cookies and HTTPS behavior behind your actual proxy.
- [ ] Test AI success, provider refusal/error/timeout, review, undo, and stale proposals using a live configured model.
- [ ] Restart containers and verify data/media survive.
- [ ] Complete the backup/restore drill below and configure external health monitoring.

Validation includes SQLite HTTP integration, production configuration guards, content/AI constraints, physics, TypeScript compilation, production frontend build, and a Playwright desktop/mobile acceptance suite (`npm run test:e2e` after `npx playwright install chromium`). CI also exercises PostgreSQL. Container deployment, real TLS, a restore drill, physical touch devices, and paid live AI must be verified in staging.

## 6. Backups and restore

Back up **both** PostgreSQL and media; database-only backups do not include character art or sound files. Run these from the application root. A brief write outage gives a consistent pair:

```sh
mkdir -p backups
chmod 700 backups
docker compose stop app
docker compose exec -T db pg_dump -U gamegift -d gamegift -Fc > backups/gamegift.dump
docker compose run --rm --no-deps --entrypoint tar app -C /app/.data -czf - uploads > backups/media.tar.gz
docker compose start app
```

Ensure `app` is restarted even if a backup command fails. Encrypt and copy backups off the server, rotate them according to your retention policy, and alert on backup failures. Database dumps contain account records and private game content. See [PostgreSQL SQL dump documentation](https://www.postgresql.org/docs/current/backup-dump.html).

Restore first into a fresh, isolated deployment with empty database and media volumes:

```sh
docker compose up -d db
docker compose exec -T db pg_restore -U gamegift -d gamegift --no-owner --exit-on-error < backups/gamegift.dump
docker compose run --rm --no-deps --entrypoint tar app -C /app/.data -xzf - < backups/media.tar.gz
docker compose up -d
```

Use the same application version that created the backup, then test before upgrading. Never test restoration against a live production database. JSON exports from the studio are a convenience; they are not a substitute for these backups.

## 7. Updates

Back up first. Review and append migrations rather than changing previously applied ones. Run tests, then `docker compose up -d --build app`. Check health and logs. Image tags currently pin major releases; pin tested image digests for reproducible production releases. Roll back the application image only if it is compatible with the installed schema; otherwise restore the matching database/media backup into a separate deployment and switch traffic after verification.

## Other hosting arrangements

A container host may run this app with a managed PostgreSQL database and a persistent volume mounted at `DATA_DIR`. Set:

| Variable                         | Value                                                                      |
| -------------------------------- | -------------------------------------------------------------------------- |
| `NODE_ENV`                       | `production`                                                               |
| `DATABASE_URL`                   | Provider connection URI, with TLS verification as required by the provider |
| `APP_ORIGIN`                     | Exact public HTTPS origin, no trailing slash                               |
| `DATA_DIR`                       | Persistent writable mount                                                  |
| `PORT`                           | Host-assigned HTTP port                                                    |
| `TRUST_PROXY`                    | Exact number of trusted reverse-proxy hops                                 |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | Optional, server-only                                                      |

Do not set `TRUST_PROXY` blindly or expose the API around the proxy. Keep certificate verification enabled for external databases. Configure a CA through your provider's supported Node/PostgreSQL settings if required.

## Public-launch work still required

This release supports controlled deployments, not every operational feature of a mature consumer SaaS. Production is invitation-only. Before open public registration, integrate verified email recovery or a managed identity provider, moderation/reporting, centralized monitoring, and independent security/accessibility testing. Password change and account deletion are available in My games → Account settings. Deletion revokes access immediately and queues physical media removal; maintenance retries every minute, 100 files per batch. Monitor maintenance errors. Backups retain deleted data until your backup retention expires. Media quotas are 100 MB/account with 10 MB/request; each account can have 50 projects and each project retains its latest 100 revisions. The history UI shows the latest 50 versions. Disk and database growth need monitoring.

Images are decoded with a 16-megapixel cap, resized within 2048×2048, and re-encoded to WebP. Audio is signature-checked and size-limited; malformed audio may fail to play, and codec support varies by browser. No transcoding service is included. Published games and their referenced assets are accessible to anyone with the link. Unpublishing prevents future origin requests but cannot revoke copies someone already downloaded.

## Invited-account recovery

Verify the person's identity using your existing private relationship, then run on the server:

```sh
docker compose exec app npm run account:reset -- user@example.com
```

This generates a random password and revokes all existing sessions. The command prints the new password once: deliver it through a private channel and ask the person to change it in Account settings. Do not send it to an unverified email claimant or save the command output in shared logs. The app does not claim to verify email ownership.

## Browser acceptance suite

```sh
npm run build
npx playwright install chromium
npm run test:e2e
```

The suite starts a temporary SQLite-backed server on port 4173, uses a test invitation, and exercises desktop/mobile registration, editing, persistence, publication, signed-out play, unpublishing, password changes and deletion. It never connects to the configured production database. On a workstation with Chrome installed, `PLAYWRIGHT_CHROME_PATH` can select its executable instead of downloading Chromium.

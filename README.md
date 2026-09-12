# Gamegift Studio

A personal game maker inspired by platformer. Create a little adventure with your own cast, chapters, messages, soundtrack, and movement.

## Run locally

Requires **Node.js 24+** (the API uses `node:sqlite`). Your machine's default Node 16 is too old; select Node 24 with your version manager first.

```sh
npm ci
cp .env.example .env
npm run dev
```

Open **http://localhost:5173**. The API runs on port 3001. SQLite and uploaded media live in `.data/`. Environment files are loaded by the Node launch scripts. No API key or external database is needed locally.

Explore as a guest; a valid guest draft is stored on that browser. Create an account to save projects and upload assets. Click **Save** explicitly to persist an account's changes to the database. **My games** reopens saved projects. Edits are not silently cloud-saved. The toolbar provides undo, redo, history, and game-data export.

## What works

- Guided builder: game settings → characters → levels → story → sounds → animations → review and share. Back/Next navigation preserves your draft.
- Movement presets, adjustable speed/jump/gravity/health, and optional double/triple jumps.
- Chapter background PNG/JPEG/WebP uploads, plus meadow, sunset, and midnight starter atmospheres.
- Optional Google OAuth sign-in with invitation-protected registration and a recovery password.

- Character editor: custom names, hero/friend/enemy roles, uploaded art, scale and accent colors. Exactly one playable hero; enemy appearances cycle through enemy characters, and all friends appear near the goal.
- Level editor: add/remove/reorder up to 12 chapters, choose atmosphere, set length and enemies, place platforms visually, edit coordinates and moving-platform behavior.
- Story editor: opening, chapter introductions and conclusions, and a personalized ending.
- Audio editor: background music and jump/hit/win sounds, volume, playback, uploads and reset. Procedural effects are provided when no clip is uploaded.
- Animation editor: bounce/float presets, speed, squash/stretch, and a custom hero animation made from up to 24 uploaded frames. Frame order is upload order; delete and re-add to change it.
- Shared canvas engine: fixed-step physics, collision, jumping, combat, enemy encounters, moving platforms, chapter progression, keyboard and touch controls.
- Accounts, password hashing, HTTP-only sessions, owner-scoped authorization, append-only revisions, optimistic concurrency, and published snapshots.
- Optional AI proposals: a server-side Responses API integration with an allowlist of editable paths, schema validation, review, stale-proposal checks and undo. It edits **game data**, not executable application code.

## Code map

| Folder                                 | Responsibility                                       |
| -------------------------------------- | ---------------------------------------------------- |
| `shared/schema.ts`                     | Versioned content contract and bounded AI changes    |
| `shared/template.ts`                   | Starter adventure and chapter factory                |
| `src/components/editors/`              | One component per content editor                     |
| `src/components/GameCanvas.tsx`        | Simulation lifecycle and input integration           |
| `src/engine/`                          | Rendering, physics, collision and audio              |
| `src/App.tsx`                          | Studio shell, project state and workflows            |
| `server/app.ts`                        | Authentication, projects, assets and publication API |
| `server/db.ts`, `server/migrations.ts` | SQLite/PostgreSQL persistence and migrations         |
| `server/ai.ts`                         | Constrained AI provider integration                  |
| `tests/`                               | Schema, physics and HTTP integration tests           |

## Deploy

Follow [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for exact GitHub Actions → Render → Supabase deployment steps, domain DNS, and Google sign-in setup. `render.yaml` provisions a native Node service with a persistent media disk. Local development needs no Docker.

## Verify

```sh
npm run check
npm run format:check
npx playwright install chromium
npm run test:e2e
```

The HTTP suite tests authorization, invalid input, concurrent writes, history, asset privacy, publication isolation, CSRF, and logout using a disposable SQLite database. Set `TEST_DATABASE_URL` to an isolated PostgreSQL test database to run the same tests against PostgreSQL; tests create and remove their own temporary schema. Never use a production database for tests.

## Scope and launch status

This is a working, production-oriented first release, **not a claim of a security-audited public SaaS**. It recreates the original's core platformer/combat idea in a modular engine; its bespoke boss fight, power-ups, cinematic events and specific three-stage layouts have not been ported. Levels currently have a continuous floor; this editor does not author ground holes or new gameplay scripts.

Production registration requires a private invitation code. Account settings support password changes and permanent account deletion; operators can recover invited accounts using `npm run account:reset -- email@example.com`. Before opening registration to the general public, add verified email recovery and abuse/reporting workflows; run the staging checklist and a security/accessibility review. Horizontal scaling requires shared object storage and a distributed rate-limit store. Backups and restore drills are an operator responsibility. See the deployment guide for concrete boundaries.

The AI integration requires your provider credentials and a compatible model, and has not been exercised against a paid live model in this workspace. A proposal passing validation is not a proof of level reachability or fun: playtest before publishing. Asset exports contain references, not bundled media; they are intended for backup/import on the same server and account.

Projects are limited to 50 per account and the latest 100 revisions per game. Account deletion immediately revokes sessions and public links, then removes uploaded files through a retryable maintenance queue. My games includes game deletion and Account settings.

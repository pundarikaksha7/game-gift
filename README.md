# Gamegift

A multi-project builder for creating, playtesting, and publishing interactive adventures. Start with an exploration game, a story journey, or an arcade challenge; customize the cast, level layouts, physics, encounters, audio, and narrative. Projects use a declarative content schema and a reusable runtime.

## Development

Use Node.js 24 LTS or newer. The repository includes `.nvmrc`, so nvm users can run `nvm use`.

```sh
npm ci
cp .env.example .env
npm run dev
```

Open http://localhost:5173. The Express API runs on port 3001. Without cloud credentials, SQLite and uploads are stored in `.data/`. Guest drafts stay in the browser. Accounts use Google through Supabase Auth; there is no email/password sign-in path.

## Workspace

- Responsive editor and live preview, camera controls, placement grid, and chapter selection.
- Three independent starter templates and multi-project management.
- Custom character art, individual animation frames, combat attributes, and procedural fallbacks.
- Up to 12 chapters with moving platforms, pits, optional crossings, power-ups, and configurable bosses.
- Keyboard and touch playtesting, chapter progression, retry, and final messages.
- Undo/redo, validated JSON import/export, the latest 100 saved revisions, and optimistic concurrency.
- Google-only Supabase authentication, remotely verified bearer sessions, owner-scoped uploads, rate limits, and published snapshots.
- Authenticated JSON exports and stable public links shaped as `/play/{user-id}/{public-project-uuid}`.
- Optional private Supabase object storage and PostgreSQL persistence.
- Optional reviewed AI proposals, enabled by server-side provider credentials.

## Verification

```sh
npm run check
npm run format:check
npm run test:e2e
```

Browser tests cover desktop/mobile creation, editing, persistence, publish/play/unpublish, account management, template switching, viewport updates, and overflow. API tests cover Google-only authentication enforcement, account isolation, authenticated exports, namespaced public URLs, invalid data, media access, revisions, and concurrency. Set `TEST_DATABASE_URL` only to an isolated test PostgreSQL database; the suite creates its own temporary schema.

## Deployment

See [deployment guide](docs/DEPLOYMENT.md). The intended topology is Vercel for the frontend, Render for the API, and Supabase for Google authentication, PostgreSQL, and a private media bucket. Vercel proxies `/api` to Render so application requests and media remain on the same browser origin. The Render service can also serve the complete app directly.

Anyone with a supported Google account can create a creator profile. Billing, team roles, abuse reporting, and distributed rate limits are not implemented. Playtest authored levels before publishing; schema validation does not establish reachability. Gamegift exports bundle creator-uploaded media so they can be imported without depending on the original private asset URLs. Configure database/storage backups before a public launch.

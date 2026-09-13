# game-gift implementation checklist

## Architecture inspection
- [x] Read application, schemas, database/migrations, auth, storage, AI, tests and deployment files.
- [x] Preserve pre-existing uncommitted changes, React/Vite, both engines, SQL adapter, revisions, ownership and immutable public snapshot boundary.
- [x] Decision: legacy sessions remain development-only; production uses Supabase Auth with server-validated bearer tokens. Existing accounts are not linked by email automatically.
- [ ] Central API origin and secure browser media resolution.
- [ ] Supabase signup/login/verification/recovery/logout/deletion/session restoration.
- [ ] Stateless private storage, project metadata and durable deletion cleanup.
- [ ] Append SaaS migrations with RLS, products, orders, entitlements, webhook events, reports and AI usage.
- [ ] Razorpay server-priced checkout, capture verification and idempotent raw-body webhooks.
- [ ] Publish entitlement gate, stable randomized slugs, public game page and completion CTA.
- [ ] Dynamic share metadata and Vercel/Render configuration.
- [ ] Resend, PostHog and Sentry integration/configuration.
- [ ] Security regression tests, build and browser verification.
- [ ] Document setup, local workflow, provider test checklist and deployment prerequisites.
- [ ] Live provider credentials, DNS and deployment verification (external configuration required).

Canonical frontend: https://game-gift.shop. API origins are deployment configuration, including staging. Requirements after the truncated section 16 are pending.

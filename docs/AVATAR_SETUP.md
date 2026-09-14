# Avatar system setup

## REQUIRED BEFORE LOCAL TESTING

No asset download is required. The curated CC0 production subset and manifest are committed under `public/avatars/`.

Optional reproducibility check:

- Download Kenney Modular Characters from https://kenney.nl/assets/modular-characters
- Extract the archive.
- Run `npm run avatars:import -- /absolute/path/to/kenney_modular-characters/PNG`
- Success: `public/avatars/manifest.json` is recreated and the command reports 59 stable avatar options.

## REQUIRED SUPABASE CHANGES

No Supabase schema change is required. Avatar configuration is part of the existing versioned `game` document stored on the owned `projects` record. Existing API ownership checks and RLS posture are unchanged. The server validates all IDs with Zod before save and publish.

## REQUIRED ENVIRONMENT VARIABLES

No new environment variables required.

## REQUIRED VERCEL ACTIONS

No configuration changes required. Deploy the repository normally; Vite includes `public/avatars/` as static assets and Vercel serves them through its edge CDN. `vercel.json` applies long shared-cache headers to avatar images and a shorter revalidation window to the manifest.

## REQUIRED RENDER ACTIONS

No configuration changes required. Deploy the repository normally.

## REQUIRED PRODUCTION DATABASE ACTIONS

No migration is required for this implementation. Existing JSON game documents remain backward compatible because `character.avatar` is optional.

## ASSET LICENSING

Only the Kenney Modular Characters CC0 pack is used. Exact source paths and normalized usage are recorded in `docs/ASSET_LICENSES.md`; a copy of the pack license is shipped at `public/avatars/KENNEY-CC0.txt`.

## VERIFICATION CHECKLIST

- [ ] Open a project and select Characters.
- [ ] Change hairstyle and hair color; confirm the preview updates immediately.
- [ ] Change skin, eyes, smile, top, bottom, and shoes.
- [ ] Pick several presets and use Randomize.
- [ ] Press Save character, then save the adventure.
- [ ] Refresh and reopen the project; confirm the avatar remains selected.
- [ ] Start the game; confirm the customized hero appears.
- [ ] Publish and open the public game URL.
- [ ] Test the creator and game in a narrow/mobile viewport.
- [ ] Upload a character image and confirm it still overrides the modular avatar.

## Architecture and limitations

The picker uses precomposed WebP thumbnails, so opening a category does not create dozens of layered avatar renderers. The live editor loads trusted manifest layers once and `composeAvatar()` caches a single 260×350 PNG data URL; the canvas engine draws that same single texture. V1 uses the game's existing procedural bob, tilt, squash, and attack effects rather than skeletal limb animation. The selected Kenney pack has no meaningful accessory layer, so the UI intentionally does not expose an empty Accessories category.

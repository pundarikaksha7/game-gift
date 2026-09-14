# Avatar asset provenance

Verified: 2026-09-14

## Kenney Modular Characters

- Source: Kenney
- Pack: Modular Characters
- URL: https://kenney.nl/assets/modular-characters
- License: Creative Commons CC0 1.0 (public domain dedication; no attribution required)
- Official archive used: `kenney_modular-characters.zip`, downloaded from the pack's official Kenney download link
- Production location: `public/avatars/`
- Runtime registry: `public/avatars/manifest.json`
- Notes: The app uses only this primary pack. Roguelike Characters and all other asset packs are not used.

Files actually used from the official archive:

- `PNG/Skin/Tint 1` through `Tint 8`: `head`, `neck`, `arm`, `hand`, and `leg` PNGs
- `PNG/Hair/Black`, `Brown 1`, `Brown 2`, `Blonde`, `Red`, and `Grey`: styles `Man1`–`Man8` and `Woman1`–`Woman4`
- `PNG/Face/Eyes`: large black, blue, brown, and green eyes; small pine eyes
- `PNG/Face/Mouth`: glad, happy, oh, straight, and upper-teeth mouths
- `PNG/Shirts/Blue`, `Green`, `Grey`, `Navy`, `Pine`, `Red`, `White`, and `Yellow`: shirt style 1 and long arm
- `PNG/Pants/Blue 1`, `Blue 2`, `Brown`, `Green`, `Grey`, `Navy`, `Red`, and `Tan`: waist style 3 and long leg
- `PNG/Shoes/Black`, `Blue`, `Brown 1`, `Grey`, `Red`, and `Tan`: shoe style 5
- `license.txt`, copied to `public/avatars/KENNEY-CC0.txt`

The import script renames this curated subset to stable internal IDs. Original Kenney filenames are not referenced by application code or stored avatar configurations. The full source archive is not shipped to production.

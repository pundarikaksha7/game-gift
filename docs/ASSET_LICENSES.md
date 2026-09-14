# Character asset provenance

Verified: 2026-09-15

## Repository sprite sheets

- Sources: `sprite-sheet.png` and `image.png` in the repository root
- Production output: `public/characters/`
- Runtime registry: `public/characters/manifest.json`
- Deterministic importer: `scripts/import-character-sheets.py`

These two supplied sheets are the sole source of character art. The importer removes the baked
checkerboard, trims cells, and emits full-body looks, coherent movement frames, villains, and
companions. No remote character pack is downloaded or referenced at build or runtime.

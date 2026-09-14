# Character sheet workflow

The character library is committed under `public/characters/`, so normal development and deploys
need no asset download. To rebuild it after either source PNG changes, run:

```sh
npm run characters:import
```

The importer uses only the root-level `sprite-sheet.png` and `image.png`. It reconstructs alpha
from their baked checkerboards, crops and normalizes the cells, and rewrites the local manifest.

The creator exposes authored looks plus build, skin, hair, hair-color, and clothing-style choices.
Every choice resolves to a coherent authored look. Idle, running, and jumping previews use pose
families from the same sheet, and the game runtime chooses those frames from movement state.

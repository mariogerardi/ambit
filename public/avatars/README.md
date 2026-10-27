# Profile avatar artwork

The 24 centered SVGs use a 512 × 512 view box and a circular profile composition.
Each motif appears in four fixed palettes: Discovery, Odyssey, Expedition, Safari.
Colors stay with the selected avatar, independently of the viewer's theme.

| Slots | Motif                  | In-game source                                                   |
| ----- | ---------------------- | ---------------------------------------------------------------- |
| 01–04 | Pinpoint pin           | Globe pin silhouette in `src/globe/placeLabels.ts`               |
| 05–08 | Border Run finish flag | Same skewed checkerboard and flag silhouette as the globe marker |
| 09–12 | Star                   | Reward star in `src/game/PointOrbs.tsx`                          |
| 13–16 | Mountain               | Geographic mountain emblem using globe land inks                 |
| 17–20 | Explore compass        | Explore action icon in `src/app/ActionIcon.tsx`                  |
| 21–24 | Journey                | Journey action icon in `src/app/ActionIcon.tsx`                  |

Run `node scripts/prepare-profile-avatars.mjs` with the pinned Node version to
refresh all SVGs and catalog labels after a palette or artwork change. The script
uses existing vectors and code; it does not download or generate AI imagery.

`shared/profile-avatars.json` retains the stable `avatar-01` through `avatar-24`
IDs for saved profiles and server validation. Square PNG replacements are also
supported; update the corresponding catalog image path. Restart the development
server after adding files; production builds enable only assets that exist.
Missing slots stay disabled and never request a missing image. Country flags
remain selectable. Previously saved emoji avatars remain supported but are no
longer offered in the picker.

# Themes and visual styling

This is the source-level inventory for refining Ambit's themes. Palette values
below are authored colors, before lighting, transparency, compositing, or texture
sampling. They do not establish the final on-screen appearance.

## Selection and application

Discovery is the default and first Appearance choice, followed by Odyssey, Expedition,
and Safari. All four themes are dark. Saved IDs remain `ocean`, `survey`, `dusk`
and `paper`, respectively, so existing selections survive the renames and redesigns.
A saved Atlas preference falls back to Discovery. There is no automatic
system light/dark selection. Preferences are device-local, not account-synced;
storage events update other tabs. Missing, invalid, unsupported-version, and
unavailable storage fall back to Discovery.

- [themes.ts](../src/theme/themes.ts) owns the registry, default, validation,
  versioned storage, and application to the document.
- [ThemePicker.tsx](../src/theme/ThemePicker.tsx) derives the order and previews
  from the registry. [AppearancePanel.tsx](../src/app/AppearancePanel.tsx) hosts it.
- [App.tsx](../src/App.tsx) applies the current theme and passes the palette to the
  persistent globe. Switching themes updates styling without replacing the globe.
- [index.html](../index.html) has a separate early preference reader and background
  palette, before React and application CSS load. It must stay aligned with the registry.
- Application updates set document `data-theme`, native-control `color-scheme`,
  browser `theme-color`, `--ui-*`, `--play-*`, and `--map-*` colors.
  Portal dialogs inherit the document variables.

## Default theme direction

Discovery retains the existing `ocean` preference ID. Its identity is a playful geography
game with a scholarly editorial touch. Background, input, panel, raised surface,
scrim, borders, and subdued copy use neutral grays with equal RGB channels.
The backdrop is a deep charcoal (`#101010`), balanced between near-black and the
lighter charcoal study, with off-white copy and no colored page glow. Copper actions, mint
accents, and six richer land colors carry the color.

Discovery's material rules live in [themes.css](../src/theme/themes.css): flat opaque
cards, menus and question panels; no question-card glass blur; flat earned score
markers; no beveled button/card shadows; no loading globe glow, shine, or rim.
The live globe hides its atmosphere and removes ocean specular highlights.
Study’s footer remains transparent; only its session-review note owns the
editorial fill. Neutral scrims remain available to protect text near the globe. Semantic gameplay
colors remain distinct from ordinary surfaces, including selected answers and
clue/context roles. All four themes share this material treatment.

## Odyssey direction

Odyssey is a second dark identity: graphite water and six gray land values, pale
country boundaries, gold actions and selection, cool slate references, green
success, cyan revealed answers, coral mistakes and muted lavender discoveries.
Color concentrates on interactions and gameplay information. Candidate fields use
dark outlines instead of pale base-map boundaries so their fills remain legible.
Ordinary place labels and markers use pale ink against the graphite geography;
river ink has a pale casing, and unclassified guides use gold.

Typography, spacing, shapes, surface colors, surface effects and motion match
Discovery. The distinction comes from cartography and semantic colors.

## Expedition direction

Expedition is the cyberpunk identity: ink-violet water and backdrop, six vivid
orchid/cyan/pink/blue/lilac/amber land colors, cyan actions and selection, pink
editorial emphasis and routes. Lime-green success, periwinkle revealed answers,
coral mistakes and orchid discoveries preserve distinct gameplay meanings.
It keeps Discovery's typography, geometry, material treatment and motion,
without an atmosphere, glossy water or added animation. The saved ID is `dusk`.

## Safari direction

Safari is the organic exploration identity: a deep green backdrop, blue ocean,
five green land colors and one restrained brown-green, with seafoam interface
accents and sienna actions/selections. Small editorial text uses a lighter matching
brown for contrast on raised panels. Success stays a brighter leaf green; revealed answers use
lavender, mistakes rose and discoveries soft plum. It shares the other themes'
typography, spacing, shapes and material treatment. The saved ID is `paper`.

## Themed illustrations

`src/theme/artwork.ts` maps the existing SVG illustration inks onto theme roles.
`ThemedImage` follows the live React theme, including inside portal dialogs.
The seven Study/minigame previews, Account globe, default globe avatar, Daily share
globe and minigame share artwork adapt to Discovery, Odyssey, Expedition and Safari.
Minigame exports use the same full preview illustration as their modal.
Flags, photographic clues, data legends and the brand wordmark keep their authored colors.

The 24 selectable profile avatars offer six motifs in four fixed theme palettes.
Their colors follow the saved avatar choice rather than the viewer's current
theme. `node scripts/prepare-profile-avatars.mjs` refreshes those SVGs and catalog
labels; the existing avatar IDs remain stable.

Run `node scripts/prepare-theme-artwork.mjs` with the pinned Node version after
editing a palette or source SVG. Generated variants live under `public/artwork/`;
original geometry and embedded flag artwork stay intact. `tests/theme-artwork.test.tsx` checks palette
freshness, preserved geography and live image switching.

## What a theme changes

| Area                 | Theme-controlled appearance                                                           | Boundary                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Page and text        | Background, primary/muted/faint text, editorial emphasis                              | Font families, sizes, weights, spacing, and heading italics are shared.                                                               |
| Controls             | Input fill, accents, primary and daily actions, hover and focus colors, feedback text | Sizes, radii, layout, icons, disabled opacity, and interaction behavior are shared.                                                   |
| Panels and dialogs   | Surface, raised surface, line, scrim, shadow color/strength, some text shadows        | Most effects are defined per component; All four themes share surface and gloss overrides. A few shadows bypass the tokens.           |
| Globe                | Ocean, atmosphere, six base land colors, country borders                              | Land color assignment, geometry, lighting and camera remain shared; All four themes disable atmosphere and ocean specular highlights. |
| Play state           | Selection, candidates, hover, clues, reference land, outcomes, visited areas, rivers  | All four themes have distinct state palettes.                                                                                         |
| Map annotations      | Semantic marker/overlay colors, pin accuracy bands, clue locator ink/casing           | Odyssey adapts ordinary label ink; many casings, relief and authored imagery remain fixed.                                            |
| Branding and startup | Startup page background; themed loading globe                                         | Logo artwork, loading-globe geometry and loading typography are shared; All four themes remove loading gloss and glow.                |
| Native/browser UI    | Light/dark scheme and browser theme color after application                           | Browser/platform rendering still determines actual native-control appearance.                                                         |
| Minigame share cards | Background, text, editorial/accent, motif outlines and semantic outcomes              | Each game uses its themed preview illustration; composition and typography stay shared.                                               |

## Interface palette

All roles below become `--ui-<role>`. RGB triplets are used with component-specific
opacity; matching hex and RGB accent/editorial values must be edited together.

| Role               | Discovery     | Odyssey       | Expedition    | Safari        |
| ------------------ | ------------- | ------------- | ------------- | ------------- |
| bg                 | `#101010`     | `#101010`     | `#100d18`     | `#08140d`     |
| input              | `#161616`     | `#161616`     | `#171320`     | `#111f16`     |
| text               | `#ececec`     | `#ececec`     | `#f2edf9`     | `#f0eddf`     |
| muted              | `#bdbdbd`     | `#bdbdbd`     | `#c4bad5`     | `#c2c8b9`     |
| faint              | `#a6a6a6`     | `#a6a6a6`     | `#afa1c5`     | `#abb7a2`     |
| editorial          | `#e6ad7c`     | `#f0c671`     | `#ff8cda`     | `#c18b66`     |
| editorial-rgb      | `230 173 124` | `240 198 113` | `255 140 218` | `193 139 102` |
| accent             | `#91dfbd`     | `#f0c671`     | `#64e8ed`     | `#a3dec5`     |
| accent-hover       | `#b2edd3`     | `#f6d798`     | `#a0f4f6`     | `#c2ebda`     |
| action             | `#e6ad7c`     | `#f0c671`     | `#64e8ed`     | `#ad704a`     |
| action-hover       | `#f1c39e`     | `#f6d798`     | `#a0f4f6`     | `#bd825b`     |
| daily-action       | `#e6ad7c`     | `#f0c671`     | `#64e8ed`     | `#ad704a`     |
| daily-action-hover | `#f1c39e`     | `#f6d798`     | `#a0f4f6`     | `#bd825b`     |
| on-accent          | `#202020`     | `#202020`     | `#161020`     | `#061009`     |
| accent-rgb         | `145 223 189` | `240 198 113` | `100 232 237` | `163 222 197` |
| line-rgb           | `160 160 160` | `160 160 160` | `151 126 181` | `147 165 140` |
| surface-rgb        | `28 28 28`    | `28 28 28`    | `29 23 40`    | `27 38 29`    |
| raised-rgb         | `38 38 38`    | `38 38 38`    | `40 31 54`    | `37 51 39`    |
| scrim-rgb          | `16 16 16`    | `16 16 16`    | `16 13 24`    | `8 20 13`     |
| shadow-rgb         | `0 0 0`       | `0 0 0`       | `0 0 0`       | `0 0 0`       |
| shadow-strength    | `.6`          | `.6`          | `.6`          | `.6`          |
| focus              | `#91dfbd`     | `#f0c671`     | `#64e8ed`     | `#a3dec5`     |
| correct            | `#79d58b`     | `#8bd89a`     | `#8ce77d`     | `#76d496`     |
| incorrect          | `#eb9b96`     | `#ed9a91`     | `#ff9891`     | `#e898ad`     |
| text-shadow        | `none`        | `none`        | `none`        | `none`        |

All four themes use their play success/error colors, reduce shadow strength and
omit text shadows. Legacy light-theme logo and contrast overrides were retired.

The registry currently declares `accent-hover` without a production consumer.
Declaring a token does not guarantee it affects the interface.

## Globe palette

[globe/themes.ts](../src/globe/themes.ts) maps semantic states to polygon fills and
outlines. Base country colors use a prepared adjacency-aware assignment, with a
stable ID hash fallback. Changing the six colors changes the appearance, not the
assignment or geographic data. Adjacent countries must retain distinct colors.

| Role            | Discovery                                              | Odyssey                                                | Expedition                                             | Safari                                                 |
| --------------- | ------------------------------------------------------ | ------------------------------------------------------ | ------------------------------------------------------ | ------------------------------------------------------ |
| ocean           | `#234d69`                                              | `#242424`                                              | `#211833`                                              | `#204c68`                                              |
| atmosphere      | `#a6a6a6`                                              | `#bcbcbc`                                              | `#b79ae5`                                              | `#a5b79b`                                              |
| showAtmosphere  | `false`                                                | `false`                                                | `false`                                                | `false`                                                |
| land            | `#78cfa0, #efbc62, #70bfce, #e99579, #b59ae1, #bfd574` | `#676767, #858585, #747474, #969696, #5b5b5b, #a6a6a6` | `#ae7fea, #48bdc9, #df78bb, #678fe0, #c4a4ec, #dfa76b` | `#72956b, #8da976, #537f65, #a1b68b, #699785, #8b8a60` |
| disabled        | `#5b5b5b`                                              | `#4e4e4e`                                              | `#51465e`                                              | `#4b5b4d`                                              |
| border          | `rgba(25,47,57,0.7)`                                   | `rgba(225,225,225,0.7)`                                | `rgba(25,16,39,0.85)`                                  | `rgba(10,27,17,0.8)`                                   |
| highlight       | `#e6ad7c`                                              | `#f0c671`                                              | `#64e8ed`                                              | `#ad704a`                                              |
| candidateBorder | —                                                      | `#202020`                                              | `#21152f`                                              | `#17271b`                                              |

`globe.disabled` feeds `--map-neutral` (the neutral legend swatch). Actual disabled
play land uses the separate `playColors().disabled` value below. The registry's
`globe.highlight` currently has no production consumer.

The main application explicitly uses the `play` globe renderer. The separate
`natural` renderer uses a fixed Earth texture, fixed ocean material, and
[visualStates.ts](../src/globe/visualStates.ts) colors; it does not adopt the theme's
polygon state palette. Atmosphere color and visibility still come from the palette in GlobeView.

## Gameplay palette

[playColors.ts](../src/theme/playColors.ts) provides both JavaScript colors and
`--play-<role>` CSS properties. These are distinct from interface success/error
colors. Meaning must remain consistent across map fills, markers, answer controls,
legends, and recap. State and eligibility come from question contracts, not colors.

| Role                    | Discovery | Odyssey   | Expedition | Safari    |
| ----------------------- | --------- | --------- | ---------- | --------- |
| surface                 | `#909090` | `#b0b0b0` | `#9a8ba8`  | `#97a38e` |
| context-land            | `#90accf` | `#8b96a6` | `#a09bbb`  | `#94b4b2` |
| selectable              | `#dccfae` | `#c5b8a8` | `#bdacd0`  | `#d5c6a0` |
| candidate-hover         | `#dbb28f` | `#e8c780` | `#f3b1df`  | `#cfa184` |
| candidate-hover-outline | `#65462e` | `#755421` | `#6c245e`  | `#4a3627` |
| selected                | `#e6ad7c` | `#f0c671` | `#64e8ed`  | `#ad704a` |
| context-outline         | `#202b33` | `#1b1b1b` | `#1b1126`  | `#14281f` |
| hinted                  | `#9eb9e3` | `#b7c3d4` | `#b9b3ea`  | `#a0c6c3` |
| clue                    | `#9eb9e3` | `#b7c3d4` | `#b9b3ea`  | `#a0c6c3` |
| clue-outline            | `#202b33` | `#1b1b1b` | `#1b1126`  | `#14281f` |
| correct                 | `#79d58b` | `#8bd89a` | `#8ce77d`  | `#76d496` |
| answer                  | `#70c9d4` | `#8bd0dc` | `#9dafff`  | `#c4b6ef` |
| incorrect               | `#eb9b96` | `#ed9a91` | `#ff9891`  | `#e898ad` |
| corridor                | `#c9976f` | `#d7ad63` | `#ff8cda`  | `#c18b66` |
| visited                 | `#b9a3db` | `#b1a1c5` | `#e2a1f2`  | `#c5afd0` |
| disabled                | `#5b5b5b` | `#4e4e4e` | `#51465e`  | `#4b5b4d` |
| river                   | `#087b9b` | `#414a54` | `#282044`  | `#224951` |
| river-casing            | `#e5edf0` | `#e0e4e7` | `#b6f2f4`  | `#e5eed9` |
| outline                 | `#242424` | `#202020` | `#21152f`  | `#182b1f` |
| on-feedback             | `#242424` | `#202020` | `#21152f`  | `#182b1f` |
| on-selected             | `#242424` | `#202020` | `#21152f`  | `#061009` |
| guide                   | `#c9976f` | `#efd18f` | `#ff8cda`  | `#c18b66` |

Reference countries (`hinted`) use `context-land` with `context-outline`;
reference markers use `hinted`. Clue polygons use `clue` and `clue-outline`.
Candidate hover uses its own fill/outline only for selectable or open surfaces;
selection and result states remain steady on hover. Selected controls and selection symbols
use `on-selected`; outcome glyphs use `on-feedback`. These inks can differ on
future palettes with different contrast requirements. Selected/outcome/visited
polygons share the semantic outline. Pin bands use correct for the first band,
hinted for the last, and selected for intermediate bands.

Discovery uses neutral gray open and disabled surfaces, sand candidates, copper
selection, blue references, leaf-green success, cyan revealed answers, coral
mistakes, and lilac discoveries. Copper selection matches interface actions;
success has its own green, distinct from the mint interface accent, and matches
the success text. Corridor context uses a quieter
copper and rivers use teal-blue ink with a pale casing. Expedition has a separate
neon palette; Safari uses botanical greens, parchment candidates and lavender answers.

Discovery separates supplied geography from answer/comparison geography through
hue: reference land is `#90accf`, reference markers and anonymous clues are
`#9eb9e3`, and answers/examples remain cyan (`#70c9d4`). Keep references bright
enough for small islands, station rays, river context and dark water; do not
apply a global opacity reduction to make them quieter. Correct results retain
leaf green. Pin accuracy bands retain their green/copper/blue order, independently
of the cyan target or example marker. Anonymous clues retain their existing
label and selection-disclosure rules.

## Gameplay state composition

Theme work must preserve each mechanic's existing presentation, eligibility and
information disclosure. There is no single global question-map treatment.

| Family                            | Presentation distinctions to preserve                                                                                                                                                                                                                                         |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Region selection                  | Finite highlighted candidates, whole-world neutral search, blind eligible picks, pending selection, immediate commitment, eliminated candidates, merged territories and fragment clues. A muted `disabled` fill does not by itself make a region ineligible.                  |
| Named/button/typed answers        | Choice-to-geography links do not enable map answering. Anonymous `clue` fields can defer identity feedback until submission; abstract and numeric answers must not grade background countries.                                                                                |
| City and pin answers              | Grade points rather than containing countries. Preserve reference markers, hidden names/locations, submitted guesses, target reveals, distance bands and guess-to-answer paths.                                                                                               |
| Compass and bearing intersections | Origin/station references, supplied sectors/corridors, withheld destinations and revealed paths have separate roles.                                                                                                                                                          |
| Construction                      | Brush inside/outside comparison, circle coverage, traces, polygons, population cuts and labeled multipins layer player geometry, results and optional examples over the base globe. Raster colors, masks and relief have independent meanings; display geometry never grades. |
| Recall and recap                  | Progressive accepted entries, mistakes and assistance differ from ordinary pending selections. Recap discoveries retain visited status, mistakes remain distinct, and authored context cannot erase a graded point's status.                                                  |
| Study                             | Builder scope previews, map-answer pools, country silhouettes, concealed flag answers, capital disclosure, feedback, summary and selected-answer review compose their own states. `selected` can depict the country clue for a non-map question.                              |

Inspect [mechanics.ts](../src/game/mechanics.ts) and its
[recipes](../src/game/recipes.ts), then the relevant presentation owner:
[presentation.ts](../src/game/presentation.ts),
[journeyWorld.ts](../src/app/journeyWorld.ts),
[constructionScene.ts](../src/game/constructionScene.ts), or
[useStudyPresentation.ts](../src/study/useStudyPresentation.ts) and
[studyStates](../src/study/engine.ts). Minigames compose their question contracts
through the same engine, with their own reveal sequencing and recap context.
Borders, hover names, markers, labels, overlays and camera framing are independent
of fill color; a theme must not reveal information withheld by those contracts.

## What does not change per theme

- **Typography:** Manrope for interface and map text, Newsreader for editorial
  headings, plus fixed monospace numeric labels and startup system fonts.
  Font families, sizes, weights, line heights, letter spacing, and transformed
  heading italics are not theme options.
- **Layout:** desktop panel widths, globe allocation, header clearance, mobile
  breakpoints, safe-area handling, scrolling, control arrangement, and spacing.
  Mobile uses the same palette in an opaque content panel; desktop often shows
  the globe through or beside surfaces.
- **Shape and effects:** radii, border thickness, most opacity values,
  transition durations, most animations, focus-ring dimensions, and disabled opacity.
  Discovery, Odyssey, Expedition and Safari share flat material rules. The retired
  glow, loading sheen and light-logo branches have been removed.
  Reduced motion and coarse-pointer target sizes are shared accessibility rules.
- **Structure and meaning:** icons, button hierarchy, marker shapes, badges,
  route geometry, answer eligibility, grading, disclosure, camera behavior,
  geography, country color assignment, and label placement.
- **Content artwork:** flags, photos, raster overlays, terrain images, social
  preview assets, favicon, and logo pixel colors. Themes do not recolor these.

## Fixed colors and partial coverage to review

These are concrete boundaries for a full redesign, not changes made by selecting
a theme. CSS fallback hex values inside `var(--ui-..., #...)` are normally inactive
once the theme is applied; they are different from unconditional fixed colors.

| Owner                                                                                                                                                                                                 | Fixed or partially themed appearance                                                                                                                                                                                                                                                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [index.html](../index.html), [LoadingScreen.tsx](../src/app/LoadingScreen.tsx)                                                                                                                        | Startup text/background and globe land/ocean/border colors follow each theme before the bundle loads. Loading uses a flat ocean fill; the obsolete glow, gradients, shade and rim have been removed. The inline startup palette must stay aligned with the registry. Browser chrome starts Discovery and updates to the saved theme with the bundle.                                |
| [placeLabels.ts](../src/globe/placeLabels.ts)                                                                                                                                                         | Odyssey uses pale neutral ink, Expedition violet/cyan ink, and Safari parchment/green ink; pins follow their selection colors. Discovery retains city/capital text `#f4f8ff`, river text `#b0e5ef`, mountain text `#ede1ca` and ocean text `#bddde1`. Numeric text and some casings/checkerboards remain fixed. Selected/outcome badge ink and semantic markers follow the palette. |
| [physicalFeatures.ts](../src/globe/physicalFeatures.ts)                                                                                                                                               | Mountain light/dark faces `#c1b79a` / `#99896d`, relief lines and landform tints remain fixed or feature-authored. Rivers use semantic ink/casing.                                                                                                                                                                                                                                  |
| [overlays.ts](../src/globe/overlays.ts), [pathAnnotations.ts](../src/globe/pathAnnotations.ts), [GlobeView.tsx](../src/globe/GlobeView.tsx)                                                           | State-bearing paths, paint, cells, and bands use play colors; unclassified paths/circles and fallback construction handles use the `guide` role. Path labels use white/dark casing. Odyssey arcs use slate/gold; other themes use pale green/gold. Raster/texture overlays retain authored colors.                                                                                  |
| [game.css](../src/game/game.css)                                                                                                                                                                      | River-bank diagram stroke `#72b9d2`; order-bank red tint; selected copy and map-key glyphs now use semantic ink; several black/white inset and drop shadows. Most surrounding UI uses tokens.                                                                                                                                                                                       |
| [shell-base.css](../src/app/styles/shell-base.css)                                                                                                                                                    | Daily stage point outlines/fills `#9ed9df`.                                                                                                                                                                                                                                                                                                                                         |
| [shared-neighbors.css](../src/app/styles/shared-neighbors.css)                                                                                                                                        | Motif checkerboards, boundaries and glow follow theme roles; popup shadow uses fixed black.                                                                                                                                                                                                                                                                                         |
| [activity-preview.css](../src/app/styles/activity-preview.css)                                                                                                                                        | Image-area background follows the theme; SVG previews use generated themed variants.                                                                                                                                                                                                                                                                                                |
| [question-content.css](../src/app/styles/question-content.css)                                                                                                                                        | Question emphasis mixes theme text with fixed cream `#f4ecd8`.                                                                                                                                                                                                                                                                                                                      |
| [workspace-layout.css](../src/app/styles/workspace-layout.css)                                                                                                                                        | Select caret remains a fixed pale SVG rather than a registry token.                                                                                                                                                                                                                                                                                                                 |
| [mobile.css](../src/app/mobile.css), [construction.css](../src/app/styles/construction.css), [explore.css](../src/app/styles/explore.css), [admin-schedule.css](../src/app/styles/admin-schedule.css) | Some text/drop shadows use fixed black or ignore the theme's shadow-strength multiplier.                                                                                                                                                                                                                                                                                            |
| [journeySharing.ts](../src/app/journeySharing.ts)                                                                                                                                                     | Exported result-card surfaces, text and score dots now use the selected theme. The decorative globe uses the generated theme variant of `public/brand/account-globe.svg`.                                                                                                                                                                                                           |
| Journey modules and public assets                                                                                                                                                                     | Authored raster legends, density maps, explanatory illustrations, photos, relief, and other texture content keep their own colors. For example, The Shape of India's density legend is fixed to its data visualization.                                                                                                                                                             |

## Custom cursors

`theme/cursors.ts` bakes the active gameplay selection, mistake and outline colors
into paint, eraser and pin SVG cursors. `applyTheme` refreshes the `--cursor-*`
variables on every theme change; construction CSS consumes them with crosshair
fallbacks. SVG cursor images cannot inherit ordinary document color variables.

## Editing and verification boundaries

Palette refinement starts in the registry and play palette. Shared
material rules live in themes.css; component layout stays with its owning stylesheet.
Typography, shape and spacing still come from the shared CSS. Shared CSS loads in this order:
`fonts.css → style.css → game/game.css → app/app.css → app/mobile.css → theme/themes.css`.
Account CSS is imported by AccountTabs and AccountDashboard. Feature styles in `app/app.css` refine
earlier shared rules, so changes must be evaluated against the final cascade.

For a complete theme, review these surfaces together: Home and navigation;
Explore and display settings; Study setup/results; Journey question, hover,
selection, reveal and completion; minigames and construction controls; account,
Appearance and portal dialogs; startup and shared-result artwork. Include mobile
and the dark-surface contrast of every palette.

Focused automated coverage lives in [themes.test.ts](../tests/themes.test.ts),
[app-preferences-shell.test.tsx](../tests/app-preferences-shell.test.tsx), and
[loading-screen.test.tsx](../tests/loading-screen.test.tsx). Existing tests check
UI contrast against base/input/surface/raised colors, action text contrast,
country adjacency colors, semantic state distinctions, selected/clue/hover
outlines, river visibility, storage recovery, and theme switching without globe
replacement. These checks do not prove composited/translucent contrast,
color-vision accessibility, GPU appearance, or final browser layout.

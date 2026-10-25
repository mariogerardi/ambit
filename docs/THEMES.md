# Themes and visual styling

This is the source-level inventory for refining Ambit's themes. Palette values
below are authored colors, before lighting, transparency, compositing, or texture
sampling. They do not establish the final on-screen appearance.

## Selection and application

Discovery is the default and first Appearance choice, followed by Survey, Dusk, and
Paper. A saved Atlas preference falls back to Discovery; other saved choices remain valid. There is no automatic
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
lighter charcoal study, with off-white copy and no colored page glow. Gold actions, mint
accents, and six richer land colors carry the color.

Discovery's material rules live in [themes.css](../src/theme/themes.css): flat opaque
cards, menus and question panels; no question-card glass blur; flat earned score
markers; no beveled button/card shadows; no loading globe glow, shine, or rim.
The live globe hides its atmosphere and removes ocean specular highlights.
Study’s footer remains transparent; only its session-review note owns the
editorial fill. Neutral scrims remain available to protect text near the globe. Semantic gameplay
colors remain distinct from ordinary surfaces, including selected answers and
clue/context roles. Survey shares this material treatment; Dusk and Paper retain theirs.

## Survey direction

Survey is a second dark identity: graphite water and six gray land values, pale
country boundaries, copper actions and selection, cool slate references, green
success, cyan revealed answers, coral mistakes and muted lavender discoveries.
Color concentrates on interactions and gameplay information. Candidate fields use
dark outlines instead of pale base-map boundaries so their fills remain legible.
Ordinary place labels and markers use pale ink against the graphite geography;
river ink has a pale casing, and unclassified guides use copper.

Typography, spacing, shapes, surface colors, surface effects and motion match
Discovery. The distinction comes from cartography and semantic colors.

## What a theme changes

| Area                 | Theme-controlled appearance                                                           | Boundary                                                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Page and text        | Background, primary/muted/faint text, editorial emphasis                              | Font families, sizes, weights, spacing, and heading italics are shared.                                                                    |
| Controls             | Input fill, accents, primary and daily actions, hover and focus colors, feedback text | Sizes, radii, layout, icons, disabled opacity, and interaction behavior are shared.                                                        |
| Panels and dialogs   | Surface, raised surface, line, scrim, shadow color/strength, some text shadows        | Most effects are defined per component; Discovery and Survey share gradient/glass/gloss overrides. A few shadows bypass the tokens.        |
| Globe                | Ocean, atmosphere, six base land colors, country borders                              | Land color assignment, geometry, lighting and camera remain shared; Discovery and Survey disable atmosphere and ocean specular highlights. |
| Play state           | Selection, candidates, hover, clues, reference land, outcomes, visited areas, rivers  | Discovery and Survey have their own state palettes; Dusk and Paper retain theirs.                                                          |
| Map annotations      | Semantic marker/overlay colors, pin accuracy bands, clue locator ink/casing           | Survey adapts ordinary label ink; many casings, relief and authored imagery remain fixed.                                                  |
| Branding and startup | Startup page background; Paper chooses the light-background logo asset                | Logo artwork, loading-globe geometry and loading typography are shared; Discovery and Survey remove loading gloss and glow.                |
| Native/browser UI    | Light/dark scheme and browser theme color after application                           | Browser/platform rendering still determines actual native-control appearance.                                                              |

## Interface palette

All roles below become `--ui-<role>`. RGB triplets are used with component-specific
opacity; matching hex and RGB accent/editorial values must be edited together.

| Role               | Discovery     | Survey        | Dusk                        | Paper         |
| ------------------ | ------------- | ------------- | --------------------------- | ------------- |
| bg                 | `#101010`     | `#101010`     | `#17131d`                   | `#f4eee1`     |
| input              | `#161616`     | `#161616`     | `#1e1b26`                   | `#fffaf0`     |
| text               | `#ececec`     | `#ececec`     | `#f6eee5`                   | `#29343b`     |
| muted              | `#bdbdbd`     | `#bdbdbd`     | `#ccbfcf`                   | `#50616a`     |
| faint              | `#a6a6a6`     | `#a6a6a6`     | `#ae98b2`                   | `#53616a`     |
| editorial          | `#f0c671`     | `#e6ad7c`     | `#efcc88`                   | `#934831`     |
| editorial-rgb      | `240 198 113` | `230 173 124` | `239 204 136`               | `147 72 49`   |
| accent             | `#91dfbd`     | `#e6ad7c`     | `#f0b98b`                   | `#215f65`     |
| accent-hover       | `#b2edd3`     | `#f1c39e`     | `#f6d1ad`                   | `#16484d`     |
| action             | `#f0c671`     | `#e6ad7c`     | `#a1d6c8`                   | `#294f70`     |
| action-hover       | `#f6d798`     | `#f1c39e`     | `#c0eadf`                   | `#1d3e5a`     |
| daily-action       | `#f0c671`     | `#e6ad7c`     | `#a1d6c8`                   | `#294f70`     |
| daily-action-hover | `#f6d798`     | `#f1c39e`     | `#c0eadf`                   | `#1d3e5a`     |
| on-accent          | `#202020`     | `#202020`     | `#332033`                   | `#fffaf0`     |
| accent-rgb         | `145 223 189` | `230 173 124` | `240 185 139`               | `33 95 101`   |
| line-rgb           | `160 160 160` | `160 160 160` | `174 152 178`               | `104 119 127` |
| surface-rgb        | `28 28 28`    | `28 28 28`    | `32 32 42`                  | `255 250 240` |
| raised-rgb         | `38 38 38`    | `38 38 38`    | `47 39 50`                  | `229 226 216` |
| scrim-rgb          | `16 16 16`    | `16 16 16`    | `23 19 29`                  | `244 238 225` |
| shadow-rgb         | `0 0 0`       | `0 0 0`       | `0 0 0`                     | `55 44 26`    |
| shadow-strength    | `.6`          | `.6`          | `1`                         | `.18`         |
| focus              | `#91dfbd`     | `#e6ad7c`     | `#f0b98b`                   | `#215f65`     |
| correct            | `#79d58b`     | `#8bd89a`     | `#9de0b7`                   | `#26734e`     |
| incorrect          | `#eb9b96`     | `#ed9a91`     | `#ffa19a`                   | `#b33c35`     |
| text-shadow        | `none`        | `none`        | `0 1px 3px rgb(0 0 0 / .6)` | `none`        |

Dusk share success/error UI colors, black shadows, shadow strength,
and text shadow. Discovery uses the play success/error colors, reduces shadow
strength, and removes text shadows. Paper has light-surface overrides. Discovery now
has its own refreshed play palette; Dusk retain the legacy highlights.

The registry currently declares `accent-hover` without a production consumer.
Declaring a token does not guarantee it affects the interface.

## Globe palette

[globe/themes.ts](../src/globe/themes.ts) maps semantic states to polygon fills and
outlines. Base country colors use a prepared adjacency-aware assignment, with a
stable ID hash fallback. Changing the six colors changes the appearance, not the
assignment or geographic data. Adjacent countries must retain distinct colors.

| Role            | Discovery                                              | Survey                                                 | Dusk                                                   | Paper                                                  |
| --------------- | ------------------------------------------------------ | ------------------------------------------------------ | ------------------------------------------------------ | ------------------------------------------------------ |
| ocean           | `#234d69`                                              | `#242424`                                              | `#3b2f4f`                                              | `#82b3cc`                                              |
| atmosphere      | `#a6a6a6`                                              | `#bcbcbc`                                              | `#bd9dc2`                                              | `#7eafbd`                                              |
| showAtmosphere  | `false`                                                | `false`                                                | `true`                                                 | `true`                                                 |
| land            | `#78cfa0, #efbc62, #70bfce, #e99579, #b59ae1, #bfd574` | `#676767, #858585, #747474, #969696, #5b5b5b, #a6a6a6` | `#b4a3d8, #89c6b2, #e4c58e, #d59a79, #92bdcf, #aebd7a` | `#93b79c, #d5bc7e, #ce997e, #aab8d2, #9abfc2, #c3a2b6` |
| disabled        | `#5b5b5b`                                              | `#4e4e4e`                                              | `#9a8c9c`                                              | `#b3b7a7`                                              |
| border          | `rgba(25,47,57,0.7)`                                   | `rgba(225,225,225,0.7)`                                | `rgba(64,43,64,0.65)`                                  | `rgba(60,78,68,0.65)`                                  |
| highlight       | `#fff1be`                                              | `#e6ad7c`                                              | `#fff1be`                                              | `#78541d`                                              |
| candidateBorder | —                                                      | `#202020`                                              | —                                                      | —                                                      |

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

| Role                    | Discovery | Survey    | Dusk      | Paper     |
| ----------------------- | --------- | --------- | --------- | --------- |
| surface                 | `#909090` | `#b0b0b0` | `#8a858e` | `#d2d0c4` |
| context-land            | `#90accf` | `#8b96a6` | `#99abc7` | `#c0d4df` |
| selectable              | `#dccfae` | `#c5b8a8` | `#eadfb9` | `#e4cf91` |
| candidate-hover         | `#e8c780` | `#dbb28f` | `#f0d18a` | `#ddba68` |
| candidate-hover-outline | `#755421` | `#65462e` | `#a36708` | `#78541d` |
| selected                | `#f0c671` | `#e6ad7c` | `#f6bc46` | `#d68c19` |
| context-outline         | `#202b33` | `#1b1b1b` | `#0b2037` | `#244e72` |
| hinted                  | `#9eb9e3` | `#b7c3d4` | `#9bbddd` | `#83a9c7` |
| clue                    | `#9eb9e3` | `#b7c3d4` | `#9bbddd` | `#83a9c7` |
| clue-outline            | `#202b33` | `#1b1b1b` | `#0b2037` | `#244e72` |
| correct                 | `#79d58b` | `#8bd89a` | `#78dfaa` | `#216d4e` |
| answer                  | `#70c9d4` | `#8bd0dc` | `#55c9c0` | `#176e81` |
| incorrect               | `#eb9b96` | `#ed9a91` | `#f18c96` | `#ac3346` |
| corridor                | `#d7ad63` | `#c9976f` | `#ffd34e` | `#a36708` |
| visited                 | `#b9a3db` | `#b1a1c5` | `#b79ae3` | `#73539e` |
| disabled                | `#5b5b5b` | `#4e4e4e` | `#62596d` | `#d9dacd` |
| river                   | `#087b9b` | `#414a54` | `#007ba7` | `#007ba7` |
| river-casing            | `#e5edf0` | `#e0e4e7` | `#edf6fa` | `#fffaf0` |
| outline                 | `#242424` | `#202020` | `#172b35` | `#283e47` |
| on-feedback             | `#242424` | `#202020` | `#172b35` | `#fffaf0` |
| on-selected             | `#242424` | `#202020` | `#172b35` | `#172b35` |
| guide                   | `#efd18f` | `#c9976f` | `#efd18f` | `#efd18f` |

Reference countries (`hinted`) use `context-land` with `context-outline`;
reference markers use `hinted`. Clue polygons use `clue` and `clue-outline`.
Candidate hover uses its own fill/outline only for selectable or open surfaces;
selection and result states remain steady on hover. Selected controls and selection symbols
use `on-selected`; outcome glyphs use `on-feedback`. These inks can differ on
light themes, where outcome fills are dark but selection remains warm gold. Selected/outcome/visited
polygons share the semantic outline. Pin bands use correct for the first band,
hinted for the last, and selected for intermediate bands.

Discovery uses neutral gray open and disabled surfaces, sand candidates, gold
selection, blue references, leaf-green success, cyan revealed answers, coral
mistakes, and lilac discoveries. Gold selection matches interface actions;
success has its own green, distinct from the mint interface accent, and matches
the success text. Corridor context uses a quieter
ochre and rivers use teal-blue ink with a pale casing. Dusk retain
their previous state colors; Paper retains its light-surface adaptations.
Paper also has specific clue-locator and marker-badge contrast branches outside
the registry.

Discovery separates supplied geography from answer/comparison geography through
hue: reference land is `#90accf`, reference markers and anonymous clues are
`#9eb9e3`, and answers/examples remain cyan (`#70c9d4`). Keep references bright
enough for small islands, station rays, river context and dark water; do not
apply a global opacity reduction to make them quieter. Correct results retain
leaf green. Pin accuracy bands retain their green/gold/blue order, independently
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
  Discovery and Survey share the overrides for glossy surface treatment and loading-globe animation.
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

| Owner                                                                                                                                                                                                 | Fixed or partially themed appearance                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [index.html](../index.html), [LoadingScreen.tsx](../src/app/LoadingScreen.tsx)                                                                                                                        | Startup text/background and globe land/ocean/border/rim colors follow each theme before the bundle loads. Discovery and Survey disable the loading globe glow, gradient sheen, shade and rim; Dusk and Paper retain the shared highlight/shade gradients. The inline startup palette must stay aligned with the registry. Browser chrome starts Discovery and updates to the saved theme with the bundle. |
| [placeLabels.ts](../src/globe/placeLabels.ts)                                                                                                                                                         | Survey uses pale neutral text/markers and copper pins. Other themes retain city/capital text `#f4f8ff`, river text `#b0e5ef`, mountain text `#ede1ca`, ocean text `#bddde1`, numeric text `#b4cbd0`; dark text casings; target checkerboards and some hover ink remain fixed; selected/outcome badge ink follows the palette. Semantic state markers do adapt. Paper has a special badge-ink branch.      |
| [physicalFeatures.ts](../src/globe/physicalFeatures.ts)                                                                                                                                               | Mountain light/dark faces `#c1b79a` / `#99896d`, relief lines and landform tints remain fixed or feature-authored. Rivers use semantic ink/casing.                                                                                                                                                                                                                                                        |
| [overlays.ts](../src/globe/overlays.ts), [pathAnnotations.ts](../src/globe/pathAnnotations.ts), [GlobeView.tsx](../src/globe/GlobeView.tsx)                                                           | State-bearing paths, paint, cells, and bands use play colors; unclassified paths/circles and fallback construction handles use the `guide` role. Path labels use white/dark casing. Survey arcs use slate/copper; other themes use pale green/gold. Raster/texture overlays retain authored colors.                                                                                                       |
| [game.css](../src/game/game.css)                                                                                                                                                                      | River-bank diagram stroke `#72b9d2`; order-bank red tint; selected copy and map-key glyphs now use semantic ink; several black/white inset and drop shadows. Most surrounding UI uses tokens.                                                                                                                                                                                                             |
| [shell-base.css](../src/app/styles/shell-base.css)                                                                                                                                                    | Daily stage point outlines/fills `#9ed9df`.                                                                                                                                                                                                                                                                                                                                                               |
| [shared-neighbors.css](../src/app/styles/shared-neighbors.css)                                                                                                                                        | Preview target art uses navy/cream/gold (`#15313b`, `#fff0cd`, `#edc467`); popup shadow uses fixed black.                                                                                                                                                                                                                                                                                                 |
| [activity-preview.css](../src/app/styles/activity-preview.css)                                                                                                                                        | Image-area background `#0b1923`.                                                                                                                                                                                                                                                                                                                                                                          |
| [question-content.css](../src/app/styles/question-content.css)                                                                                                                                        | Question emphasis mixes theme text with fixed cream `#f4ecd8`.                                                                                                                                                                                                                                                                                                                                            |
| [workspace-layout.css](../src/app/styles/workspace-layout.css)                                                                                                                                        | Select caret is a fixed SVG color for dark themes with a separate Paper override, rather than a registry token.                                                                                                                                                                                                                                                                                           |
| [mobile.css](../src/app/mobile.css), [construction.css](../src/app/styles/construction.css), [explore.css](../src/app/styles/explore.css), [admin-schedule.css](../src/app/styles/admin-schedule.css) | Some text/drop shadows use fixed black or ignore the theme's shadow-strength multiplier.                                                                                                                                                                                                                                                                                                                  |
| [journeySharing.ts](../src/app/journeySharing.ts)                                                                                                                                                     | Exported result-card surfaces, text and score dots now use the selected theme. The decorative globe remains the fixed artwork in `public/brand/account-globe.svg`, rather than a capture of the live globe.                                                                                                                                                                                               |
| Journey modules and public assets                                                                                                                                                                     | Authored raster legends, density maps, explanatory illustrations, photos, relief, and other texture content keep their own colors. For example, The Shape of India's density legend is fixed to its data visualization.                                                                                                                                                                                   |

## Editing and verification boundaries

Palette refinement starts in the registry and play palette. Theme-specific
material and motion rules belong in themes.css; Discovery demonstrates this boundary.
Typography, shape and spacing still come from the shared CSS. Shared CSS loads in this order:
`fonts.css → style.css → game/game.css → app/app.css → app/mobile.css → theme/themes.css`.
Account CSS is imported by AccountTabs and AccountDashboard. Feature styles in `app/app.css` refine
earlier shared rules, so changes must be evaluated against the final cascade.

For a complete theme, review these surfaces together: Home and navigation;
Explore and display settings; Study setup/results; Journey question, hover,
selection, reveal and completion; minigames and construction controls; account,
Appearance and portal dialogs; startup and shared-result artwork. Include mobile
and light-surface contrast when refining Paper.

Focused automated coverage lives in [themes.test.ts](../tests/themes.test.ts),
[app-preferences-shell.test.tsx](../tests/app-preferences-shell.test.tsx), and
[loading-screen.test.tsx](../tests/loading-screen.test.tsx). Existing tests check
UI contrast against base/input/surface/raised colors, action text contrast,
country adjacency colors, semantic state distinctions, selected/clue/hover
outlines, river visibility, storage recovery, and theme switching without globe
replacement. These checks do not prove composited/translucent contrast,
color-vision accessibility, GPU appearance, or final browser layout.

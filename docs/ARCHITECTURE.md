# Architecture

Ambit is a client-side React/TypeScript application compiled by Vite. Product
routes share one Three.js/react-globe.gl renderer and local geography dataset.
There are no production server endpoints or runtime third-party data services.

## Module map

| Owner                                                                                                      | Responsibility                                                             |
| ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [`src/App.tsx`](../src/App.tsx)                                                                            | Navigation, shared data, camera memory, view orchestration, and sessions.  |
| [`src/app/modes.ts`](../src/app/modes.ts), [`ModePanels.tsx`](../src/app/ModePanels.tsx)                   | Route-to-mode mapping and overlapping panel transitions.                   |
| [`src/app/dailyProgress.ts`](../src/app/dailyProgress.ts)                                                  | Device-local scheduling and date-pinned Journey progress.                  |
| [`src/app/recordSave.ts`](../src/app/recordSave.ts), [`progressSaves.ts`](../src/app/progressSaves.ts)     | Independent save registers and domain-specific merges.                     |
| [`src/game/journeyRegistry.ts`](../src/game/journeyRegistry.ts)                                            | Lightweight Journey metadata and lazy module loading.                      |
| [`src/game/questions.ts`](../src/game/questions.ts), [`state.ts`](../src/game/state.ts)                    | Question contract, prepared answers, scoring, and round transitions.       |
| [`src/game/presentation.ts`](../src/game/presentation.ts)                                                  | Clue, selection, feedback, and disclosure states.                          |
| [`src/game/reasoning.ts`](../src/game/reasoning.ts), [`spatial.ts`](../src/game/spatial.ts)                | Shared-edge adjacency, shortest paths, routes, and spatial predicates.     |
| [`src/study/engine.ts`](../src/study/engine.ts)                                                            | Study pools, decks, methods, review pairs, completion, and history models. |
| [`src/study/StudySetup.tsx`](../src/study/StudySetup.tsx), [`scopeFocus.ts`](../src/study/scopeFocus.ts)   | Builder configuration and geographic scope framing.                        |
| [`src/app/ExplorePanel.tsx`](../src/app/ExplorePanel.tsx)                                                  | Search, country/subdivision details, and display settings.                 |
| [`src/geography/types.ts`](../src/geography/types.ts), [`loadLayer.ts`](../src/geography/loadLayer.ts)     | Canonical geometry contracts and cancellable, cached layer loading.        |
| [`src/globe/GlobeView.tsx`](../src/globe/GlobeView.tsx)                                                    | Sole product renderer adapter: regions, places, routes, and overlays.      |
| [`src/globe/camera.ts`](../src/globe/camera.ts)                                                            | Interruptible camera travel, fitting, and looping flyovers.                |
| [`src/globe/regionSurfaces.ts`](../src/globe/regionSurfaces.ts), [`outlines.ts`](../src/globe/outlines.ts) | Cached regional surfaces and border draw order.                            |
| [`src/theme/themes.ts`](../src/theme/themes.ts), [`themes.css`](../src/theme/themes.css)                   | Palette registry and semantic UI properties.                               |

`src/app/daily.ts` and `src/game/journeys.ts` provide synchronous full-catalog APIs
for tooling/tests. Runtime scheduling uses the small generated
[`journeyIndex.json`](../src/game/journeyIndex.json), keeping clue geometry deferred.
The read-only playground intentionally imports the whole question catalog.

## Loading and transitions

Startup requests the world layer and manifest in parallel. The renderer, mode
panels, and Journey definitions use deferred imports. After Home's globe is ready,
idle preparation warms today's Journey and its question context, rather than all
Journeys. Prepared contexts reuse the world border graph and are cached.

Explore fetches only an activated subdivision branch; physical features load on
first activation. Layer loading validates structure, identity, and hierarchy and
supports cancellation, cache reuse, and error reporting. Manifest checksums are
preparation/test evidence; the runtime loader does not hash every fetched asset.

Ordinary mode switches retain the mounted globe, country bindings, and camera
memory. Panels transition for 220 ms, with the outgoing layer immediately inert.
Reduced motion removes that animation. Regional caps are built in short frame
batches and cached by renderer instance; country backing stays visible while a
new branch is prepared. Cold heavy-geometry entry still needs device profiling.

## Trustworthy globe state

Keep these responsibilities separate:

- **Eligibility:** which regions may be selected or studied.
- **Clues:** which regions, labels, and overlays may be visible before submission.
- **Response:** pending selections and pins, then graded feedback.
- **Camera:** frames the clue or selected scope without silently revealing an answer.

The Study builder previews the actual `studyPool` and hint settings. Scoped
sessions frame their eligible area; country-identification and typed/choice
capital questions can frame their visible clue. Capital map questions keep the
answer country undisclosed. Capital feedback reveals the target capital's marker
and name even when those hints were disabled.

Journey questions configure disclosure independently of answer mode. Future stage
labels remain `???` until active or completed. A pin's playable camera need not be
its grading target; results tours use answer geography in round order. Player
input, navigation, and reduced motion cancel animated travel.

Canonical `geometry` determines grading and connectivity. `displayGeometry`
reconciles subdivisions and masks the Great Lakes for rendering; it must not
replace canonical identity or silently change answer rules. Spherical geometry
copies normalize winding without mutating the source catalog. Renderer caches
and mesh bindings belong to the mounted globe, not the shared source objects.
Highlights use near-surface geometry and draw order rather than large elevation.

Idle motion and Fidget share playback state. Home enables rotation after focus;
Explore preserves it until interaction. Fidget restores prior playback and
retains polygon metadata needed for subsequent renderer refreshes. These contracts
have helper/DOM coverage; that is not proof of GPU appearance or frame rate.

## Themes and controls

Atlas, Ocean, Dusk, and Paper share semantic roles for text, editorial emphasis,
actions, land, selection, and feedback. UI consumes `--ui-*` custom properties;
portal dialogs inherit them from the document. Globe styles use the same registry
through [`src/globe/themes.ts`](../src/globe/themes.ts).

To add a theme, extend the palette registry and `ThemeId`, check semantic contrast
and geography feedback, and update the documentation. The menu derives choices
from the registry; unknown stored IDs fall back to Atlas. Do not hardcode a new
palette into a component or use visual color as the sole answer cue.

Use the existing `tertiary-action` class for low-priority actions and
[`ActionIcon`](../src/app/ActionIcon.tsx) for established action icons. Keep tooltips,
accessible labels, focus behavior, mobile targets, and reduced motion intact.

## Persistence and legacy code

See [Save persistence](SAVE_PERSISTENCE.md) for migration and recovery. Active Study
attempts are tab-private; settings and archived results synchronize independently.
Themes/default views have their own small preference stores.

[`src/app/publishedPuzzles.ts`](../src/app/publishedPuzzles.ts) reads previously
published IndexedDB packs with a bounded fallback. There is no active editor,
AI generation service, or draft-publication workflow. Product modes render
decorative geography. The shared renderer retains optional texture support and
attributed imagery, which ordinary product views do not request.

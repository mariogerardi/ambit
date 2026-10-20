# Architecture

Ambit is a client-side React/TypeScript application compiled by Vite. Product
routes share one Three.js/react-globe.gl renderer and local geography dataset.
Guest gameplay remains local. `src/services/accounts.tsx` manages Cognito
authorization-code/PKCE sessions with persistent user storage and tab-scoped
redirect state. `src/services/feedback.ts`
connects reports and admin review to API Gateway/Lambda/DynamoDB.
`src/services/progressSync.ts` synchronizes account-scoped Journey and Study
registers, using local storage as an offline upload queue.
`src/services/monitoring.ts` initializes Datadog RUM with the React plugin.
Backend infrastructure and handlers live in `backend/`; deployment and secret
provisioning use `scripts/deploy-backend.py`. See [Services](SERVICES.md).

## Module map

| Owner                                                                                                                              | Responsibility                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| [`src/App.tsx`](../src/App.tsx)                                                                                                    | Navigation, shared data, presentation composition, player actions and sessions.               |
| [`src/app/modes.ts`](../src/app/modes.ts), [`ModePanels.tsx`](../src/app/ModePanels.tsx)                                           | Route-to-mode mapping and overlapping panel transitions.                                      |
| [`src/app/dailyProgress.ts`](../src/app/dailyProgress.ts)                                                                          | New York daily scheduling and date-pinned Journey progress.                                   |
| [`src/app/recordSave.ts`](../src/app/recordSave.ts), [`progressSaves.ts`](../src/app/progressSaves.ts)                             | Independent save registers and domain-specific merges.                                        |
| [`src/game/journeyRegistry.ts`](../src/game/journeyRegistry.ts)                                                                    | Lightweight Journey metadata and lazy module loading.                                         |
| [`src/game/questionContracts.ts`](../src/game/questionContracts.ts), [`questionBuilder.ts`](../src/game/questionBuilder.ts)        | Type-only schemas, authoring entry point and structural validation.                           |
| [`src/game/questionPreparation.ts`](../src/game/questionPreparation.ts)                                                            | Canonical data validation, eligibility, answer resolution, topology and context caches.       |
| [`src/game/questionEvaluation.ts`](../src/game/questionEvaluation.ts), [`state.ts`](../src/game/state.ts)                          | Submission readiness, grading and round transitions.                                          |
| [`src/game/answerPresentation.ts`](../src/game/answerPresentation.ts), [`AnswerReview.tsx`](../src/game/AnswerReview.tsx)          | Response identities, depicted geography, slot outcomes and concise mistake/assignment review. |
| [`src/game/pinPresentation.ts`](../src/game/pinPresentation.ts), [`src/theme/playColors.ts`](../src/theme/playColors.ts)           | Display accuracy bands and semantic palette values independent of grades and points.          |
| [`src/geography/interiorAnchor.ts`](../src/geography/interiorAnchor.ts), [`src/globe/areaSymbols.ts`](../src/globe/areaSymbols.ts) | Display-only territory anchors and projected symbol fitting.                                  |
| [`src/game/presentation.ts`](../src/game/presentation.ts)                                                                          | Clue, selection, feedback, and disclosure states.                                             |
| [`src/game/reasoning.ts`](../src/game/reasoning.ts), [`spatial.ts`](../src/game/spatial.ts)                                        | Shared-edge adjacency, shortest paths, routes, and spatial predicates.                        |
| [`src/study/engine.ts`](../src/study/engine.ts)                                                                                    | Study pools, decks, methods, review pairs, completion, and history models.                    |
| [`src/study/useStudyPresentation.ts`](../src/study/useStudyPresentation.ts)                                                        | Study globe colors, scoped labels and borders, capital disclosure and clue focus.             |
| [`src/study/StudySetup.tsx`](../src/study/StudySetup.tsx), [`scopeFocus.ts`](../src/study/scopeFocus.ts)                           | Builder configuration and geographic scope framing.                                           |
| [`src/app/ExplorePanel.tsx`](../src/app/ExplorePanel.tsx)                                                                          | Search, country/subdivision details, and display settings.                                    |
| [`src/app/AccountDashboard.tsx`](../src/app/AccountDashboard.tsx), [`src/services/community.ts`](../src/services/community.ts)     | Profiles, compact progress dashboard and friends.                                             |
| [`src/geography/types.ts`](../src/geography/types.ts), [`loadLayer.ts`](../src/geography/loadLayer.ts)                             | Canonical geometry contracts and cancellable, cached layer loading.                           |
| [`src/globe/GlobeView.tsx`](../src/globe/GlobeView.tsx)                                                                            | Sole product renderer adapter: regions, places, routes, and overlays.                         |
| [`src/globe/camera.ts`](../src/globe/camera.ts)                                                                                    | Interruptible camera travel, fitting, and looping flyovers.                                   |
| [`src/globe/regionSurfaces.ts`](../src/globe/regionSurfaces.ts), [`outlines.ts`](../src/globe/outlines.ts)                         | Cached regional surfaces and border draw order.                                               |
| [`src/theme/themes.ts`](../src/theme/themes.ts), [`themes.css`](../src/theme/themes.css)                                           | Palette registry and semantic UI properties.                                                  |

`src/app/daily.ts` and `src/game/journeys.ts` provide synchronous full-catalog APIs
for tooling/tests. Runtime scheduling uses the small generated
[`journeyIndex.json`](../src/game/journeyIndex.json), keeping clue geometry deferred.
Admin’s “Preview five questions” loads only the selected Journey through its practice route.

`src/game/questions.ts` remains a compatibility facade for tools and existing clients.
Current source imports contracts, preparation, evaluation or text helpers directly.
Contracts are type-only. Preparation can validate structure through the builder,
but does not import the evaluator; evaluation consumes the prepared context and
answer resolvers. Shared name matching in `answerNames.ts` serves Journey, Study
and Explore without importing preparation/grading; `questionText.ts` owns prompt,
disclosure and feedback text. Registered control grading stays in `mechanics.ts`.

### App shell boundaries

`App.tsx` connects navigation, the persistent globe, presentation and player actions.
The following modules own their own lifetimes and can be read independently:

- [`useJourneyContent.ts`](../src/app/useJourneyContent.ts): deferred Journey/runtime
  loading, local-pack resolution, idle Home preparation, canonical context caching
  and render-only region warming. The shell supplies the active/offered Journey IDs.
- [`useWorldGeography.ts`](../src/app/useWorldGeography.ts): parallel world/manifest
  loading, deferred regional helpers, subdivision chains and versioned physical
  layers. It owns cancellation, errors and caches; the shell owns selection and cameras.
- [`usePlayerProgress.ts`](../src/app/usePlayerProgress.ts): account-scoped save
  instances, catalog-ready hydration, durable writes, incoming register merges,
  sync status, save retry and current-day reset. It delegates cloud transport to
  `useProgressSync`; the shell retains Admin authorization and gameplay decisions.
- [`useCameraOrchestration.ts`](../src/app/useCameraOrchestration.ts): mode/session
  entry, question and feedback framing, Study scope/preview/review cameras,
  recentering, rotation controls, reduced motion and completion flyovers. It receives
  the mounted globe/scene refs and current presentation destinations. The globe's
  `camera.ts` still owns animation, cancellation and live viewport fitting.
- [`HomePanel.tsx`](../src/app/HomePanel.tsx): today's Journey title, progress,
  Play/Resume/View result action and navigation; readiness is supplied by the shell.
- [`AdminPanel.tsx`](../src/app/AdminPanel.tsx): Schedule/Feedback/Tools tabs, calendar
  selection from the October 11 opening date, searchable Journey picker, explicit assignment, and compact reset
  tools. Tabs retain the editor; unpublished selections survive navigation within
  the browser tab through session storage. Date/month switches confirm before
  discarding a draft. The shell supplies protected feedback and account reset;
  choosing a Journey alone never publishes or alters a player's attempt.
- [`JourneyArchive.tsx`](../src/app/JourneyArchive.tsx) and [`archiveDates.ts`](../src/app/archiveDates.ts): public monthly archive, fixed October 11, 2026 opening date, historical assignment/edition resolution, and dated play routes. Missing history is unavailable, never replaced by a new seeded choice. The route date owns the visible attempt independently of the shared `activeDate` pointer.
- [`useStudyPresentation.ts`](../src/study/useStudyPresentation.ts): declarative
  Study globe state for the builder preview, visible session and summary review.
  It returns colors, places, border/name scope, disclosure flags and visible clue
  focus points. The shell supplies only the session being shown and composes the
  result with Journey/Explore/global layers. Saved sessions and previews cannot
  override other modes. Unchanged place and scope arrays survive answer typing.

`PlayerWorkspace` still remounts the entire workspace when the account subject
changes. Do not reset a save store merely because the catalog or route changed.
Journey contexts are invalidated when the canonical world array is replaced;
navigation reuses prepared contexts. A cancelled load or idle callback must not
publish late data into the active view. The shell owns the shared renderer and
supplies route/session identity to camera orchestration; navigation does not replace Earth.
Study presentation does not access the globe, measure the viewport or start a
camera flight. Scope fitting remains in `scopeFocus.ts`; camera orchestration
decides when to travel, retains the live orbit and keeps hidden map answers out
of the camera. Travel is triggered by entry, question identity/phase or an explicit
player action, not arbitrary presentation-object changes. Hint/display edits and
answer typing must not restart a flight. Home-country entry intent is captured
before effects consume its queued focus, so Explore retains the tapped selection.
Completion effects cancel their flyover on exit or reduced-motion changes.

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

The Study builder configures the actual `studyPool` and hint settings. Building
or customizing a session on mobile raises the content panel and hides the mounted globe;
desktop keeps its sidebar and previews the selected Study area on the live globe.
Configuration changes do not reposition the hidden mobile camera. Scoped sessions
frame their eligible area; country-identification and typed/choice
capital questions can frame their visible clue. Capital map questions keep the
answer country undisclosed. Capital feedback reveals the target capital's marker
and name even when those hints were disabled. Named-country map prompts require
an actual globe selection; typing remains available when the answer name is not
in the prompt. Capital multiple choice separates the studied countries from its
distractor pool: selected-country capitals, same-continent capitals, cities in the
target country, worldwide cities, or worldwide capitals. City options use their
own place IDs and the bundled major-city catalog; countries without another city
are excluded from a session using country-city capital multiple choice.

The Study cog groups report/edit/finish actions on desktop and mobile. On phones,
correct answers stay visible longer before automatic advance. Explore selections use tighter
camera framing. Home magnifies the mobile globe projection by 20% behind its
transparent bars. Explore measures its content to fit the open tray, capping long
details at 45% of the visible height; the map, controls, and tray boundary animate
with the existing enlargement timing. The mobile tray remains mounted between
modes so its position can interpolate. Projection magnification blends over
720 ms; tray resizing updates the viewport without cancelling active camera
travel or tours. Keyboard detection retains the viewport height before focus,
including Safari layouts where both viewports shrink. The keyboard layout hides
the mounted globe and keeps the prompt and submit control available in the
scrolling question pane. Quiz fields disable text correction and use response
metadata rather than address-like placeholders.

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

Idle motion and Fidget share playback state. Home, Explore, Archive and the Study overview
continue from the globe's live orientation with rotation enabled; returning from
a close view zooms out smoothly. Explore clears its prior selection on mode entry,
and neither Explore nor Study stores/restores a mode-specific camera position.
Legacy saved camera defaults are no longer applied. Globe display preferences
are saved separately and do not move the camera. Camera flights fit their destination against the live viewport while panels move.
Overview flights recalculate their world framing as the viewport settles; hidden
mobile pages retain the normal map frame instead of a full-screen fitting area.
Fidget restores prior playback and
retains polygon metadata needed for subsequent renderer refreshes. These contracts
have helper/DOM coverage; that is not proof of GPU appearance or frame rate.

## Themes and controls

Explore and Study panels load with the app shell so their first navigation renders
content directly instead of a module-loading placeholder. The globe and Journey
runtime retain their separate loading paths.

The globe stays mounted and measurable while hidden during initial loading. Once
its renderer and geography are ready, two animation frames allow the populated
scene to paint before a single fade and gentle scale-up reveal. This affects only
the canvas presentation; navigation never repeats it or changes the camera to
produce it. Reduced motion reveals the globe immediately. Loading copy is omitted,
but geography and WebGL errors remain visible.

Account access lives beside the menu in the header, opening profile, stats, and
friends. Friends mixes daily activity cards with comparisons for matching Journeys.
Accepted friends can open profiles and aggregate Study stats; scores unlock only
when the viewer has synced completion for the same date, Journey and game version.
Study sessions vary in difficulty and are not ranked. Account IDs own friendships
and progress independently of case-insensitive, atomically reserved handles.
The editor checks availability and suggests alternatives, while saving remains
protected against concurrent claims. Profile links prefill the friend finder.
Activity pages contain at most 24 friends, with bounded server fan-out and cached
summaries invalidated by progress sync. See [services](SERVICES.md) for API behavior.
Dashboard, Profile, Friends, and the protected Admin tab share one persistent
account header and navigation bar. `/account?tab=dashboard`, `profile`, `friends`,
or `admin` selects the content; Admin uses `section=schedule`, `feedback`, or
`tools` for its compact secondary controls. Tab navigation updates browser history
without remounting the account shell or replaying its entry animation. Admin mounts
on first use and stays mounted when switching account tabs, retaining its editor.
Legacy `/admin` links replace their URL with the matching account destination.
The menu groups Home, Journey (with Archive nested beneath it), Explore, and Study
above feedback, credits, and theme settings. Its heading is simply “Ambit”. Explore opens search
through the underlined introduction link. Selected-country
details keep the input out of their layout; “Search another country” opens a
floating search box without clearing or reframing the current selection. A shared
cog beside the globe motion controls opens display settings in Home, Explore and
the Study overview. Preferences save automatically in `wurl.globe-layers.v1`;
legacy display choices migrate without restoring a camera. On mobile, rotation
speed is also in this popup so the control strip stays compact. Settings and floating
search use opaque theme surfaces. Country actions form a compact toolbar above
the subdivision toggle; changing countries clears the prior regional branch and
selection, including entry from Home. Quiz display
hints remain governed by question disclosure and Study session settings.
Leaving a Study builder skips the outgoing panel copy, which would otherwise
remount the editor as the Study overview during the exit animation.

Atlas, Ocean, Dusk, and Paper share semantic roles for text, editorial emphasis,
actions, land, selection, and feedback. UI consumes `--ui-*` custom properties;
portal dialogs inherit them from the document. Globe styles use the same registry
through [`src/globe/themes.ts`](../src/globe/themes.ts). Journey color values come
from [`playColors.ts`](../src/theme/playColors.ts); reference land, reference
accents, open search, finite candidates, outcomes and recap have separate roles.
Eligibility comes from the input contract, not a fill color. Bare area symbols
fit display interiors; actual locations retain point markers. Recaps retain
actual mistakes separately from reviewed discoveries, including custom scenes.
See the [authoring visual grammar](JOURNEY_CRAFTING.md#5-give-the-globe-purposeful-question-state-information).

To add a theme, extend the palette registry and `ThemeId`, check semantic contrast
and geography feedback, and update the documentation. The menu derives choices
from the registry; unknown stored IDs fall back to Atlas. Do not hardcode a new
palette into a component or use visual color as the sole answer cue.

Use the existing `tertiary-action` class for low-priority actions and
[`ActionIcon`](../src/app/ActionIcon.tsx) for established action icons. Keep tooltips,
accessible labels, focus behavior, mobile targets, and reduced motion intact.

## Persistence and legacy code

See [Save persistence](SAVE_PERSISTENCE.md) for migration and recovery. Active Study
attempts, settings, and archived results synchronize independently for signed-in players.
Themes/default views have their own small preference stores.

[`src/app/publishedPuzzles.ts`](../src/app/publishedPuzzles.ts) reads previously
published IndexedDB packs with a bounded fallback. There is no active editor,
AI generation service, or draft-publication workflow. Product modes render
decorative geography. The shared renderer retains optional texture support and
attributed imagery, which ordinary product views do not request.

Journey-specific authoring and extension boundaries are documented in
[Journey engine and extension contracts](JOURNEY_ENGINE.md). It distinguishes
current contracts from proposed next steps as mechanics and scenes grow.

### Retained compatibility and cleanup boundaries

The current catalog has one metadata index, `JOURNEY_INDEX`; the former separate
availability alias is gone. The globe has one product layout, shared by all modes;
the prototype lab layout and its unused controls/styles have been removed.
Global typography, the logo, canvas behavior and accessibility styles live in
`src/style.css`; mode-specific layouts remain in their existing stylesheets.
`src/app/ErrorBoundaries.tsx` owns globe/panel failure containment separately from
the app's navigation and session orchestration.

Compatibility that still protects player data remains intentional: record-save
migration and recovery, retired Journey IDs, `supersedes` assignment aliases,
in-place receipt labels and read-only IndexedDB packs. The `studio:` geometry
source convention still supports those recovered packs. The old crafting filename
is a redirect to the single maintained guide, not another policy document.
Test evaluator fixtures are not archived playable Journeys. Trace consumers and
save recovery before removing any of these paths.

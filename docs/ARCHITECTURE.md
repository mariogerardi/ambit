# Architecture

Ambit is a client-side React/TypeScript application compiled by Vite. Product
routes share one Three.js/react-globe.gl renderer and local geography dataset.
Guest gameplay remains local. `src/services/accounts.tsx` manages Cognito
authorization-code/PKCE sessions with persistent user storage and tab-scoped
redirect state. `src/services/feedback.ts`
connects reports and admin review to API Gateway/Lambda/DynamoDB.
`src/services/progressSync.ts` synchronizes account-scoped Journey and Study
registers in IndexedDB, with a LocalStorage journal for synchronous offline writes.
`src/services/monitoring.ts` initializes Datadog RUM with the React plugin.
Backend infrastructure and handlers live in `backend/`; deployment and secret
provisioning use `scripts/deploy-backend.py`. See [Services](SERVICES.md).

## Module map

| Owner                                                                                                                              | Responsibility                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| [`src/App.tsx`](../src/App.tsx)                                                                                                    | Navigation, shared data, presentation composition, player actions and sessions.               |
| [`src/app/modes.ts`](../src/app/modes.ts), [`ModePanels.tsx`](../src/app/ModePanels.tsx)                                           | Route-to-mode mapping and sequential panel transitions.                                       |
| [`src/app/dailyProgress.ts`](../src/app/dailyProgress.ts)                                                                          | New York daily scheduling and date-pinned Journey progress.                                   |
| [`src/app/recordSave.ts`](../src/app/recordSave.ts), [`progressSaves.ts`](../src/app/progressSaves.ts)                             | Independent save registers and domain-specific merges.                                        |
| [`src/app/registerStorage.ts`](../src/app/registerStorage.ts)                                                                      | Transactional history storage, durable edit journal and cross-tab cache updates.              |
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
| [`src/app/AccountDashboard.tsx`](../src/app/AccountDashboard.tsx), [`src/services/community.ts`](../src/services/community.ts)     | Profiles, Progress, private Settings and friends.                                             |
| [`src/geography/types.ts`](../src/geography/types.ts), [`loadLayer.ts`](../src/geography/loadLayer.ts)                             | Canonical geometry contracts and cancellable, cached layer loading.                           |
| [`src/globe/GlobeView.tsx`](../src/globe/GlobeView.tsx)                                                                            | Sole product renderer adapter: regions, places, routes, and overlays.                         |
| [`src/globe/camera.ts`](../src/globe/camera.ts)                                                                                    | Interruptible camera travel, fitting, and looping flyovers.                                   |
| [`src/globe/regionSurfaces.ts`](../src/globe/regionSurfaces.ts), [`outlines.ts`](../src/globe/outlines.ts)                         | Cached regional surfaces and border draw order.                                               |
| [`src/theme/themes.ts`](../src/theme/themes.ts), [`themes.css`](../src/theme/themes.css)                                           | Palette registry and semantic UI properties.                                                  |

`src/app/daily.ts` and `src/game/journeys.ts` provide synchronous full-catalog APIs
for tooling/tests. Runtime scheduling uses the small generated
[`journeyIndex.json`](../src/game/journeyIndex.json), keeping clue geometry deferred.
Admin's library loads only the selected Journey for its outline. Review uses the
protected practice route with `?review=1` and separate in-memory game state.

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
  Long departures from a local close-up first pull back to an orbital view, then
  rotate at that distance before approaching the destination. Nearby local
  reframing retains its existing smooth scale change; reduced motion jumps directly.
- [`HomePanel.tsx`](../src/app/HomePanel.tsx): today's Journey title, progress,
  Play/Resume/View result action and navigation; readiness is supplied by the shell.
- [`AdminPanel.tsx`](../src/app/AdminPanel.tsx): Schedule/Journeys/Feedback tabs, calendar
  selection from the October 11 opening date, searchable Journey picker, explicit assignment, and compact reset
  tools in Maintenance. Tabs retain the editor; unpublished selections survive navigation within
  the browser tab through session storage. Date/month switches confirm before
  discarding a draft. The shell supplies protected feedback and account reset;
  choosing a Journey alone never publishes or alters a player's attempt.
- [`AdminJourneys.tsx`](../src/app/AdminJourneys.tsx) and
  [`AdminJourneyReview.tsx`](../src/app/AdminJourneyReview.tsx): catalog browsing,
  five-question outlines and isolated review controls. Review reuses the shell,
  reducer and audit response samples; it never writes a Daily attempt. A reviewed
  Journey passes to a date-choice preview before explicit publication.
- [`Toast.tsx`](../src/app/Toast.tsx): shared bounded, dismissible notifications
  above account workspaces; transient confirmations pause on focus/hover and
  failures remain visible. Inline validation remains owned by its form.
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

Startup requests the world layer and manifest in parallel. The renderer, Journey
definitions, Explore and Study panels, minigame play panel, account dashboard,
and Admin interfaces use deferred imports. Shared gameplay engines, the minigame
menu/tour, and U.S. state geometry remain eager dependencies of the shell.
Border Run imports only Three's triangulation and vector helpers, keeping the
full renderer out of the entry bundle. After Home's globe is ready,
idle preparation warms today's Journey and its question context, rather than all
Journeys. Prepared contexts reuse the world border graph and are cached.

Explore fetches only an activated subdivision branch; physical features load on
first activation. Layer loading validates structure, identity, and hierarchy and
supports cancellation, cache reuse, and error reporting. Manifest checksums are
preparation/test evidence; the runtime loader does not hash every fetched asset.

Ordinary mode switches retain the mounted globe, country bindings, and camera
memory. Animated panel switches finish the 220 ms exit before starting the 220 ms
entrance. Desktop exits retain the same panel DOM and component state so completion
animations do not restart during departure. Returning to the exiting page cancels
that exit without mounting a duplicate. The outgoing layer is immediately inert; incoming content can load but
stays hidden, inert and inactive for focus effects until the exit's animation-end
event. A 320 ms fallback recovers from a missing event. Rapid navigation retains
one visible exit and opens the latest requested destination. Reduced motion removes
animation; existing no-exit/page-layout paths skip the exit wait. The mobile tray retains its
mounted node and existing motion behavior. Regional caps are built in short frame
batches and cached by renderer instance; country backing stays visible while a
new branch is prepared. Cold heavy-geometry entry still needs device profiling.

Deferred globe/geometry bundles remain substantial. `useGlobeRecovery.ts` reports
WebGL context loss, unmounts the failed renderer and attempts one rebuild after
500 ms. A second loss requires the player's Retry globe action. Sessions, drafts
and saves remain mounted; recovery captures the last readable camera view. A
renderer exception also exposes manual retry. Study's written alternative does
not replace every visual clue.

A narrow October 2026 check in headless Chrome with actual Apple M1 Max/Metal
WebGL kept one connected canvas across four Explore/Study/Home cycles. Median
and p95 frame intervals stayed near 16.7 ms; buffer/program counts stabilized
after warmup. Forced context loss rebuilt one live canvas within the 1.8-second
observation window, preserving the page, with no uncaught errors. These are local
development measurements with a mocked schedule, not mobile/heavy-region GPU
benchmarks. Neither a build nor mocked renderer tests establish GPU performance.

A follow-up exercised an actual Sahara brush stroke and cold/warm US subdivision
toggles on the same GPU. Drawing changed the shape, warm drawing/toggles retained
about 16.7 ms median/p95 intervals, and three subdivision cycles held stable at
3,926 buffers, 70 textures and six programs in one connected context. Cold work
showed 60–135 ms stalls; a repeat drawing sample was smooth after warmup. A narrow
390×844 viewport used this desktop GPU and does not establish phone performance.
No uncaught errors occurred. Cold preparation and device profiling remain open;
the observations do not justify rebuilding rendering infrastructure.

## Trustworthy globe state

Keep these responsibilities separate:

- **Eligibility:** which regions may be selected or studied.
- **Clues:** which regions, labels, and overlays may be visible before submission.
- **Response:** pending selections and pins, then graded feedback.
- **Camera:** frames the clue or selected scope without silently revealing an answer.

Study opens **Your Sessions** at `/study`, showing the current unfinished run
above compact past-result rows, or starting/review actions when no run is active.
Its globe previews the current session's declared geographic scope without
framing or revealing its current answer. Separate
**Study Packs**, **Session Builder**, and **Review** tabs use `view=packs`,
`view=builder`, and `view=review`. Legacy `view=history` and `view=custom` links
still resolve. Historical results use `view=results&record=<id>` without replacing
the active run. Starting another run confirms replacement, archives answered
progress, and pauses automatic advance while the dialog is open. Ending an
unanswered session returns to Your Sessions without creating an empty result.

Study Packs previews one of ten ready-made configurations at a time on the live globe.
Previous/next arrows wrap through the packs; the selected pack contains its
premise, settings, Start action and Customize link to Session Builder.
Previewing a pack changes no running session or saved configuration. The builder
provides clickable Topics, Area, Answer method, Session length, and Advanced
options sections, with at most one expanded at a time; all can be closed. Headers
retain current selections; changing a selection does not advance sections.
Area supports single continents, whole-continent combinations (stored as custom
country IDs), and individual countries. Advanced options summarizes changes from
the standard defaults and can reset those options without changing the exercise.
The per-topic
control is disabled and shown unchecked for fewer than two topics, retaining its
saved preference and methods internally. With multiple topics, this checkbox
switches between a shared dropdown and individual topic dropdowns. Historical
rows use compact topic/area titles and open results through the main row; replay
and Review actions live on the result page.
Active questions omit section navigation and the setup recap; results retain
section navigation without a duplicate Your Sessions footer link. Study panel
styles attach to each `.study-view` rather than the app's current mode, so outgoing
content retains its typography and sizing until its exit animation finishes.

`study/learning.ts` derives a personal review queue from retained Study answers,
including minigame map-review sessions. It separates recognition, location and
capital skills, deduplicates saved session snapshots and schedules checkups using
a conservative interval heuristic. Misses return sooner. Immediate repetitions
and assisted answers do not increase confidence; recognition-only successes
cannot establish confidence alone. Review varies compatible response methods;
location-only skills retain their applicable pin method. New reviews offer exactly
10, 20, 50, or 100 questions, defaulting to 10; retries count toward that length.
The full retained review pool is shuffled deterministically from skill identities
and attempt counts; unchanged history gives the same order after reload, and
longer reviews extend the same prefix. A shorter pool cycles through
available items with compatible methods; misses return after other items.
Older saved reviews without a question count retain their queue-based finish and
30-answer cap. The review globe continuously circles the next ten distinct
country/capital locations at a steady zoom, with anonymous labels and gentle
latitude changes. It pauses for interaction and holds one view for reduced motion.
Preview settings and locations pass together between visible panels, retaining
the outgoing globe until the incoming panel takes over. Builder uses the same
exit animation sequencing as other Study panels. Scene and camera handoffs retain
the outgoing result or preview until the destination supplies its complete preview. Raw minigame
results are not automatically imported into this queue.
The Review summary separates skills due now from confidence: due skills can be
either building confidence or confident. An inline explanation clarifies these
overlapping counts and that a place can contribute more than one skill.

Study topics include countries, capitals, flags, major cities, and landmarks.
`study/placeTopics.ts` reuses the shipped major-city catalog and minigame landmark
catalog, including landmark photography and attribution. Geographic scopes filter
places by their parent country. For cities and landmarks, Select on globe asks
for the containing country, Place a pin checks a 50 km radius, and typing/choices
identify an anonymous map marker. Landmark questions also show their photograph.
Recognition, country association, and exact location remain separate Review skills.
Complete passes cover each eligible place/topic pair once.

Study setup configures the actual `studyPool` and hint settings. Inline
customization keeps the globe visible on desktop and mobile; only the in-session
mobile preferences panel temporarily hides it. Scoped sessions
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

Study also offers an explicit **Place a pin** method for countries, flags and
capitals. Country and flag answers grade canonical country containment; capitals
accept pins within 50 km of the capital. Pin prompts hide answer locations until
feedback, show a movable guess and require submission. Feedback describes the
actual country or distance, including old minigame-review saves. The existing
Mixed method retains its select/type/choice rotation; pin placement is opt-in.
`study/pins.ts` shares target resolution, grading and feedback with minigame reviews.

The Study cog offers hints/pacing, pause and finish actions on desktop and mobile.
Minigame map reviews use ordinary session controls rather than friend-challenge
copy. Typing and choice questions remain usable without WebGL; pin and named-country
map questions explain their globe requirement. On phones,
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
Camera selections use the original gentle close-up flight at every scale,
with its curved route and final approach. Nearby adjustments take 1.4 seconds;
longer flights take 2.6–3.2 seconds. Explicit overview-tour timings are preserved.
City-to-wide-view flights spread their pullback over most of the trip, avoiding
a rapid departure zoom while retaining the same overall duration.
Country-scale travel adds no decorative pullback; local flights retain their surface clearance.
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

The header avatar opens direct navigation to Progress, Friends, Profile, Settings,
and (for administrators) a separated Admin entry. Guests go directly to sign-in. The account menu dismisses
on outside interaction, focus leaving it, Escape, or navigation. Progress offers
today’s Journey, Study continuation, and recent Journey/Study activity. Its Journey
stats include current/longest day streak, finished runs, perfect point totals and
answer accuracy. Study stats include completed sessions, answers/accuracy, distinct
countries practiced and the best correct-answer streak within one session. These
are derived from saved history, deduplicating Journey attempts and Study record IDs;
ongoing attempts are excluded. Historical points keep their existing scoring rules.
Profile contains public identity, with a compact preset-avatar picker beside the
flag selector. Settings contains Appearance and a small signed-in identity/sign-out
footer. Sync warnings and a retry action appear only when syncing needs attention;
there is no separate Account & sync panel. Friends leads with the matching Journey’s
comparison, followed by finding, inviting and managing friends. The directory and
same-day comparison share their first activity response; comparison pagination only
fetches remaining pages. The account shell retains the last same-day response in
memory across account tabs, scoped to its signed-in subject. Refreshes keep settled
rows visible; cold loads reserve the comparison footprint without transient sync
messages. Friend profiles separate identity, aggregate stats, today’s Journey and
shared results. Scores still come from server-permitted activity responses.
Accepted friends can open profiles and aggregate Study stats; scores unlock only
when the viewer has synced completion for the same date, Journey and game version.
Study sessions vary in difficulty and are not ranked. Account IDs own friendships
and progress independently of case-insensitive, atomically reserved handles.
The editor checks availability and suggests alternatives, while saving remains
protected against concurrent claims. Profile links prefill the friend finder.
Activity pages contain at most 24 friends, with bounded server fan-out and cached
summaries invalidated by progress sync. See [services](SERVICES.md) for API behavior.
Progress, Friends, Profile and Settings share a persistent account shell with compact
section headings and responsive side navigation. Admin uses the full workspace,
without a personal greeting or the account sidebar; a back action returns to Progress. `/account?tab=dashboard`, `profile`, `friends`,
`appearance`, or `admin` selects the content (the existing `dashboard` and `appearance`
URL keys remain compatible with Progress and Settings); Admin uses `section=schedule`, `journeys`, `feedback`, or
`tools` for compatibility (Tools opens Maintenance); the visible navigation is
Schedule, Journeys and Feedback. The agenda and optional calendar share one selected
date; Journey browsing and picking share the same list and expandable outlines. Validated Admin `date` and `journey` parameters carry
scheduling context across review/sign-in; optional review `question` selects a known
question in the isolated reducer state. Date-first and Journey-first selection
converge on one editor, with explicit publishing and themed confirmations. Tab navigation updates browser history
without remounting the account shell or replaying its entry animation. Admin mounts
on first use and stays mounted when switching account tabs, retaining its editor.
Legacy `/admin` links replace their URL with the matching account destination.
Home places a full-width Minigames card with a NEW! badge above Explore and Study.
Journey archive is a separate full-width card above Minigames, using the Journey
panel's editorial colors and two empty shapes peeking out to the left. The stack
stays inside one button's footprint and adds no extra focus or hit targets.
`/minigames` presents one selected game card, with its name between previous/next
arrows and a full-width, horizontally scrollable game menu above the title.
`/minigames/<slug>` selects that card, with inline instructions and Play/Resume.
Customization opens from a small disclosure below Play. A permanent session panel
contains a high-score callout and Start new game.
Replacing an unfinished run requires a themed in-app confirmation; canceling or
pressing Escape preserves its progress and score. The dialog traps focus and
keeps the underlying workspace inert. Pinpoint omits the scoring dropdown.
Unfinished sessions add progress (Correct so far/Strikes, or Round/Points) and
equal-width Resume/Start new game actions. Resume leaves the saved run intact. The menu does not use preview
modals or illustrations; result sharing still uses its existing artwork.
Entry prepares only the selected game's controller and preview examples. Other
games prepare on selection; Pinpoint search contexts are computed on first use
and cached, rather than framing every target country during pool construction.

`useMinigameTour.ts` drives a repeating westward 360-degree orbit with four Shared
Neighbors, four Missing Borders, four Border Run and five Pinpoint examples.
The curated questions and evaluated example responses in `minigameDemos.ts` use
existing contracts. `minigameWorld.ts` supplies the same reveal presentation to
live games and demos; `minigameContext.ts` shares canonical context preparation.
A single animation clock advances the camera and logical scene stages; React
updates only at stage changes. The globe's `orbitView` applies immediate,
viewport-fitted camera positions while normal camera orchestration yields control.
Country state fills and border opacity blend globally over 160 ms (instant for reduced motion),
including interrupted changes; explicit Border Run reveals retain their timing.
Dropped pins draw above target bullseyes and other map markers, below place names. Label placement reserves
the pin’s body above its geographic tip, and island/clue locators avoid pins. A finite, pin-colored placement ripple draws in the Three.js marker layer below
the pin, so it cannot cover the pin like a DOM overlay. Border Run pulse occlusion
reserves actual panels, not the flags it explains. Boundary outlines retain source edges before
renderer subdivision so hidden-border omissions cannot leave small resampled remnants.
No second globe, new response mode or demo save register is introduced.

The tour begins near the current view, slows through each example and crosses the
remaining ocean/land arc before repeating. Matching endpoint velocities smooth
acceleration into each leg; examples use regional framing, with zoom easing outward during travel.
Missing Borders has an authored eight-country search neighborhood per example.
Upcoming demo pairs are merged before arrival. Missing Borders skips the selected
phase and separates the answer directly on reveal. The revealed pair stays separate
as the camera leaves, avoiding a cached composite-color flash; travel uses normal globe colors.
Preview color transitions share a continuous scope, and newly separated answer
countries explicitly fade from the unrevealed fill. Live questions retain their
per-question reset. Its camera closes in over 2.2 seconds while continuing
westward, with matching speed at the following travel leg. Demo names use interior
anchors and flexible placement to avoid hiding neighboring names. Questions
remain visible for 4.3 seconds before the example response, then reveal at 5.1 seconds. Switching
games keeps the animation clock running and joins the nearest example from the
current pose and velocity. A small caption below the globe contains the question (or a touring message
between examples) and play/pause styled like Home. Travel restores
default country borders. Demo pins drop into position; Pinpoint bands
use dark gray outside the highlighted country even before reveal. Shared Neighbors
and Border Run use light gray for their open search before reveal and dark gray
afterward; Missing Borders keeps excluded land dark in both phases. Pinpoint rings
fade in from the bullseye outward without score labels. Three equally spaced
illustrative distance rings scale to the highlighted country's distance bands,
capped at 650 km, with two rings inside the outer ring; they do not depict the
1 km scoring boundary. The bullseye marker is 34 pixels.
These menu rings do not change live scoring. Demo pins land on the bullseye. Border Run uses the live reveal cadence and keeps the finish country
in the bright clue fill until the route reaches it, matching the reveal fade's
starting color. Pinpoint previews frame the highlighted country's search footprint,
rather than centering the hidden target. Pause/Resume and dragging are supported;
hidden tabs suspend its clock; customization leaves the tour running. Leaving the menu cancels animation.
Reduced motion has static examples with manual answer/next controls. Demo questions
matching an unfinished run's current question are excluded. Demos never call live
start/answer/save actions. Shibuya Crossing is a sourced demo-only landmark and
does not enter the live Pinpoint pool. Switching games clears previous example
geometry and overlays during the camera join, preserving the shared globe. An empty filtered live
pool disables Play and offers settings reset, independently of demo availability.

Study packs use the same declarative scope preview and camera framing as the
builder, with Start and Edit in Session Builder actions. Scoped previews
frame their eligible area; worldwide previews return to the rotating world view.
Preview labels/markers explain the selected geography separately from the actual
quiz hints. Mobile setup and inline customization keep the globe visible. Custom country
selection accepts globe picks; ordinary template previews do not change the list. Minigame settings snapshots apply when starting a
new game, with an unfinished-run replacement notice when necessary.
Shared Neighbors plays at `/minigames/shared-neighbors/play` on the same mounted
globe. `src/minigames/sharedNeighbors.ts` derives every eligible pair with one
common neighbor from the complete canonical border graph, including adjacent
clue countries. Each seeded shuffle visits the full pool once, then reshuffles;
there is no difficulty filter. A single-question contract reuses `pin-inside`
grading and Journey map presentation, keeping the answer and surrounding borders
hidden until submission. Small clue-country rings remain visible during pin input
without becoming pick targets or exposing the hidden answer. The existing pin
cursor applies to all coordinate-pinning input. Framing uses the given countries before submission and
the answer on reveal. Device-local, account-scoped registers preserve the deck,
pin, feedback, score, and finished result. Three wrong answers end a run after
revealing the last answer. Players can also Finish game early; an unsubmitted pin
does not count. Back to games pauses an unfinished run, and Play again starts a
fresh shuffle with a reset score. Focused coverage lives in the
`shared-neighbors-minigame`, `shared-neighbors-save`, and
`shared-neighbors-minigame-shell` tests.
Missing Borders plays at `/minigames/missing-borders/play` through the same
`useBorderMinigame` controller and `BorderMinigamePanel`. Its pool is generated
from shared canonical segments between eligible countries. Each question reuses
`merged-region-single`: the round's search area determines selectable countries, the original
members are replaced by one anonymous composite, and a pick immediately grades
and restores the real boundaries. A reveal-only accent traces the actual shared
display edges, keeping separate boundary components separate and respecting reduced motion.
The shared edges are omitted from both ordinary country outlines on reveal, so
the gold stroke is the only restored boundary; exterior borders stay intact. `missingBorders.ts` anchors the view near the
actual erased boundary (including overseas components). Continent-wide is the
default: the camera centers consistently on that continent at a continent-specific scale, and
other continents are not valid answers. Regional search uses a narrower subset
chosen by a seeded search circle. The camera then centers and fits the selectable
land within that circle, independently of eligibility, so coastal search areas
do not frame mostly ocean. Remote composite components
outside the search area cannot accept picks; ignored picks do not cost strikes.
Reloads preserve the same view. The game uses the
same three-strike/finish/restart flow with independent saved progress. Focused
coverage lives in `missing-borders-minigame` and `missing-borders-minigame-shell`.
Border Run displays start/finish flags before submission, then reveals countries
and numbered crossings sequentially. Countries and markers fade over 180 ms,
with crossings interleaved between country steps at 110 ms intervals. Render-clock
materials handle color blending without rebuilding geography. Flag footprints
take priority over overlapping island rings; the finish flag uses fitted checks.
The final crossing uses a subtle success-green ripple with a thin dark casing,
shared with the Border Run menu preview. It starts with the final crossing marker,
including during camera travel. Reduced motion keeps a static completion ring and
shows the complete route immediately. Reveal progress is ephemeral and never
changes scoring or saved progress.
Border Run (`/minigames/border-run/play`) uses numeric questions whose minimum
is computed on a connected-land-component graph in `borderRunTopology.ts`.
Ownership never links separate islands or overseas components. Multi-source
breadth-first searches find minimum country crossings, and numeric grading reuses
`manual-number`. Borders are hidden by default, with a saved Show borders option.
`borderRunPath.ts` chooses shared-boundary portals, triangulates each participating
polygon, and finds and simplifies an interior corridor. It rounds bends only where
the replacement stays inside land; holes and concave shores remain constraints.
The corridor is used for camera fitting only. Reveals display numbered badges
on actual shared-boundary crossings, with a repeating pulse on the final crossing (a static ring for reduced motion),
rather than a connecting line. Entry framing uses the actual endpoint components;
reveal framing fits the full route. These are schematic land corridors derived
from canonical boundaries, not transport-network data.

Pinpoint (`/minigames/pinpoint/play`) reuses `pin-distance` and `pin-inside` for ten
rounds. The pool includes primary capitals, bundled cities with a source population
of at least one million, 60 curated Wikidata landmarks across 60 countries, eligible
countries and the 50 bundled US states. There are 58 attributed, locally bundled
landmark photos. Category choices are random; selection then chooses a country
before a place, avoiding repeated countries within a run where possible. This
keeps large Chinese/Indian city catalogs from dominating the draw. New runs persist
`pinpointRules: regional`: cities and landmarks highlight a country, or a bundled
U.S. state when available. Areas with at least six bundled reference cities stand
alone; smaller areas broaden to seven nearby reference cities and highlight their
countries/states equally, without identifying which country contains the answer.
These references frame the search; they do not add answers or change saved decks.
Question framing fits the highlighted regional footprints,
including nearby islands but excluding remote overseas outposts. Reference-city
positions select the countries/states; their geometry determines the view and scoring
radius. The distance score remains 1–1,000; the exponential scale is one quarter of
that search radius, bounded to 20–500 km, with a 0.1–1 km bullseye. Broader searches
therefore broaden the feedback rings too. Submitted scores are not recalculated.
Reveals center the answer at a scale fitted to its rings, without pulling back beyond
the search view. Pin-to-answer connectors are dashed during feedback and dotted
on the end-of-game results flyover.
Dash spacing stays in screen pixels, matching the short strokes used by UI trails.
Area targets retain canonical
containment scoring. Existing unversioned runs retain the world-search curve
`round(1000 * exp(-max(0, km-1)/1500))` and their deck. The two editions use separate
personal-best keys (`v3` regional, `v2` legacy), while preserving saved runs and history.
Feedback rings preserve the active edition's radii, use distinct preview-tier colors,
and sit on the map annotation shell rather than above the land. Demos highlight the supplied country;
no image or location API is queried during play. The controller caches base graphs,
land topologies and display meshes.

Shared Neighbors and Missing Borders use the Journey answer treatment, show the
submitted mistake separately, and mark its geography as incorrect.
Pinpoint feedback keeps the score/distance beneath its existing question/photo;
it does not repeat the target name and explanation. Missing Borders omits the
generic explanation that restates the answer. Search-area callouts are omitted.
Missing Borders scopes fill/border fades to the current question so a new map cannot
briefly inherit cached answer colors or outlines; reveal transitions within that map still fade.
All four games share a compact score/strikes row, Journey-style answer feedback and separate results
overview. A terminal answer stays in feedback until **See results**; finishing
early goes directly to the overview. The latest 64 submitted visits preserve
revealed country IDs, outcome and pins. The overview highlights those areas and
pins, with up to six sampled flyover stops including missed-pin locations;
reduced motion uses the overview focus. Replay appears only on the overview.
Personal bests are recorded only for each game’s default rules, using the active
run’s settings snapshot. Custom games retain progress but do not record or display
a personal best. The settings footer announces eligibility beside Reset settings.
Default-rule records survive replay and merge by maximum.
Results group equal-width Play again and Choose another game actions using the
preview session-panel styles. Study and Share sit below as quieter actions; Study
appears only when review targets exist. `minigameReview.ts` deduplicates
missed countries (neighbors, merged-border pairs, or route countries); Pinpoint
reviews targets scoring below 500. Misses are retained independently of the
64-visit recap, with target metadata for Pinpoint's named places. `placeReview.ts`
creates a one-pass pin Study session: region targets grade canonical containment,
and point targets use Pinpoint's 500-point threshold. These sessions use the
existing Study save/history flow and hide the answer until feedback.
`minigameSharing.ts` draws a result card with each game's themed preview illustration,
without answer geography, using the Journey share dialog's native-share/download flow.
Focused coverage for the new games and completion behavior lives in
`extra-minigames`, `extra-minigames-shell`, `border-run-routing`,
`pinpoint-scoring` and the existing minigame shell tests.

The menu groups Home, Journey (with Archive nested beneath it), Minigames, Explore, and Study
above feedback and World credits. The Archive hierarchy connector sits outside
the row's selected/hover background. World credits opens a modal with source and
license links, trapped keyboard focus, Escape/backdrop dismissal and focus return.
Theme settings live in the account's Settings section and save on this device;
guests can open Settings alongside the sign-in Profile section. The menu heading
is simply “Ambit”. Explore opens search
through the underlined introduction link. Selected-country
details keep the input out of their layout; “Search another country or territory” opens a
floating search box without clearing or reframing the current selection. Search
uses the selectable map catalog, including the active regional branch, rather
than the Study roster or only ADM0 units. A shared
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

Discovery uses neutral matte surfaces, a dark backdrop, richer land colors, and no
globe halo. Odyssey shares its typography, layout and surface treatment, with
graphite cartography, pale borders and gold accents. Discovery retains the
`ocean` preference ID. Shared material rules live in `src/theme/themes.css`; startup
map colors and shared result-card colors follow the palette. See
[Themes and visual styling](THEMES.md) for the full inventory.

Expedition replaces Dusk (preserving its `dusk` preference ID) with violet cartography,
cyan actions and pink editorial emphasis. It shares Discovery's typography and materials.
`theme/artwork.ts` and the themed SVG variants generated by
`scripts/prepare-theme-artwork.mjs` cover activity previews, Account/avatar globes
and shared result artwork for all four themes. Safari replaces Paper (preserving
its `paper` preference ID) with a deep green backdrop, blue ocean, mostly green land and
seafoam accents and sienna actions. Odyssey keeps the saved `survey` ID. Original flag, photograph and
data-legend colors are preserved. Custom cursors use the live gameplay palette.

Discovery (the default), Odyssey, Expedition, and Safari share semantic roles for text, editorial emphasis,
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
from the registry; unknown stored IDs fall back to Discovery. Do not hardcode a new
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

Global typography, the logo, canvas behavior and accessibility styles live in
`src/style.css`. `src/app/app.css` is the ordered import entry for
`src/app/styles/*.css`; its feature sections retain their original cascade order.
Keep those imports ordered when editing shell, panel, navigation and control
styles. Mobile, account, game and theme styles retain their existing entry points.
`src/app/ErrorBoundaries.tsx` owns globe/panel failure containment separately from
the app's navigation and session orchestration.

Compatibility that still protects player data remains intentional: record-save
migration and recovery, retired Journey IDs, `supersedes` assignment aliases,
in-place receipt labels and read-only IndexedDB packs. The `studio:` geometry
source convention still supports those recovered packs.
Test evaluator fixtures are not archived playable Journeys. Trace consumers and
save recovery before removing any of these paths.

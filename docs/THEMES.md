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

Shared action sizing is defined by `--action-min-height`, `--action-font-size`,
and `--action-padding` in `src/style.css`. Journey, Study, and minigame actions
share a 48px minimum height and may grow for wrapped text or help/points metadata.
Study Packs and Minigames use `carousel-navigation` from
`src/app/styles/shared-controls.css` for matching 44px arrow controls and icons.
Home cards share raised hover/focus surfaces and full-strength borders while
Archive retains its stacked shape and editorial accent. Question help is omitted
when unavailable; exhausted authored help remains visibly disabled.
Home's Daily Journey card is one full-card action with a top-right arrow; Resume
and View result appear as compact state labels, and readiness gates the entire card.
Home destination cards and Study destination cards (including Review) share an
opaque surface and neutral raised hover/focus fill in `themes.css`. Archive's
decorative stack lights its front, near and far borders in sequence; reduced
motion applies the highlight immediately. Archive calendar cells show the date and
a completion checkmark; scores and Play/Resume actions live in the selected Journey
display. Rows are 32px tall, with 44px touch targets for coarse pointers, leaving
room for the selected Journey below the calendar.

### Shared interface rules

These standards were agreed on November 2, 2026. They describe the target
interface; existing screens have not all been migrated or verified against them.
Use a few shared styles by purpose: tabs, menu rows, cards and action buttons.
Differences must be named exceptions rather than independent page-specific CSS.
Theme palettes, font families and gameplay color meanings remain unchanged.

Implementation progress: section tabs, dropdown/sidebar rows, header triggers
and Admin's Upcoming/Month switch now share their agreed interaction treatments,
and the common focus-ring baseline is aligned. The remaining typography, action,
form, tooltip, card and Journey-feedback migrations are still pending.

#### Navigation and interaction states

`src/app/styles/shared-controls.css` owns the existing `section-navigation`
treatment. Preserve real links for page navigation and tab keyboard/focus
behavior for tab panels.

| Control family                                       | Default and selected appearance                                                                                                                     | Hover behavior                                                                                               |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Horizontal section tabs: Study, Minigames, Admin     | Muted labels; selected text/icon and underline use the accent color.                                                                                | Brighten unselected text/icon without adding a fill. Selected items retain their accent color and underline. |
| Dropdown menu rows and Account sidebar items         | Selected items have accent text/icon, a slim left marker and a subtle neutral fill.                                                                 | Use a subtle neutral fill and brighter text. Selected items retain their selected color and marker.          |
| Compact joined view switches, such as Upcoming/Month | Selected option has a neutral filled background and accent text; unselected options are muted.                                                      | Use the shared neutral hover treatment while retaining the selected appearance.                              |
| Header menu triggers: profile and hamburger          | Use the neutral supporting-control treatment. While open, retain an accent border and accent text/icon. The profile trigger retains its pill shape. | Use a subtle neutral fill and brighter text/icon. Open triggers retain their accent treatment.               |

Study links and Minigame tabs keep 13px labels and 44px minimum targets. Admin uses a compact operational navigation at 14px with the same selected underline; Account keeps 16px/44px sidebar items. On small
screens, roomy/sidebar labels are 13px and their minimum targets are 44px. Short
horizontal tab groups wrap onto another row when necessary, keeping every option
visible. Other layout and orientation decisions remain feature-owned.

Keyboard focus uses one consistent thin outer ring following the control's
shape, with consistent spacing from its edge. It remains distinct from hover and
selection. Enabled menu/button hover changes fade color and background over
approximately 150ms, without movement or scaling; respect reduced motion.
Keep these states in the shared owner rather than repeating them in feature CSS.

Visible disabled controls keep comfortably readable muted labels and reduced
border/fill emphasis, with no hover response. Avoid strongly fading the entire
control. Explain unclear prerequisites nearby; do not rely on hovering over a
disabled control. Unavailable question help remains omitted, while exhausted
authored help remains visibly disabled.

#### Actions, links and messages

Normally give each task or panel one filled primary action, such as Submit or
Save. Separate tasks can each have a primary action; answer choices are not a
set of competing primary actions. Ordinary supporting actions such as Edit,
Refresh and Cancel use neutral outlined buttons with a subtle neutral hover
fill. Hint and destructive actions have the named exceptions below.

Underline inline text links. Standalone Back links use an arrow and accent text
without a permanent underline. Familiar utility actions such as Close, Settings
and Refresh can be icon-only; primary and less familiar actions need visible
labels. Icon-only controls need accessible names and a consistent tooltip on
hover and keyboard focus. Essential instructions must also remain visible or
available by tapping.

While submitting, keep a button's width stable, show a spinner and specific
wording such as “Saving…”, and prevent duplicate submission. Leave unrelated
controls available. Destructive actions use warning color on the action itself
and its final confirmation; surrounding controls remain neutral.

Use the existing toast notifications for short success confirmations. Keep field
errors and information the user still needs inline; do not introduce another
notification system. A panel's initial content load uses a quiet placeholder.
During refresh, retain loaded content and show a small busy indicator. The app's
initial loading-globe presentation remains separate.

#### Typography, shapes and cards

Ordinary instructions and explanatory text use 14px body text on desktop and
mobile. Supporting metadata such as credits and dates use 12px. Do not shrink
instructions or explanations into metadata styling. Navigation labels, action
labels and editorial Journey prompts retain their separate roles and sizes.
Ordinary page headings share a 40px desktop / 28px mobile scale. Expressive Home
copy, Journey prompts and dense Admin subheadings remain explicit exceptions.

Use 8px corners for controls, 12px for cards/panels and 16px for dialogs/popups.
Ordering cards are answer controls and therefore use 8px corners. Preserve
purposeful circles and pills, and the unfilled/underlined shape of section tabs.
`--control-radius` in `src/style.css` owns the existing control radius. Full-size
answer actions retain `--action-min-height` (48px) and can grow for wrapped labels
or help/points information. Compact controls and navigation keep 44px targets;
existing mobile action sizing remains 44px.

A card with one destination is clickable across its whole surface and has a
consistent trailing arrow. A card with multiple actions stays static and uses
explicit controls. Non-clickable panels do not brighten or change borders on
hover; reserve that response for the clickable card, row or control. Preserve
the shared raised neutral hover surface and accent border for navigation cards,
including Home's existing treatment.

Inside a panel, group information with spacing, headings and occasional dividers.
Use another box only for a distinct task, interactive area or important status,
rather than routinely nesting bordered panels.

#### Forms and dialogs

Ordinary form fields keep a visible label above the field. Placeholder text is
for examples and hints, not a replacement label. First show error styling after
the user leaves a field or attempts submission; once shown, update it as the
user corrects the input. Mark the field border and put a short error message
beside or below it. Form-level failures, such as a failed save, use a form-level
message. These validation rules do not change quiz grading or disclose answers
before submission.

On small screens, keep short confirmations centered with comfortable screen
margins. Long settings forms can use most of the screen height and scroll inside.

#### Journey controls and named exceptions

Journeys may vary their content composition to suit photography, ordering or
other mechanics. Reuse shared answer controls, help, feedback and navigation
styles through `GameShell`/`QuestionActions`; document additional exceptions.
Image fitting follows the existing photo/flag contract, retaining credits and
factual qualifications.

An unsubmitted selected answer uses an accent border and light accent tint, with
a check or selection mark where appropriate. Reserve grading colors for after
submission. A hint-eliminated choice remains readable but muted, with a
strikethrough and no hover response. It is not styled as a submitted mistake.
An ordering spare uses neutral surface/line roles; a hint lock indicates
availability without an error color.

Hint buttons are an explicit exception to ordinary supporting buttons: they
retain a light accent tint. Assistance stays neutral. Use these treatments
consistently across Journeys. Graded feedback panels stay neutral, with outcome
color on the result label, icon and relevant answer details rather than the
whole panel. Existing correct, incorrect and revealed-answer color meanings
remain unchanged.

The agreed exceptions are Home's expressive composition (including Archive's
stacked card shape), editorial Journey prompts and content compositions, dense
Admin subheadings, hint buttons, purposeful circles/pills and the app's initial
loading presentation. No additional page-specific exceptions were requested.
Keep the already established navigation density variants above.

### Shared globe standards

The following globe standards were agreed on November 2, 2026. Like the
interface standards above, these are a target, not a claim that every rendered
state already conforms. Shared geographic roles apply across Journeys, Study
and live minigames, independently of answer input. The engine's
[answer-role and disclosure contracts](JOURNEY_ENGINE.md#answer-roles-and-presentation)
remain authoritative for what may be shown. Styling must not change eligibility,
grading, canonical geometry or withheld identities.

#### Geographic layers and symbols

- During questions, unrelated land remains recognizable but clearly quieter than
  clues, candidates and answers. Home and Explore retain ordinary political-map
  colors, using the shared symbols, labels and selection styles where relevant.
- Country borders have a shared thin baseline. Use restrained extra weight and
  role color for references, hovered candidates, selections and results. Preserve
  existing rules that keep noninteractive references and committed colors steady.
- References, submitted pins, revealed point targets and numbered locations use a
  small shared family of role-specific symbols and sizes. Scale for legibility
  rather than giving each Journey a separate symbol language.
- Circles have shared styles by meaning: accuracy bands, editable answers, search
  areas and explanatory geography. Share basic stroke/label conventions without
  implying that all circles represent the same thing. Decorative preview rings
  are explicitly separate from grading distances.
- Meaningful routes, player traces and response-to-target comparisons differ by
  a shared combination of pattern and color, such as solid routes versus dashed
  comparisons. Do not invent routes or center-to-center links to decorate an
  answer. Existing geographic and comparison paths retain their real meaning.
- Thematic layers such as population and terrain can use distinct data palettes
  with clear legends and shared contrast/opacity conventions. Player responses
  and results remain distinguishable above those layers; data colors do not
  acquire grading meanings merely because they resemble an outcome color.

#### Labels, motion and camera

- Where disclosure permits labels, use a shared hierarchy: clear answer labels,
  quieter reference labels and smaller distance/measurement labels. Keep
  typography consistent for each role. Essential task/result labels take priority
  when space is tight; reduce or hide lower-priority context first and adjust
  framing when necessary. Anonymous geography must remain anonymous until its
  disclosure contract permits naming.
- Ordinary globe fades use shared short defaults around 150–200ms. Pin placement
  animations use shared defaults around 300–400ms. Camera travel and deliberately
  sequenced teaching reveals are separate motion roles, not reasons to stretch
  ordinary fades independently in each Journey.
- Normally pulse once after an attention event, then leave a stable marker.
  Repeated pulses need a specific guidance purpose. Respect reduced motion and
  retain equivalent final information and existing manual review controls.
- Frame the geography and markers that must be visible, adapting to screen size.
  Preserve authored framing needed for the question. After manual rotation/zoom,
  take over at a new question, explicit hint/assistance requiring reframing, or a
  reveal that needs it; otherwise respect the player's view.
- Ensure the answer is on screen before its main reveal animation. Gentle camera
  movement may continue; finishing all movement before showing any information
  is not required. Use the existing answer/guess views when one view cannot show
  a distant pin comparison legibly.

#### Mechanic-specific presentation

| Mechanic family                                                | Shared presentation target                                                                                                                                                                                                                                                             |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Single/multiple country or city picks                          | Preserve candidate/reference roles and disclosure. For unordered multiple picks, use selected color plus a discreet check/selection symbol where legible; numbers imply order or a named slot.                                                                                         |
| Merged anonymous territory picks                               | Reuse area-selection styles while preserving the mechanic's anonymous merged geography before submission and canonical reveal afterward.                                                                                                                                               |
| Distance pins                                                  | Retain the actual response and target. Draw real accuracy bands lightly, emphasize the achieved band and label its meaning. Decorative preview radii never redefine grading.                                                                                                           |
| Territory-inside pins                                          | Make the territory result primary and keep the submitted pin. Do not invent a correct target coordinate at the country's center.                                                                                                                                                       |
| Brush, circle, trace, polygon and cut constructions            | Keep the submitted geometry primary. Use clear outlines and translucent fills with shared defaults by construction role; painting must remain visibly painted. Distinguish authored examples by pattern/color and provide a toggle when simultaneous display would obscure comparison. |
| Independently labeled pins                                     | Give the active pin a shared editing emphasis and clear slot label. Keep placed pins visible but quieter and preserve their labels. Grade and retain each slot independently.                                                                                                          |
| Compass bearings                                               | Preserve destination concealment during play. Feedback shows submitted/target directions with distinct shared line treatments and a compact angular-error annotation.                                                                                                                  |
| Geographic card ordering/matching and ordered typed answers    | Connect revealed geography to the list with shared number badges or slot labels where legible, preserve sequence and reduce competing context labels. Abstract cards must not manufacture geographic answer roles.                                                                     |
| Text, typed-region lists, recall, choices, numbers and sliders | Use the same geographic role rules as other controls. A non-map input does not by itself create map selections, disclose anonymous names or grade illustrative geography. Apply point/area styles according to the actual answer identity.                                             |
| Visibly assisted/locked responses                              | Retain the appropriate selected/answer role and add a small lock or assistance indicator where disclosure allows it. Do not imply grading before submission or introduce a separate assistance palette.                                                                                |
| Completion overview and stop review                            | Use a calm overview, emphasizing the relevant geography and result when reviewing a stop. Retain required discoveries and keep mistakes identifiable throughout. Deliberately authored completion maps remain documented exceptions.                                                   |

This covers every registered control family, including supported controls without
current catalog use. `land-path` remains internal/recipe-only; its presence in
an inventory is not approval to introduce it into a published Journey. Compare
applicable initial-play, pending-response, hint, assistance, correct-reveal,
missed-reveal, completion-overview and completion-stop states. Shared layers also
need screen-size and theme checks; neither source inventory nor mocked scene
checks establish rendered legibility or actual animation timing.

#### Scope and exceptions

Live minigames and Study reuse these role styles. Flyover previews reuse the real
symbols, role colors, borders and labels, while allowing different preview pacing
and explicitly decorative elements. Preserve production behavior when building
review tools rather than creating a separate renderer for the examples.

Document departures from shared roles, symbol styles or motion defaults.
Coordinates, real geographic sizes and ordinary framing needed to show a subject
are content choices, not style exceptions. Required disclosure exceptions still
follow the engine's existing validation. These appearance standards do not add
new supported keys to `visualExceptions` by themselves.

Shared implementation now supplies role-based marker sizes and label priority,
circle and line treatments, one-shot attention pulses, and visibility-gated
reveal motion. Normal feedback retains the question's fade scope; starting a new
question or rewinding to play resets it. Compass feedback includes angular error
and comparison framing; distance-pin feedback fits the response and target where
one view can show both. Submitted constructions remain primary in stop review.
Authored symbol overrides and real geographic sizes remain supported.

Focused scene/renderer tests cover these contracts. Native Chrome checks cover
representative compass, pin, ordering and construction scenes, including a narrow
viewport. This is not visual certification of every question, theme or device.

Country fill and border fades belong to the Three.js presentation layer
(`regionFades.ts` and `borderFades.ts`), independently of navigation CSS.
Changing `regionTransitionKey` resets cached colors immediately, preventing old
answers from appearing in a new puzzle. Continuous minigame previews keep one
key across question, reveal and travel so their 160ms fades can run. Preserve
these transitions when consolidating styles and check motion with reduced
motion disabled; static screenshots cannot establish animation behavior.

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
| [game.css](../src/game/game.css)                                                                                                                                                                      | River-bank diagram stroke `#72b9d2`; selected copy and map-key glyphs now use semantic ink; several black/white inset and drop shadows. Most surrounding UI uses tokens.                                                                                                                                                                                                            |
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

City and capital map labels use a moderate shared text size in all themes. Authored city
and landmark references share the same readable typography, regardless of capital status; numeric map
annotations and physical-feature labels keep their existing scale. The values
and screen-space layout live in `src/globe/placeLabels.ts`.

Background reference geography uses the `context` state and shared context-land
fill on the existing country surfaces. It does not receive individual country
outlines or small-country locator rings. Explicit help remains `hinted` and keeps
its geographic outlines and locators.

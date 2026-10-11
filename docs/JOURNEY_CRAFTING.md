# Crafting a Journey

A Journey is five questions that develop a premise: a geographic trip, a shared
surprise, or a distinctive mechanic. This guide covers editorial and player-facing
review. [Question catalog and authoring](QUESTION_CATALOG.md) covers registration,
answer contracts, data preparation, and supported controls.

## Start with the experience

Write a one-sentence premise and the reason each stop belongs. Most geographic
trips should be explicit enough that a player can follow them without a separate
explanation. The introduction establishes the route; short directional lead-ins
carry it forward; reveals develop the story. On Russia’s doorstep is the model
for concise movement cues. Shared neighbors and Island instincts demonstrate that
a repeated mechanic or geographic quirk can also provide the throughline.

Choose controls because they fit the task. Five different controls do not make a
Journey better. An easy midpoint can provide breathing room; an obscure opening
needs either useful reasoning clues or an especially satisfying discovery.

For each stop, decide these things before writing its final prompt:

| Decision   | What to specify                                                                            |
| ---------- | ------------------------------------------------------------------------------------------ |
| Task       | What the player should identify, locate, count, or infer.                                  |
| Input      | The actual button, text field, marker, polygon, or coordinate tap they use.                |
| Clues      | Borders, labels, markers, lines, camera position, and earlier answers they can see.        |
| Difficulty | What knowledge or spatial precision is intended; which assistance is withheld and why.     |
| Commitment | Whether a selection can be changed, how many answers are needed, and when it is submitted. |
| Reveal     | The geography or reasoning the map should explain after either a correct answer or a miss. |

## Keep the question visually central

The renderer joins `leadIn` and `prompt` into one continuous question paragraph,
with equal font size and line-height. Muted context and a brighter question use
color to carry the hierarchy, without a vertical break. `title` is an internal
identity, not a second visible heading. Editing `title` does not shorten the
player's question.

- A lead-in is optional. Include it only when it adds necessary orientation,
  conceptual context, or meaningful movement that the globe does not already
  communicate. Context and question should form one thought; omit travel filler.
  Put rich context in the reveal, not a second introduction at every stop.
- Make `prompt` one clear question or task. Keep mechanics and tolerance in the
  separate instruction, not in the paragraph. Round overlines describe content,
  rather than mixing destinations with interaction instructions.
- Use `instruction` for important mechanics, counts, ordering, or precision.
  “Drop a pin in Vienna.” can be the heading; “Land within 50 km of the city
  center.” belongs underneath.
- Match the instruction to the visible control. “Tap both countries on the
  globe” is clearer than “Choose two countries” when there are no choice buttons.
- Include a date, unfamiliar proper name, or number only when it helps the task
  or establishes an interesting observation. Move incidental detail to the reveal.
- Use short step labels consistently. Avoid implying a special challenge through
  a label while silently configuring a different one.

## Separate the setting from the answer

For each stop, distinguish **where we are**, **what we are examining**, and
**what the player must supply**. Do not obscure information the prompt already
gives. A named country can be centered and context-highlighted when the task is
about its flag, history, or symbolism; finding that country is not an additional
hidden task. A clear setting makes the trip readable without solving the question.

When the task asks players to select countries within an explicitly named region,
show the whole candidate region consistently. Highlight all eligible countries
with the same context treatment, not just the correct answers. Keep selected,
correct, and incorrect states distinguishable, and verify that highlighted
polygons remain tappable. Hiding country names can still provide the intended
identification challenge.

Conversely, a blind location question must not highlight, outline, label, or
center the hidden target in a way that supplies its location. Show only the broad
orientation the premise promises. Judge each question separately instead of
inheriting a single anonymous, muted map for an entire Journey.

Context is not an answer. On reveal, retain known setting geography in a context
color when useful; reserve answer colors for the actual answer object. If the
answer takes us to a different place, pivot the feedback camera directly there.
Do not frame the midpoint between distant countries merely to include both:
that can strand both subjects near the horizon. Use an intentional sequence or
separate explanatory view when the relationship itself needs both locations.

## Make difficulty deliberate

Country borders, country names, city markers, river lines, and camera placement
are separate clues. Turning all of them off creates a different challenge from
hiding only the answer's label.

For ordinary city placement, show country borders and hide city markers/names
before submission. A borderless pin challenge should be an established premise,
with appropriate targets and tolerance, as in On Russia’s doorstep. Do not inherit
its settings merely because a new question also uses a pin.

A marker or line can establish where we are, but can also supply the answer
without a label. Separating location from answer identification takes more than
turning country names off. If a highlighted line touches exactly two clickable
polygons, tapping those polygons tests observation, not knowledge of their names.
Use that deliberately when observation is the intended skill. Otherwise consider
named choices, typing, a wider context, or different clue geometry.

**Run the naive-inspection test:** Could someone with none of the intended
knowledge produce the correct input by tracing a visible line, comparing marker
positions, following the camera center, or clicking adjacent polygons? Also check
names disclosed by hovering or selecting. If yes, either make visual observation
the intended skill or revise the input and display. A plausible prompt can still
be undermined by its map.

For pin questions, select tolerance deliberately. Check nearby cities, borders,
and alternative plausible targets, then test both sides of the acceptance radius.
Convert that radius to the precision available on the smallest supported screen.
Do not choose an enormous radius to compensate for a poorly framed camera or
inaccessible input. Conversely, do not demand accuracy the visible map cannot
support. State the tolerance before submission and show it in the reveal.

Audit Journey descriptions, lead-ins, instructions, input labels, image alt text,
map labels, and earlier feedback for answer leaks. Naming Vienna is intentional
when the task is locating Vienna. Naming the country being guessed is not.
Sources remain locked until submission because their titles or pages can reveal
answers.

## Author help that teaches before it narrows

Use **Question → Hint → Assist → Answer/reveal**. A hint adds an authored
semantic foothold while preserving the task. An assist changes its presentation:
removing options, narrowing a search area, or exposing spelling information.
Every round should eventually have a hint; an assist is optional. Never generate
help automatically from the answer, and never charge for orientation needed to
understand the question.

- Add information beyond the prompt: a relationship, meaningful region, historical
  reason, or useful exception. Repeating a multiple-select predicate is not a hint.
- Review both stages for naive-inspection leaks and spoilers for later rounds.
  Help should leave meaningful work, not reveal a target through a camera center,
  answer-centered circle, or exactly the required set of remaining candidates.
- Author candidate elimination deliberately. Preserve every correct answer and
  plausible alternatives; do not require a generic 50/50 reduction. All surviving
  map candidates have equivalent styling, without hidden name disclosure.
- Keep grading fixed, especially pin tolerances and country boundaries. A broad
  search area is an assist, not a new acceptance zone; its center must not mark the
  answer. Explain the distinction in the assist copy.
- Prefer meaningful reference places to generic shaded areas when the clue names
  those places. An assist can mark nearby cities while keeping the target absent;
  it must not turn reference geography into an answer marker.
- Request stages separately. Keep the hint visible after assistance, preserve
  player selections, and record help use per round through reloads and sync.
- Ordering assists may explicitly place and lock a card, while leaving meaningful
  work in the remaining slots. Return displaced cards to the spare bank, explain
  the change, enforce locks in the reducer, and keep the original grading rule.
- Preserve correctness and completion without point deductions. Record the strongest
  stage as unassisted, hinted, or assisted; count rounds using hints and assists
  separately, with an assisted round counted in both.

## Verify that the required interaction is possible

Correct answers accepted by the reducer do not establish that a player can enter
them. Check the path from authored settings through `journeyWorld`, App props,
and `GlobeView` hit handling to the reducer.

Current implementation details that matter:

- Map picking is derived from the answer mode, independently of display settings.
  `map.hoverFeedback` controls hover inspection/styling; it cannot disable answers.
  Pin coordinate taps and city-marker picking have their own paths.
- `muteOthers: true` normally leaves countries in the `disabled` visual state.
  `GlobeView` rejects disabled country taps unless `selectDisabled` is enabled.
- For an anonymous, neutral country map pick, use `candidates: "neutral"` and
  hide names with disclosure settings. Polygon eligibility remains authoritative
  even when a muted country has a disabled visual style.
- For specifically highlighted candidates, use the highlighted-candidate contract
  and verify that correct polygons or their display fragments are clickable.
- A collapsed typing alternative is accessibility/fallback support, not a repair
  for a broken primary map interaction.
- Author typed recall as `mode: "text"`, with an immediately visible input. For
  globe-only questions, set `allowTyping: false`; retain typing when WebGL is
  unavailable. Do not accidentally inherit a bypass from unrelated content.
- For card ordering, author explicit slots, direction, candidate cards, and any
  distractors. Allow spare cards, swapping, removal, touch dragging, and keyboard
  placement. Validate unique IDs, complete slots, order, and assist locks.

Reuse mechanics through technical defaults or builders, and content through
deliberate adaptation of the same question. Never spread an unrelated completed
question as a configuration base. Each round's mode, eligibility, commitment,
and map interaction should be understandable from its own declaration.

A neutral multiple-country configuration can look like this:

```ts
mode: "map-multiple",
selection: { type: "members" },
count: 2,
disclosure: {
  hoverNames: false,
  namedChoices: false,
  committedNames: true,
  previousVisits: false,
},
map: {
  borders: true,
  hoverFeedback: true,
  muteOthers: true,
  candidates: "neutral",
  revealOnAnswer: true,
},
```

Author every round with `defineQuestion` from `questionBuilder.ts`. Its discriminated
contract binds the answer mode to valid rules, selection, count, commitment, and
required input fields. Shared presentation must use `definePresentation`, whose
exact-key check rejects whole questions even when hidden behind object spreads.
Do not put answer contracts or clue copy into shared presentation defaults.

Completed questions are leaf content, not reusable templates. Reuse data and
presentation deliberately; declare each round's interaction explicitly. The
constructor, Journey loader, index preparation, and context creation validate
contracts before play. Context validation additionally checks actual targets,
answer counts, candidate eligibility, and help configuration.

Map modes may offer named button alternatives when explicitly authored; this is
a supported dual-input contract, not an accidental inherited choice list.

## Make the reveal explain the answer

Use Study's answer-card pattern: the correct answer, then a short insight. Do not
repeat the answer at the beginning of the explanation or recap the wrong guess.
For multiple valid answers, show the accepted canonical answer on success and a
clearly labelled example or set on a miss.

The map should explain the same answer as the text:

- A river answer needs river context; coloring its starting country as “Correct”
  is misleading. `contextIds` highlights known geography during play.
  `feedbackContextIds` can become answer-colored on feedback; use an explicit
  empty array when that would misrepresent the answer. `feedbackHintIds` retains
  setting geography in its context color after submission.
- A two-bank city story should show the river and the banks at a useful scale,
  not only a generic capital marker at continental scale.
- A receiving-sea answer should identify the sea, not only a delta point.
- Reveal useful borders, targets, radius guides, or explanatory features after
  both success and failure. Keep color-key wording consistent with what is shown.

Match the visual emphasis to the actual answer object. A city answer needs a
city marker, not answer-colored national territory; a sea needs its receiving
waterbody identified. Keep unrelated land neutral. Pull back if a close-up becomes
an abstract field without useful reference geography. When the data cannot show
the relevant urban detail, a small, explicitly **schematic** diagram can explain a
relationship better than a false impression of map precision.

Match feedback praise to the skill used: reasoning, recalling, spotting, or
placing. An authored override is appropriate when the widget alone does not tell
us what the player did.

## Treat the map as authored information

Review geometry, highlights, labels, camera framing, and reveal state with the
same care as the question wording. They jointly control what the player knows.

### Maintain geographic continuity

When one feature carries a Journey, keep previously traveled portions legible and
extend the route as the story moves forward. A camera change should read as
traveling farther along the same feature. Context can leave the viewport; it
should not disappear from the underlying route without an editorial reason.
Side excursions need not persist when the main itinerary resumes.

Progressive revelation is part of the clue budget. Do not show a full route early
if its endpoint solves a later question. Reveal the next reach only when it is
safe, and reserve the true terminus for its intended payoff. Make a shortened
itinerary explicit, for example “route so far,” so its drawn end does not claim to
be the physical feature's end.

### Make linear features cartographically honest

A clipped river, road, or coastline can silently tell the player “it ends here.”
Its visible end must either reach its true terminus, continue beyond the frame,
fade at the viewport edge, or be clearly qualified as a partial route, local
segment, or schematic. At a destination reveal, show the actual connection to the
receiving feature. A narrative claim of arrival cannot repair a visible gap.

Reuse reviewed source geometry. Join segments only where the source establishes
connectivity; preserve junctions and true endpoints when simplifying. Never
invent a connector to hide a source gap. If a source cannot support the story,
choose a better reviewed source or change the display. Keep provenance,
transformations, license notices, and downloadable data where required.

`physicalFeatures` supplies question context; `feedbackPhysicalFeatures` adds
answer-bearing context after submission. These features are display-only and do
not alter eligibility or grading. Author each stop's cumulative context explicitly
so an earlier side reveal does not accidentally leak into a later question.

Mountain extents can provide the same persistent continuity as a river. Use
reviewed footprints rather than an invented ridge or route line, and distinguish
generalized extent from precise topography. A lake-border reveal needs the actual
shoreline/area, not only a point label. Withhold that geometry before submission
when tracing it across visible political borders would supply the answer.

### Choreograph cameras as a separate review pass

Review the question camera and feedback camera together for all five stops.
A question camera should orient the player without centering a hidden target so
precisely that the framing solves the task. A feedback camera should explain the
answer at a useful scale. Preserve a sense of movement into the next stop without
revealing its answer too early. Camera position is part of the clue budget.

Check desktop and narrow screens: labels, cards, and controls change the useful
map area. Avoid dramatic zooms that lose all geographic context. An authored
coordinate is a hypothesis until its actual rendered view has been inspected.

### Resolve the whole Journey

Completion should pay off the premise. For a geographic itinerary, show the full
route and all resolved stops together, rather than a generic answer-country
flyover. Use meaningful destination labels in the recap; keep active step labels
spoiler-safe and semantically consistent. A shared-feature Journey can instead
resolve its common pattern. The completion map must agree with the five reveals
and must remain legible on a small screen.

For a conceptual Journey spanning distant countries, a constellation of resolved
places can be more honest than a connected route. Use separate authored views
when one globe hemisphere cannot show every destination comfortably, and provide
a static reduced-motion view. Label comparison cities by their relevant roles
(former capital, current capital, reference city), with sources covering those
claims. Country fills remain context when the answer object is a city.

## Review and validation before publishing

Run three distinct passes. Each catches problems the others miss.

1. **Editorial pass:** Read the five stops in order. Confirm premise, concise
   headings, usable instructions, difficulty progression, source support, and
   no early answer leaks. Run the naive-inspection test for each question. Read
   every reveal for repetition, useful insight, and emphasis on the right object.
2. **Interaction and presentation tests:** Check answer acceptance and rejection,
   but also inspect the prepared world: borders, interaction flags, disabled
   states, label disclosure, clue geometry, and feedback features. Exercise the
   App-to-globe input contract and both correct and incorrect submissions.
3. **Browser playthrough:** Complete every stop through the intended visible
   controls on desktop and mobile. Tap the actual canvas for map/pin questions;
   typing or direct reducer actions do not substitute. Check small-screen scroll,
   visible clues, route continuity, focus changes, labels, reveals, and the
   completion payoff. Verify fallback controls
   separately. Use Admin practice; do not change shared dates to test a pack.

A green scoring test is not a completed player-experience review. Record what was
actually tested and distinguish browser verification from simulated input.

Preserve published attempts. Cosmetic copy, borders, and interaction repairs can
retain IDs when answer contracts remain intact. A change to answer identity,
acceptance, question order, or substantial mechanics needs a reviewed edition/save
strategy. Original editions can remain loadable for started attempts while being
excluded from Admin choices and practice routes. Never silently regrade prior
results. Register and regenerate metadata, update the catalog, and follow the
normal test/build/release checks before publication.

## Render mountain context from terrain

Mountain hatching must follow reviewed elevation data, not decorative peak stamps
or a polygon boundary presented as a ridgeline. Derive crest strokes and downhill
hachures from a generalized elevation grid; record input checksums, sampling,
clipping, and source attribution. Pale high-elevation strokes do not imply
permanent snow. Keep lines subordinate to answer markers and borders, and reduce
detail contrast at distant zooms. Relief is display-only: its geometry never
changes eligibility or grading. A general mountain footprint may limit rendering
but should not appear as a hard terrain boundary.

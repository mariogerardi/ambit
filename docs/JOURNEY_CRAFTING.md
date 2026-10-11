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

The renderer displays `leadIn`, then the actual `prompt` as the large heading.
`title` is an internal identity, not a second visible heading. Editing `title`
does not shorten the player's question.

- Use a short lead-in to establish movement or a necessary observation. Put rich
  context in the reveal, not a second introductory paragraph at every stop.
- Make the heading one clear question or task. Do not put scene-setting,
  instructions, and tolerance into the same large heading.
- Use `instruction` for important mechanics, counts, ordering, or precision.
  “Drop a pin in Vienna.” can be the heading; “Land within 50 km of the city
  center.” belongs underneath.
- Match the instruction to the visible control. “Tap both countries on the
  globe” is clearer than “Choose two countries” when there are no choice buttons.
- Include a date, unfamiliar proper name, or number only when it helps the task
  or establishes an interesting observation. Move incidental detail to the reveal.
- Use short step labels consistently. Avoid implying a special challenge through
  a label while silently configuring a different one.

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

## Verify that the required interaction is possible

Correct answers accepted by the reducer do not establish that a player can enter
them. Check the path from authored settings through `journeyWorld`, App props,
and `GlobeView` hit handling to the reducer.

Current implementation details that matter:

- `map.hover: false` also disables country-region interaction in `journeyWorld`.
  It is not just a tooltip preference. Pin coordinate taps have a separate path.
- `muteOthers: true` normally leaves countries in the `disabled` visual state.
  `GlobeView` rejects disabled country taps unless `selectDisabled` is enabled.
- For an anonymous, neutral country map pick, use `hover: true` and
  `candidates: "neutral"`; hide names with disclosure settings. The neutral
  candidate setting allows polygon taps while correctness still uses eligibility.
- For specifically highlighted candidates, use the highlighted-candidate contract
  and verify that correct polygons or their display fragments are clickable.
- A collapsed typing alternative is accessibility/fallback support, not a repair
  for a broken primary map interaction.

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
  hover: true,
  muteOthers: true,
  candidates: "neutral",
  revealOnAnswer: true,
},
```

Do not copy a base multiple-choice configuration into a map or pin question
without reviewing every inherited setting.

## Make the reveal explain the answer

Use Study's answer-card pattern: the correct answer, then a short insight. Do not
repeat the answer at the beginning of the explanation or recap the wrong guess.
For multiple valid answers, show the accepted canonical answer on success and a
clearly labelled example or set on a miss.

The map should explain the same answer as the text:

- A river answer needs river context; coloring its starting country as “Correct”
  is misleading. `contextIds` can become answer-colored on feedback for choice
  questions. Use explicit `feedbackContextIds` (including an empty array) when
  that inherited behavior is inappropriate.
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

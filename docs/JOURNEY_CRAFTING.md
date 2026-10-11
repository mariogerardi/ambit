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
  “Drop a pin in Vienna.” can be the heading; “Land within 80 km of the city
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

A marker or river segment can locate the subject without naming the answer. For
example, a marked gorge can ask which countries border it; otherwise the question
also quietly requires knowing where the gorge is. Decide whether that additional
knowledge is intended.

Review camera centers as clues. A wide view can establish a region; a camera
centered exactly on a hidden target can undermine the question. For a river
itinerary, show only the relevant section. An opening full-length river could
reveal the final destination several questions early.

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
without reviewing every inherited setting. The Danube's Iron Gates question and
the revised Sun of May question originally failed this check.

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

`physicalFeatures` supplies local physical context during a question;
`feedbackPhysicalFeatures` adds answer-bearing context only after submission.
Reuse reviewed cartographic geometry. These features are display-only and must
not change answer eligibility or grading. Do not invent a straight line and
present it as an actual river or underground cave route. Label generalized or
schematic geography honestly.

The Danube's local layers are regenerated with `npm run prepare:journey-map`
from the existing reviewed `public/geography/physical.v1.json` snapshot. The small
derived asset records its source revision and clips actual river paths to each
stop; it does not load the whole physical catalog into the Journey bundle.

## Review and validation before publishing

Run three distinct passes. Each catches problems the others miss.

1. **Editorial pass:** Read the five stops in order. Confirm premise, concise
   headings, usable instructions, difficulty progression, source support, and
   no early answer leaks. Read every reveal for repetition and useful insight.
2. **Interaction and presentation tests:** Check answer acceptance and rejection,
   but also inspect the prepared world: borders, interaction flags, disabled
   states, label disclosure, clue geometry, and feedback features. Exercise the
   App-to-globe input contract and both correct and incorrect submissions.
3. **Browser playthrough:** Complete every stop through the intended visible
   controls on desktop and mobile. Tap the actual canvas for map/pin questions;
   typing or direct reducer actions do not substitute. Check small-screen scroll,
   visible clues, focus changes, labels, and reveals. Verify fallback controls
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

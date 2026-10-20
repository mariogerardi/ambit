# Crafting a Journey

_Authoritative editorial and player-experience guide · consolidated October 2026_

A **Journey** is five questions that develop one geographic premise. It might follow a route, investigate a physical feature, connect historical or cultural ideas, or repeat one satisfying reasoning mechanic. The point is not five facts about the same topic: **each round should advance an experience that is worth completing as a whole.**

This is the single maintained Journey crafting guide, incorporating the former
`Crafting_a_Journey_Revised.md` and the implementation lessons from Andes.
[AGENTS.md](../AGENTS.md) governs working efficiency, verification, and deployment.

This guide covers what authors design and what players actually experience. [Question catalog and authoring](QUESTION_CATALOG.md) remains the reference for registration, data contracts, supported modes, and technical mechanics. These are current authoring standards. The engine may support additional legacy or internal configurations; that does not make them the default for new Journeys. Label proposed features explicitly and agree on their scope before relying on a new API.

## 1. Design the whole Journey first

Before writing questions, establish:

| Journey decision          | Authoring question                                                                                                         |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Title and premise**     | What will the player discover, follow, or reconsider in five stops?                                                        |
| **Throughline**           | Why does each round belong here—not merely somewhere nearby?                                                               |
| **Structure**             | Is this a route, common feature, comparison, historical thread, shared exception, or repeated mechanic?                    |
| **Rhythm**                | Which round opens accessibly, adds depth, offers a breather, creates tension, and pays off?                                |
| **Geographic continuity** | What remains visible or meaningful across rounds: a route, mountain range, reference location, or accumulated discoveries? |
| **Completion**            | What would a resolved globe show that the player could not see at the start?                                               |

A geographic route is **not** automatically a thematic argument. “Spain → Sicily → Libya → Balkans” is a travel sequence; the author must also show how each question arises from the Mediterranean rather than merely being located near it. Likewise, a Journey _Along the Andes_ should use the mountain system as more than recurring prose.

Choose the input format to fit the skill—not to achieve five different controls. Repetition can be the identity of a Journey (as in _Shared neighbors_); variety can be the identity of another. Difficulty need not rise continuously. A simple visual question between harder ones can improve pacing, while an obscure opening needs good inference clues or a satisfying discovery.

**Read all five prompts and reveals in order.** Identify repeated trivia (e.g., two consecutive capital-recall questions), an overly broad first task, and later questions spoiled by earlier answers. Do not force increasing difficulty for its own sake. The finale should provide a satisfying destination, discovery, consequence, or new application of earlier understanding.

**Questions should move forward.** In a geographic route, advance along the established itinerary; do not send players back to earlier stops to reconstruct the trip. In a conceptual Journey, each stop should develop the idea. Earlier discoveries can provide context for a new task, but a later question must not simply retrieve facts or answers that previous rounds already supplied. The completion screen can recap the experience without turning Q5 into a memory test.

For a facelift, identify which rounds need redesign, which need presentation repairs, and which already work. Preserve the Journey's identity and favorite questions. Do not adopt Andes' mechanics or five-stop rhythm as a compulsory template.

## 2. Review a compact five-stop outline before coding

Write the premise in one sentence, then fill in this outline with short phrases.
Review the whole sequence before implementing question redesigns. This can live
in the working discussion; a modest facelift does not need a separate design document.

| Stop / destination | Task and intended skill | Given / withheld clues | Hint / assist | Reveal / reason to belong |
| ------------------ | ----------------------- | ---------------------- | ------------- | ------------------------- |
| 1                  |                         |                        |               |                           |
| 2                  |                         |                        |               |                           |
| 3                  |                         |                        |               |                           |
| 4                  |                         |                        |               |                           |
| 5                  |                         |                        |               |                           |

Agree on the questions that need redesign before coding them; continue independent,
already-authorized presentation work. Record material decisions once and reuse them.
Do not repeatedly reopen settled questions without new evidence.

Expand only the rounds that need it, especially new mechanics or unusual geometry:

- **Input and grading:** visible control, eligible candidates, canonical answers,
  accepted variants, count/order, tolerance, commitment, points, and failure behavior.
- **Presentation:** question and feedback cameras, visible/withheld/interactive
  features, prior discoveries, and any hint/assist changes.
- **Reveal and evidence:** new insight, supporting media and accessibility text,
  factual/geometry sources, review date, licenses, and what persists at completion.

Separate three concepts throughout: **where we are**, **what we can inspect**, and **what the player must provide**. Marking the first two is often helpful; marking the third prematurely often destroys the question.

## 3. Write one continuous question—not a headline and footnote

The renderer joins `leadIn` and `prompt` into one visual paragraph with equal font size and line-height. Muted context and a brighter task carry the hierarchy through **color**, not a size jump. `title` is an internal identity, not a second player-facing heading.

- **`leadIn` is optional.** Use it for meaningful movement, a necessary premise, or conceptual context. Avoid filler such as “Head to West Africa” when the globe and prompt already establish that.
- **`prompt` is one clear task.** State what the player has to answer, not an essay about the topic.
- **`instruction` supplies only a missing interaction cue or genuine exception.** Leave it empty when the prompt or visible control already explains the action. “Tap the island” can clarify a globe response; repeating “Tap a territory” after the prompt already says to tap is redundant. Preserve necessary qualifications such as hidden boundaries, overseas departments and which borders count.
- **Overlines/step labels describe the content** consistently (`Capital`, `Lake`, `Border`), rather than unpredictably changing to a method (`Drop a pin`). The method should be clear from the primary control.
- Move incidental dates, statistics, and long explanations into the reveal unless they are needed for the task.

Example: **Context:** “Downstream, Buda and Pest face each other across the river.” **Task:** “What capital brings the two banks together?” Render as a single paragraph with different text colors; do not add a second heading or a vertical break.

A question may be short. Do not fill every content field to satisfy a template.

Supporting copy is one shared paragraph at 14px across Journey and Study questions.
Instructions stay muted; immediate-commitment notices retain the accent color in
the same inline flow and font size. Let the paragraph wrap naturally on narrow
screens. Do not add separate paragraphs for “Your first answer is final,” generic
pin movement instructions, or controls that already have a Submit button.

For a distance pin, the shared control derives “Aim for the bullseye (within
100 km)!” from the rule. All acceptance bands remain available before answering in
the free question-information menu under **Accuracy**; opening it does not use a
hint or lower points. Authors provide the radii, not another prose version of
them. Numeric sliders use the same convention. Territory-containment pins do not
receive a distance bullseye. Review the combined rendered prompt, supporting copy
and control text, rather than reviewing the authored fields in isolation.

Feedback headings are a brief reaction: one to four words, such as “Well
spotted.” or “Very close.” Apply this to `correctFeedback` and accuracy-tier
`feedback` too. Put discoveries in the reveal body; omit interface narration
such as “The missing boundaries are back.” Live map legends belong after the
player’s selection and hint text, immediately above the hint/assist buttons.

Write for the player discovering a place or relationship. Source-review status,
rendering decisions, answer-validation rationale, and explanations of why the
challenge is difficult belong outside the story. Instructions and assists can
explain necessary tolerances, hidden boundaries, changed geography, or locked
answers. After submission, use the reveal to add geographic meaning rather than
repeat what qualifies as an accepted response. An assist that changes the map
should help the player reason from that change, not explain how the puzzle was
authored.

Give each Journey its own voice. A repeated mechanic can develop a comparison
without pretending to follow a continuous itinerary. Keep movement language
geographically honest, particularly when the previous question accepts several
different locations. A title must promise the subject the five questions actually
develop; a thematic name cannot substitute for that development.

Each new question opens at the top of its panel and focuses its heading. Advancing
resets both the desktop card and mobile tray; selecting answers or opening help
preserves the player's reading position.

## 4. Design the answer method and distractors intentionally

**The intended action must be the easiest, immediately available way to answer.** A technically valid reducer rule does not prove the player can use the interface.

Typical modes include named single/multiple choices, map country/region selection, anonymous city markers, pin-by-distance, pin-inside-territory, typed names, numeric entry, and ordered answers. Select among them based on the cognitive target:

- Use **typing sparingly**, mostly when recall or spelling of a name (often a city or capital) is the skill. A typed question shows its input immediately. Players should never have to open **“Answer by typing”** to perform a required text task.
- If the question is **tap on the map**, make the polygons or markers genuinely selectable. A collapsed typing fallback is for accessibility or unavailable globe input—not the default workaround for a broken map.
- For **pins**, define whether the skill is estimating a point or getting inside a territory. The latter is not automatically a fair challenge with hidden boundaries: evaluate whether the player has a meaningful way to land inside without guessing against invisible grading geometry. Do **not** solve this by revealing the exact target country's outline as an assist; that simply exposes the answer surface. Redesign the task, choice of location, or clues instead.
- For **ordering**, specify whether order is geographic, chronological, or logical, whether a card can be excluded, and whether confirmation is needed. Use the supported card-order control when rearranging cards with a distractor; provide touch and keyboard alternatives. Declare the slots, direction, candidate cards, and any locks explicitly. See [supported answer modes](QUESTION_CATALOG.md#answer-modes) for the current contract.

For distance pins, design four separate decisions:

| Decision              | Meaning                                                             |
| --------------------- | ------------------------------------------------------------------- |
| **Acceptance radius** | The maximum distance that counts as correct.                        |
| **Accuracy tiers**    | Ordered bands within the radius that distinguish placement quality. |
| **Feedback**          | The distance, praise, and visual explanation for the achieved band. |
| **Points**            | Standard bands earn 3 / 2 / 1, capped independently by help used.   |

Choose the radius for the intended skill, geographic scale, available clues, and
small-screen input precision. Audit nearby plausible locations and both sides of
each boundary. A larger radius intentionally changes the challenge; do not use it
to compensate for poor framing or unusable controls. Make the acceptance rule
available before submission in the free **Accuracy** information; show the target
and rings only on reveal. Help must preserve it.
Author three accuracy bands for distance pins: bullseye, close, and within range.
The shared bullseye line and **Accuracy** information disclose the bands before
submission, while keeping target rings reveal-only. Do not repeat those distances
in `instruction`.
Choose useful inner radii for the subject; the outer band must end at the acceptance
radius. Territory-inside pins grade an area, so do not invent concentric distance
tiers for them.

Aconcagua accepts all pins within 450 km, with inclusive bands ending at 150, 300,
and 450 km. Every accepted band earns one correct answer; point rewards are
3, 2 and 1 respectively. Accuracy grading and reward points remain separate.
Technical tier requirements live in the [question catalog](QUESTION_CATALOG.md#answer-modes).

**Distractors are authored content, not filler.** Each plausible wrong choice should embody a recognizable misconception; at most a couple of obvious exclusions can make a question approachable. A useful four-choice structure may deliberately combine: a correct answer, a tempting near miss, a familiar category error, and an easier elimination. For example, a northern-Andes capital question can juxtapose **Bogotá** (capital in the Andes), **Caracas** (capital of an Andean country but outside the Andean range), **Medellín** (Andean city but not a national capital), and **Paramaribo** (capital outside the Andes). Do not state in the lead-in or hint that a listed distractor is wrong.

For every candidate set, ask: _Can someone win solely by choosing the odd-looking item, the only inland dot, the only small country, or the only option matching a grammatical cue?_ If so, either the observation is the intended skill or the set needs redesign.

**Design around the deciding condition.** Identify the geographic, historical or
conceptual distinction the player must apply. Give plausible distractors some of
the same traits as the answer, so a secondary clue cannot bypass that distinction.
For example, a question about former Yugoslav republics can offer coastal Albania
and Greece alongside the correct coastal countries: coastline alone then cannot
settle historical membership. A question about an Atlantic–Mediterranean strait
can include countries sharing one coast, both coasts, proximity to Spain, or other
Mediterranean passages. Observation may still be the intended skill; decide this
deliberately rather than letting the easiest visual shortcut decide the task.

**Changing candidates can change the skill.** Revisit the prompt, given geography,
camera, hint and assist together whenever the candidate pool changes. A coastline
hint may stop being useful when the deciding condition becomes former federal
membership. Broader candidates may require a wider camera; do not leave the
correct location privileged at the center or hide all plausible alternatives.

When a round asks for _some_ members of a larger valid set, author the acceptance rule and reveal carefully. A set of three arbitrary countries out of seven may be technically easy to grade but too broad to make an engaging question. Prefer a specific spatial or conceptual relationship over “any three” when the narrower task offers a clearer learning payoff.

### Point rewards

The current five-question Daily is worth **15 points**: three per question.
All 17 reviewed Journeys use this uniform budget. Variable question weights are
not implemented; agree a new scoring/display contract before authoring them.

- Discrete answers and territory-inside pins earn three points when correct,
  otherwise zero. Multi-answer, ordered and matching questions retain their
  all-or-nothing correctness contract; no new partial credit is implied.
- Distance pins with the standard three tiers earn 3 / 2 / 1 from the innermost
  to outermost accepted band, or zero outside acceptance. Legacy single-radius
  pins retain three points for an accepted answer.
- A hint caps the question at two points; an assist caps it at one. Apply
  `min(outcome points, help ceiling)`, rather than subtracting help again from
  an already lower pin reward. The strongest help stage wins across synced tabs.
- The total stays out of 15 after help or an early finish. Unreached questions
  contribute zero. Correct-answer counts remain a separate statistic.
- Earned star orbs sit beside the reveal message: three fixed positions, filled
  from left to right, then hollow. Results place the total below the closing line,
  with one continuous row of 15 slots and per-question receipt rewards. Reveal all
  slots once, sequentially from left to right, including hollow shells;
  reduced motion uses a static display. Theme accents carry the orb styling.
- New answers capture versioned point rewards at submission. Earlier submitted
  answers retain full credit (three for a correct answer) under their original
  rules, without recomputing old pin distances or retroactively charging for help.
  Mixed/legacy receipts identify that earlier credit. The save data is not reset.

There is no time limit or speed-based reward.

## 5. Give the globe purposeful question-state information

The globe communicates the question's geography. Choose these four properties
independently for every visible object:

| Property    | Authoring decision                                                                                 |
| ----------- | -------------------------------------------------------------------------------------------------- |
| Geometry    | An area, an actual point location, a linear feature, or a label anchor.                            |
| Role        | Established reference, undisclosed clue, openly shown candidate, submitted answer, or explanation. |
| Interaction | Inspection, country/region selection, city selection, coordinate pin placement, or none.           |
| Lifecycle   | What is shown during play, added by help, explained on reveal, and retained at completion.         |

**Match representation to geometry.** Countries, states, territories, islands,
lakes, and other areas use their footprints and labels. A country-name label must
not create a city dot. Use `areaLabel` for label anchors when a footprint is already
shown or no reviewed extent is available; never invent a precise point or boundary.
Cities, summits, bridges, and other actual locations may use point markers. Rivers
and surveyed routes use reviewed line geometry. Border adjacency, crossing counts,
and sequences do not imply center-to-center travel paths: use area emphasis and a
written sequence. Point-to-point distance and explicitly assessed great-circle
comparisons can use connecting lines.

**Use roles consistently.**

- **Reference (subdued blue land and raised, contrasting blue outline; blue point accent):**
  Geography already established by the prompt. Area outlines use darker blue ink
  that contrasts with the fill; point accents retain the lighter blue. Reference outlines remain visible
  when the surrounding search field has hidden borders. Reference areas are inspectable,
  rather than country-selection answers. Reference cities share one point style
  and size, independent of capital status. Use `cityReference` for authored cities.
- **Candidate field (pale gold):** An openly shown, equally styled pool of
  answers selectable on the globe. Gold land signals an available map action.
- **Anonymous area clues (blue fill and contrasting outline):** Shapes supplied
  for reasoning while the player answers by name or buttons. Declare their pool
  with `scenes.play.candidateRegionIds` and `map.candidateRole: "clue"`;
  this keeps them distinct from established references in `contextIds` without
  implying globe selection. Use the same rule for provinces, territories and
  countries, including map-assisted knowledge questions.
  Use the same thin, dark blue boundary treatment as established references,
  with only enough elevation to clear the geography; avoid bright white halos.
  Set `map.selectionFeedback: "after-submit"` and disable hover emphasis.
  Keep clues equally emphasized while the player chooses named buttons or types
  a place name. Buttons and text fields may show their pending state;
  the map must not identify their shapes through selection color, symbols, labels,
  hover names, or camera movement until submission. This is a task-specific
  disclosure rule, not the default for questions where that identity is already given.
- **Open search surface (light neutral land):** Undisclosed land available for
  whole-world recall or a deliberately unrestricted pin search. Pin input alone
  does not imply an open search field: city pins with given reference countries
  use the same muted background as other questions. Declare
  `map.background: "open-search"` and its authored reason when the withheld
  footprint is itself part of a broad pin search. Whole-world country selection
  uses `map.candidates: "neutral"`. Gray muted geography represents
  background outside the current search field. Do not color only the correct
  candidate or expose a withheld pin target's outline.
  Keep this broad surface lower in visual emphasis than the blue references;
  references must remain easy to locate against it.
- **Selected (strong gold):** A pending answer. Area selections use a bare check,
  not a city-marker disk. The same symbol grammar applies to feedback.
  Available globe candidates use a richer amber outline and a warmer fill on
  hover. Blue references/clues remain steady; hover never adds a selection symbol
  or replaces an already selected answer's color.
- **Correct / solution / incorrect:** Green, teal, and rose belong to the actual
  answered object or assignment. A reason, language, or animal answer does
  not make every illustrative location a graded answer. Use `explanationPlace`
  or `displayRole: "explanation"` for supporting discoveries. Keep matching/order
  numbers attached to their locations through feedback; use color and text for
  correctness. Bind geographic choices explicitly to the locations they grade;
  a meaning or reason choice must not grade its illustrative cities. Valid
  alternatives are distinct from missed required answers.
  For numeric geography tasks, color the complete counted set or demonstrated
  border-crossing route green after a correct answer, teal after a miss. Keep
  unrelated supporting geography blue and omit individual selection checks:
  the submitted answer was a count, not a set of country selections.
- **Completion (purple):** Retain the reviewed discoveries, including cities and
  landmarks, alongside useful containing geography. Custom completion scenes add
  framing and context; they do not remove the answered locations. Supporting
  references may remain blue. Keep unrelated land muted and mistakes distinct.
  Purple means a reviewed discovery, including a solution revealed after a miss;
  it is not a correct-answer grade. Actual mistaken areas, city selections,
  assignments, and coordinate pins remain red. For city and pin answers, grade
  the location rather than its containing country. A mistake takes precedence
  when the same object is also included in a discovery or custom recap scene.
  Keep omitted required solutions, named clue geometry, and its labels in the
  recap. For tasks accepting alternatives, retain the player's accepted answer;
  after a miss, use an illustrative accepted solution rather than the entire pool.
  A known wrong typed city remains visible even when it is not a capital. Unknown
  or ambiguous names should never create an invented map point.

Area symbols occupy the widest interior of the main displayed landmass. Their
size follows the available space on screen, with an upper bound; hide a symbol
when it cannot fit legibly instead of imposing a minimum that covers neighboring
land. Keep the whole territory as the hit target. A clue fragment and its owner
may both receive emphasis, but one answer must not acquire duplicate status
symbols. Numeric crossing-count examples use geography as explanation, without
claiming that each route territory was a submitted answer.
Small clue fragments need a contrasting outline that remains visible at the
authored zoom. Keep the shared thin boundary treatment; do not enlarge grading
geometry, add city markers or use thick white borders to manufacture visibility.
Candidate geography must not overpower the clue.
When a supplied clue is too small to locate, use a modestly tighter camera and
`scenes.play.clueLocators: [{ regionId, label }]`. The label must already be given
to the player (or say “Highlighted island” when its name is withheld). The shared
locator measures the displayed area, gives two short blue pulses, and leaves a
fine leader/name callout while the clue remains small. It adds no city marker or
answer hit target. Reduced motion uses only the static callout; locators clear on
submission and exit. Never use one to expose an undisclosed pin target or owner.

**Protect the task.** A named country supporting a city question is free
orientation. A named country the player must locate with a pin is still a withheld
target. Reveal a city's containing country as reference geography when its answer
is shown; do not grade the country for a city answer. Waterbody answers need a
reviewed extent or a clear waterbody label, rather than a city-like dot.
Show country and regional boundaries when players must select areas. Hide them
only when estimating an undisclosed footprint or recalling a relationship from
memory is part of the task, and explain that omission before submission. Write prompts
around geographic names or “the highlighted island,” rather than palette values
such as “darker yellow”; meaning must survive theme changes.

**Keep input consistent.** Single-country and merged-territory taps submit
immediately, including named button alternatives. Pins and multi-answer selections
retain confirmation. Pins use a crosshair on land and water. Reference areas do
not gain answer cursors or hover emphasis. Colors alone never grant eligibility,
change grading, expose names, or frame the camera.
The shared answer control owns commitment notices such as “Your first answer is
final.” Authored instructions explain the task without repeating that notice.

Legends explain distinctions needed to interpret an answer, rather than listing
every background or context color. Preserve ordinary point-marker readability and
its accessible hit area independently of territory-symbol scaling.

**Three-state authoring:**

1. **Question state:** what is visible, withheld, and interactive before submission.
2. **Help state:** what new information appears at the hint and assist stages without changing the grading contract.
3. **Reveal state:** what becomes visible to explain the answer and its geographic significance.

A map line or marker can betray an answer just as easily as a label. Run the **naive-inspection test**: could a player with none of the intended knowledge solve the task by tracing geometry, clicking adjacent polygons, comparing candidate dots, exploiting color, or following the camera center? If yes, either observation is intentionally being assessed, or change the map, clue, or answer method. Hide names only when that actually preserves the skill.

**Explain deliberate omissions when they affect the task.** If a feature players
might expect to inspect is hidden, tell them to estimate its location: “We’ve
hidden the Suez Canal on this map. Drop a pin at its Mediterranean entrance.”
This explains the intended action without revealing the target coordinate. Give
that explanation before help; players should not mistake intentional withholding
for missing geography. Use accurate feature terms, such as canal versus strait.

Audit the _entire_ information surface: lead-in, prompt, instructions, options, image and alt text, overline, hover names, map labels, earlier feedback, hint, assist, and source titles. Sources remain locked until after submission because they can spoil an answer.

## 6. Choreograph cameras and geographic features

Design **question camera → answer action → feedback camera → next question camera** for every stop. Review all five transitions as a sequence, not five independent coordinates.

- The question focus should orient the player **without pinpointing a withheld target**. Being near the subject is not inherently a leak; centering the sole correct marker or precisely identifying the only relevant pair of polygons often is.
- The feedback focus should make the insight visually understandable at an appropriate scale. A close camera that shows nothing but uniform land color is not informative; a distant camera that puts both subjects at the globe's edges is not a real comparison.
- A route Journey should feel like movement. A feature-based Journey (Danube, Andes) should retain a geographic throughline where useful. A conceptual Journey spanning continents may instead use deliberate, clearly separated views.
- Account for desktop and narrow-screen viewports. The panel changes the useful map area; latitude, longitude, and altitude alone do not establish visual quality. Use the scoped verification policy in section 11 when an actual rendering uncertainty needs resolution.

Rivers use the shared theme’s cerulean ink and thin light casing so they remain
legible over reference, candidate, and muted land. Keep physical water styling
independent of answer correctness; do not author a one-off river color per Journey.

**Linear geography must be honest.** Rivers, roads, coastlines, routes, and mountain chains must not seem to end only because an author clipped a data segment. Let the geometry continue past the frame, fade at a viewport edge, reach a real terminus, or clearly identify a schematic/partial segment. At a destination reveal, show the true connection to the receiving feature. Do not invent a straight connector to cover a source gap; use reviewed geometry or revise the depiction.

A persistent feature need not appear in full at all times. **Visibility is part of the clue budget.** Show the relevant stretch during question states when it doesn't expose an answer; withhold answer-bearing segments only when warranted. Keep continuity in the available underlying geography, and explicitly label a shortened drawn itinerary as “route so far” if its ending could be mistaken for the end of the actual feature. Re-evaluate this per question rather than applying an indiscriminate whole-Journey visibility rule.

`physicalFeatures` supplies pre-answer geographic context; `feedbackPhysicalFeatures` can add answer-bearing explanation after submission. Both are **display layers**, not grading data. Reuse reviewed geometry with provenance and appropriate licensing.

## 7. Author hints that teach and assists that preserve play

Use **Question → Hint → Assist → Answer/reveal**. Not every question needs an assist; each should eventually have an authored hint. The hint adds a useful _new_ thought or relationship. The assist modifies the presented problem—such as disabling distractors, providing a reference marker, narrowing a non-answer-centered search area, or revealing spelling information—while leaving the original correctness rule intact.

| Input                    | Light hint                                             | Stronger assist to consider                                                                             |
| ------------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Single choice            | Relevant exception, cause, or geographical distinction | Remove selected distractors while retaining a genuine decision                                          |
| Multiple choice          | A foothold that helps distinguish members of the set   | Narrow candidate pool **without leaving exactly the required answer set**                               |
| Country/map tap          | Neighbor, direction, region, or reason                 | Uniformly narrow the candidate field, without marking the answer polygon                                |
| City pin                 | Directional or relational clue                         | Show useful reference cities or a broad search region whose center is **not** the target                |
| Pin inside territory     | Geographic relationship                                | Broad candidate region/indirect reference geography; **never the answer boundary itself**               |
| Typed name               | Historical/cultural/spatial clue                       | Meaningful reference geography or a plausible candidate set that leaves a decision                      |
| Number                   | Comparison, scale, or method for reasoning             | Narrow numerical interval with several plausible values                                                 |
| Ordering with distractor | One partial relationship                               | Fix **one** position or identify a nonfinal relationship while leaving ordering **and exclusion** to do |

**Test the hint and assist as rigorously as the question.** Never paywall basic orientation that should already be given. A hint cannot merely repeat the prompt (“one of these is landlocked”), nor should an assist reduce a multi-answer choice to exactly the number of required answers. Eliminate candidates intentionally and preserve plausible alternatives. The survivors should have equivalent appearance and no accidental labels or position-based leaks.

In a pin question, **never enlarge the acceptance radius** as an assist. That silently changes the answer contract. Likewise, revealing the exact grading boundary, city coordinate, or answer-bearing line is not appropriate assistance. An assist should leave real work to do, not turn a difficult task into following a visible outline.

Audit reference markers against every distance tier, especially after changing the
acceptance radius. A player must not earn a correct answer or the strongest
accuracy feedback merely by pinning a supplied reference marker. Keep reference
points outside the outer acceptance zone and verify this against the authored
coordinates; visual separation on the globe is not sufficient.

Keep the hint on screen after the assist. Preserve prior selections and explain when eliminated choices conflict with them. Store the strongest help stage per round and reflect it in the receipt. **Correctness and completion stay unchanged**; assistance is reported separately (unassisted, hinted, assisted) and caps the
question's points at two for a hint or one for an assist. Disclose the ceiling
before help is used; never change the acceptance rule or tolerance.

Help controls should be visually secondary to the normal answer/submit action and clearly progress from “Need a hint?” to “Need an assist?”. Question information/sources/reporting is separate from gameplay help.

## 8. Design the reveal before declaring the question finished

Write both **answer text** and **answer-state globe**. The correct answer should be explicit, followed by a short insight that adds something beyond restating the question. On a miss, show the canonical solution clearly. For questions with multiple valid solutions, distinguish an illustrative accepted example from an exhaustive answer set.

The revealed visual must represent the **actual type of answer**:

- **City:** mark the city, not the entire country in green. Show relevant comparison cities, labelled by roles when appropriate (`former capital`, `current capital`, `coastal city`).
- **Lake:** reveal its actual shape and border relationship, not just a dot. Keep the relevant countries legible.
- **Peak:** reveal the summit marker and nearby mountain range/border at a useful scale, not only a text statement that it is “near Chile.”
- **River:** reveal the relevant route, banks, tributary, or drainage relationship rather than color its starting country as correct.
- **Receiving sea:** identify the waterbody and show the river visibly meeting it.
- **Country / group of countries:** apply correct/incorrect states to the eligible answer polygons, while retaining given geography as context.
- **Pin:** show the target, submitted pin, distance or accepted region, and tolerance appropriately **after** commitment. Keep local explanation framing when useful; the shared engine widens distant distance-pin reveals when both locations fit. Separate **Show your pin** and **Show answer** views handle extreme distances without hiding either location or changing the answer.
- **Order:** retain numbered assignments on the relevant objects, distinguish the excluded distractor, and avoid an ambiguous “one green mass” reveal. A sequence alone does not justify drawing a travel route.

A documentary photograph can make a discovery tangible, as in Tierra del Fuego.
Distinguish pre-answer clue media from reveal-only media; audit captions, alt text,
credits, and labels for spoilers. Use reviewed factual images, record provenance
and licenses, and display attribution. See the [reveal-media contract](QUESTION_CATALOG.md#authored-map-narrative-and-completion).

Some ideas cannot be explained honestly with the globe alone: underground diversions, two-bank urban relationships, historical border changes, and other relational concepts may warrant an **explicitly schematic diagram**. Distinguish schematics from surveyed cartography; they should clarify rather than feign precision.

Review declared roles through reveal and completion. In grouped scenes,
`reveal.contextIds` supplies references and `reveal.answerIds` identifies actual
solution areas; use explanatory place roles for supporting illustrations. The
compiler owns the flat feedback fields. If a reference becomes graded or a city
becomes a country answer, correct the role/input contract or shared presentation
logic rather than adding a one-off color override. Set the reveal focus
purposefully. Match the success phrase to the skill: _remembered, placed, inferred,
identified_, not always “Well spotted.”

## 9. Make completion resolve the premise

The completion screen is an **authored sixth visual state**, not merely “5/5 correct.” It should make the five answers intelligible together. Q5 earns an ending through a new task; completion then gathers the discoveries without asking another question.

Author the completion geography, caption, media and cameras. The score-based
closing heading and reward orbs are shared UI; do not prescribe a fixed headline
per Journey. Daily and Archive results retain the saved run without a replay
button, including for admins. Practice routes can replay; Admin Tools offers a
separate explicit reset of today's attempt.

A Journey about visual symbolism needs visual clues and visual explanations.
Give the relevant motif enough room to inspect, retain its full visual context,
and keep answer-bearing comparisons after submission. At completion, compare the
resolved designs themselves alongside their locations; a constellation of colored
countries alone does not resolve an iconographic premise.

- **Route/physical-feature Journey:** show the honest full geographic feature or traveled route with resolved stops and useful labels. Do not use an unrelated generic flyover when a continuous map is the payoff.
- **Conceptual Journey:** show the common pattern or a constellation of resolved locations. Do not pretend distant stops form a meaningful route merely to draw lines.
- **Repeated mechanic:** make the repeated relationship visible in the recap. Resolved round labels may reveal actual names once spoilers no longer matter.

Use an appropriate `completion` state (camera, markers, physical features, caption). When a single hemisphere cannot show everything well, use multiple authored views rather than a midpoint that hides both ends. Reduced-motion and small-screen experiences must communicate the same takeaway. Keep the result receipt legible across the panel width, with meaningful resolved labels. Report help separately from correctness; the shared receipt uses a lightbulb for a hint and a lifebuoy for an assist beside the result icon, with accessible labels. Update the caption and flyover whenever a destination changes.

Frame the actual revealed subject or relationship. Generic flyovers prefer an
authored reveal focus; an island clue should not send the player to its owner's
mainland. Revealed clue fragments and labels survive completion even when several
stops share the same country.

## 10. Reuse supported mechanics and keep contracts explicit

**Do not use an unrelated completed question as a template.** A whole-question
spread can silently inherit commitment, eligibility, disclosure, or clue content.
Reuse reviewed data and deliberate presentation defaults instead.

Author rounds with `defineQuestion` and shared presentation with
`definePresentation`. The builders already bind answer modes to valid rules,
selection, count, commitment, and required input fields; shared presentation
rejects answer contracts and whole-question spreads. Runtime/context validation
also checks actual targets, answer counts, eligibility, and help configuration.

Keep eligibility, disclosure, grading, and camera framing separate. Map answering
is derived from the answer mode; `map.hoverFeedback` controls hover presentation
and cannot disable answering. Muted visual states do not settle tap eligibility.
A colored polygon is not proof that it is selectable; inspect the authored
contract through presentation and input handling. A typing fallback must not
conceal a broken primary control.

Use [Question catalog and authoring](QUESTION_CATALOG.md) as the maintained
reference for supported modes and recipes, including card ordering, pin tiers,
help locks, and reveal media. Consult the current implementation and focused
tests before relying on an unfamiliar combination. A proposed interaction must
be identified as proposed; an existing supported mechanic need not be rebuilt.

## 11. Validate efficiently at the layer that can resolve the risk

Use [AGENTS.md](../AGENTS.md) as the verification policy. Perform these checks
in proportion to the change:

1. **Editorial:** Read the five stops and their clue/reveal sequences. Check
   purpose, forward progression, distractors, redundancy, fairness, sources, and
   the completion payoff. Review changed help against the unchanged answer rule.
2. **Focused automated checks and inspection:** Use relevant unit/DOM tests and
   inspect the prepared world and App-to-globe input contract. Cover material
   risks such as answer leakage, eligibility, preserved selections, wrong-answer
   reveals, tier edges, or stale presentation between rounds. Run TypeScript for
   typed-code changes. Documentation-only changes need formatting/link checks,
   not gameplay tests. Stop once the relevant checks pass.
3. **Lifecycle and outcome review:** For affected mechanics, inspect a correct
   answer, an actual wrong response, a partial set/assignment where supported,
   and the completed recap. A correct revealed solution and the player's wrong
   pick are different objects. Check repeated objects across rounds, restored
   drafts, and cleanup when advancing or exiting. `check:journey` submits
   representative correct and wrong responses through the reducer and checks
   completion retention. These samples are not exhaustive; exported scene previews
   remain synthetic. Use focused behavior tests for partial answers, repeated
   geography, ambiguous text, and extreme pins, and inspect the effective scenes.
4. **Conditional browser verification:** Use a browser only when explicitly
   requested or when a critical uncertainty cannot be resolved otherwise, such
   as actual WebGL picking, rendered label collisions, or device-specific input.
   State the reason first and check the smallest affected flow/device. A Journey
   facelift does not automatically require a complete desktop/mobile playthrough.
   Use practice without changing shared dates or clearing real player saves.

### Two levels of consistency checks

1. **Shared rules:** `journeyVisualRules.ts` defines role invariants used by
   `check:journey` and the catalog tests. References stay blue, outlined and
   ineligible; candidate and revealed answer areas retain boundaries; background
   follows explicit scene scope rather than answer input. Editable names cannot
   identify anonymous geography before submission, and supplied pin reference
   markers cannot satisfy the answer. Independent mechanic fixtures test these
   rules with deliberately broken scenes. The same rules audit existing content,
   not just the question that originally exposed a problem.
2. **Authored intent:** A departure needs a narrow `visualExceptions` entry and a
   reason tied to the learning task. Supported keys are `hidden-boundaries`,
   `open-search-background`, and `natural-background`. For example, recalling
   border crossings can withhold state borders until assistance; an unrestricted
   coastline-based pin search can withhold political boundaries; photograph
   recognition may use natural political map colors (`map.neutralRegions`).
   Explain hidden boundaries to players. Reasons do not waive reference outlines,
   eligibility, pending-answer disclosure or grading rules. The audit rejects
   empty, unknown and stale exceptions whose scene configuration no longer applies.

Use `npm run check:journey -- --all` for a concise catalog sweep. Use a Journey ID
for detailed stages and exception reasons, or add `--json` for structured findings.
Review each finding by its shared role and the skill being tested before deciding
whether to fix presentation or document an exception. A passing check establishes
these particular invariants, not every aspect of editorial or visual quality.

An automated scoring check does not establish rendered visual quality. State
exactly what was inspected, simulated, or browser-tested and any unresolved
material limitation. Broaden testing only for a new failure, shared-contract
risk, or required release check; do not repeat already-passing checks routinely.

Preserve published progress and the user's edition preference. A facelift does
not automatically require a new Journey. When changing answer identity, order,
acceptance, or mechanics, explicitly handle in-progress saves and keep completed
results intact; use a reviewed edition or migration only when the agreed scope
calls for it. Never silently regrade completed attempts. Regenerate metadata
only when the content/index changes, following the [authoring workflow](QUESTION_CATALOG.md#add-or-change-a-journey).

Deploy only when authorized. Use the supported nonblocking path and report that
publication was initiated, with a link or identifier. Do not poll CI, deployment,
or hosted services for success unless the user asks for that verification or
completion genuinely depends on it.

## 12. Final author checklist

- [ ] A compact five-stop outline establishes the premise and the reason every stop belongs.
- [ ] Questions move forward and do not retest facts or answers already supplied.
- [ ] Q5 earns an ending through a destination, discovery, consequence, or new application.
- [ ] Cognitive targets are deliberate, with no repetitive filler or implausibly wide questions.
- [ ] Each lead-in contributes context; each prompt is one task; instructions are nonredundant.
- [ ] Distractors are intentionally misleading **without becoming impossible or spoiled**.
- [ ] Plausible candidates preserve the deciding distinction; secondary clues cannot bypass the intended knowledge.
- [ ] Candidate changes trigger a joint review of prompt, camera, hint and assist.
- [ ] Deliberately hidden features are explained when players might otherwise expect to inspect them.
- [ ] The requested input is obvious and actually usable—no required hidden typing panel.
- [ ] Given geography is visibly contextualized when helpful; answers are **not** pre-colored.
- [ ] Question, hint, assist, and reveal all pass the naive-inspection/fairness tests.
- [ ] Help leaves meaningful work and never changes grading geometry or correctness rules.
- [ ] Pin acceptance, accuracy feedback, and points are explicit; reference markers lie outside every accepted tier.
- [ ] Camera transitions make sense, and linear geographic features do not falsely end.
- [ ] The reveal shows the correct _type_ of answer and teaches something new.
- [ ] Areas use fills and fitting status symbols; actual locations use point markers. Reference and candidate roles agree with input eligibility.
- [ ] Supporting geography stays contextual, matching assignments retain their identity, and discoveries survive into the recap.
- [ ] The completion map/caption resolves the five-round premise.
- [ ] Sources validate both facts and the relevant geometry or historical claims.
- [ ] Shared configs cannot inherit unrelated question behavior unnoticed.
- [ ] Relevant checks pass; actual inspection, simulated input, and any necessary browser verification are recorded accurately.
- [ ] Changed destinations agree with completion labels, caption, and camera views.
- [ ] Save handling respects the agreed edition strategy and preserves completed results.

## Appendix: render mountain context from terrain

Mountain context needs recognizable forms at the actual question zoom, not a
cloud of disconnected strokes. Ground placement in reviewed elevation data.
Pictorial peaks may simplify it into connected silhouettes, shared saddles,
shaded faces and attached hatching; record that these are cartographic symbols,
not exact summit outlines or surveyed ridgelines. Record input checksums,
sampling, clipping, and attribution. Pale faces do not imply permanent snow.
Keep relief subordinate to answer markers and reduce detail at distant zooms.
When a lake or another physical feature is the reveal’s focal object, author a
local clearance: remove complete overlapping terrain symbols and their ink.
Preserve the terrain elsewhere. Foreground silhouettes must hide both rear faces
and rear ink. Check transitions from earlier rounds as well as isolated states:
cached geometry must not restore outlines cleared for a reveal.
Use one label per focal feature, and ensure
opaque relief does not erase political boundaries needed by the task.
Relief is display-only: it never changes eligibility or grading. A general
mountain footprint may limit rendering but must not appear as a hard boundary.

Review map markers round by round: adding selectable summit or city locations to
one round does not authorize them elsewhere. Anonymous candidates should be
legible and equally styled; reveal names only when the answer contract permits.
A custom completion still needs authored camera views and a consistent recap
palette. Highlight the answer objects, not unrelated countries left over from
the final question.

# Crafting a Journey

_Editorial and player-experience guide · revised October 2026_

A **Journey** is five questions that develop one geographic premise. It might follow a route, investigate a physical feature, connect historical or cultural ideas, or repeat one satisfying reasoning mechanic. The point is not five facts about the same topic: **each round should advance an experience that is worth completing as a whole.**

This guide covers what authors design and what players actually experience. [Question catalog and authoring](QUESTION_CATALOG.md) remains the reference for registration, data contracts, supported modes, and technical mechanics. Where this guide identifies desired behavior not yet implemented, treat it as a product requirement—not as an existing API.

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

**Read all five prompts and reveals in order.** Identify repeated trivia (e.g., two consecutive capital-recall questions), an overly broad first task, later questions spoiled by earlier answers, or a finale easier and less meaningful than the journey leading to it. Do not force increasing difficulty for its own sake; make the finale integrative.

## 2. Write a round design record before writing code

Every round needs a small, explicit design record. A camera coordinate or answer ID alone does not capture editorial intent.

| Field                      | Specify                                                                                                                                  |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Identity and role**      | Spoiler-safe step label, internal title, and why this stop appears at this point.                                                        |
| **Cognitive target**       | What is tested: recall, recognition, inference, spatial placement, relationship, comparison, ordering, or observation?                   |
| **Required knowledge**     | What must the player know or deduce that the presentation does **not** already supply?                                                   |
| **Camera**                 | Question focus, feedback focus, viewport scale, and transition from the previous stop.                                                   |
| **Visible components**     | Borders, context fills, physical features, markers, labels, diagrams, candidates, previously discovered geography.                       |
| **Withheld components**    | Exact targets, names, borders, lines, or locations deliberately hidden to preserve the challenge.                                        |
| **Interactive components** | What can actually be tapped, selected, dragged, pinned, or typed—not merely what is visible.                                             |
| **Question**               | `leadIn` (optional), `prompt`, and `instruction` (only if necessary).                                                                    |
| **Supporting media**       | Optional flag, image, inset, source map, audio, or diagram and its accessibility text.                                                   |
| **Answer contract**        | Canonical answer(s), accepted variants, response mode, number/order, tolerance, commitment, partial-credit policy, and failure behavior. |
| **Help**                   | Authored hint; optional stronger assist, including any UI/map changes.                                                                   |
| **Reveal**                 | Canonical answer, added insight, feedback camera, visual highlights/features/diagram, and what persists.                                 |
| **Provenance**             | Factual sources, geometry sources, review date, and whether a feature is display-only or answer-bearing.                                 |

Separate three concepts throughout: **where we are**, **what we can inspect**, and **what the player must provide**. Marking the first two is often helpful; marking the third prematurely often destroys the question.

## 3. Write one continuous question—not a headline and footnote

The renderer joins `leadIn` and `prompt` into one visual paragraph with equal font size and line-height. Muted context and a brighter task carry the hierarchy through **color**, not a size jump. `title` is an internal identity, not a second player-facing heading.

- **`leadIn` is optional.** Use it for meaningful movement, a necessary premise, or conceptual context. Avoid filler such as “Head to West Africa” when the globe and prompt already establish that.
- **`prompt` is one clear task.** State what the player has to answer, not an essay about the topic.
- **`instruction` explains nonobvious interaction mechanics**, exact count/order, or spatial tolerance. Do not use it to repeat what the controls already convey. “Choose two countries” under a clearly labeled two-selection choice UI is redundant; “Tap both countries on the globe” may be necessary if the map is the control.
- **Overlines/step labels describe the content** consistently (`Capital`, `Lake`, `Border`), rather than unpredictably changing to a method (`Drop a pin`). The method should be clear from the primary control.
- Move incidental dates, statistics, and long explanations into the reveal unless they are needed for the task.

Example: **Context:** “Downstream, Buda and Pest face each other across the river.” **Task:** “What capital brings the two banks together?” Render as a single paragraph with different text colors; do not add a second heading or a vertical break.

A question may be short. Do not fill every content field to satisfy a template.

## 4. Design the answer method and distractors intentionally

**The intended action must be the easiest, immediately available way to answer.** A technically valid reducer rule does not prove the player can use the interface.

Typical modes include named single/multiple choices, map country/region selection, anonymous city markers, pin-by-distance, pin-inside-territory, typed names, numeric entry, and ordered answers. Select among them based on the cognitive target:

- Use **typing sparingly**, mostly when recall or spelling of a name (often a city or capital) is the skill. A typed question shows its input immediately. Players should never have to open **“Answer by typing”** to perform a required text task.
- If the question is **tap on the map**, make the polygons or markers genuinely selectable. A collapsed typing fallback is for accessibility or unavailable globe input—not the default workaround for a broken map.
- For **pins**, define whether the skill is estimating a point or getting inside a territory. The latter is not automatically a fair challenge with hidden boundaries: evaluate whether the player has a meaningful way to land inside without guessing against invisible grading geometry. Do **not** solve this by revealing the exact target country's outline as an assist; that simply exposes the answer surface. Redesign the task, choice of location, or clues instead.
- For **ordering**, specify whether order is geographic, chronological, or logical, whether a card can be excluded, and whether confirmation is needed. The desired **drag-to-order with a distractor** has three ordered slots and a separate unused card; it requires a real drag/reorder UI (plus keyboard/touch alternatives), not a row of typed fields relabeled as dragging. Verify implementation support before publishing it.

**Distractors are authored content, not filler.** Each plausible wrong choice should embody a recognizable misconception; at most a couple of obvious exclusions can make a question approachable. A useful four-choice structure may deliberately combine: a correct answer, a tempting near miss, a familiar category error, and an easier elimination. For example, a northern-Andes capital question can juxtapose **Bogotá** (capital in the Andes), **Caracas** (capital of an Andean country but outside the Andean range), **Medellín** (Andean city but not a national capital), and **Paramaribo** (capital outside the Andes). Do not state in the lead-in or hint that a listed distractor is wrong.

For every candidate set, ask: _Can someone win solely by choosing the odd-looking item, the only inland dot, the only small country, or the only option matching a grammatical cue?_ If so, either the observation is the intended skill or the set needs redesign.

When a round asks for _some_ members of a larger valid set, author the acceptance rule and reveal carefully. A set of three arbitrary countries out of seven may be technically easy to grade but too broad to make an engaging question. Prefer a specific spatial or conceptual relationship over “any three” when the narrower task offers a clearer learning payoff.

## 5. Give the globe purposeful question-state information

The globe is an active part of the question, not decorative background. An endless field of gray countries is often a sign that the author has not deliberately specified the **given** geography.

- **Context highlight (typically yellow):** Geography already named or established by the prompt, such as Ecuador in an Ecuadorian mountain question, or Chile as a fixed reference for an ordering task. Yellow is **not** a decoration requirement on every round.
- **Neutral/muted:** Background, undisclosed answers, and nonprivileged candidates. These may still need to be selectable.
- **Selected/committed:** What the player has chosen, distinctly different from contextual yellow.
- **Correct/incorrect:** Feedback states for the **answered object**, not arbitrary neighboring land.

If a question names a country and asks for its mountain, capital, language, or history, highlighting that named country is **free orientation**, not a hint. Do not make players rediscover information already in the copy.

If an explicit candidate region is provided, give its eligible members equivalent styling when appropriate. Do not pre-highlight only correct members. And do not assume every multi-choice question needs yellow map fills: use them only if they clarify the actual task.

**Three-state authoring:**

1. **Question state:** what is visible, withheld, and interactive before submission.
2. **Help state:** what new information appears at the hint and assist stages without changing the grading contract.
3. **Reveal state:** what becomes visible to explain the answer and its geographic significance.

A map line or marker can betray an answer just as easily as a label. Run the **naive-inspection test**: could a player with none of the intended knowledge solve the task by tracing geometry, clicking adjacent polygons, comparing candidate dots, exploiting color, or following the camera center? If yes, either observation is intentionally being assessed, or change the map, clue, or answer method. Hide names only when that actually preserves the skill.

Audit the _entire_ information surface: lead-in, prompt, instructions, options, image and alt text, overline, hover names, map labels, earlier feedback, hint, assist, and source titles. Sources remain locked until after submission because they can spoil an answer.

## 6. Choreograph cameras and geographic features

Design **question camera → answer action → feedback camera → next question camera** for every stop. Review all five transitions as a sequence, not five independent coordinates.

- The question focus should orient the player **without pinpointing a withheld target**. Being near the subject is not inherently a leak; centering the sole correct marker or precisely identifying the only relevant pair of polygons often is.
- The feedback focus should make the insight visually understandable at an appropriate scale. A close camera that shows nothing but uniform land color is not informative; a distant camera that puts both subjects at the globe's edges is not a real comparison.
- A route Journey should feel like movement. A feature-based Journey (Danube, Andes) should retain a geographic throughline where useful. A conceptual Journey spanning continents may instead use deliberate, clearly separated views.
- Check the rendered viewport on both desktop and mobile. The question panel changes how much of the globe is visible; authored latitude, longitude, and altitude are hypotheses until tested.

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
| Typed name               | Historical/cultural/spatial clue                       | First letter, length, or another meaningful constraint                                                  |
| Number                   | Comparison, scale, or method for reasoning             | Narrow numerical interval with several plausible values                                                 |
| Ordering with distractor | One partial relationship                               | Fix **one** position or identify a nonfinal relationship while leaving ordering **and exclusion** to do |

**Test the hint and assist as rigorously as the question.** Never paywall basic orientation that should already be given. A hint cannot merely repeat the prompt (“one of these is landlocked”), nor should an assist reduce a multi-answer choice to exactly the number of required answers. Eliminate candidates intentionally and preserve plausible alternatives. The survivors should have equivalent appearance and no accidental labels or position-based leaks.

In a pin question, **never enlarge the acceptance radius** as an assist. That silently changes the answer contract. Likewise, revealing the exact grading boundary, city coordinate, or answer-bearing line is not appropriate assistance. An assist should leave real work to do, not turn a difficult task into following a visible outline.

Keep the hint on screen after the assist. Preserve prior selections and explain when eliminated choices conflict with them. Store the strongest help stage per round and reflect it in the receipt. **Correctness and completion stay unchanged**; assistance is reported separately (unassisted, hinted, assisted), not scored as a penalty.

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
- **Pin:** show the target, submitted pin, distance or accepted region, and tolerance appropriately **after** commitment.
- **Order:** map the resolved sequence spatially, distinguish the excluded distractor, and avoid an ambiguous “one green mass” reveal.

Some ideas cannot be explained honestly with the globe alone: underground diversions, two-bank urban relationships, historical border changes, and other relational concepts may warrant an **explicitly schematic diagram**. Distinguish schematics from surveyed cartography; they should clarify rather than feign precision.

Review feedback colors and legends: if `contextIds` becomes answer-green in a particular state, adjust `feedbackContextIds`/`feedbackHintIds` so background geography is not misrepresented. Set `feedbackFocus` purposefully. Match the success phrase to the skill: _remembered, placed, inferred, identified_, not always “Well spotted.”

## 9. Make completion resolve the premise

The completion screen is an **authored sixth visual state**, not merely “5/5 correct.” It should make the five answers intelligible together.

- **Route/physical-feature Journey:** show the honest full geographic feature or traveled route with resolved stops and useful labels. Do not use an unrelated generic flyover when a continuous map is the payoff.
- **Conceptual Journey:** show the common pattern or a constellation of resolved locations. Do not pretend distant stops form a meaningful route merely to draw lines.
- **Repeated mechanic:** make the repeated relationship visible in the recap. Resolved round labels may reveal actual names once spoilers no longer matter.

Use an appropriate `completion` state (camera, markers, physical features, caption). When a single hemisphere cannot show everything well, use multiple authored views rather than a midpoint that hides both ends. Reduced-motion and small-screen experiences must communicate the same takeaway. Maintain the result receipt and separate hinted/assisted annotations.

## 10. Author safely: reuse mechanics, not unrelated questions

**Do not use an unrelated completed question as a template.** Spreading `mapleFlagQuestion` into an Aconcagua question invisibly inherits Canada-flag behaviors (map mode, commitment, disclosure, selection, and more). Later changes to the flag question could then break a mountain question.

Use:

- **Generic defaults** only for behavior genuinely safe across question types.
- **Mode-specific builders** for valid interaction contracts (`mapSingleQuestion`, `pinQuestion`, `choiceMultipleQuestion`, etc.) if/when implemented.
- **Complete authored questions** as leaf nodes. Deliberately adapt a seed only when reusing essentially the **same content**.

Prefer types that bind `mode`, `rule`, `selection`, commitment, and required props into valid combinations. Until the compiler enforces such contracts, authors must state or audit these settings **explicitly**. A round should be understandable from its own declaration rather than from a distant, unrelated inheritance chain.

**Current runtime interaction pitfalls to verify:**

- `map.hover: false` in `journeyWorld` also disables country-region interaction; it is **not** merely tooltip suppression. Pin taps follow a different path.
- `muteOthers: true` can render regions `disabled`. `GlobeView` may reject taps on disabled regions unless the neutral-candidate/`selectDisabled` path is configured.
- For anonymous neutral country selection, use `hover: true`, `candidates: "neutral"`, appropriate `selection`, and hidden names. Verify the rendered polygons actually accept taps.
- Highlighted candidates also require a working hit contract; a colored polygon is not proof that it is selectable.
- A typing escape hatch must not disguise a broken map mode. If direct map interaction fails, repair the configuration and UI rather than telling players to expand “Answer by typing.”

A typical neutral country-selection contract is:

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
  hover: true, // also enables country-region interaction in the current runtime
  muteOthers: true,
  candidates: "neutral",
  revealOnAnswer: true,
},
```

Keep supported answer modes distinct from **proposed UI formats**. For example, `ordered-countries` presently uses ordered text inputs in the reviewed `AnswerForm`; a draggable card sort with an excluded distractor is a **new interaction requiring implementation and testing**.

## 11. Validate the experience, not just the answer key

Perform three independent passes:

1. **Editorial:** Read the whole Journey and each round's clue sequence. Check purpose, distractors, text redundancy, repeated cognitive tasks, fairness, naive-inspection leaks, difficulty rhythm, sources, and whether every reveal advances the premise.
2. **Interaction/presentation:** Inspect the prepared `journeyWorld` state and route it through App and `GlobeView`. Confirm actual hover/tap eligibility, enabled candidates, map highlighting, hidden information, help state, answer submission, correct/wrong reveal, and responsive camera framing. A reducer accepting `wurl:ARG` does not prove Argentina can be tapped on the globe.
3. **Real browser playthrough:** On desktop **and mobile**, complete every question using the intended visible control—including drag, tap, pin, and typed fields. Test both correct and incorrect outcomes; open hints and assists; verify camera transitions, clipping, label visibility, diagram readability, completion, and accessibility fallbacks. Record exactly what was browser-tested versus simulated.

An automated green scoring test is not a passing player-experience review. Preserve published progress: cosmetic changes may preserve identifiers where answer contracts are unchanged; changed answers, order, accepted results, or mechanics may require a reviewed edition and save-migration strategy. Never silently regrade attempts already completed. Regenerate catalog metadata and follow the normal build/release procedure.

## 12. Final author checklist

- [ ] The five rounds express one coherent premise; every stop has a reason to belong.
- [ ] Cognitive targets are deliberate, with no repetitive filler or implausibly wide questions.
- [ ] Each lead-in contributes context; each prompt is one task; instructions are nonredundant.
- [ ] Distractors are intentionally misleading **without becoming impossible or spoiled**.
- [ ] The requested input is obvious and actually usable—no required hidden typing panel.
- [ ] Given geography is visibly contextualized when helpful; answers are **not** pre-colored.
- [ ] Question, hint, assist, and reveal all pass the naive-inspection/fairness tests.
- [ ] Help leaves meaningful work and never changes grading geometry or correctness rules.
- [ ] Camera transitions make sense, and linear geographic features do not falsely end.
- [ ] The reveal shows the correct _type_ of answer and teaches something new.
- [ ] The completion map/caption resolves the five-round premise.
- [ ] Sources validate both facts and the relevant geometry or historical claims.
- [ ] Shared configs cannot inherit unrelated question behavior unnoticed.
- [ ] Desktop/mobile playthroughs, correct/wrong paths, and accessibility alternatives have been checked.

# Crafting a Journey

_Authoritative editorial and player-experience guide · consolidated October 2026_

A **Journey** is five questions that develop one geographic premise. It might follow a route, investigate a physical feature, connect historical or cultural ideas, or repeat one satisfying reasoning mechanic. The point is not five facts about the same topic: **each round should advance an experience that is worth completing as a whole.**

This is the single maintained Journey crafting guide, incorporating the former
`Crafting_a_Journey_Revised.md` and the implementation lessons from Andes.
[AGENTS.md](../AGENTS.md) governs working efficiency, verification, and deployment.

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
- **`instruction` explains nonobvious interaction mechanics**, exact count/order, or spatial tolerance. Do not use it to repeat what the controls already convey. “Choose two countries” under a clearly labeled two-selection choice UI is redundant; “Tap both countries on the globe” may be necessary if the map is the control.
- **Overlines/step labels describe the content** consistently (`Capital`, `Lake`, `Border`), rather than unpredictably changing to a method (`Drop a pin`). The method should be clear from the primary control.
- Move incidental dates, statistics, and long explanations into the reveal unless they are needed for the task.

Example: **Context:** “Downstream, Buda and Pest face each other across the river.” **Task:** “What capital brings the two banks together?” Render as a single paragraph with different text colors; do not add a second heading or a vertical break.

A question may be short. Do not fill every content field to satisfy a template.

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
| **Points**            | Whether bands earn the same score or explicitly different rewards.  |

Choose the radius for the intended skill, geographic scale, available clues, and
small-screen input precision. Audit nearby plausible locations and both sides of
each boundary. A larger radius intentionally changes the challenge; do not use it
to compensate for poor framing or unusable controls. State the acceptance rule
before submission; show the target and rings only on reveal. Help must preserve it.

Aconcagua accepts all pins within 450 km, with inclusive bands ending at 150, 300,
and 450 km. Every band earns one correct answer; feedback varies by accuracy.
Tiered feedback does **not** imply tiered points. More complex Journey scoring is
future product work and must be explicitly designed before an author relies on it.
Technical tier requirements live in the [question catalog](QUESTION_CATALOG.md#answer-modes).

**Distractors are authored content, not filler.** Each plausible wrong choice should embody a recognizable misconception; at most a couple of obvious exclusions can make a question approachable. A useful four-choice structure may deliberately combine: a correct answer, a tempting near miss, a familiar category error, and an easier elimination. For example, a northern-Andes capital question can juxtapose **Bogotá** (capital in the Andes), **Caracas** (capital of an Andean country but outside the Andean range), **Medellín** (Andean city but not a national capital), and **Paramaribo** (capital outside the Andes). Do not state in the lead-in or hint that a listed distractor is wrong.

For every candidate set, ask: _Can someone win solely by choosing the odd-looking item, the only inland dot, the only small country, or the only option matching a grammatical cue?_ If so, either the observation is the intended skill or the set needs redesign.

When a round asks for _some_ members of a larger valid set, author the acceptance rule and reveal carefully. A set of three arbitrary countries out of seven may be technically easy to grade but too broad to make an engaging question. Prefer a specific spatial or conceptual relationship over “any three” when the narrower task offers a clearer learning payoff.

## 5. Give the globe purposeful question-state information

The globe is an active part of the question, not decorative background. An endless field of gray countries is often a sign that the author has not deliberately specified the **given** geography.

- **Context (amber):** Geography already named or established by the prompt. Yellow is **not** a decoration requirement on every round.
- **Available candidates (pale yellow):** An equally styled eligible candidate field; distinct from known context.
- **Neutral/muted:** Background, undisclosed answers, and nonprivileged candidates. These may still need to be selectable.
- **Selected/committed (brighter yellow):** What the player has chosen, with an emphasized outline and a different fill from both context and available candidates. These shared globe colors are defined in `PLAY_HIGHLIGHTS` in `src/globe/themes.ts` and used for country fills and place markers.
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
- Account for desktop and narrow-screen viewports. The panel changes the useful map area; latitude, longitude, and altitude alone do not establish visual quality. Use the scoped verification policy in section 11 when an actual rendering uncertainty needs resolution.

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

Audit reference markers against every distance tier, especially after changing the
acceptance radius. A player must not earn a correct answer or the strongest
accuracy feedback merely by pinning a supplied reference marker. Keep reference
points outside the outer acceptance zone and verify this against the authored
coordinates; visual separation on the globe is not sufficient.

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

A documentary photograph can make a discovery tangible, as in Tierra del Fuego.
Distinguish pre-answer clue media from reveal-only media; audit captions, alt text,
credits, and labels for spoilers. Use reviewed factual images, record provenance
and licenses, and display attribution. See the [reveal-media contract](QUESTION_CATALOG.md#authored-map-narrative-and-completion).

Some ideas cannot be explained honestly with the globe alone: underground diversions, two-bank urban relationships, historical border changes, and other relational concepts may warrant an **explicitly schematic diagram**. Distinguish schematics from surveyed cartography; they should clarify rather than feign precision.

Review feedback colors and legends: if `contextIds` becomes answer-green in a particular state, adjust `feedbackContextIds`/`feedbackHintIds` so background geography is not misrepresented. Set `feedbackFocus` purposefully. Match the success phrase to the skill: _remembered, placed, inferred, identified_, not always “Well spotted.”

## 9. Make completion resolve the premise

The completion screen is an **authored sixth visual state**, not merely “5/5 correct.” It should make the five answers intelligible together. Q5 earns an ending through a new task; completion then gathers the discoveries without asking another question.

A Journey about visual symbolism needs visual clues and visual explanations.
Give the relevant motif enough room to inspect, retain its full visual context,
and keep answer-bearing comparisons after submission. At completion, compare the
resolved designs themselves alongside their locations; a constellation of colored
countries alone does not resolve an iconographic premise.

- **Route/physical-feature Journey:** show the honest full geographic feature or traveled route with resolved stops and useful labels. Do not use an unrelated generic flyover when a continuous map is the payoff.
- **Conceptual Journey:** show the common pattern or a constellation of resolved locations. Do not pretend distant stops form a meaningful route merely to draw lines.
- **Repeated mechanic:** make the repeated relationship visible in the recap. Resolved round labels may reveal actual names once spoilers no longer matter.

Use an appropriate `completion` state (camera, markers, physical features, caption). When a single hemisphere cannot show everything well, use multiple authored views rather than a midpoint that hides both ends. Reduced-motion and small-screen experiences must communicate the same takeaway. Keep the result receipt legible across the panel width, with meaningful resolved labels. Report help separately from correctness; the shared receipt uses a lightbulb for a hint and a lifebuoy for an assist beside the result icon, with accessible labels. Update the caption and flyover whenever a destination changes.

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
3. **Conditional browser verification:** Use a browser only when explicitly
   requested or when a critical uncertainty cannot be resolved otherwise, such
   as actual WebGL picking, rendered label collisions, or device-specific input.
   State the reason first and check the smallest affected flow/device. A Journey
   facelift does not automatically require a complete desktop/mobile playthrough.
   Use practice without changing shared dates or clearing real player saves.

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
- [ ] The requested input is obvious and actually usable—no required hidden typing panel.
- [ ] Given geography is visibly contextualized when helpful; answers are **not** pre-colored.
- [ ] Question, hint, assist, and reveal all pass the naive-inspection/fairness tests.
- [ ] Help leaves meaningful work and never changes grading geometry or correctness rules.
- [ ] Pin acceptance, accuracy feedback, and points are explicit; reference markers lie outside every accepted tier.
- [ ] Camera transitions make sense, and linear geographic features do not falsely end.
- [ ] The reveal shows the correct _type_ of answer and teaches something new.
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

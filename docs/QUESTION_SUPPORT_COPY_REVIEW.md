# Question supporting copy audit

20 October 2026. Reviewed all **95 questions across 19 registered Journeys**, using
authored content and server-rendered panels. The shared supporting-copy fix is now
implemented. Appearance cards also use the full container width.

## Findings addressed

- 48 questions had authored instructions; the other 47 generally needed no filler.
- All 28 pins appended generic movement/confirmation prose.
- 16 distance pins repeated the rule's numeric bands in hand-written paragraphs.
- Four questions split authored instructions and final-answer notices into separate
  paragraphs, with different font sizes and margins.
- Missing Borders Q1 repeated the tap action already present in its prompt.
- Other map, marker and named-choice instructions repeated visible controls.

## Current player-facing standard

Supporting text uses one **14px paragraph**, including Study's map instruction.
Muted instructions and the accent-colored commitment notice share inline flow and
font size. Text wraps naturally on narrow screens.

| Case                                              | Supporting copy                                                                    |
| ------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Puerto Rico                                       | Tap the island. **Your first answer is final.**                                    |
| Missing Borders, whose prompt already says to tap | **Your first answer is final.**                                                    |
| Bridge pin                                        | Aim for the bullseye (within 100 km)!                                              |
| Hidden country borders                            | Country borders are hidden; estimate using the coastlines and reference countries. |
| Hidden U.S. state borders                         | State borders are hidden.                                                          |
| California–Missouri crossings                     | State borders are hidden. Stay in the U.S.; corner contacts don’t count.           |

Bold represents the accent color, not a bold typographic treatment. Distance pins
and numeric sliders derive their concise bullseye copy from the grading rule.
Their full acceptance limits and bands are available before submission through
**Question information → Accuracy**, without using a hint or lowering points.
Target locations and rings remain reveal-only. Territory pins have no invented
numeric bullseye. Grading, points and help ceilings are unchanged.

## Ownership and prevention

- `QuestionSupport.tsx` owns authored exceptions, mechanic guidance and commitment
  copy. `AnswerForm` renders it once; `GameShell` and `OrderAnswer` no longer append
  their own instruction paragraphs. Pin placement changes use a screen-reader
  status instead of another visible sentence.
- Catalog instructions retain only missing interaction cues and real exceptions.
  Redundant numeric accuracy prose and generic marker/count/tap instructions were
  removed or shortened explicitly, without runtime text-stripping heuristics.
- `QuestionAccuracy` supplies free accuracy details in the existing information
  menu, independently of source-link locking and paid hints/assists.
- The crafting guide, catalog checklist, specification template, exported project
  instructions and kit mode notes describe this standard. The kit includes the
  shared supporting-copy implementation for source review.
- Regression coverage checks the combined rendered question: a single inline row,
  no repeated notices or movement boilerplate, numeric copy matching the rule,
  hidden-boundary exceptions, and free access to the full acceptance bands.

The 95-question count covers registered Journeys, not the generated Study pool.
Study's separate map instruction uses the same shared typography.

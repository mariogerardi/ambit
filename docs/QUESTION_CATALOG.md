# Journey catalog and question authoring

The bundled catalog contains **15 Journeys and 75 questions**, reviewed against
the code on October 10, 2026. Each Journey has five rounds. Admin chooses today's
Journey on this device; direct practice routes and `/playground` provide access
to other bundled content. There is no current in-app authoring or AI generator.
Previously published local packs are read-only compatibility data.

## Bundled Journeys

| #   | Title                    | Practice route                     | Definition                                               |
| --- | ------------------------ | ---------------------------------- | -------------------------------------------------------- |
| 1   | The long way home        | `/journey/long-way-home`           | [journey.ts](../src/game/journey.ts)                     |
| 2   | Beyond borders           | `/journey/beyond-borders`          | [secondJourney.ts](../src/game/secondJourney.ts)         |
| 3   | Across the Silk Roads    | `/journey/silk-roads`              | [thirdJourney.ts](../src/game/thirdJourney.ts)           |
| 4   | Around the Mediterranean | `/journey/mediterranean`           | [fourthJourney.ts](../src/game/fourthJourney.ts)         |
| 5   | North America by name    | `/journey/north-america`           | [fifthJourney.ts](../src/game/fifthJourney.ts)           |
| 6   | Worlds within worlds     | `/journey/enclosed-territories`    | [sixthJourney.ts](../src/game/sixthJourney.ts)           |
| 7   | Borrowed names           | `/journey/borrowed-names`          | [seventhJourney.ts](../src/game/seventhJourney.ts)       |
| 8   | Pins and cities          | `/journey/pins-and-cities`         | [eighthJourney.ts](../src/game/eighthJourney.ts)         |
| 9   | Shared neighbors         | `/journey/shared-neighbors`        | [ninthJourney.ts](../src/game/ninthJourney.ts)           |
| 10  | Around the Ring of Fire  | `/journey/ring-of-fire`            | [tenthJourney.ts](../src/game/tenthJourney.ts)           |
| 11  | Not the obvious city     | `/journey/not-the-obvious-city`    | [eleventhJourney.ts](../src/game/eleventhJourney.ts)     |
| 12  | Exceptions to the rule   | `/journey/exceptions-to-the-rule`  | [twelfthJourney.ts](../src/game/twelfthJourney.ts)       |
| 13  | The Z trail              | `/journey/the-z-trail`             | [thirteenthJourney.ts](../src/game/thirteenthJourney.ts) |
| 14  | Island instincts         | `/journey/island-instincts`        | [fourteenthJourney.ts](../src/game/fourteenthJourney.ts) |
| 15  | On Russia’s doorstep     | `/journey/try-not-to-click-russia` | [fifteenthJourney.ts](../src/game/fifteenthJourney.ts)   |

Home displays TODAY'S JOURNEY, its title/description, progress, and the appropriate
Play/Resume/View result action. The daily rotation uses device-local midnight and
cycles the catalog from October 5, 2026. Results use Home/Study as primary exits,
with replay secondary. A results flyover follows answer stops in round order and
loops; player interaction or reduced motion interrupts it.

The Russia-neighbor Journey asks for pins in Finland, North Korea, Mongolia,
Georgia, and Estonia. Broad playable cameras are deliberately centered outside
the answer; borders, names, and markers remain hidden until submission.

## Answer modes

Counts below refer to the 75 bundled questions, not every possible engine pairing.
The type and rule contracts live in [`questions.ts`](../src/game/questions.ts);
user-facing type names live in [`questionTypes.ts`](../src/game/questionTypes.ts).

| Mode                | Control                | Questions |
| ------------------- | ---------------------- | --------: |
| `pin`               | Drop a pin             |        15 |
| `city-single`       | Single city pick       |         3 |
| `city-multiple`     | Multiple city picks    |         2 |
| `map-single`        | Single country pick    |        17 |
| `map-multiple`      | Multiple country picks |         6 |
| `number`            | Number                 |         6 |
| `text`              | Free response          |         9 |
| `typed-regions`     | Typed region names     |         4 |
| `ordered-countries` | Ordered country names  |         1 |
| `ordered-capitals`  | Ordered capital names  |         1 |
| `choice-single`     | Single choice          |         9 |
| `choice-multiple`   | Multiple choices       |         2 |

`land-path` remains an internal supported mode/evaluator, with no playable catalog
example or playground selector. Multiple-choice questions are capped at six
options. The numeric counter supports nonnegative integers with explicit +/-
controls and direct typing; a new numeric rule should respect that UI contract.

## Knowledge rules and data scope

A rule describes correctness independently of its answer control:

| Family                 | Rule IDs                                                                                        | Authority/limits                                                                                        |
| ---------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Authored answers       | `manual-text`, `manual-number`, `choice-ids`, `country-ids`, `region-ids`, `place-ids`          | Reviewed explicit answers, aliases, and membership sets; `manual-number` has no bundled example.        |
| Pin placement          | `pin-inside`, `pin-distance`                                                                    | Canonical local region containment or authored place/radius, with units and tolerance reviewed.         |
| Country facts/names    | `country-fact`, `text-fact`, `name-length`                                                      | Sourced fact context or the explicit common-English-name UN roster.                                     |
| Capitals/flags         | `capital-name`, `capital-order`, `flag-country`                                                 | Bundled capital/flag records; capital-order checks the specified route.                                 |
| Geographic reasoning   | `shortest-borders`, `great-circle-order`                                                        | Shared-edge canonical topology and spherical route intersections, not roads or travel permissions.      |
| Reviewed relationships | `territory-owner`, `feature-count`, `language-family`, `official-languages`, `physical-feature` | Curated sets/profiles, not universal relationships inferred from display metadata.                      |
| Spatial predicates     | `capital-coordinate`, `capital-circle`, `country-circle`                                        | Pinned coordinates, geodesic disks, and full country geometry. `country-circle` has no bundled example. |

There are 24 declared knowledge-rule variants. Support for a rule does not imply
complete factual coverage or that every mode/rule combination is valid.
[`createQuestionContext`](../src/game/questions.ts) prepares and validates the
required targets/answers. Inspect an existing question with the same rule before
adding a new combination.

**Languages can already be used in questions.** Official-language, language-family,
and reviewed choice rules have examples, but coverage is curated. Spoken-language
lists in Explore are not official-language lists; incomplete lists cannot support
an exhaustive “all countries with language X” question.

**Population questions can be authored with reviewed answers**, using explicit
country/choice sets, numbers, or text. There is no general population-comparison
rule or reviewed time-series dataset. Explore's undated population estimates are
not safe evidence for a current-year ranking. Supply a dated source, population
measure, units, rounding/tolerance, and tie policy; add a versioned dataset and
predicate if the question should be computed rather than fixed.

## Add or change a Journey

1. Define five `Question` records and a `Journey` in `src/game/`. Use stable,
   unique IDs; changing an existing ID affects saved progress. Set an editorial
   Journey title/description and short question labels, with the actual `prompt`
   as the visible question heading.
2. Choose mode, rule, count, selection eligibility, disclosure, commitment, and
   failure behavior independently. Add required targets, facts, prepared regional
   geometry, places, or overlays. Extend [`COUNTRY_FACTS`](../src/game/countryFacts.ts)
   or reviewed [`quizData.ts`](../src/game/quizData.ts) relationships when needed.
3. Set a permitted playable `focus`, optional feedback focus, explanation, and
   `source`/`sources` with review dates. A camera, label, flag alt text, or highlighted
   candidate set must not reveal an answer that the question intends to hide.
4. Register the Journey and route in [`journeys.ts`](../src/game/journeys.ts), and
   add its rounds to [`questionCatalog.ts`](../src/game/questionCatalog.ts).
   Runtime lazy discovery covers `journey.ts` and files ending in `Journey.ts`;
   keep that naming pattern or update discovery deliberately.
5. Run `npm run prepare:journeys`, then `npm test` and `npm run build`. Add focused
   checks for new answer behavior, disclosure, ambiguous geography, and metadata.
   Update this catalog table/counts when adding/removing content.

Adding a bundled Journey changes the repeating schedule for subsequent dates.
Existing attempts remain pinned to their stored Journey. Review schedule policy
and save compatibility before removing or reordering content; do not treat the
index as an independently authored source.

## Review checklist

- Keep the prompt central. Use authored `title` for internal identity; add
  instructions only for exceptional rules, units, ordering, or tolerances.
- State the country/territory convention, primary-capital convention, or relevant
  date when it affects the answer. Accept reviewed aliases and distinguish
  boundary contact from shared-edge adjacency.
- Keep eligibility separate from correct answers. Hide future progress labels
  until a stage is active/completed; avoid cached tooltips leaking old disclosure.
- Use canonical geometry for grading, display footprints for presentation, and
  source links for attribution. Do not fetch unchecked facts during gameplay.
- After submission, reveal useful geography and reasoning. Sources belong below
  Next as a small tertiary control; avoid repeating the question as an answer recap.

Reviewed facts, explanations, source links, and disclosure settings live with the
Journey definitions linked above. Use those definitions and the current guides
when maintaining content.

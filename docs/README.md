# Documentation

The [root README](../README.md) provides setup and a product overview.

Start with the task below and read the relevant sections, then the owning code.
The [development owner/test map](DEVELOPMENT.md#choose-focused-checks) identifies
focused verification. Engine support is broader than recommended authoring
standards; examples do not override the crafting guide.

## Find the relevant section

| Task                                   | Start here                                                                                                                        | Then inspect                                                                                                                                                  |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Implement an approved Journey spec     | [Implementation workflow](journey-authoring/IMPLEMENTING_A_SPEC.md)                                                               | Approved brief, relevant crafting sections, catalog's **Bundled Journeys** table, and matching examples/recipes.                                              |
| Design a new Journey                   | [Crafting](JOURNEY_CRAFTING.md), sections 1–2                                                                                     | Sections relevant to the proposed controls, help, reveal and completion; record decisions in the [spec template](journey-authoring/JOURNEY_SPEC_TEMPLATE.md). |
| Edit question copy or help             | [Crafting](JOURNEY_CRAFTING.md), sections 3 and 7–9                                                                               | The affected Journey; `questionText.ts` and `QuestionSupport.tsx` if changing shared copy.                                                                    |
| Change clues, scenes or camera framing | [Engine: Explicit scenes](JOURNEY_ENGINE.md#explicit-scenes); crafting sections 5–6                                               | `presentation.ts`, `scenes.ts`, and the relevant presentation/camera owner in [Architecture](ARCHITECTURE.md#module-map).                                     |
| Change grading or add a mechanic       | [Engine: Responsibilities](JOURNEY_ENGINE.md#responsibilities) and [Extending the engine](JOURNEY_ENGINE.md#extending-the-engine) | `questionContracts.ts`, preparation/evaluation owner, `mechanics.ts` and the matching `recipes.ts` example.                                                   |
| Register or retire a Journey           | [Catalog: Add or change a Journey](QUESTION_CATALOG.md#add-or-change-a-journey)                                                   | `journeys.ts`, generated index, retired IDs and save recovery.                                                                                                |
| Change saves, accounts or backend APIs | [Architecture: Module map](ARCHITECTURE.md#module-map)                                                                            | Relevant sections of [Save persistence](SAVE_PERSISTENCE.md) or [Services](SERVICES.md), then the owning module and focused tests.                            |

## Current guides

| Guide                                                 | Use it for                                                                                             |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| [Development](DEVELOPMENT.md)                         | Running checks, regenerating assets safely, and maintaining docs.                                      |
| [Architecture](ARCHITECTURE.md)                       | Finding the owner of a behavior; shared globe, loading, and presentation contracts.                    |
| [Question catalog and authoring](QUESTION_CATALOG.md) | Practice routes, answer modes, rules, factual scope, and adding a Journey.                             |
| [Journey engine](JOURNEY_ENGINE.md)                   | Scene APIs, validation, presentation owners, and mechanic extension.                                   |
| [Portable authoring kit](JOURNEY_AUTHORING_KIT.md)    | Exporting current guidance and examples for AI-assisted design.                                        |
| [Journey crafting](JOURNEY_CRAFTING.md)               | Throughlines, prompt formatting, intentional difficulty, playable globe controls, reveals, and review. |
| [Geographic catalog policy](CATALOG_POLICY.md)        | Stable IDs, hierarchy, eligibility, and territorial conventions.                                       |
| [Explore data](EXPLORE_DATA.md)                       | Country details, subdivisions, physical features, and asset provenance.                                |
| [Save persistence](SAVE_PERSISTENCE.md)               | Local save registers, migration, recovery, and concurrent tabs.                                        |
| [Services](SERVICES.md)                               | Accounts, guest feedback, private review, Datadog configuration, and backend deployment.               |
| [Hosting](HOSTING.md)                                 | Release acceptance, production deployment, HTTP configuration, and rollback.                           |
| [Attribution](../NOTICE.md)                           | Source licenses, transformations, and redistribution notices.                                          |

Source code, generated catalogs, and source metadata are authoritative when a
summary disagrees with implementation. Update the relevant guide when changing a
public behavior, data convention, save format, preparation workflow, or release
requirement. Keep this index focused on maintained guides.

## Source notices and generated records

For AI-assisted Journey design, use the [portable authoring kit](JOURNEY_AUTHORING_KIT.md).
It exports current guides, mechanics and complete examples without loading the
whole repository into a design conversation.

The [layer manifest](../public/geography/manifest.json), `sources/*.metadata.json`,
checksum files, and ID mappings document the shipped inputs and outputs.
[The flag source README](../sources/flags-source-README.md) and
[font license notices](../public/fonts/) are original upstream documents; preserve
their wording when updating assets. They are not app-maintenance guides.

# Documentation

Current guides were reviewed against the implementation on **October 10, 2026**.
The [root README](../README.md) provides setup and a product overview. Journey
crafting guidance was consolidated on October 11, 2026; `JOURNEY_CRAFTING.md` is
the single maintained editorial guide.

## Current guides

| Guide                                                 | Use it for                                                                                             |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| [Development](DEVELOPMENT.md)                         | Running checks, regenerating assets safely, and maintaining docs.                                      |
| [Architecture](ARCHITECTURE.md)                       | Finding the owner of a behavior; shared globe, loading, and presentation contracts.                    |
| [Question catalog and authoring](QUESTION_CATALOG.md) | Practice routes, answer modes, rules, factual scope, and adding a Journey.                             |
| [Journey crafting](JOURNEY_CRAFTING.md)               | Throughlines, prompt formatting, intentional difficulty, playable globe controls, reveals, and review. |
| [Geographic catalog policy](CATALOG_POLICY.md)        | Stable IDs, hierarchy, eligibility, and territorial conventions.                                       |
| [Explore data](EXPLORE_DATA.md)                       | Country details, subdivisions, physical features, and asset provenance.                                |
| [Save persistence](SAVE_PERSISTENCE.md)               | Local save registers, migration, recovery, and concurrent tabs.                                        |
| [Release readiness](RELEASE_READINESS.md)             | Remaining launch work and static-hosting requirements.                                                 |
| [Services](SERVICES.md)                               | Accounts, guest feedback, private review, Datadog configuration, and backend deployment.               |
| [Hosting](HOSTING.md)                                 | Production deployment, domain, HTTP configuration, and rollback.                                       |
| [Attribution](../NOTICE.md)                           | Source licenses, transformations, and redistribution notices.                                          |

Source code, generated catalogs, and source metadata are authoritative when a
summary disagrees with implementation. Update the relevant guide when changing a
public behavior, data convention, save format, preparation workflow, or release
requirement. Keep this index focused on maintained guides.

## Source notices and generated records

The [layer manifest](../public/geography/manifest.json), `sources/*.metadata.json`,
checksum files, and ID mappings document the shipped inputs and outputs.
[The flag source README](../sources/flags-source-README.md) and
[font license notices](../public/fonts/) are original upstream documents; preserve
their wording when updating assets. They are not app-maintenance guides.

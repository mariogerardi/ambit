# Documentation

The Journey authoring set was reconciled with the local implementation on
**October 18, 2026**. This is a documentation review date, not deployment or browser
verification. The [root README](../README.md) provides setup and a product overview.

For Journey work, read [Crafting a Journey](JOURNEY_CRAFTING.md) for current
editorial and interaction standards, [the catalog](QUESTION_CATALOG.md) for
supported formats and registration, and [the engine guide](JOURNEY_ENGINE.md) for
implementation contracts. The [specification template](journey-authoring/JOURNEY_SPEC_TEMPLATE.md)
records those decisions. Engine support is broader than the recommended authoring
standards; examples do not override the standards.

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
| [Release readiness](RELEASE_READINESS.md)             | Remaining launch work and static-hosting requirements.                                                 |
| [Services](SERVICES.md)                               | Accounts, guest feedback, private review, Datadog configuration, and backend deployment.               |
| [Hosting](HOSTING.md)                                 | Production deployment, domain, HTTP configuration, and rollback.                                       |
| [Attribution](../NOTICE.md)                           | Source licenses, transformations, and redistribution notices.                                          |

Source code, generated catalogs, and source metadata are authoritative when a
summary disagrees with implementation. Update the relevant guide when changing a
public behavior, data convention, save format, preparation workflow, or release
requirement. Keep this index focused on maintained guides.

## Historical review records

[Journey review](JOURNEY_REVIEW.md) and the
[Shared Names implementation review](journey-authoring/SHARED_NAMES_REVIEW.md)
record earlier decisions and verification scope. They are historical evidence,
not current authoring instructions or confirmation of current rendered behavior.

## Source notices and generated records

For AI-assisted Journey design, use the [portable authoring kit](JOURNEY_AUTHORING_KIT.md).
It exports current guides, mechanics and complete examples without loading the
whole repository into a design conversation.

The [layer manifest](../public/geography/manifest.json), `sources/*.metadata.json`,
checksum files, and ID mappings document the shipped inputs and outputs.
[The flag source README](../sources/flags-source-README.md) and
[font license notices](../public/fonts/) are original upstream documents; preserve
their wording when updating assets. They are not app-maintenance guides.

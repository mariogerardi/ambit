# Ambit

A geography game built around one shared, interactive globe. Play a five-question
Journey, explore places, or build a Study session. React, TypeScript, Vite, and
Three.js power a static web app; geography, flags, and fonts are bundled locally.
Guest play uses local assets and saves. Optional Cognito accounts and a feedback
API run on AWS; Datadog monitors configured releases. Cross-device saves are not
yet implemented.

## Quick start

Use **Node.js 24.21.0** (pinned in [.nvmrc](.nvmrc)) and its bundled npm 11.19.0.
With nvm installed, run `nvm install` and `nvm use` in this directory first.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite, normally `http://127.0.0.1:5173`. The dev server binds
to loopback and requires its configured port to be available. Generated assets
are included; no data preparation or API keys are needed to run the app.

```sh
npm test         # Unit, asset, and DOM integration tests; no browser/WebGL
npm run build    # Strict TypeScript checks, then the production build in dist/
npm run preview  # Inspect dist/ locally; this is not a production server
```

See [Development](docs/DEVELOPMENT.md) for preparation commands and troubleshooting,
and [Release readiness](docs/RELEASE_READINESS.md) before deploying.
Production hosting and rollback are documented in [Hosting](docs/HOSTING.md).

## What is included

| View                     | Behavior                                                                                                                                  |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Home** (`/`)           | Today's Journey, saved progress, and entry points to Explore and Study.                                                                   |
| **Journey**              | Eleven active daily concepts, with 13 current five-question editions covering pins, map picks, recall, choices, and geographic reasoning. |
| **Explore** (`/explore`) | Country search/details, flags, capitals, cities, subdivisions, physical features, and a saved default view.                               |
| **Study** (`/study`)     | Discover Asia, African capitals, World flags, and a Custom session builder; results, review, and past sessions.                           |
| **Account** (`/account`) | Optional verified-email signup, sign-in, recovery, and sign-out.                                                                          |
| **Admin** (`/admin`)     | Verified owner only: review feedback and publish shared date-to-Journey assignments.                                                      |

The daily schedule cycles through the eleven retained Journey concepts from October 5, 2026, using
device-local dates. Admin’s Journey calendar can override any date for everyone;
unassigned dates continue that rotation. Chasing the sun and Down the Danube are additional concepts ready for Admin date assignments. Archived Journey definitions have been removed; new Sun attempts use its revised edition. Started attempts keep their edition and
progress when an assignment changes. Past attempts remain in saved history but
cannot be reopened by players after midnight. Direct practice routes require admin access; use Admin’s “Preview five questions” button. See the [Journey catalog](docs/QUESTION_CATALOG.md) for titles and routes.
The removed editor/AI generator is not part of the current app; legacy locally
published packs remain readable.

Study supports countries, capitals, and flags for 193 UN members. Choose worldwide,
a continent, or a custom country pool; answer by globe, typing, multiple choice,
or Mixed. **Cover everything once** exhausts the selected country/topic pairs.
**Bring back missed answers** explicitly enables additional mistake reviews.
Ordinary fixed-length/continuous decks reshuffle after exhausting their pool;
that can revisit a country even with mistake reviews disabled.

Study settings and results persist; the active attempt does not survive refresh
or tab closure. Leaving Study through app navigation clears it and archives any
submitted answers. Past sessions can be viewed or replayed, including the exact
coverage of targeted reviews. [Save persistence](docs/SAVE_PERSISTENCE.md) explains
recovery, tab synchronization, and remaining durability limits.

## Globe and presentation

All product views share the same mounted decorative globe. Selected regions,
question clues, and feedback use semantic states; display geometry and grading
geometry remain separate. Home starts idle rotation after focusing. Entering
Explore preserves enabled rotation until interaction; Fidget restores the prior
playback state. Speeds range from 0.25× to 8×. Reduced motion disables idle
rotation, Fidget, and animated travel.

On narrow screens, the globe and scrolling content occupy separate areas, with
navigation in the hamburger menu and an **Enlarge globe** action. Desktop layouts put content
beside the globe. Keyboard answer controls remain available for written answers;
Study map prompts include **Answer by name**, automatically expanded without
WebGL. Capital map prompts expect the country name in this alternative.
Actual browser/GPU, screen-reader, and physical mobile behavior still require
separate verification; unit/DOM coverage does not certify those experiences.

Question feedback screens offer **Report this question**; the menu includes
**Send feedback** for general comments. Neither requires an account. See
[Accounts, feedback, and monitoring](docs/SERVICES.md) for configuration and
backend deployment.

The hamburger menu offers **Atlas**, **Ocean**, **Dusk**, and **Paper** themes.
Each theme applies to UI and globe, preserving the camera and session. Editorial
emphasis, interaction accents, and primary actions use separate color roles.
Themes and default-view preferences persist locally and synchronize between tabs.

## Documentation

Start with the [documentation index](docs/README.md).

- [Architecture](docs/ARCHITECTURE.md): module responsibilities and globe state.
- [Development](docs/DEVELOPMENT.md): commands, data preparation, and maintenance.
- [Question catalog and authoring](docs/QUESTION_CATALOG.md): Journeys, rules, and content review.
- [Journey engine and extension contracts](docs/JOURNEY_ENGINE.md): reusable mechanics, matching, and extension boundaries.
- [Journey crafting](docs/JOURNEY_CRAFTING.md): Throughlines, difficulty, globe interaction, and meaningful reveals.
- [Geographic catalog policy](docs/CATALOG_POLICY.md) and [Explore data](docs/EXPLORE_DATA.md): identities, source conventions, and display limits.
- [Save persistence](docs/SAVE_PERSISTENCE.md): migration, recovery, and conflicts.
- [Release readiness](docs/RELEASE_READINESS.md): current gaps and deployment handoff.
- [Hosting](docs/HOSTING.md): production deployment, domain, HTTP configuration, and rollback.
- [Attribution](NOTICE.md): source notices, licenses, and transformations.

## Product language

**Ambit** is the product. A **Journey** is the daily five-question experience;
a **round** is one question within it. **Explore** is freeform exploration.
**Study** is practice; a **session** is one Study run. Keep the question prominent,
explain exceptional rules only, and avoid copy that merely describes visible UI.
Stable internal `wurl:` IDs remain for save/data compatibility; they are not an
additional product mode. The npm package is named `ambit`.

## Repository and licensing

This is a private project; no open-source license is granted for the application
code. The package is marked `private` and `UNLICENSED`. Third-party dependencies,
fonts, and geographic assets retain their own notices in [NOTICE.md](NOTICE.md).

[CI](.github/workflows/ci.yml) runs on main pushes, pull requests, and manual
requests using the pinned Node version. It installs locked dependencies, checks
documentation formatting, runs tests, builds the app, and checks dependency
advisories. Validation has read-only repository permissions. Successful main-branch
builds deploy their verified artifact to Amplify using short-lived AWS credentials
scoped to Ambit's production app; pull requests do not deploy.

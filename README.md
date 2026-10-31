# Ambit

A geography game built around one persistent, interactive globe. Play a daily
five-question Journey, try a minigame, explore the world, or build a Study session.
The application runs at [playambit.com](https://playambit.com).

Ambit uses React, TypeScript, Vite, and Three.js. Geography, flags, fonts, and
Journey media are bundled with the application. Guest progress is saved locally;
optional accounts synchronize Journey progress and Study settings, sessions, and
results. AWS provides hosting, accounts, and backend APIs; configured releases use
Datadog for monitoring.

## Experiences

| View                             | What it offers                                                                                                                                                               |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Home** (`/`)                   | Today's Journey, saved progress, and entry points to Minigames, Explore, and Study.                                                                                          |
| **Daily Journey** (`/daily`)     | Five connected questions using map picks, pins, recall, choices, matching, and geographic reasoning.                                                                         |
| **Archive** (`/archive`)         | Past Daily Journeys from October 11, 2026: play, resume, or revisit a saved result.                                                                                          |
| **Minigames** (`/minigames`)     | Shared Neighbors, Missing Borders, Border Run, and Pinpoint, with globe demonstrations, settings, and saved runs.                                                            |
| **Explore** (`/explore`)         | Countries, capitals, cities, subdivisions, physical features, and place details.                                                                                             |
| **Study** (`/study`)             | Your Sessions, curated Study Packs, a Session Builder, and personal Review; topics include countries, capitals, flags, major cities, and landmarks.                          |
| **Account** (`/account`)         | Progress, Friends, Profile, and Settings, with optional signup, sign-in, and account recovery.                                                                               |
| **Admin** (`/account?tab=admin`) | Authorized administrators manage the Daily schedule, browse and review Journeys, triage feedback, and access Maintenance controls. `/admin` remains a supported entry point. |

Daily dates use New York midnight. Registered Journeys participate in automatic
selection; locked dates and explicit assignments retain their chosen edition.
Changing an assignment does not replace a player's started attempt. Archive
completions earn points without retroactively extending Daily streaks. Direct
Journey practice and review routes require Admin access. The
[Journey catalog](docs/QUESTION_CATALOG.md) lists current titles and routes.

Study offers globe, typing, multiple-choice, and mixed answer methods, with options
that depend on the topic. Sessions, draft answers, and results survive navigation
and reloads; saved sessions can be continued and results reviewed. See
[Save persistence](docs/SAVE_PERSISTENCE.md) for recovery and synchronization details.

All modes share the same globe. Display geometry and scoring geometry have
separate responsibilities. Discovery, Odyssey, Expedition, and Safari themes
change the interface and globe styling while preserving the session. Responsive
layouts, reduced motion, and written answer alternatives support different ways
to play; automated DOM tests do not establish real device or WebGL behavior.

## Local development

Use **Node.js 24.21.0** from [.nvmrc](.nvmrc) and **npm 11.19.0** from
[package.json](package.json). With nvm installed, run `nvm install` and `nvm use`
first. Python 3.11+ is needed for backend tests and selected tooling; the runtime
check identifies a supported interpreter.

```sh
npm run check:env
npm ci
npm run dev
```

Open the URL printed by Vite, normally `http://127.0.0.1:5173`. The dev server binds
to loopback and requires its port to be available. Prepared assets are committed;
ordinary setup does not require regeneration or API keys. Optional account and
feedback services use the configuration described in [Services](docs/SERVICES.md).

Use focused checks for the behavior you change:

```sh
npm test -- tests/themes.test.ts
./node_modules/.bin/tsc --noEmit
```

Put test filenames before options. Bare `npm test` intentionally refuses to run
the full suite. The [development owner/test map](docs/DEVELOPMENT.md#choose-focused-checks)
helps select coverage, including cross-feature behavior. `npm run test:all` is
available when a full local frontend run is explicitly needed; CI owns the full
frontend/backend suites and production build gate.

`npm run build` creates `dist/`; `npm run preview` serves that build locally.
Development-only review fixtures are documented in [Development](docs/DEVELOPMENT.md).

## Repository map

| Path                                         | Purpose                                                                                                             |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `src/App.tsx`, `src/app/`                    | Modes, navigation, sessions, account/Admin interfaces, and persistence coordination.                                |
| `src/game/`                                  | Journey definitions, answer contracts, grading, presentation, and generated catalog metadata.                       |
| `src/study/`, `src/minigames/`               | Study and minigame engines, controls, and results.                                                                  |
| `src/globe/`, `src/geography/`, `src/theme/` | Shared globe rendering, geographic helpers/data, and visual themes.                                                 |
| `public/`, `sources/`                        | Shipped assets and source provenance. Raw preparation inputs may be ignored; retain committed metadata and notices. |
| `backend/`, `deployment/`                    | Python services, infrastructure, and deployment configuration.                                                      |
| `scripts/`, `tests/`, `review/`              | Preparation and maintenance tools, automated checks, and local review fixtures.                                     |
| `docs/`                                      | Maintained development, architecture, authoring, and operational guides.                                            |

`node_modules/`, `.cache/`, `dist/`, `reports/`, and `artifacts/` are ignored local
outputs or working files. Data preparation is an intentional maintenance task,
not part of installation or deployment. Stable internal `wurl:` IDs remain for
data and save compatibility; the product and npm package are named Ambit.

## Contributing and releasing

Coding agents should follow [AGENTS.md](AGENTS.md). Start independent work from
current `origin/main`, preserve existing work, and keep changes and local checks
focused. Use the [documentation index](docs/README.md) to find the relevant guide.

[CI](.github/workflows/ci.yml) runs frontend tests separately from backend, tooling,
and build checks. The required **Tests and production build** check passes only
when both jobs succeed. Pull requests do not deploy. After an authorized merge,
main-branch CI validates the merged commit and can deploy its artifact to Amplify
when the production cutover flag is enabled. Backend releases are separate.

See [Hosting](docs/HOSTING.md) for the merge/release handoff, deployment, and
rollback, and [Services](docs/SERVICES.md) for backend operations. Datadog reporting
is best effort; reporting failures produce warnings without overriding validation
or deployment results.

For Journey work, start with [Journey crafting](docs/JOURNEY_CRAFTING.md), or the
[approved-spec workflow](docs/journey-authoring/IMPLEMENTING_A_SPEC.md) when a spec
already exists. The [authoring kit](docs/JOURNEY_AUTHORING_KIT.md) exports current
guidance and examples for design work.

## Licensing

No open-source license is granted for the application code. The package is marked
`private` and `UNLICENSED`; public repository visibility does not change those
terms. Dependencies, fonts, photographs, and geographic assets retain their own
licenses and attribution in [NOTICE.md](NOTICE.md).

# Development and maintenance

## Run and check

Use Node.js **24.21.0**, pinned in [`.nvmrc`](../.nvmrc), with bundled npm 11.19.0.
`package.json` records the supported Node 24/npm 11 ranges and npm package-manager
version. If you use nvm, run `nvm install` and `nvm use` before installing.
Python 3.11 or newer runs offline backend tests and the optional preparation/deployment
scripts.

Run `npm run check:env` before installing or testing. It checks Node against
`.nvmrc`, npm against `packageManager`, and finds Python >=3.11 without installing
anything. It reports the Python command to use; substitute that command for
`python3` below if your default is older. `PYTHON=/path/to/python` explicitly
selects the interpreter for preflight and catalog checks; an invalid override
fails instead of silently selecting another runtime.

```sh
npm run check:env
npm ci
npm run dev
npm test -- tests/themes.test.ts
python3 scripts/run-python-tests.py backend/test_services.py
npm run build
npm run preview
```

For local frontend changes, name existing test files before any options:
`npm test -- tests/themes.test.ts`, or add `-t "test name"` to narrow further.
Bare `npm test` and options-only invocations refuse to run the entire suite.
CI owns the complete frontend/backend suites and production build gate before
merge. Keep local checks focused, including for Journey catalog changes.
`npm run test:all` and `npm run check:catalog` remain available for explicitly
requested full local verification; neither is a routine pre-push step. Broaden
local checks only for an identified shared-contract risk. Stop once they pass.

Backend checks accept one or more existing `backend/test_*.py` files or dotted
module/class/method names. Missing targets and empty selections fail. For example:

```sh
python3 scripts/run-python-tests.py backend/test_staging_demo.py
python3 scripts/run-python-tests.py test_staging_demo.SeedTests.test_refuses_production_resources
python3 scripts/run-python-tests.py  # Intentional full backend suite, also used by CI
```

Backend tests import `backend/offline_aws.py` before AWS-dependent application
modules. This shared test boundary requires no SDK, credentials, or other test
module to be imported first. New backend tests belong in `backend/test_*.py` so
the full runner discovers them. `npm run test:tooling` checks runtime selection;
`backend/test_test_runner.py` checks test selection and reporting.

Shell integration tests share the mocked globe/account setup in
`tests/helpers/appShell.tsx`; import it before application modules. Choose the
feature file below instead of running every shell test. Preserve existing cases
for file moves, and reserve new cases for changed behavior or a missing failure
mode. A test count alone does not justify a full run.

Frontend and backend runners suppress successful test logs while preserving
failure diagnostics. CI retains JUnit files separately. The catalog-wide Journey
audit belongs to `tests/catalog-invariants.test.ts`; help tests retain their
help-specific assertions and targeted broken-contract examples without repeating
the full audit. Changed/related-file detection can inform test selection, but
cannot replace deliberate coverage of dynamically loaded content and assets.

Run commands from the repository root. `dev` and `preview` bind to `127.0.0.1`
with strict ports; use the URL they print. `build` runs strict TypeScript checks
before writing `dist/`. Public assets are copied into the output; root docs are
not automatically copied. No `.env` file or API key is required. Optional accounts/feedback use `deployment/services.json`; optional Datadog
configuration is described in [Services](SERVICES.md). Old local credentials for
the removed authoring service are not part of current startup.

For review without deploying account services, open
`http://127.0.0.1:5173/review/accounts.html` on the dev server. It renders the actual
dashboard with an in-memory client and sample accounts; requests never reach AWS.
The preview supports profile edits, friend acceptance and Journey comparisons. `/review/login.html` previews the supported
Cognito branding assets; it submits no credentials. For Journey map review, open `/review/journeys.html`. It renders the real App and
WebGL globe with an in-memory Admin permission for local practice, no signed-in
user, and no access token. It starts Down the Danube; use Admin’s “Preview five questions” for other
Journeys. Non-read API requests are blocked, and the fixture grants no server
permissions. Review entry points stay
outside the production bundle. See [Services](SERVICES.md) for release steps.

Vitest covers logic, local assets, and DOM integration with a
mocked globe. It does not exercise browser/WebGL rendering or actual mobile input.
Browser testing is a separate, explicitly scoped activity. Record verification
scope in the change's PR or commit rather than adding a completed audit page.

For a focused check, name the relevant test files:

```sh
npm test -- tests/progress-saves.test.ts tests/study-regressions.test.tsx
```

[CI](../.github/workflows/ci.yml) installs locked dependencies, checks docs,
runs the complete test suite, builds, and fails on high/critical dependency
advisories. It runs for main pushes, pull requests, and manual dispatches, with
read-only validation permissions and commit-pinned official actions. Successful
main-branch runs can publish their verified artifact through a scoped GitHub OIDC
deployment role when the [schedule-cutover flag](SERVICES.md#schedule-cutover) is
enabled. Pull requests do not deploy. See [Hosting](HOSTING.md).

Run `npm run check:docs` to check documentation formatting. There is no source lint
gate yet. Format files you change with the local executable:

```sh
./node_modules/.bin/prettier --write docs/<changed-guide>.md
```

## Choose focused checks

Use this map to select checks for the changed behavior; run the matching row's
relevant files, not every test listed here. The [architecture map](ARCHITECTURE.md#module-map)
describes ownership in more detail. Named frontend files go after `npm test --`;
backend files go after `python3 scripts/run-python-tests.py`.

| Area and owners                                                                                            | Relevant checks                                                                                                                                                         |
| ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Journey copy/help: `src/game/*Journey.ts`, `questionText.ts`, `QuestionSupport.tsx`                        | `npm run check:journey -- <id-or-slug>`; matching `tests/*-journey.test.*`; `tests/question-support.test.tsx` or `tests/journey-guidance.test.tsx` for shared behavior. |
| Contracts/grading: `questionBuilder.ts`, `questionPreparation.ts`, `questionEvaluation.ts`, `mechanics.ts` | `tests/question-contracts.test.ts`, `tests/game.test.ts`, matching control/rule tests; `tests/journey-engine.test.ts` for engine changes.                               |
| Scenes/disclosure: `presentation.ts`, `scenes.ts`                                                          | `tests/presentation.test.ts`, `tests/journey-visual-grammar.test.ts`, `tests/journey-review-lifecycle.test.tsx`.                                                        |
| Loading: `useJourneyContent.ts`, `useWorldGeography.ts`                                                    | `tests/app-loading-hooks.test.tsx`, `tests/journey-loading.test.ts`, `tests/loader.test.ts`.                                                                            |
| Camera/input: `useCameraOrchestration.ts`, `src/globe/camera.ts`, `interaction.ts`                         | `tests/camera-orchestration.test.tsx`, `tests/camera.test.ts`, `tests/globe-interaction.test.ts`. These do not verify real WebGL.                                       |
| Saves/sync: `registerStorage.ts`, `recordSave.ts`, `progressSaves.ts`, `progressSync.ts`                   | `tests/register-storage.test.ts`, `tests/progress-saves.test.ts`, `tests/progress-sync.test.ts`, `tests/journey-revision-saves.test.ts`.                                |
| Study: `src/study/engine.ts`, `useStudyPresentation.ts`, `StudySetup.tsx`                                  | `tests/study-regressions.test.tsx`, `tests/study-presentation.test.tsx`, `tests/study-setup.test.tsx`; select history/results tests when changing those flows.          |
| Shell navigation/accounts: `App.tsx`, `AccountPanel.tsx`                                                   | `tests/app-shell.test.tsx`; prefer `tests/accounts.test.tsx` for isolated authentication behavior.                                                                      |
| Daily/archive/schedule shell integration                                                                   | `tests/app-daily-shell.test.tsx`; prefer `tests/admin-panel.test.tsx` or `tests/journey-archive.test.ts` for isolated behavior.                                         |
| Journey shell controls/reveal/recap                                                                        | `tests/app-journey-shell.test.tsx`; use matching Journey/control tests for local changes.                                                                               |
| Explore and display-preference shell integration                                                           | `tests/app-explore-shell.test.tsx` or `tests/app-preferences-shell.test.tsx`.                                                                                           |
| Study shell navigation/session integration                                                                 | `tests/app-study-shell.test.tsx`; use the Study unit/DOM files above for isolated behavior.                                                                             |
| Shared globe lifetime, viewport and motion in the shell                                                    | `tests/app-globe-shell.test.tsx`; use camera/loading files above when changing those owners.                                                                            |
| Backend APIs/SDK: `backend/handler.py`, `community.py`, `dynamodb.py`                                      | `backend/test_services.py`, `backend/test_community.py`, `backend/test_dynamodb.py`.                                                                                    |
| Schedule/staging: `journey_schedule.py`, `journey_lock.py`, `staging_demo.py`                              | `backend/test_journey_schedule.py`, `backend/test_journey_lock.py`, `backend/test_staging_demo.py`.                                                                     |

Use TypeScript checks for typed changes. For catalog metadata/registration changes,
include `tests/catalog-invariants.test.ts` locally. CI runs the complete suites
and build before merge; do not repeat that full run locally by default.

## Prepared data

All generated runtime assets are included. Preparation is for intentional data
changes or regeneration, not ordinary installation/build. Node tools use the
installed npm dependencies. Most Python tools use the standard library;
terrain and construction preparation have additional dependencies documented below
or in the [terrain appendix](JOURNEY_CRAFTING.md#appendix-render-mountain-context-from-terrain).

| Command                                 | Inputs/prerequisites                                                                              | Outputs and behavior                                                                                                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run prepare:geography`             | Pinned Natural Earth and U.S. geoBoundaries sources; downloads missing raw files into `sources/`. | Base world, U.S. ADM1, New York ADM2, point asset, manifest, and legacy texture metadata. **Replaces the manifest with base layers.**                                     |
| `npm run prepare:quiz`                  | Pinned GeoNames exports; downloads missing files into `.cache/quiz/`.                             | 193 primary capital records. Mutable upstream URLs must still match the recorded snapshot hashes.                                                                         |
| `npm run prepare:flags`                 | Prepared `.cache/quiz/countryInfo.txt`; pinned flag-repository commit.                            | 193 local SVGs, flag index/checksums, and original upstream README. Downloads missing flag inputs.                                                                        |
| `npm run prepare:cities`                | Both pinned GeoNames files already in `.cache/quiz/`; prepared capitals.                          | Local major-city catalog and source metadata. Offline; rejects missing/changed cache inputs.                                                                              |
| `npm run prepare:explore`               | Prepared base geography, `sources/ne-countries.geojson`, and quiz countryInfo cache.              | Worldwide subdivisions/index, country details, and physical features; downloads missing Explore sources. Also runs display reconciliation and language-label preparation. |
| `npm run prepare:regional-display`      | Existing complete world/layers/manifest.                                                          | Offline parent-footprint reconciliation, Great Lakes masking, manifest hashes, and enclosed-territory/namesake clue subsets.                                              |
| `npm run prepare:languages`             | Country-info output and pinned language metadata; cached ISO language list or network.            | Bundled English language labels and output metadata. Uses preparation-time English locale names.                                                                          |
| `npm run prepare:journeys`              | Authored Journey modules and route catalog.                                                       | Lightweight Home/routing/progress metadata in `src/game/journeyIndex.json`; no downloads.                                                                                 |
| `node scripts/prepare-island-clues.mjs` | Checksum-pinned raw Natural Earth countries and prepared world.                                   | Island-clue geometry for the island-ownership Journey. Not an npm script or automatic Explore step.                                                                       |

When rebuilding all data, use this order so the full manifest and display geometry
are restored after base preparation:

```sh
npm run prepare:geography
npm run prepare:quiz
npm run prepare:flags
npm run prepare:cities
npm run prepare:explore
node scripts/prepare-island-clues.mjs
npm run prepare:journeys
npm run test:all
npm run build
```

Full regional reconciliation can be expensive. To regenerate just the U.S.,
Canadian, and descendant Great Lakes display branches from existing assets:

```sh
npm run prepare:regional-display -- --great-lakes-only
```

`npm run prepare:geography -- --download` explicitly re-downloads its pinned raw
snapshots. Other scripts have their own cache behavior; do not assume this flag
applies to them. Raw `sources/*.geojson`, `.cache/`, `node_modules/`, and `dist/`
are ignored by `.gitignore`; keep source metadata, mappings, generated assets,
and the lockfile tracked when deliberately updating data.

Preparation is not an automatic update to current geography or statistics.
Snapshot dates, versions, checksums, and curated conventions belong together.
A changed GeoNames live export may fail checksum verification on a clean cache.
Restore the recorded snapshot or deliberately review/version an update; do not
change a checksum simply to make preparation succeed. Preserve source caches
needed to reproduce inputs that are no longer available at their old URLs.
Review generated differences before treating them as a release: not every script
stages all outputs atomically, and Node locale differences can affect labels.

### Sahara data preparation

This is an optional Journey-only rebuild, not part of installation or release.
Use a separate Python environment with numpy 2.0.2, pillow 11.3.0, rasterio 1.4.3,
shapely 2.0.7, scipy 1.13.1 and pyproj 3.6.1. Cache the frozen inputs below under
`.cache/constructive/`; retain hashes recorded in
`public/journeys/drawing-the-sahara/data-audit.json`.

| Cached name                                     | Frozen input                                                                                                                                                                     |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dune-world/…/dune-mask-rev1.tif` and `LICENSE` | [Zenodo release archive](https://zenodo.org/api/records/20054674/files/geomorphlab/dune-world-v1.0.0.zip/content), unzip into `dune-world/`.                                     |
| `algeria-population.tif`                        | [WorldPop 2024 R2025A v1 raster](https://data.worldpop.org/GIS/Population/Global_2015_2030/R2025A/2024/DZA/v1/100m/constrained/dza_pop_2024_CN_100m_R2025A_v1.tif).              |
| `algeria-boundary.geojson`                      | [geoBoundaries revision 9469f09](https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/DZA/ADM0/geoBoundaries-DZA-ADM0.geojson).                              |
| `erg-oriental.jpg`                              | [NASA EarthKAM CCFID_152293_2017304121045](https://assets.science.nasa.gov/content/dam/science/esd/eo/images/imagerecords/92000/92232/CCFID_152293_2017304121045_IMAGE_LRG.jpg). |

Other cached images use the [NASA GIBS WMS endpoint](https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi)
with `SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1&SRS=EPSG:4326` and these parameters:

| File         | LAYERS                      | FORMAT       | WIDTH×HEIGHT | BBOX           |
| ------------ | --------------------------- | ------------ | ------------ | -------------- |
| `sahara.jpg` | `BlueMarble_NextGeneration` | `image/jpeg` | 4096×2048    | `-18,10,38,38` |
| `nile.jpg`   | `BlueMarble_NextGeneration` | `image/jpeg` | 2048×3072    | `29,23,34,31`  |
| `lights.png` | `VIIRS_CityLights_2012`     | `image/png`  | 2048×2048    | `-9,18,12,38`  |

Run `python3 scripts/prepare-sahara-construction.py` for scoring inputs, then
`python3 scripts/prepare-sahara-display.py` for current imagery, masks and
footprints. The display step downloads fixed Blue Marble patches if absent and
writes `display-audit.json`. Compare recorded hashes before accepting a changed
upstream response; neither command regenerates shared geography. Preserve
submitted source revisions and metrics rather than regrading old answers.
The shipped [source notes](../public/journeys/drawing-the-sahara/SOURCES.md) own
licenses and modeling limitations; [Hosting](HOSTING.md#journey-acceptance-checks)
retains human calibration requirements.

## Common problems

| Symptom                                       | Check                                                                                                                                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vite will not start                           | Node version, `npm ci`, and whether the strict port is already occupied.                                                                                                              |
| Missing/changed preparation input             | Cache path and committed checksum; distinguish an absent snapshot from an intentional source update.                                                                                  |
| Subdivisions disappear after base preparation | Run `prepare:explore` to restore the extended manifest and reconciled footprints.                                                                                                     |
| Journey metadata test fails                   | Run `prepare:journeys` after editing definitions or registration.                                                                                                                     |
| Deep link fails only after deployment         | Host SPA fallback and root-relative asset paths; see [Hosting](HOSTING.md#hosting-behavior).                                                                                          |
| Save warning or missing active Study attempt  | Storage availability/quota and the documented [save lifecycle](SAVE_PERSISTENCE.md). Avoid clearing storage as a first troubleshooting step.                                          |
| Globe unavailable                             | WebGL/context availability; supported written fallbacks remain, but merged-territory questions require WebGL. Study offers Answer by name. Actual renderer recovery is separate work. |
| Large-chunk build warning                     | Deferred globe/geometry bundles are still substantial. A successful build does not establish device performance.                                                                      |

## Keep documentation current

For production deployment, HTTP configuration, and rollback, see
[Hosting](HOSTING.md). Main-branch CI publishes the exact artifact that passed its
checks; deploying does not require regenerating committed geography.

- Update the root overview and affected guide when public behavior changes.
- After a Journey change, regenerate the index only if its metadata inputs changed;
  update the catalog table when titles, routes or registration change. Run focused
  checks during authoring; CI supplies the complete suite/build gate before merge.
- Keep authoring standards in `JOURNEY_CRAFTING.md` and capability/API details in
  the catalog and engine guide. Keep completed implementation history in Git/PRs;
  retain only actionable acceptance checks and unique provenance in current guides.
  Refresh the authoring kit after relevant code/docs changes; check its manifest
  rather than assuming an old export or uploaded copy is current.
- After a data change, review mappings, metadata, manifest, hashes, attribution,
  and eligibility conventions together.
- After a save-format change, document migration, failure behavior, and old-version handling.
- Record validation dates and scope; do not present a mocked renderer or old audit as current browser verification.
- Preserve upstream license notices; remove superseded plans and temporary exports rather than accumulating them beside current guides.
- Check relative Markdown links and referenced package scripts before handoff.

The [architecture map](ARCHITECTURE.md) identifies implementation owners; the
[question guide](QUESTION_CATALOG.md) covers authoring and reviewed facts.

## Focused Journey authoring review

`npm run export:journeys` creates a portable AI-authoring kit in the git-ignored
`artifacts/journey-authoring-kit/` directory. Add `-- --include-code` for a fresh
architecture source review. See [the authoring-kit guide](JOURNEY_AUTHORING_KIT.md)
for selective uploads, highlighted examples and refresh behavior. This exporter
does not modify content, call an AI or deploy anything.

Run `npm run check:journey -- <id-or-slug>` to inspect one Journey's contracts,
help and reveal scenes, cameras, sources and local media. `--recipe <answer-mode>`
loads a complete control example; `--list` shows current Journeys.
See [Journey engine and authoring contracts](JOURNEY_ENGINE.md) for scene authoring,
registered mechanics, recipes, JSON output and the limits of automated review.

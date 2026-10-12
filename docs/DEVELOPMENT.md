# Development and maintenance

## Run and check

Use Node.js **24.21.0**, pinned in [`.nvmrc`](../.nvmrc), with bundled npm 11.19.0.
`package.json` records the supported Node 24/npm 11 ranges and npm package-manager
version. If you use nvm, run `nvm install` and `nvm use` before installing.
Python 3 runs offline backend tests and the optional preparation/deployment
scripts.

```sh
npm ci
npm run dev
npm test
python3 -m unittest discover -s backend -p 'test_*.py'
npm run build
npm run preview
```

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
user, and no access token. It starts Down the Danube; use the playground for other
questions. Non-read API requests are blocked, and the fixture grants no server
permissions. Review entry points stay
outside the production bundle. See [Services](SERVICES.md) for release steps.

Full implementation verification on October 10, 2026 passed **478 frontend tests in
46 files**, 25 offline backend tests, and the production build. That is a dated result, not a promise about
later changes. Vitest covers logic, local assets, and DOM integration with a
mocked globe. It does not exercise browser/WebGL rendering or actual mobile input.
Browser testing is a separate, explicitly scoped activity; it was not run for
this implementation pass.

For a focused check, name the relevant test files:

```sh
npm test -- tests/progress-saves.test.ts tests/study-regressions.test.tsx
```

[CI](../.github/workflows/ci.yml) installs locked dependencies, checks docs,
runs the complete test suite, builds, and fails on high/critical dependency
advisories. It runs for main pushes, pull requests, and manual dispatches, with
read-only validation permissions and commit-pinned official actions. Successful
main-branch runs publish their verified artifact through a scoped GitHub OIDC
deployment role. Pull requests do not deploy. See [Hosting](HOSTING.md).

Run `npm run check:docs` to check documentation formatting. There is no source lint
gate yet. Format files you change with the local executable:

```sh
./node_modules/.bin/prettier --write README.md docs/*.md
```

## Prepared data

All generated runtime assets are included. Preparation is for intentional data
changes or regeneration, not ordinary installation/build. Node tools use the
installed npm dependencies; Python tools use the standard library.

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
npm test
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
are ignored by `.gitignore`; source metadata, mappings, generated assets, and the
lockfile must be included in a future version-controlled release.

Preparation is not an automatic update to current geography or statistics.
Snapshot dates, versions, checksums, and curated conventions belong together.
A changed GeoNames live export may fail checksum verification on a clean cache.
Restore the recorded snapshot or deliberately review/version an update; do not
change a checksum simply to make preparation succeed. Preserve source caches
needed to reproduce inputs that are no longer available at their old URLs.
Review generated differences before treating them as a release: not every script
stages all outputs atomically, and Node locale differences can affect labels.

## Common problems

| Symptom                                       | Check                                                                                                                                        |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Vite will not start                           | Node version, `npm ci`, and whether the strict port is already occupied.                                                                     |
| Missing/changed preparation input             | Cache path and committed checksum; distinguish an absent snapshot from an intentional source update.                                         |
| Subdivisions disappear after base preparation | Run `prepare:explore` to restore the extended manifest and reconciled footprints.                                                            |
| Journey metadata test fails                   | Run `prepare:journeys` after editing definitions or registration.                                                                            |
| Deep link fails only after deployment         | Host SPA fallback and root-relative asset paths; see [Release readiness](RELEASE_READINESS.md).                                              |
| Save warning or missing active Study attempt  | Storage availability/quota and the documented [save lifecycle](SAVE_PERSISTENCE.md). Avoid clearing storage as a first troubleshooting step. |
| Globe unavailable                             | WebGL/context availability; written controls remain, and Study offers Answer by name. Actual renderer recovery is separate work.             |
| Large-chunk build warning                     | Deferred globe/geometry bundles are still substantial. A successful build does not establish device performance.                             |

## Keep documentation current

For production deployment, HTTP configuration, and rollback, see
[Hosting](HOSTING.md). Main-branch CI publishes the exact artifact that passed its
checks; deploying does not require regenerating committed geography.

- Update the root overview and affected guide when public behavior changes.
- After a Journey change, regenerate the index and update the catalog table/counts.
- After a data change, review mappings, metadata, manifest, hashes, attribution,
  and eligibility conventions together.
- After a save-format change, document migration, failure behavior, and old-version handling.
- Record validation dates and scope; do not present a mocked renderer or old audit as current browser verification.
- Preserve upstream license notices; remove superseded plans and temporary exports rather than accumulating them beside current guides.
- Check relative Markdown links and referenced package scripts before handoff.

The [architecture map](ARCHITECTURE.md) identifies implementation owners; the
[question guide](QUESTION_CATALOG.md) covers authoring and reviewed facts.

## Focused Journey authoring review

Run `npm run check:journey -- <id-or-slug>` to inspect one Journey's contracts,
help and reveal scenes, cameras, sources and local media. `--recipe <answer-mode>`
loads a complete control example; `--list` shows current Journeys.
See [Journey engine and authoring contracts](JOURNEY_ENGINE.md) for scene authoring,
registered mechanics, recipes, JSON output and the limits of automated review.

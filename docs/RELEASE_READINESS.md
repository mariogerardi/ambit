# Release readiness

Reviewed against the repository on **October 10, 2026**. This guide consolidates
the outstanding release work. It is not evidence that a deployment or device
audit has already passed. Current save behavior is documented in
[Save persistence](SAVE_PERSISTENCE.md).

## Current baseline

The static app has pinned npm dependencies, strict TypeScript checks, extensive
unit/asset/DOM coverage, local assets, and source attribution. The October 10
implementation pass passed 395 tests across 40 files and the production build.
The October 9 dependency audit reported no known advisories; rerun it for release.

Record-based save persistence addresses stale-tab data loss, preserves recoverable
legacy data, and isolates invalid records. Study completion, targeted replay, and
keyboard/no-WebGL map answers have regression coverage. These fixes do not supply
history retention/export or browser/device performance verification.

The project is version-controlled as the private `mariogerardi/ambit` repository,
with Node 24.21.0 pinned and a [CI workflow](../.github/workflows/ci.yml)
for locked installs, documentation formatting, tests, builds, and dependency
advisories. Successful main-branch builds deploy the verified artifact to Amplify
using GitHub OIDC; artifacts are retained for rollback. See [Hosting](HOSTING.md)
for configuration and operations. No open-source code license was selected.
Production error reporting remains separate work.
Large deferred globe/geometry bundles still produce Vite's chunk-size warning.

## Before a public launch

| Work                        | Completion evidence                                                                                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Version control and runtime | Tracked source/lockfile/assets; supported Node LTS pinned and verified with a clean install.                                                                              |
| CI and preview              | Automated install, tests, and build; a preview of the exact candidate release.                                                                                            |
| Player-data policy          | Retention/export or storage-growth handling, and an explicit decision on refresh/close losing active Study attempts.                                                      |
| Static hosting              | Direct-route loading, compression, cache policy, headers, and rollback verified on the chosen host.                                                                       |
| Browser/device verification | Cold/warm Journey entry, heavy subdivisions, repeated Fidget, close-zoom borders, keyboard, touch, mobile layouts, and WebGL failure inspected on representative devices. |
| Accessibility               | Focus/dialog navigation, keyboard alternatives, screen-reader feedback, transparency/imagery contrast, and reduced motion verified.                                       |
| Content policy              | Fifteen-Journey repeat cadence, device-local “today,” public Admin visibility, and source conventions accepted.                                                           |
| Distribution and discovery  | Full attribution shipped, font notices retained, and intentional favicon/social-preview metadata.                                                                         |
| Error visibility            | A deliberate production reporting/debugging path for failed loads, context loss, and storage failures.                                                                    |

Browser/device work should be separately authorized and scoped. Tests with a
mocked globe do not establish actual frame rate or visual correctness. No browser
tests were run in the documentation review.

## Static-hosting contract

Deploy the contents of `dist/` after a successful build. `npm run preview` is a
local inspection server, not the production hosting process.

- Serve real static files before the SPA fallback; application routes such as
  `/study` and `/journey/shared-neighbors` must return `index.html` on direct entry.
  Missing data/assets should retain useful HTTP errors rather than receive HTML.
- Current asset paths are root-relative (`/geography`, `/flags`, `/fonts`, etc.).
  A root-domain deployment fits them; a subpath deployment requires code/path
  changes and verification, not just changing Vite's base.
- Let HTML and mutable public metadata/geography URLs revalidate across releases.
  Hashed Vite assets can be cached immutably. Stable `*.v1.json` filenames alone
  do not guarantee immutable content; runtime loaders do not verify manifest
  SHA-256 hashes on every fetch.
- Keep each release's HTML, hashed chunks, and geography internally consistent.
  Prefer atomic deployment and retain the prior artifact for rollback; consider
  open tabs requesting deferred chunks from an older release.
- Enable HTTPS and suitable compression/content types for JavaScript, JSON, SVG,
  and fonts. Review security headers on the real deployment; do not assume a
  generic CSP works without testing the Three.js/font/SVG paths.
- The build ships the full root [NOTICE.md](../NOTICE.md) as `/NOTICE.txt`, linked
  from World credits, alongside the public font licenses. Verify this distribution
  when updating source/transformation notices.

## Candidate verification

Use the runtime pinned in [`.nvmrc`](../.nvmrc). From a clean installation of the
candidate source:

```sh
npm ci
npm test
npm run build
npm audit
```

Save the output and exact source/release identifier. Verify prepared asset hashes
and Journey metadata with the test suite, inspect build warnings, and avoid running
all data-preparation commands merely as a deployment step. Committed generated
assets are the release inputs.

On a preview, separately confirm direct links, asset cache headers/compression,
first load, failed loads, open-tab updates, storage failures, and representative
interaction flows. Never clear real player storage to make a release test pass.
Confirm rollback with the hosting mechanism; no repository rollback command is
currently established.

## Known product limits

Saves are browser-origin-local, with no cloud recovery, delete/export interface,
or automatic retention. Active Study attempts are lost on reload/closure; in-app
navigation archives submitted answers. History/writer registers grow without
pruning. See [Save persistence](SAVE_PERSISTENCE.md).

WebGL context loss disables the globe rather than automatically rebuilding it.
Study retains an alternate answer input; written controls cannot replace every
visual geography clue. Simplified boundaries, disputed source conventions,
undated population estimates, and limited official-language facts remain explicit
content limits. See [Explore data](EXPLORE_DATA.md) and [question authoring](QUESTION_CATALOG.md).

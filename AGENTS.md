# Working in Ambit

These instructions apply to every coding agent working in this repository.

## Work efficiently

- Make the smallest complete change that satisfies the request. Avoid unrelated
  refactors, speculative infrastructure, and cleanup outside the task.
- Read only the relevant docs and code. Use `rg` and batch independent reads;
  reuse what you have already learned instead of repeating discovery.
- Start with the task-to-section map in `docs/README.md`; the owner/test map in
  `docs/DEVELOPMENT.md` identifies focused checks. Do not read every linked guide.
- Search the most likely implementation directory or files first, then expand
  only if necessary. Use `rg --files src tests scripts backend` to locate files;
  use `rg -l 'pattern' <relevant-path>` when only filenames are needed, and
  `rg -n 'pattern' <relevant-path>` to inspect matching lines. For broader code
  and docs searches, use
  `rg -n -g '*.{ts,tsx,mjs,py,css,md}' 'pattern' src tests scripts backend docs`
  only when a narrower search is insufficient. Inspect JSON/assets by explicit
  path; broad searches can emit megabytes per line.
- Preserve existing user changes, including untracked files. Never regenerate
  catalogs or geography unless the task requires it.
- Continue authorized work without unnecessary permission checks. Ask only when
  a missing decision materially changes scope or correctness.
- Keep updates and handoffs concise: what changed, what was verified, and any
  unresolved limitation.

## Focus verification: get in, get out

- Select relevant test files before running checks. For mechanical moves,
  preserve existing cases. Add or update tests when a change introduces meaningful
  regression risk; prioritize grading, geography, persistence, authentication,
  and shared contracts. For small, localized changes, existing checks or static
  inspection may be sufficient. Do not add tests merely because code changed,
  or for file layout or assertions that repeat the implementation.
- Local checks stay focused even when CI will later run the full suite. Use static
  inspection or saved reports to inventory tests; do not run the suite to count them.
- Use `npm test -- tests/<file>.test.ts` for local frontend checks; put test files
  before options such as `-t <test-name>`. The command refuses unscoped runs.
  `npm run test:all` explicitly runs the full frontend suite. Passing test logs
  are suppressed; failure diagnostics remain visible. Do not rerun a passing
  command just to obtain more output.
- When changing typed code, run a TypeScript check once after a coherent set of
  changes is complete. Repeat only if later edits could invalidate that result.
  Do not routinely run the full test suite, production build, dependency audit,
  or all preparation scripts.
- For backend changes, use Python >=3.11 and
  `python3 scripts/run-python-tests.py backend/test_<area>.py` (or a dotted test
  name). No arguments intentionally runs the full backend suite for CI/releases.
- Broaden checks only when a failure, shared-contract change, explicit request,
  or release requirement makes them necessary. Once relevant checks pass, stop
  testing; do not repeat them without a new reason.
- CI owns the full frontend/backend suite and build gate before merge. For Journey
  catalog changes, run relevant Journey/catalog tests and TypeScript locally; use
  `npm run check:catalog` only for an explicitly requested full local release check.
  Test Journey identity by ID rather than array position or catalog count.
- Do not launch a browser or perform browser testing by default. Use unit/DOM
  tests and code inspection. Browser testing is reserved for an explicit request
  or a critical uncertainty that cannot be resolved otherwise (for example actual
  WebGL picking, GPU rendering, or device-specific layout/input). State the reason
  before doing it and keep the check narrowly scoped. This default also applies
  to Journey work; a one-off change does not require a full desktop/mobile tour.
- Distinguish automated or mocked checks from real browser verification.

## Do not wait around

- Do not deploy unless the task authorizes deployment.
- When deploying, use the supported nonblocking path and report that deployment
  was initiated, with a status link or identifier when available. Do not poll or
  wait for deployments, CI, DNS, hosted services, or monitoring to succeed unless
  the user explicitly requests that verification or completion truly depends on it.
- Never claim an asynchronous deployment succeeded just because it was started.
- Avoid idle waits and repeated status checks; finish the useful local work and
  hand control back.

## Repository essentials

- Ambit uses React, TypeScript, Vite, and one persistent Three.js globe.
  `src/App.tsx` coordinates modes, sessions, camera state, and persistence.
- Use `docs/JOURNEY_CRAFTING.md` as the single editorial guide. Review a compact
  five-stop outline before redesigning questions; keep route questions moving
  forward and reserve recap for completion.
- For an approved spec, start with `docs/journey-authoring/IMPLEMENTING_A_SPEC.md`.
  Reuse the approved outline, inspect relevant current Journeys and preserve settled decisions.
- Before extending a Journey mechanic, read `docs/JOURNEY_ENGINE.md`, inspect
  `src/game/mechanics.ts` and the corresponding `src/game/recipes.ts` example.
  Prefer grouped scene authoring; use `npm run check:journey -- <id-or-slug>` for
  focused local validation. This command does not publish or deploy.
- Journey content lives in `src/game/*Journey.ts`. Use `defineQuestion` and
  `definePresentation`; declare answer contracts explicitly. Register content in
  `journeys.ts`, regenerate the index only when needed, and use retired IDs/save recovery when deliberately removing an edition.
- Keep eligibility, clue disclosure, grading, and camera framing separate.
  Canonical geometry grades answers; display geometry and relief only render them.
- Admin access is checked in the UI and protected APIs. Shared date assignments
  must not reset players' started attempts.
- Player saves use independent LocalStorage registers and account sync. Use the
  existing save layer; clearing a React state value or legacy storage key alone
  does not reliably clear synced progress.
- Start with `docs/ARCHITECTURE.md`, `docs/QUESTION_CATALOG.md`,
  `docs/JOURNEY_CRAFTING.md`, `docs/SAVE_PERSISTENCE.md`, or `docs/SERVICES.md`
  as relevant. Code and tests establish current behavior when docs disagree.
- Run `npm run check:env` once when setting up the workspace; it checks the pinned
  Node/npm and identifies a supported Python executable. Use that interpreter for
  Python commands. Use the pinned Node version in `.nvmrc`. Typical focused
  checks are `npm test -- tests/<relevant-file>` and `./node_modules/.bin/tsc --noEmit`.

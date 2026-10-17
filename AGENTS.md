# Working in Ambit

These instructions apply to every coding agent working in this repository.

## Work efficiently

- Make the smallest complete change that satisfies the request. Avoid unrelated
  refactors, speculative infrastructure, and cleanup outside the task.
- Read only the relevant docs and code. Use `rg` and batch independent reads;
  reuse what you have already learned instead of repeating discovery.
- Preserve existing user changes, including untracked files. Never regenerate
  catalogs or geography unless the task requires it.
- Continue authorized work without unnecessary permission checks. Ask only when
  a missing decision materially changes scope or correctness.
- Keep updates and handoffs concise: what changed, what was verified, and any
  unresolved limitation.

## Focus verification: get in, get out

- Run only tests relevant to the changed behavior. Prefer named files or focused
  test filters. Add regression coverage for meaningful behavior and failure modes,
  not tests that merely repeat the implementation.
- Use a TypeScript check when changing typed code. Do not routinely run the full
  test suite, production build, dependency audit, or all preparation scripts.
- Broaden checks only when a failure, shared-contract change, explicit request,
  or release requirement makes them necessary. Once relevant checks pass, stop
  testing; do not repeat them without a new reason.
- A Journey catalog change is a release requirement: run the full frontend and
  backend test suites before pushing, and test Journey identity by ID rather than
  array position or catalog count.
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
- Use the pinned Node version in `.nvmrc`. Typical focused checks are
  `npm test -- tests/<relevant-file>` and `./node_modules/.bin/tsc --noEmit`.

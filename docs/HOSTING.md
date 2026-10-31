# Production hosting

Ambit is hosted by AWS Amplify Hosting in `us-east-1`. The canonical address is
**https://playambit.com**; `www.playambit.com` redirects to it. Domain registration
and DNS are managed through Route 53.

## Deployments

Pushes to `main` run the [CI workflow](../.github/workflows/ci.yml). After locked
dependency installation, documentation checks, tests, the production build, and
the dependency audit pass, the retained `dist/` artifact is eligible for
deployment. Deployment to Amplify also requires `DAILY_SCHEDULE_CUTOVER_READY=true`; see
[Schedule cutover](SERVICES.md#schedule-cutover). Pull requests validate and retain
their artifact without deploying. A manual workflow run on `main` can redeploy
the current source when the cutover gate is enabled.

`main` requires a pull request and an up-to-date, passing **Tests and production
build** check. The rule applies to administrators, blocks force pushes and branch
deletion, and requires no reviewer approval. This aggregate check requires both
the frontend test job and the backend, tooling, and build job to succeed; the
production deploy job depends on it. An artifact from a failed or incomplete run
has not passed the full gate and must not be used for release or rollback.

For a Journey catalog change, run relevant Journey/catalog tests and TypeScript
locally. CI runs the full suites and build before merge; a duplicate full local
run is not required. Cover Journey IDs rather than positions or catalog totals. Backend releases are
separate; use the tested commit and procedure in [Services](SERVICES.md).
Local deployments use the supported `--no-wait` path and report the job/stack ID
and status link promptly. Wait for completion or verify hosted behavior only when
the task explicitly requires it.

### Merge and release handoff

In the PR description or release handoff, record the following as applicable:

- The PR link, source branch and exact head commit; after merge, identify the
  resulting `main` commit separately, especially for a squash merge.
- The checks run and their results, including the required CI check for the
  current PR commit. State what was not verified and distinguish mocked tests
  from browser, device, or hosted checks.
- Backend, migration, or configuration dependencies, including required release
  order and compatibility with the currently deployed frontend and backend.
- The actual state: PR open or merged; frontend and backend deployments not
  started, initiated, succeeded, failed, or unknown. Include workflow, job, or
  stack links or IDs when available. A merged PR alone does not establish that a
  deployment started or succeeded.

Before an authorized merge, check that the PR targets `main`, is up to date, and
the required check has passed for its current head. Merging can trigger production
frontend deployment after main-branch validation; backend deployment is separate.
Report the known status without polling unless verification is explicitly requested
or required to complete the task. Do not deploy without authorization.

AWS credentials are issued through GitHub OIDC. The IAM role trusts only this
repository's immutable GitHub identity and `main` branch, and permits deployment operations on Ambit's production
app/branch. `AWS_DEPLOY_ROLE_ARN` is a repository variable; no persistent AWS keys
are stored in GitHub. Amplify is an artifact deployment target and does not build
the repository independently. This avoids publishing before CI finishes.

The [production configuration](../deployment/production.json) identifies the app,
branch, region, and managed validation URL. The deployment script checks that the
artifact's commit matches the requested SHA, publishes it, waits for completion,
and verifies release identity, direct application routes, source notices, and a
missing geography resource through HTTP. It does not run browser or WebGL tests.

For an authorized local release that should return immediately after upload, use
`python3 scripts/deploy-production.py --directory dist --expected-commit FULL_COMMIT_SHA --no-wait`.
This starts the Amplify job and prints its status link without polling or claiming
deployment completion. Omitting `--no-wait` retains CI's completion checks.

## Hosting behavior

- Deploy the built `dist/` artifact, not the source tree. `npm run preview` is a
  local inspection server. Asset paths are root-relative; subpath hosting requires
  deliberate code/path changes.
- [Redirect rules](../deployment/amplify-rules.json) serve `index.html` for
  extensionless application routes. Missing files with extensions retain HTTP
  errors instead of receiving the app's HTML.
- [HTTP headers](../customHttp.yml) make HTML and public data revalidate, and
  cache hashed `/assets/` files immutably. They also set basic HTTPS, framing,
  content-type, referrer, and browser-permission controls.
- Stable `*.v1.json` names do not guarantee immutable content. Keep HTML, deferred
  chunks and geography consistent across releases; retain the prior artifact for
  rollback and account for older open tabs requesting deferred chunks. Runtime
  loaders do not verify every manifest SHA-256 hash on fetch.
- The build includes `/NOTICE.txt`, linked from World credits, and `/release.json`
  containing the source commit and build time.
- Rules and headers are configured on the Amplify app. Editing their repository
  files alone does not change hosting configuration; apply them with `update-app`
  as shown below.

```sh
aws amplify update-app --region us-east-1 --app-id d2s965d1nr8fn6 \
  --custom-rules file://deployment/amplify-rules.json \
  --custom-headers "$(cat customHttp.yml)"
```

## Release acceptance

Use the pinned runtime and the exact artifact validated by CI. Record the commit,
checks and scope in the PR/release handoff; do not regenerate committed geography
as a deployment step. CI covers installs, frontend/backend/tooling tests, the
production build, documentation formatting and dependency advisories.

When hosted or device verification is requested, scope it to the changed risks:

- Direct links, missing-asset errors, HTTPS, compression/content types, headers,
  `/release.json`, `/NOTICE.txt`, font notices, favicon/social metadata and rollback.
- First/failed loads, old open tabs, storage failures and actual monitoring events.
  Never clear real player saves to make a check pass.
- Cold/warm Journey entry, heavy subdivisions, Fidget, close borders, keyboard,
  touch/mobile layouts, WebGL failure, focus/dialog navigation, screen-reader
  feedback, contrast and reduced motion. Mocked globe tests do not establish GPU
  appearance or device performance; written controls cannot replace every clue.

Save retention/export and storage growth remain documented in
[Save persistence](SAVE_PERSISTENCE.md#remaining-limits); WebGL context recovery
and geographic source limitations remain in [Architecture](ARCHITECTURE.md) and
[Explore data](EXPLORE_DATA.md). These are product limits, not completed checks.

### Journey acceptance checks

The following unverified checks were carried forward from implementation reviews.
Use them when reviewing the affected edition; deleting a review is not evidence
that its visual checks passed.

| Journey                    | Checks to resolve                                                                                                                                                                                                                                               |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Drawing the Sahara         | Before pool publication, trial 3–5 human brush samples on desktop/mobile; calibrate brush/river tolerances, touch gestures and imagery readability. Automated feasible shapes do not establish human usability.                                                 |
| Same Name, Different Place | London/Chatham equal pickability among four candidates, named Toronto/Detroit references and Thames assist; suppressed Caucasus hover names and actual taps; continuous Zambezi/pin input; Congo/Tripoli labels, lakes, feedback and reduced-motion completion. |
| Far From Everything        | Calibrate bands and broad/off-target cameras on desktop/mobile; inspect Greenland coastline/70°N assist, Tristan-to-Bouvet progression and the wide Rapa Nui reveal. Verify rights, credit and alt text before adding photography.                              |
| Reggaetón                  | Anonymous Puerto Rico field, Colón coastline, U.S. city-marker spacing and the finale scale guide on narrow screens.                                                                                                                                            |

## Link previews and icons

`index.html` includes static Open Graph and large-image card metadata, so link
preview clients can read it without running the app. Every application route uses
the same evergreen [`ambit-preview-v1.png`](../public/social/ambit-preview-v1.png),
with no daily schedule or private player state. The vector artwork and export
notes live in [`sources/brand/`](../sources/brand/README.md).

Browser favicons and the Apple home-screen icon reuse the existing logo globe.
These public assets ship with the regular production build. Actual Messages
preview behavior can be checked after publishing; messaging clients may cache
previews of previously shared URLs.

## Rollback

Verified artifacts are retained by GitHub for 90 days. To restore one, identify
the successful main-branch workflow run and its source commit, download its
`production-site` artifact, and deploy it using a local AWS identity with access
to this Amplify app:

```sh
gh run download RUN_ID --repo mariogerardi/ambit \
  --name production-site --dir /tmp/ambit-rollback
python3 scripts/deploy-production.py --directory /tmp/ambit-rollback \
  --expected-commit FULL_COMMIT_SHA --no-wait
```

Use a fresh download directory. A rollback changes the served application; it does
not clear or roll back player saves. Normal pushes to `main` resume deployment of
newer source, so coordinate rollback with ongoing development.

## Operations and costs

Review current Route 53, Amplify and monitoring usage and billing in AWS. Budget
alerts notify; they do not impose spending caps.

Domain registration, contact verification, DNS propagation, and certificate
issuance can complete at different times. The managed Amplify URL can serve a
release before the custom domain becomes available. Check the AWS registration
email if contact verification is requested.

Guest and unsynced local saves do not transfer between the managed URL, `www`,
and the canonical domain. Share the canonical domain with players; signed-in
players can restore synced account progress after signing in at the new origin.

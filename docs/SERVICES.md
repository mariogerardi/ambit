# Accounts, feedback, and monitoring

Guest gameplay and local saves remain available without accounts, monitoring,
or a working backend connection. Signed-in players synchronize Journey and Study progress across devices;
accounts also protect admin tools. See [Save persistence](SAVE_PERSISTENCE.md).

## Accounts and admin access

The header's profile button opens **Account**, separate from the navigation menu.
After a profile is saved it shows the player's handle and chosen avatar; on mobile
it keeps the avatar visible. Sign-in, signup, email verification, and
password recovery use Cognito's hosted pages. The browser uses authorization code
with PKCE, without an embedded client secret. The signed-in user stays in local
storage across tabs and browser sessions; temporary authorization state stays in
tab session storage. Existing tab sessions migrate on first use. A coordinated
refresh runs at startup, 90 seconds before expiry, and on focus/reconnect. Network
failures retain the selected account and back off for 30 seconds; they do not
erase progress or silently select guest storage. Other-tab sign-out/account
changes cannot be overwritten by a late refresh. Access/ID tokens last 60 minutes
and the refresh token lasts 30 days in the infrastructure configuration.
Sign-out revokes the refresh token, removes the local session, and closes the
hosted session. Sign-in failures remove callback query parameters and show a
retry path without exposing provider responses.

Only `mario.d.gerardi@gmail.com`, after email verification, receives the `admin`
group through the post-confirmation Lambda. Email is immutable in this pool.
The UI checks the verified owner and group; protected API routes require valid
Cognito access tokens with `openid` scope, and the Lambda checks group membership.
Hiding a menu item is not the API authorization boundary. No password or account
is created on the owner's behalf: use **Create account** and verify that address.

The admin view offers shared Journey scheduling, feedback review, and **Clear my
Journey attempt**. Clearing asks for confirmation and removes the signed-in
admin's current-day attempt, including its answers, score, and help use. Other
dates and users remain intact. Start again from Home to use the currently
scheduled Journey. The reset saves locally and synchronizes through the existing
account save service.

## Profiles, dashboard, and friends

The Account screen shows daily Journey totals, a calendar-day Journey streak,
Study completion totals and answer accuracy. It keeps Dashboard, Profile and
Friends tabs; Journey/session history, Study setup presets, resume actions and
Challenges are not shown on Account. Account and Admin scroll with the page.
Account and Admin use a static globe illustration behind the content, while the hidden
WebGL renderer is paused and kept mounted for returning to play.
Display names, case-insensitive unique handles, preset avatars or country flags, an optional
favorite region and a 160-character bio live in the retained, encrypted
`ambit-production-community` table. Profile revisions prevent stale-device
updates from overwriting newer edits. Handle claims and changes are transactional.
No email address appears in another player's profile.

[`shared/profile-avatars.json`](../shared/profile-avatars.json) defines the default
avatar catalog for both frontend and backend. It reserves 24 PNG choices named
`avatar-01.png` through `avatar-24.png` under [`public/avatars/`](../public/avatars/README.md).
Add PNGs and update their catalog labels, then restart the dev server or build.
Build configuration enables only files that exist; missing slots stay disabled
and do not request missing images. Earlier emoji avatars remain valid for existing
profiles but are no longer offered in the picker.
Flag choices reuse the 193 locally bundled Study flags. The server accepts only
catalog IDs and known country IDs, never player-supplied image URLs. Saving a
profile updates the header immediately. The Profile tab presents a saved card;
**Edit profile** opens the full-width editor, with cancel returning to the card.
Saved profiles are cached per account in memory and tab session storage. Reads
are shared between the header and Account, reused for five minutes, and refreshed
in the background when stale. The last known profile stays visible during refresh.
Explicit sign-out clears cached identity; late responses cannot revive it or
overwrite a newer save. A friends-service failure does not block
profile editing, and connection errors show a player-facing retry message.

Friends are requested by exact handle and require the recipient's acceptance.
Requests can be declined/cancelled; friendships can be removed and players can
be blocked/unblocked. A block removes reciprocal inbox access and prevents new
requests, comparisons and challenge access. The Friends tab offers daily completion
status, friend cards, requests, handle lookup and shareable `/account?friend=handle`
links. Clicking a friend opens their profile, streak, completed Journey count,
Study completion/accuracy stats and recent shared results. Study stats are
informational; sessions with different settings are not ranked.

`GET /account/handles/{handle}` checks case-insensitive availability and suggests
up to three alternatives. An availability check does not reserve a handle:
`PATCH /account/profile` atomically claims it, releases the old claim on rename,
and returns a field-specific 409 if another account wins the claim. Relationships
and results use account IDs, so renaming never breaks friendships.

Scores are visible only to accepted friends after the viewer has synced completion
for the same date, Journey ID and game version. Completion status is visible
beforehand. The sharing rule is internal and enabled for mutual friendships;
the legacy profile flag has no user-facing control. All score endpoints enforce
this rule, including the older `/friends/{id}/journeys` endpoint. The API derives
totals from private synced saves; answers, pins, typed responses, drafts and email
are never returned to friends.

Journey results may include aggregate help counts and the strongest help status
(hinted or assisted). Assisted rounds count as both a hint and an assist. Friends
comparisons label results as unassisted, hinted, or assisted without point
deductions. The projection counts answered rounds only and never exposes per-round
help records, clues, eliminated choices, or other answer information.

`GET /account/friends/activity?date=YYYY-MM-DD` returns your own activity and up to
24 accepted friends with a continuation cursor. `GET /account/friends/{id}/profile`
returns one accepted friend's public profile and aggregate activity. Summary reads
use a 60-second cache in the community table, invalidated by daily and archived
Study sync. Viewer completion is read fresh for score disclosure without reading
or rewriting the summary cache. Profiles, caches and relationships are read in strongly
consistent batches, with a second relationship check before returning scores.
Server fan-out is bounded to four concurrent reads; historical comparisons expose at most 30
results. Projection reads are bounded to 1,000 save registers and fail explicitly
rather than show incomplete totals when that bound is exceeded.

Friendship records, versioned Journey results and challenge records stay separate.
Future minigames can add game-specific result projections without changing friend
identities or inboxes. Current results come from client-graded synced progress;
verified competitive rankings require authoritative grading for the new game.

The backend includes challenge routes for a future feature,
but Account no longer requests or exposes them. These routes use a fixed 10/20/50-question Study configuration and a server-generated
seed. Both players receive the same order; missed-answer repeats and mid-session
settings changes are disabled. Invitations can be accepted/declined/cancelled.
An accepted challenge starts/resumes an account-scoped Study run and retains its
challenge ID through sync. **Share result** requires a finished, synced session;
the API calculates totals from the matching archived run rather than accepting
caller-supplied totals. This is friendly practice using the existing client-side
grading model, not a verified competitive ranking. Results are idempotent and
private to the participants while their friendship remains accepted. Friend
inboxes are bounded to 200 entries, outstanding outgoing requests to 20, and
challenge sending to 20 per day. The challenge inbox shows its latest 50 entries.

All profile and social routes require the existing JWT authorizer and `openid`
scope. Writes additionally validate the browser origin, JSON type, payload size,
field bounds and Study settings. Identity comes from the validated `sub`, never
a submitted owner ID. Conditional DynamoDB transactions protect reciprocal
inboxes and concurrent profile/challenge updates.

## Local API isolation

Development uses `http://127.0.0.1:3001` until a staging API is configured. The
staging stack has its own Cognito user pool, API, tables, login domain and logs;
production tokens and data are not reused. Its API allows only localhost and
127.0.0.1 on port 5173. Production API CORS and write-origin checks allow only
`https://playambit.com`.

Create or update staging without waiting:

```sh
python3 scripts/deploy-backend.py --profile personal --environment staging --no-wait --write-dev-env
```

The command prints a CloudFormation status link. After creation finishes, export
its endpoints and configure local development without deploying again:

```sh
python3 scripts/deploy-backend.py --profile personal --environment staging --refresh-config --write-dev-env
npm run dev
```

This writes ignored `deployment/services.staging.json` and
`.env.development.local`, preserving unrelated settings. The development file
contains `VITE_API_URL`, `VITE_AUTH_AUTHORITY`, `VITE_AUTH_CLIENT_ID`,
`VITE_AUTH_LOGIN_URL` and `VITE_DATADOG_ENV=staging`. Restart Vite after exporting.
Production builds ignore this development file and keep `deployment/services.json`.
A general `.env.local` override still applies to builds, so put staging settings
only in `.env.development.local`.

Create a separate account using **Create account** in the local app and verify
its email. The verified owner receives staging admin access through the same
confirmation hook. Existing production accounts, profiles and saves are separate.
Staging Datadog collection is off unless explicitly configured with the existing
monitoring flags; it does not copy the production API key. Resource retention and
Cognito deletion protection apply to staging too.

## Login branding and local review

Cognito Essentials managed login retains signup, verification and password
recovery, using the existing app client, authorization-code flow and callbacks.
[`backend/login_branding.py`](../backend/login_branding.py) defines the full-page
navy background, subdued account/admin globe, header wordmark and accessible form
colors. CloudFormation owns the branding style and publishes it before switching
the domain to managed login version 2. The globe stays vector artwork and needs
no WebGL or external image service. Classic CSS is retained only for rollback.
See [AWS's managed login branding rules](https://docs.aws.amazon.com/cognito/latest/developerguide/managed-login-brandingeditor.html).

The owner approved the Lite-to-Essentials change on October 10, 2026. Essentials
includes 10,000 monthly active direct/social users free per AWS account or
organization, with higher per-user charges beyond the free tier than Lite.
See [Cognito pricing](https://aws.amazon.com/cognito/pricing/).

With `npm run dev`, review `/review/accounts.html` for an interactive sample-data
dashboard/profile/friends flow and `/review/login.html` for the branding
approximation. These entry points are not included in the production build;
the account preview sends no API calls. The real hosted layout still needs a
post-publication check. Validate branding offline with:

```sh
python3 scripts/apply-login-branding.py
```

Deploy the backend stack to publish the managed login configuration and assets.
Templates with embedded artwork use the private artifact bucket because they
exceed CloudFormation's 51 KB inline template limit:

```sh
python3 scripts/deploy-backend.py --profile personal --no-wait
```

To republish only styling on the existing managed login resource:

```sh
python3 scripts/apply-login-branding.py --profile personal --apply
```

The default branding command never contacts AWS; only `--apply` publishes it.

## Feedback

Journey and Study answer feedback offer **Report this question**. The hamburger
menu offers **Send feedback** for general comments. Reports work anonymously;
a valid signed-in session can attach an internal account identifier. Context
includes the screen, release, touch/mouse device class, and applicable Journey,
question, content version, Study topic, target, and method. It excludes written
answers, account emails, and raw IP addresses. Comments are limited to 2,000
characters; general feedback requires a comment, while question comments are
optional. Reports pause Study auto-advance while the dialog is open.

Reports use stable UUIDs across retries. Failed/slow requests keep the draft
available for retry; closing the dialog discards it. The request timeout is 15
seconds. Feedback and progress-sync failures include route, method, HTTP status
(0 if no response), failure type, elapsed milliseconds, retry count and online
state in RUM. Diagnostics exclude request bodies, credentials and query strings;
account-switch cancellations do not report a failure. CORS allows all browser
tracing headers, including Datadog's default
`baggage` header. There is no persistent offline submission queue. The API limits
submissions to ten per source IP per hour using a salted hash, restricts browser
origins, and validates context/body limits. DynamoDB records expire after 180
days, with eventual TTL deletion; rate-limit records expire after two hours.
Backups can retain records separately from live-table TTL.

Admins can browse reports in pages of 30 and set **New**, **Reviewed**, or
**Resolved**. Review responses exclude internal account IDs. Comments render as
text, never HTML. API logs record route, status, duration, release, and request ID;
they do not record report bodies, tokens, emails, or IPs.

## Datadog

Copy `.env.example` entries into ignored `.env.local` and fill in:

- `VITE_DATADOG_APPLICATION_ID`: the RUM application's ID.
- `VITE_DATADOG_CLIENT_TOKEN`: its public browser client token.
- `VITE_DATADOG_SITE`: `datadoghq.com` for this application.
- `DATADOG_API_KEY`: the private API key used only by backend deployment.

Production builds enable configured RUM. Local development requires
`VITE_DATADOG_ENABLED=true`; restart Vite after changing `.env.local`. Tests never
send telemetry. The browser installs matching `@datadog/browser-rum` and
`@datadog/browser-rum-react` versions and initializes `reactPlugin()`. Ambit's
custom navigation uses manual RUM view tracking, with API request tracing,
load/storage/request failures, React component errors, and feedback-submission
actions. The app does not use React Router.

RUM samples 100% of sessions, masks content, disables session replay and automatic
interaction collection, removes query/hash parameters from view/resource URLs,
and excludes Cognito resource traffic and auth callbacks. Feedback comments and
account emails are not added to custom telemetry. The private API key must never
have a `VITE_` prefix or appear in browser code.

GitHub CI reads repository variables `VITE_DATADOG_APPLICATION_ID` and
`VITE_DATADOG_CLIENT_TOKEN` for production builds; it sets the site itself.
Local `.env.local` values are not available to CI. Configure those public
variables before publishing an instrumented release. The backend API key belongs
in AWS Secrets Manager. For source maps, configure a
private GitHub Actions `DATADOG_API_KEY` secret. Main-branch CI uploads hidden maps
with `service:ambit-web`, the build's Git SHA, and the `https://playambit.com` URL
prefix, then removes maps from the site artifact. The deployment packager also
excludes maps for local builds. The upload step skips with a notice when the secret
is absent; the key is never a Vite variable or bundled in browser code.

## Backend deployment

`backend/infrastructure.py` defines the independent CloudFormation stack
`ambit-production-services` in `us-east-1`: Cognito, HTTP API, Lambdas, DynamoDB,
IAM policies, throttling, and logs. `deployment/services.json` contains only
public API/auth configuration. Static frontend deployment remains separate.

Existing stacks can be updated without waiting for deployment completion:

```sh
python3 scripts/deploy-backend.py --profile personal --no-wait
```

This starts the update and preserves the existing public endpoints. It does not
confirm successful deployment. A first deployment can also start without waiting; use `--refresh-config` after
it finishes to export its endpoints.

Run offline checks before deploying:

```sh
python3 -m unittest discover -s backend -p 'test_*.py'
npm test
npm run build
```

To deploy the backend and enable Datadog with the locally supplied API key:

```sh
python3 scripts/deploy-backend.py --profile personal --with-datadog
```

The script stores the private key in `ambit/production/datadog-api-key` in Secrets
Manager using a private temporary file. It passes the secret ARN to the stack;
the Lambda role can read that secret, and Datadog's Python/extension layers collect
API logs and traces. The API Lambda uses 1024 MB and one shared low-level DynamoDB
client with TCP
keep-alive and eight pooled connections. AWS parameter/payload tagging and Lambda
payload capture are disabled. Payload tagging is disabled by default in ddtrace;
these explicit settings do not guarantee removal of its JSONPath import cost.
Provisioned concurrency is not enabled. Compare warm spans and initialization
durations after deployment before claiming a latency improvement. The key is not
printed,
placed in command arguments, or written to public client configuration.

To use an existing secret, supply `--datadog-secret-arn ARN`. A deployment without
either option preserves existing monitoring. Supplying an explicitly empty
`--datadog-secret-arn ''` disables it. Backend deployment does not publish the
frontend or change the automatic main-branch deployment workflow. Retain the
prior backend package and template when preparing a rollback; DynamoDB/Cognito
resources are retained and the user pool has deletion protection.

Offline tests and builds do not verify hosted signup/email delivery, Datadog
intake, or real phone/WebGL behavior. Verify those after deployment without
submitting test feedback into the production review queue unintentionally.

## Shared Journey schedule

`GET /journeys/schedule` returns public date assignments and a revision from the
community table. `PATCH /admin/journeys/schedule` requires a Cognito admin token
and accepts `{date, journeyId, revision}`. A null Journey removes an assignment,
restoring automatic rotation. Only bundled active editions can be published;
local packs cannot be assigned to other players. Conditional writes reject
concurrent edits with 409, requiring a refresh before retrying. The calendar
supports 1,000 assigned dates.

The player refreshes on startup, focus, reconnect, and every minute while visible.
A first-load scheduling failure blocks starting a daily instead of guessing the
edition. Once started, an attempt retains its edition even if Admin changes that
date. Calendar days still use each player’s local midnight. Schedule publication
does not reset progress or enable past-day play.

The backend deployment archive includes `journey-index.json`; deploy the backend
when the bundled Journey catalog changes.

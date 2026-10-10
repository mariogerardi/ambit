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

The admin view offers feedback review and the existing device-local daily
Journey override. It is not a central Journey publishing service.

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
requests, comparisons and challenge access. Completed Journey totals are shared
only with accepted friends when the profile's explicit sharing option is enabled
(off by default). The API derives totals from private synced saves; answers, pins,
typed responses, drafts and email are never returned to friends. Comparison reads
are bounded to 1,000 save registers and expose up to 30 recent totals.

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

## Login branding and local review

The classic Cognito pages retain signup, verification and password recovery.
[`deployment/cognito/ambit.css`](../deployment/cognito/ambit.css) uses the supported
classic classes with Ambit's navy, peach, turquoise and light text. The outlined
wordmark PNG stays below Cognito's 100 KB logo recommendation; no additional
font service, provider upgrade or authentication flow is required. See
[AWS's classic branding rules](https://docs.aws.amazon.com/cognito/latest/developerguide/hosted-ui-classic-branding.html).

With `npm run dev`, review `/review/accounts.html` for an interactive sample-data
dashboard/profile/friends flow and `/review/login.html` for the branding
approximation. These entry points are not included in the production build;
the account preview sends no API calls. The real hosted layout still needs a
post-publication check. Validate branding offline with:

```sh
python3 scripts/apply-login-branding.py
```

After release approval, deploy the backend routes/table before the frontend and
apply the reviewed hosted-page assets separately:

```sh
python3 scripts/deploy-backend.py --profile personal --no-wait
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
seconds. CORS allows all browser tracing headers, including Datadog's default
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
variables before publishing an instrumented release. The private API key belongs
in AWS Secrets Manager, not GitHub's browser-build configuration.

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
confirm successful deployment. The first deployment must wait for its endpoints.

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
API logs and traces. Lambda payload capture is disabled. The key is not printed,
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

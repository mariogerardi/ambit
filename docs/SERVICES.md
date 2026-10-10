# Accounts, feedback, and monitoring

Guest gameplay and local saves remain available without accounts, monitoring,
or a working backend connection. Signed-in players synchronize Journey and Study progress across devices;
accounts also protect admin tools. See [Save persistence](SAVE_PERSISTENCE.md).

## Accounts and admin access

The hamburger menu opens **Account**. Sign-in, signup, email verification, and
password recovery use Cognito's hosted pages. The browser uses authorization code
with PKCE, without an embedded client secret. Tokens and sign-in state stay in
session storage, and expired access tokens can be renewed with a refresh token.
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

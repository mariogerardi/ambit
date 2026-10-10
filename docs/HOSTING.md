# Production hosting

Ambit is hosted by AWS Amplify Hosting in `us-east-1`. The canonical address is
**https://playambit.com**; `www.playambit.com` redirects to it. The repository
remains private. Domain registration and DNS are managed through Route 53.

## Deployments

Pushes to `main` run the [CI workflow](../.github/workflows/ci.yml). After locked
dependency installation, documentation checks, tests, the production build, and
the dependency audit pass, GitHub retains the exact `dist/` artifact and deploys
it to Amplify. Pull requests validate and retain their artifact without deploying.
A manual workflow run on `main` can redeploy the current source.

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

## Hosting behavior

- [Redirect rules](../deployment/amplify-rules.json) serve `index.html` for
  extensionless application routes. Missing files with extensions retain HTTP
  errors instead of receiving the app's HTML.
- [HTTP headers](../customHttp.yml) make HTML and public data revalidate, and
  cache hashed `/assets/` files immutably. They also set basic HTTPS, framing,
  content-type, referrer, and browser-permission controls.
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
  --expected-commit FULL_COMMIT_SHA
```

Use a fresh download directory. A rollback changes the served application; it does
not clear or roll back player saves. Normal pushes to `main` resume deployment of
newer source, so coordinate rollback with ongoing development.

## Operations and costs

At setup, Route 53 quoted `.com` registration and renewal at **USD 16/year**.
One hosted zone adds **USD 0.50/month**. Amplify delivery and deployment usage,
taxes, and any future monitoring are separate. Registration uses the existing
domain contacts with privacy protection and annual auto-renewal enabled.

No new budget threshold was selected, and no budget alert was created. Review
billing in AWS; an alert would notify rather than impose a spending cap.

Domain registration, contact verification, DNS propagation, and certificate
issuance can complete at different times. The managed Amplify URL can serve a
release before the custom domain becomes available. Check the AWS registration
email if contact verification is requested.

Browser-origin-local saves do not transfer between the managed URL, `www`, and
the canonical domain. Share the canonical domain with players. Actual mobile/GPU
behavior, observability, active Study recovery, and old open tabs requesting
chunks removed by a newer deployment remain covered by
[Release readiness](RELEASE_READINESS.md).

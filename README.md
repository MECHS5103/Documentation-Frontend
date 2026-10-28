# Team 5103 Documentation

This repository is the canonical source for the Team 5103 documentation website, its Apps Script API, Firebase security rules, and reviewed deployment workflows.

## Local verification

Use Node.js 20 and install exactly the reviewed lockfile:

```sh
npm ci
npm run test:apps-script
npm run test:storage-rules
npm run build:web
```

The web build writes `dist/build-metadata.json`. It records the source commit and hashes of the lockfile and Apps Script source so a deployed artifact can be mapped back to reviewed source.

## Deployment policy

Production deploys are manual GitHub Actions workflows and only accept the protected `master` branch. Each production environment must require approval from a programming lead.

- `Deploy GitHub Pages` publishes the reviewed `dist` artifact.
- `Deploy Apps Script` pushes the canonical source, creates an immutable Apps Script version named with the Git commit, and updates the existing deployment.
- `Deploy Firebase rules` verifies and deploys only the Firebase Storage rules.

The external deployment CLIs are invoked at explicit versions in the protected workflows rather than being included in the browser application's dependency graph. Dependabot should review and update those versions deliberately.

Do not deploy from a workstation or edit production Apps Script code directly after these workflows are enabled.

## Required GitHub configuration

Create and protect these environments:

- `github-pages`
- `production-apps-script`
- `production-firebase`

Configure the following environment secrets:

| Environment | Secret | Purpose |
| --- | --- | --- |
| `production-apps-script` | `APPS_SCRIPT_CLASPRC_JSON` | OAuth credentials used by clasp |
| `production-apps-script` | `APPS_SCRIPT_SCRIPT_ID` | Apps Script project identifier |
| `production-apps-script` | `APPS_SCRIPT_DEPLOYMENT_ID` | Existing production web-app deployment |
| `production-firebase` | `FIREBASE_SERVICE_ACCOUNT_JSON` | Scoped Firebase deploy identity |
| `production-firebase` | `FIREBASE_PROJECT_ID` | Firebase project identifier |

Configure these public repository Actions variables for the Pages build (copy the names from `.env.example`):

- `EXPO_PUBLIC_APPS_SCRIPT_URL`
- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_APP_ID`
- `EXPO_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY`

The Firebase identity should have only the permissions required to release Storage rules. Do not commit credential files or place them in the web build.

Protect `master`, require the `Verify source` check and CODEOWNER review, block force pushes and branch deletion, and require conversation resolution. Protect every production environment with required reviewers.

## Pages cutover

The live site currently comes from the separate `MECHS5103/Documentation` repository. To move production safely:

1. Merge and verify this repository's CI workflow.
2. In this repository's Pages settings, select GitHub Actions as the source.
3. Configure and verify `docs.team5103.com` as the custom domain and enable Enforce HTTPS.
4. Run `Deploy GitHub Pages` from protected `master` and verify the custom domain, direct lesson links, static assets, and `build-metadata.json`.
5. Keep the previous Pages repository available for rollback until the new deployment is verified.
6. Archive the old deployment repository only after the rollback window closes.

A committed `CNAME` file is included in the build artifact, but repository administrators must still configure the custom domain and HTTPS in GitHub Pages settings.

## Apps Script and Firebase rollout

Use one maintenance window for the authentication cutover:

1. Enable the Google provider in Firebase Authentication and authorize `docs.team5103.com`.
2. Register the web app and reCAPTCHA Enterprise key. Put only the public values from `.env.example` in repository Actions variables.
3. Set the Apps Script properties `FIREBASE_WEB_API_KEY` and `FIREBASE_PROJECT_ID`. Export the current production project and compare it with `apps-script/` before deploying.
4. Grant initial editors the `editor` custom claim with `node scripts/set-editor-claim.mjs <firebase-uid>` using administrator credentials supplied outside the repository.
5. Deploy the new Apps Script version and Storage rules, then deploy the Pages client. Verify public reads, Google editor sign-in, rejected anonymous writes, version conflicts, authenticated saves, and authenticated video uploads.
6. Monitor App Check metrics before enabling Storage enforcement in the Firebase console.
7. Disable the old Apps Script deployment after verification. Remove the password column from the former credential Sheet, restrict its sharing and revision access, and rotate every former editor password.

Before the first Firebase rules deployment, run the emulator tests and verify that public object reads remain intentional while anonymous list and write operations are denied. Deploy the authenticated client before enabling App Check enforcement in the Firebase console, monitor App Check metrics, then enforce it for Storage. Keep the previous ruleset available for rollback.

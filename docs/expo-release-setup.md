# Blueberry — connect Google Play and the App Store to Expo

How to connect both stores to Expo, so that pushing to `master` builds, submits
or updates the app without manual steps.

- **Checked against:** Expo's docs on **1 Nov 2026**. The workflow file below
  passed `eas workflow:validate`, but hasn't run yet.
- **Before this guide:** create the store accounts and apps using
  [`store-setup.md`](store-setup.md) (3.1, 3.2 and 4.1).
- **Who does what:**
  - 🧑 = only you can do it (Google and Apple sign-ins, keys).
  - 🤖 = I can do it in this repo.

---

## What you end up with

Every push to `master` runs one workflow. It works out whether native code
changed, then takes one of two paths for each platform:

| What changed | What happens | Who gets it, and when |
| --- | --- | --- |
| **Only JavaScript or assets** (screens, fixes, text) | Publishes an over-the-air update (EAS Update) | Installed apps download it in the background and use it after a restart |
| **Native code or config** (a new native package, `app.json`, an SDK upgrade) | Builds the app and submits it to the store | Android: Play internal testing. iOS: TestFlight. Testers install the new version |

Neither path publishes to the public. Moving a build from testing to a public
release stays a manual step in each store's console.

### Where things stand today

| Item | Status |
| --- | --- |
| EAS project `@cabipro-software/blueberry` | ✅ Linked |
| App ID `com.blueberrymandal.app` | ✅ Set for both platforms |
| `preview` and `production` build profiles | ✅ In `eas.json` |
| Android signing key | ✅ Created by EAS (made for the preview build; a production build should reuse it) |
| Over-the-air updates | ✅ Configured |
| iOS signing | ❌ Needs your Apple sign-in (Part 2) |
| Store connections | ❌ Parts 1 and 2 |
| GitHub connection and workflow | ❌ Part 3 |

---

## Part 0: Tie updates to the native code 🤖

Do this **before the first production build**. In `app.json`:

```json
"runtimeVersion": {
  "policy": "fingerprint"
}
```

Today's `appVersion` policy relies on someone remembering to raise the version
whenever native code changes. If that's forgotten, installed apps can download
an update that calls native code they don't have. With `fingerprint`, an update
only ever reaches builds it matches. The workflow in Part 3 also makes its
build-or-update decision from the fingerprint.

This only affects new builds, so the installed preview APK isn't changed.

---

## Part 1: Connect Google Play

**You need:** a Play developer account, with the Blueberry app created in Play
Console ([`store-setup.md`](store-setup.md) 3.1 and 3.2).

### 1.1 Create a service account key 🧑

This key is what lets Expo upload to Play on your behalf.

1. In the **Google Cloud Console**, create a project, or pick an existing one.
2. Go to **IAM & Admin → Service Accounts → Create Service Account**. Enter a
   name such as `eas-submit`, then select **Create and close**. Copy the
   account's email address.
3. On that account, open **Manage keys → Create new key → JSON → Create**.
   Save the downloaded file **outside this repo**. It's a secret.
4. In the Google Cloud API library, enable the **Google Play Android Developer
   API**.

### 1.2 Give the service account access to Play 🧑

1. In **Play Console**, go to **Users and permissions → Invite new users**.
2. Paste the service account's email.
3. On the **App permissions** tab, add **Blueberry**.
4. Tick these permissions, then select **Invite user**:

| Group | Permission |
| --- | --- |
| App access | View app information (read-only) |
| Draft apps | Edit and delete draft apps |
| Releases | Release to production, exclude devices, and use Play App Signing |
| Releases | Release apps to testing tracks |
| Releases | Manage testing tracks and edit tester lists |
| Store presence | Manage store presence |

It doesn't need Admin.

### 1.3 Store the key in Expo 🧑

On [expo.dev](https://expo.dev), open the `blueberry` project and go to
**Credentials → Android → `com.blueberrymandal.app` → Service credentials →
Google service account key for EAS Submit**. Upload the JSON and save.

Or do it from a terminal in this project, choosing the **production** profile:

```bash
eas credentials --platform android
```

### 1.4 Send the first build to Play 🧑

Run this in a terminal in this project:

```bash
eas build --platform android --profile production --auto-submit
```

This creates the first release on the **internal testing** track. The app stays
in draft in Play Console until you finish its listing and setup tasks.

Then add your testers ([`store-setup.md`](store-setup.md) 3.3).

---

## Part 2: Connect the App Store

**You need:** a paid Apple Developer membership
([`store-setup.md`](store-setup.md) 4.1).

Automated runs can't ask for your Apple password, so the first iOS build has to
happen in a terminal, where you can sign in.

### 2.1 Make the first iOS build 🧑

Run this in a terminal in this project:

```bash
eas build --platform ios --profile production
```

When asked:
- **Log in to your Apple account:** yes, then enter your Apple ID, password and
  two-factor code.
- **Team:** pick your team.
- **Bundle identifier, Distribution Certificate, provisioning profile:** let EAS
  create them. EAS stores them for later builds.

### 2.2 Create the app record in App Store Connect 🧑

If you haven't already, create the app with the values in
[`store-setup.md`](store-setup.md) 4.2. Then, in App Store Connect, go to **Apps →
Blueberry → App Information**, and copy the **Apple ID** under **General
Information**. It's a number. Part 3.2 needs it as `ascAppId`.

### 2.3 Create an API key for Expo 🧑

```bash
eas credentials --platform ios
```

Choose:
1. The **production** profile
2. **App Store Connect: Manage your API Key**
3. **Set up your project to use an API Key for EAS Submit**

Expo creates the key and keeps it, so nothing needs saving in this repo.

### 2.4 Send the first build to TestFlight 🧑

```bash
eas submit --platform ios --profile production
```

Choose the build from 2.1. It appears in TestFlight after processing, usually
within 10 to 15 minutes. Then set up your internal testers
([`store-setup.md`](store-setup.md) 4.3).

Turn on **automatic distribution** for that group, so later builds reach testers
without any extra step.

---

## Part 3: Connect GitHub and turn on the automation

### 3.1 Connect the repo 🧑

On [expo.dev](https://expo.dev), open the `blueberry` project, then its **GitHub**
settings. Install the Expo GitHub app and connect
`shubhkakadia/blueberry-mobile`.

### 3.2 Add the repo changes 🤖

Send me the `ascAppId` from 2.2 and I'll make these two changes. They're listed
here so you can see exactly what goes in.

**A. `eas.json`: add the App Store app ID.** Automated iOS submissions fail
without it.

```json
"submit": {
  "production": {
    "ios": {
      "ascAppId": "<the Apple ID from 2.2>"
    }
  }
}
```

**B. Add `.eas/workflows/deploy.yml`:**

```yaml
name: Deploy to production

on:
  push:
    branches: ['master']

jobs:
  fingerprint:
    name: Fingerprint
    type: fingerprint
    environment: production
  get_android_build:
    name: Check for existing android build
    needs: [fingerprint]
    type: get-build
    params:
      fingerprint_hash: ${{ needs.fingerprint.outputs.android_fingerprint_hash }}
      profile: production
  get_ios_build:
    name: Check for existing ios build
    needs: [fingerprint]
    type: get-build
    params:
      fingerprint_hash: ${{ needs.fingerprint.outputs.ios_fingerprint_hash }}
      profile: production
  build_android:
    name: Build Android
    needs: [get_android_build]
    if: ${{ !needs.get_android_build.outputs.build_id }}
    type: build
    params:
      platform: android
      profile: production
  build_ios:
    name: Build iOS
    needs: [get_ios_build]
    if: ${{ !needs.get_ios_build.outputs.build_id }}
    type: build
    params:
      platform: ios
      profile: production
  submit_android_build:
    name: Submit Android Build
    needs: [build_android]
    type: submit
    params:
      build_id: ${{ needs.build_android.outputs.build_id }}
  submit_ios_build:
    name: Submit iOS Build
    needs: [build_ios]
    type: submit
    params:
      build_id: ${{ needs.build_ios.outputs.build_id }}
  publish_android_update:
    name: Publish Android update
    needs: [get_android_build]
    if: ${{ needs.get_android_build.outputs.build_id }}
    type: update
    params:
      branch: production
      platform: android
  publish_ios_update:
    name: Publish iOS update
    needs: [get_ios_build]
    if: ${{ needs.get_ios_build.outputs.build_id }}
    type: update
    params:
      branch: production
      platform: ios
```

This is Expo's own deploy example, with the branch changed to `master`.

### 3.3 Test it 🧑 + 🤖

Pushing those changes starts the first run. Watch it on the project's
**Workflows** page on expo.dev. If nothing native changed since 1.4 and 2.1, it
should publish updates. If it builds instead, that's safe, but it uses build
allowance; see Troubleshooting if that keeps happening.

Then test each path:

1. **Update path:** push a small visible text change. The run should publish
   updates and make no builds. Fully close and reopen the app, up to twice, and
   the change should appear.
2. **Build path:** the next time you change `app.json` or add a native package,
   the run should build and submit instead.

---

## Day to day

| You want to | Do this |
| --- | --- |
| Ship a fix or a new screen | Push to `master` |
| Add a native package | `npx expo install <package>`, then push. It builds and submits by itself |
| Test before shipping | Commit locally, and test in Expo Go. **Every push to `master` ships** |
| Publish to the public | Promote the build in Play Console or App Store Connect ([`store-setup.md`](store-setup.md) 3.8 and 4.4) |
| Prepare a new store version | Raise `version` in `app.json`, and push. If that run doesn't build, use the build command below with `--platform all`. Build numbers increase by themselves |
| Undo a bad update | Run `eas update:rollback` and follow the prompts |
| Refresh TestFlight | See below |

**TestFlight builds expire after 90 days,** and over-the-air updates don't extend
that. If native code hasn't changed in that time, no new build happens by itself,
so run this every couple of months:

```bash
eas build --platform ios --profile production --auto-submit
```

**Anyone who installed the preview APK** must uninstall it before installing from
Play. Google re-signs the Play version, so it can't install over the APK.

---

## Limits and costs

Expo's pricing page lists these for the Free plan. Check which plan
`cabipro-software` is on under the account's billing settings on expo.dev:

| Item | Free plan |
| --- | --- |
| Builds | Up to 15 Android and 15 iOS |
| Updates | Unlimited, for up to 1,000 monthly active users |
| CI/CD workflow time | Up to 60 minutes |
| Submissions | Google Play and App Store included |

Over-the-air updates don't use build allowance. Each native change uses one build
per platform.

---

## Troubleshooting

| Problem | Likely cause and fix |
| --- | --- |
| `Google Service Account Keys cannot be set up in --non-interactive mode` | The key isn't stored in Expo. Redo 1.3 |
| `App Store Connect API Keys cannot be set up in --non-interactive mode` | The API key isn't set up. Redo 2.3 |
| iOS submission fails asking for `ascAppId` | Add it to `eas.json` (3.2 A) |
| Every push builds, even with no native change | The fingerprint differs between runs. Compare two with `eas fingerprint:compare`. Files that differ on Windows, such as line endings, are a possible cause |
| iOS build fails on credentials in a workflow | The first build must be run in a terminal. Do 2.1 |
| Play rejects a release because the app is a draft | Finish the store setup tasks, or set `"releaseStatus": "draft"` under `submit.production.android` and roll out by hand |
| Play says the service account has no permission | Recheck 1.2. A new invite can take a while to apply |
| The workflow doesn't start on push | Check 3.1, that the file is on `master`, and that you pushed |
| An update doesn't appear | Fully close and reopen the app, up to twice. It must be a build from the `production` profile, because the preview APK listens to a different channel |

---

## Checklist

- [ ] Part 0 Runtime policy switched to `fingerprint`
- [ ] 1.1 Service account and JSON key created
- [ ] 1.2 Service account invited in Play Console
- [ ] 1.3 Key stored in Expo
- [ ] 1.4 First Android build on internal testing
- [ ] 2.1 First iOS build done in a terminal
- [ ] 2.2 App Store Connect app created, `ascAppId` copied
- [ ] 2.3 API key set up
- [ ] 2.4 First build in TestFlight, automatic distribution on
- [ ] 3.1 GitHub repo connected
- [ ] 3.2 Repo changes added and pushed
- [ ] 3.3 Update path and build path both tested

**Sources:**
- [EAS Submit: Google Play](https://docs.expo.dev/submit/android/)
- [EAS Submit: App Store](https://docs.expo.dev/submit/ios/)
- [Creating a Google service account](https://github.com/expo/fyi/blob/main/creating-google-service-account.md)
- [Automate submissions](https://docs.expo.dev/build/automate-submissions/)
- [EAS Workflows: get started](https://docs.expo.dev/eas/workflows/get-started/)
- [Deploy to production example](https://docs.expo.dev/eas/workflows/examples/deploy-to-production/)
- [Pre-packaged workflow jobs](https://docs.expo.dev/eas/workflows/pre-packaged-jobs/)
- [Runtime versions](https://docs.expo.dev/eas-update/runtime-versions/)
- [Expo pricing](https://expo.dev/pricing)

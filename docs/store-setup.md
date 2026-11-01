# Blueberry — Google Play & App Store setup guide

Step-by-step setup for publishing **Blueberry** (`com.blueberrymandal.app`) on
Google Play and the Apple App Store, with every form answer worked out for this
app.

- **Checked against:** Google's and Apple's help pages on **31 Oct 2026**. Both
  consoles reword screens often. If a question reads a little differently,
  answer what it means; the facts in [§1](#1-facts-every-form-asks-about) don't
  change.
- **Who does what:**
  - 🧑 = only you can do it (accounts, payments, ID checks, Apple sign-in).
  - 🤖 = I can do it or prepare it for you.

---

## 0. Decide how far to go

Blueberry always talks to **your** bridge at `https://blueberrymandal.com`,
published through a Cloudflare Tunnel. Reviewers can reach that address, but
any account you give them would control your real aircon. That decides how much
store review you face:

| Route | Who can install | Store review | Extra work |
| --- | --- | --- | --- |
| **Android — Internal testing** *(recommended)* | Up to 100 people you list by email | Light; available to testers quickly | None |
| Android — Closed / Production | Your list, or anyone on Play | Full review; reviewers must sign in | Personal accounts first need a **12-tester, 14-day closed test**; a demo account for reviewers |
| **iOS — TestFlight, internal testers** *(recommended)* | Up to 100 members of your App Store Connect team | **None** | Builds expire after **90 days**: upload a new one before then |
| iOS — TestFlight external / App Store | Anyone with the link, or everyone | Full App Review; reviewers must sign in | A demo account that can't touch the real aircon (see [§5](#5-if-you-go-public-a-demo-account-for-reviewers)) |

For a household app, the two recommended routes give everyone a store install
and automatic updates, with no public listing and no reviewer access to your
home. You can move to a public listing later without rebuilding anything.

This guide covers the recommended routes first, and every listing and privacy
form. Most of those forms are needed anyway, and all of them are needed to go
public.

---

## 1. Facts every form asks about

Keep these at hand; every answer below comes from them.

- **What the app does:** controls an AirTouch 4 air conditioner, and shares a
  grocery list, dinner plan and electricity costs, for one household.
- **Where data goes:**
  - Only to the household's own **bridge** at `https://blueberrymandal.com`,
    built into the app. It is reached through **Cloudflare**, which carries the
    traffic over a Cloudflare Tunnel to the home server and stores none of it.
  - And to **Expo's update service** (`u.expo.dev`) to check for updates.
  - Cloudflare and Expo act as **service providers**. Neither store counts that
    as "sharing".
- **Data sent to the bridge:**
  - username and password; each sign-in session keeps the app's user agent and
    last-used time for 30 days
  - aircon changes, recorded with who made them, plus runtime history
  - timers
  - grocery items, dishes, dinner notes
  - electricity bills (retailer, plan, dates, kWh, rates, amounts)
- **Data sent to Expo:** OS, app version, update channel, and a **random
  per-install ID** (`EAS-Client-ID`). Expo calls it non-identifying.
- **Not collected:** location, contacts, photos, camera, microphone, health,
  payments, ad IDs. No ads, analytics, crash reporting or tracking SDKs.
- **Accounts:** made on the bridge by its admin; **no sign-up in the app**, so
  no in-app account deletion is required by either store.
- **Encryption in transit:** yes, everything is HTTPS (release builds refuse
  plain `http`).
- **Children:** not for children.

---

## 2. Prepare first (both stores)

| # | Item | Who | Notes |
| --- | --- | --- | --- |
| 2.1 | **Privacy policy page** at `https://blueberrymandal.com/privacy` | 🤖 built, 🧑 tunnel | The bridge serves it, signed out, once the Cloudflare Tunnel is live (see [`privacy-policy.md`](privacy-policy.md)). Fill in its contact email first. Both stores require it. |
| 2.2 | **Support URL** | 🧑 | Apple requires one. Until there's a support page, `https://blueberrymandal.com/privacy#contact` leads to the contact email. |
| 2.3 | **Contact email** on the domain (e.g. `hello@blueberrymandal.com`) | 🧑 | Shown publicly on both listings. |
| 2.4 | **Store icon** 512×512 PNG (Play) | 🤖 | Same artwork as the app icon. |
| 2.5 | **Feature graphic** 1024×500 PNG/JPG (Play, required) | 🤖 | |
| 2.6 | **Phone screenshots** | 🤖 Android / 🧑 iPhone | Play: 2–8 phone screenshots, 16:9 or 9:16, 320–3840 px per side. Apple: 6.9″ iPhone screenshots (1320×2868 or 1290×2796), which must come from an iPhone or the iOS simulator. |
| 2.7 | **Store text** | 🤖 | Drafts in [§6](#6-store-text-drafts). |
| 2.8 | Decide **account type** for each store | 🧑 | See 3.1 and 4.1. |

---

## 3. Google Play

### 3.1 Create the developer account 🧑

1. Go to **https://play.google.com/console/signup** and sign in with the Google
   account that should own the app. Using one you'll keep for years matters.
2. **Who's this account for?**
   - **Yourself (personal):** shows your legal name as developer. Needs a
     government ID check and proof you have a real Android phone, done in the
     *Play Console* app.
     - New personal accounts can only publish to **Production** after a
       14-day closed test with at least 12 testers.
     - **Internal testing needs no such test.**
   - **An organisation:** shows the organisation's name. Needs a **D-U-N-S
     number** and a website (blueberrymandal.com). Exempt from the 12-tester
     rule.
3. Pay the **US$25** one-time fee.
4. Fill in the developer profile:
   - **Developer name:** public. Use "Blueberry Mandal" or your name.
   - **Contact email:** 2.3.
   - **Website:** `https://blueberrymandal.com`.
   - **Phone:** private, used for verification.
5. Wait for verification, which takes from hours to a few days.

### 3.2 Create the app 🧑

**Play Console → Home → Create app**

| Field | Answer |
| --- | --- |
| App name | `Blueberry` |
| Default language | English (Australia) – en-AU |
| App or game | **App** |
| Free or paid | **Free**. This can't later become paid. |
| Declarations | Tick **Developer Program Policies** and **US export laws** |

### 3.3 First build and upload 🤖 + 🧑

Google's API can't create an app's first release, so the **first upload is
manual**.

1. 🤖 Build the store bundle (AAB):
   `eas build --platform android --profile production`
2. 🧑 **Testing → Internal testing → Create new release**.
   - **App signing:** choose *Use Google-generated key*, the default. Google
     signs what users install, and the key EAS made becomes your **upload
     key**. Keep it in EAS; it's backed up there.
   - Upload the `.aab` from the EAS build page.
   - **Release name:** `1.0.0 (1)`.
   - **Release notes:** "First release."
   - **Next → Save and publish**.
3. 🧑 **Testers** tab → **Create email list** ("Household") → add each
   person's Google account email → **Save**.
4. Copy the **opt-in link** and send it to them. They accept, then install
   Blueberry from Play.

> Anyone who installed the preview **APK** must **uninstall it first**. Google
> re-signs the Play version, so it can't install over the APK.

A brand-new app stays in *draft* and can only go to internal testing until the
listing below is complete. The **Dashboard** lists anything Play still needs.

### 3.4 App content (Policy → App content) 🧑

Every declaration, in Play's order.

**Privacy policy**
- URL: `https://blueberrymandal.com/privacy`

**Ads**
- *Does your app contain ads?* → **No, my app does not contain ads**

**App access**
- Choose **All or some functionality is restricted**.
- **Add instructions:**
  - **Name:** `Household bridge sign-in`
  - **Username / Password:** the demo account (only when going beyond internal
    testing, see §5). For internal testing, write "N/A – internal household use".
  - **Any other information:**
    > Blueberry is the remote for our household's home server, which controls
    > an AirTouch 4 air conditioner. Accounts are created by us; there is no
    > sign-up. Sign in with the username and password above.

**Content rating** (IARC questionnaire)
- **Email:** 2.3.
- **Category:** **All Other App Types** (not a game, social, news or education app).

| Question | Answer |
| --- | --- |
| Violence, fear, blood | No |
| Sexuality / nudity | No |
| Language (profanity, crude humour) | No |
| Controlled substances (drugs, alcohol, tobacco) | No |
| Gambling, simulated gambling | No |
| Does the app let users interact or exchange content with other users? | **Yes**: household members share a grocery list and dinner notes, each tagged with who added it |
| Does the app share the user's current location with others? | No |
| Does the app allow users to purchase digital goods? | No |
| Is the app a web browser or search engine? | No |
| Any hate symbols or extremist content? | No |

- **Expected result:** Everyone / PEGI 3, with the note **"Users Interact"**.

**Target audience and content**
- **Target age groups:** **18 and over**. Tick 16–17 too if teens in the
  household use it. Avoid any group under 13: that brings in Google's Families
  policy, with extra requirements this app doesn't need.
- *Could your app unintentionally appeal to children?* → **No**
- *Store presence:* nothing extra.

**News apps**
- *Is your app a news app?* → **No**

**Data safety:** see 3.5.

**Advertising ID**
- *Does your app use advertising ID?* → **No**. No ad or analytics SDK is
  included. 🤖 I'll confirm the built app has no `AD_ID` permission.

**Government apps**
- **No**

**Financial features**
- **My app doesn't provide any financial features**. It records bills you
  enter, but there's no banking, payments, loans or trading.

**Health apps**
- **My app does not have any health features**

> Other declarations appear only if the app requests the permission they cover:
> photo and video, foreground service, full-screen intent, exact alarms and
> similar. Blueberry requests none of them, so they shouldn't appear.

### 3.5 Data safety 🧑

**Data collection and security**

| Question | Answer |
| --- | --- |
| Does your app collect or share any of the required user data types? | **Yes** |
| Is all of the user data collected by your app encrypted in transit? | **Yes** |
| Which methods of account creation does your app support? | **My app does not allow users to create an account**. Accounts are made on the bridge by its owner. |
| Do you provide a way for users to request that their data is deleted? | **Yes**. The bridge owner deletes it, as the privacy policy explains. |

**Data types.** Tick only these:

| Category → type | What it is in Blueberry |
| --- | --- |
| **Personal info → User IDs** | The username used to sign in |
| **Financial info → Other financial info** | Electricity bills: amounts, rates, retailer |
| **App activity → App interactions** | Aircon changes and runtime, recorded with who made them |
| **App activity → Other user-generated content** | Grocery items, dishes, dinner notes, timer names |
| **Device or other IDs** | Expo's random per-install update ID |

Leave everything else unticked: location, contacts, photos, health, messages,
files, calendar, web history, audio, crash logs, diagnostics, and so on.

**For each ticked type, Play asks the same five questions:**

| Type | Collected / Shared | Processed ephemerally? | Required or optional | Purposes |
| --- | --- | --- | --- | --- |
| User IDs | Collected; **not shared** | No | **Required** | App functionality, Account management |
| Other financial info | Collected; not shared | No | **Optional** (users can choose) | App functionality |
| App interactions | Collected; not shared | No | **Required** | App functionality |
| Other user-generated content | Collected; not shared | No | **Optional** | App functionality |
| Device or other IDs | Collected; not shared | No | **Required** | App functionality, Analytics |

- **"Shared" means sent to a third party.** Expo acts as a service provider
  delivering updates, and Play doesn't count service providers as sharing.
  So: **not shared**.
- **Preview:** the Data safety section will read "No data shared with third
  parties", "Data is encrypted in transit" and "You can request that data be
  deleted".

### 3.6 Store settings and listing 🧑 (text and graphics from 🤖)

**Grow → Store presence → Store settings**
- **App category:** **House & Home**
- **Tags:** Home automation, Productivity (optional)
- **Contact:** email (2.3), website `https://blueberrymandal.com`; phone
  optional.

**Main store listing**

| Field | Limit | Value |
| --- | --- | --- |
| App name | 30 | `Blueberry` |
| Short description | 80 | See §6 |
| Full description | 4000 | See §6 |
| App icon | 512×512 PNG | 2.4 |
| Feature graphic | 1024×500 | 2.5 |
| Phone screenshots | 2–8 | 2.6 |
| Tablet screenshots | — | Skip (phone-only app) |

### 3.7 Automatic uploads from now on 🧑 then 🤖

So `eas submit` can upload future builds:

1. 🧑 **Google Cloud Console** (same Google account):
   1. Create a project.
   2. Enable the **Google Play Android Developer API**.
   3. **IAM → Service accounts → Create** (`eas-submit`).
   4. **Keys → Add key → JSON**, and download it.
2. 🧑 **Play Console → Users and permissions → Invite new users** → paste the
   service account's email.
   - **App permissions:** Blueberry.
   - Tick **Release apps to testing tracks** and **Release to production…**,
     or only testing.
3. 🧑 Run `eas credentials` → Android → production →
   **Google Service Account → Upload** the JSON. Don't commit the file.
4. 🤖 From then on: `eas build -p android --profile production --auto-submit`.
   It goes to the internal track, the EAS default.

### 3.8 Going to Production later (optional)

- **Personal account:**
  1. **Testing → Closed testing:** add at least 12 testers.
  2. Keep them opted in for 14 days.
  3. **Dashboard → Apply for production**, which asks about your testing.
- **Organisation account:** promote the release from internal testing to
  production.
- **Reviewers** need §5.

---

## 4. Apple App Store

### 4.1 Join the Apple Developer Program 🧑

1. https://developer.apple.com/programs/enroll — sign in with the Apple ID that
   should own the app. It needs two-factor authentication on.
2. **Entity type:**
   - **Individual:** the seller name is your legal name.
   - **Organisation:** the seller name is the organisation's. Needs a
     **D-U-N-S number**, legal-entity status, the authority to sign for it,
     and a website on the organisation's domain (blueberrymandal.com).
3. Pay **US$99 a year** (shown in local currency). Approval takes from hours
   to a few days; organisations may get a verification call.

### 4.2 Register the app 🤖 + 🧑

The bundle ID and signing are created by EAS on the first iOS build. **You**
type your Apple ID, password and 2FA code into EAS; I can't.

1. 🧑 In a terminal in this project:
   `eas build --platform ios --profile production`
   - Log in to your Apple account: **Yes**, then enter your Apple ID,
     password and 2FA code.
   - Pick your team.
   - Let EAS **register the bundle ID** `com.blueberrymandal.app`, and
     **generate a Distribution Certificate** and **provisioning profile**.
     EAS stores them.
2. 🧑 When the build finishes: `eas submit --platform ios --profile production`
   (use the latest build).
   - If the App Store Connect app doesn't exist yet, EAS **creates it**,
     using the app name, bundle ID and an SKU. **Or** create it first yourself
     (step 3) and give EAS its **Apple ID** (`ascAppId`).
   - Export compliance is already answered (`usesNonExemptEncryption: false`),
     so it won't ask.
3. 🧑 (Only if creating the app by hand) **App Store Connect → Apps → + → New App**:

| Field | Answer |
| --- | --- |
| Platforms | iOS |
| Name | `Blueberry`. **Must be unique across the App Store**; if it's taken, use e.g. `Blueberry Home`. The home-screen label stays "Blueberry" either way. |
| Primary language | English (Australia) |
| Bundle ID | `com.blueberrymandal.app` |
| SKU | `blueberry-ios`. Private, never shown. |
| User access | Full Access |

### 4.3 TestFlight for the household 🧑

1. **Users and Access → +**: invite each household member's Apple ID email.
   - Give them the **Marketing** role, limited to **Blueberry** only.
   - Only Account Holder, Admin, App Manager, Developer and Marketing users
     can be internal testers. Of those, Marketing gives the least access.
   - Keep **Access to Certificates, Identifiers & Profiles** off.
2. **TestFlight → Internal Testing → +** → create a group called
   "Household". Add those users and turn on **automatic distribution**.
3. Each person installs **TestFlight** from the App Store, accepts the email
   invite, then installs Blueberry.
4. Builds **expire after 90 days**. Over-the-air updates fix the app's code
   but don't extend that, so plan a fresh `build` + `submit` every couple of
   months.

### 4.4 App Store listing (needed only for the App Store or external TestFlight) 🧑

**App Information**

| Field | Answer |
| --- | --- |
| Name | `Blueberry` (see 4.2) |
| Subtitle (30) | See §6 |
| Category | Primary **Utilities**; secondary **Lifestyle** |
| Content Rights → *Does your app contain, show, or access third-party content?* | **No** |
| Age Rating | 4.5 |
| Privacy Policy URL | `https://blueberrymandal.com/privacy` |

**Pricing and Availability**
- **Price:** Free.
- **Availability:** your country or countries (e.g. Australia only).
- **Distribution:** Public, or **Unlisted** (only people with the link can
  find it). Unlisted needs a request to Apple and still goes through full
  review.

**App Privacy:** see 4.6.

**Version 1.0.0**

| Field | Limit | Value |
| --- | --- | --- |
| Screenshots | 6.9″ iPhone | 2.6 (up to 10) |
| Promotional text | 170 | §6 |
| Description | 4000 | §6 |
| Keywords | 100 | §6 |
| Support URL | — | `https://blueberrymandal.com/privacy#contact` (see 2.2) |
| Marketing URL | — | `https://blueberrymandal.com` (optional) |
| Copyright | — | `2026 Blueberry Mandal` |
| Build | — | Pick the TestFlight build |
| **App Review → Sign-in required** | — | Demo username and password (§5) |
| App Review → Notes | — | Same text as Play's App access |
| App Review → Contact | — | Your name, phone, email |
| Version release | — | **Manually release this version** |

### 4.5 Age rating questionnaire 🧑

Apple's questionnaire (updated 2025) covers four areas.

| Area | Questions | Answer |
| --- | --- | --- |
| **In-app controls** | Parental controls; age assurance | **No** to both |
| **Capabilities** | Unrestricted web access | **No** |
| | Messaging and chat | **No** |
| | User-generated content | See below |
| | Advertising | **No** |
| **Mature themes** | Profanity or crude humour; horror or fear; alcohol, tobacco or drugs; mature or suggestive themes | **None** |
| | Medical or treatment information; health or wellness topics | **None / No** |
| **Sexuality, nudity, violence** | All frequency questions (cartoon, realistic, graphic violence; guns and weapons; sexual content; nudity) | **None** |
| **Gambling and contests** | Simulated gambling; gambling; contests; loot boxes | **None / No** |

- **User-generated content:**
  - **Facts:** household members see each other's grocery items and dinner
    notes. Only accounts the bridge owner created can see them; nothing is
    public.
  - **If you answer No:** Apple's definition means content shared with other
    users of the app at large, which this isn't.
  - **If you answer Yes:** reviewers may expect Guideline 1.2 features
    (reporting, blocking). Those make no sense for a private household list,
    so be ready to explain in the review notes.
- **Expected rating:** **4+**.
- **Optional:** after answering, you can choose a higher minimum age than the
  calculated one.

### 4.6 App Privacy ("nutrition label") 🧑

**App Store Connect → your app → App Privacy → Get Started**

1. *Do you or your third-party partners collect data from this app?* →
   **Yes, we collect data from this app**
2. **Data types.** Tick only these:

| Category → type | What it is |
| --- | --- |
| **Identifiers → User ID** | Username |
| **Identifiers → Device ID** | Expo's random per-install update ID |
| **Financial Info → Other Financial Info** | Electricity bills |
| **User Content → Other User Content** | Grocery items, dishes, dinner notes, timer names |
| **Usage Data → Product Interaction** | Aircon changes and runtime, recorded with who made them |

Leave everything else unticked: Contact Info, Health & Fitness, Location,
Sensitive Info, Contacts, Browsing/Search History, Purchases, Diagnostics,
Other Data.

3. **For each type, Apple asks three things:**

| Type | Purposes | Linked to the user's identity? | Used for tracking? |
| --- | --- | --- | --- |
| User ID | **App Functionality** | **Yes** | **No** |
| Device ID | **App Functionality**, **Analytics** | **No**. It's random, not tied to the account. | **No** |
| Other Financial Info | **App Functionality** | **Yes** | **No** |
| Other User Content | **App Functionality** | **Yes** | **No** |
| Product Interaction | **App Functionality** | **Yes** | **No** |

4. **Publish.** The label will show:
   - **Data Linked to You:** Identifiers, Financial Info, User Content, Usage Data.
   - **Data Not Linked to You:** Identifiers.
   - **Data Used to Track You:** none.

- **Why disclose data on your own bridge:** Apple and Google count data as
  "collected" when it leaves the phone and the app's operator can access it.
  The bridge is run by you, the developer. Declaring it is the safe, honest
  reading.
- **If the bridge were only ever run by each user for themselves,** it would
  arguably not be collected. That isn't the case here.

---

## 5. If you go public: a demo account for reviewers

Reviewers at Google and Apple must be able to sign in. The app always talks to
`blueberrymandal.com`, so they'd sign in to your real bridge. An ordinary
account there would let a stranger switch your aircon on and read your lists.
If you choose a public or external route, the bridge needs:

1. A **demo account** whose aircon commands go to a **simulated console**
   instead of the real one, and whose lists and bills are sample data, kept
   apart from the household's.
2. That account entered in Play's *App access* and Apple's *App Review
   information*, and deleted or disabled once review is done.

🤖 This is bridge work I can do as its own task when you want to go public. It
isn't needed for internal testing or internal TestFlight.

---

## 6. Store text drafts

**Short description (Play, 80):**
> Your home's aircon, timers, groceries, dinner and power bills in one app.

**Subtitle (Apple, 30):**
> Aircon, groceries & dinner

**Promotional text (Apple, 170):**
> One remote for the whole household: switch rooms on, set timers, keep a
> shared grocery list, plan the week's dinners and see what power really costs.

**Keywords (Apple, 100 incl. commas):**
> `aircon,air conditioner,timer,grocery,shopping list,dinner,meal plan,energy,electricity,bill,home`

Don't add brand names such as AirTouch to keywords: Apple rejects other
companies' trademarks there.

**Full description (both stores, 4000):**

> Blueberry is our household's remote for home. It works with the Blueberry
> home server, a small computer at home that talks to the AirTouch 4
> air-conditioning console.
>
> **Aircon**
> • Turn the system and individual rooms on and off
> • Change mode, fan speed and set point, and open each room's damper
> • Timers that start and stop the aircon on the days you choose
>
> **House**
> • A shared grocery list that shows who added what
> • Plan the week's dinners from your own list of dishes
>
> **Activity and energy**
> • See which rooms ran, for how long, and who switched them on
> • Monthly electricity costs worked out from your real bills, with a forecast
>   for the rest of the year
>
> **Private by design**
> Everything you add stays on the home server, reached over an encrypted
> connection. No ads, no tracking, no analytics.
>
> Blueberry is for members of our household: accounts are created by us, and
> there is no public sign-up.

---

## 7. Release checklist

- [ ] Cloudflare Tunnel live for `blueberrymandal.com`, bridge started with `TRUST_PROXY=true`
- [ ] 2.1 Privacy policy live at `/privacy`, contact email filled in
- [ ] 2.2 Support URL decided
- [ ] 2.3 Contact email works
- [ ] 3.1 Play developer account verified
- [ ] 3.2 Play app created
- [ ] 3.3 Internal testing release live, household opted in
- [ ] 3.4 App content declarations done
- [ ] 3.5 Data safety done
- [ ] 3.6 Store settings and listing done
- [ ] 3.7 Service account for `eas submit` added
- [ ] 4.1 Apple Developer Program approved
- [ ] 4.2 First iOS build and submit
- [ ] 4.3 TestFlight internal group, household invited
- [ ] 4.4–4.6 App Store listing, age rating and App Privacy (only for public)
- [ ] §5 Demo account (only for public)

**Sources:**
- [Play: app testing requirements for new personal accounts](https://support.google.com/googleplay/android-developer/answer/14151465)
- [Apple: updated age ratings](https://developer.apple.com/news/?id=ks775ehf)
- [Apple: add internal testers](https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-internal-testers/)
- [Expo: what end-user data EAS services handle](https://expo.dev/privacy-explained)
- [EAS: internal distribution](https://docs.expo.dev/build/internal-distribution/)
- [EAS Update: getting started](https://docs.expo.dev/eas-update/getting-started/)

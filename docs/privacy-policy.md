# Blueberry — Privacy Policy (draft)

> Draft for publishing at **https://blueberrymandal.com/privacy**. Fill in the
> three `<…>` placeholders, then publish it as a plain web page. Both stores
> need a public URL. Keep it in step with the app: if the app starts sending
> data anywhere new, update this page *and* the store privacy forms
> (see `store-setup.md`).

**Effective date:** `<date you publish it>`

Blueberry ("the app") is made by `<Blueberry Mandal / your legal or trading name>`
("we"). This policy explains what the app does with your information.

## The short version

- Blueberry is a remote control for **your household's own bridge**, a small
  server that runs in your home. Everything you add in the app (aircon settings,
  timers, grocery items, the dinner plan, electricity bills) is stored **on that
  bridge**, not on servers run by us or anyone else.
- We do **not** sell data, show ads, track you across apps or websites, or use
  analytics services.
- The only other service the app talks to is **Expo's update service**, which
  checks for app updates. It receives no personal information.

## What the app sends to your household's bridge

The app connects only to the bridge address you enter when you sign in. It uses
an encrypted (HTTPS) connection over Tailscale, a private network. It sends:

| Information | Why |
| --- | --- |
| Your username and password | To sign you in. Accounts are created by whoever runs the bridge; the app has no sign-up. |
| Aircon changes (power, mode, temperature, fan, rooms) | To control the air conditioner. The bridge records who made each change and how long rooms ran, so the household can see its usage. |
| Timers you create | So the bridge can switch the aircon on and off at the times you set. |
| Grocery items, dishes, dinner plans and notes | To share them with the other people in your household. Items show who added them. |
| Electricity bills (retailer, plan, dates, usage, rates, amounts) | To work out monthly costs and forecasts. |

This information stays on your household's bridge. It is visible to the other
accounts on that same bridge, and to whoever runs the bridge, who can also
manage and delete it.

## What stays on your phone

- The bridge address and your light/dark preference, kept in the phone's
  secure storage.
- A sign-in cookie, kept by the phone's system networking, so you stay signed
  in.

Uninstalling the app removes these on Android. On iPhone, iOS can keep the
saved bridge address and light/dark preference in its keychain after the app
is removed; neither says anything about you.

## App updates (Expo)

To deliver fixes without a full reinstall, the app asks Expo's update service
(`u.expo.dev`, operated by 650 Industries, Inc. "Expo") whether a newer version
is available. Each check sends the phone's operating system (Android or iOS),
the app's version and update channel, and a random identifier created when the
app is installed. This identifier says nothing about who you are or which
device you use. Expo uses this to deliver the right update and to count how many
installs have updated. See Expo's privacy policy at https://expo.dev/privacy.

## What we don't collect

No location, contacts, photos, camera, microphone, health data, payment card
details, advertising identifiers, or browsing history. The app contains no
advertising or analytics software.

## Keeping it safe

All connections are encrypted (HTTPS). Your bridge is reachable only through
your household's private Tailscale network.

## Deleting your information

- Ask whoever runs your household's bridge to remove your account and anything
  you added; they can delete it directly.
- Signing out ends the session on your phone; uninstalling the app removes
  what it keeps there (see above for iPhone).

## Children

Blueberry is a household tool for adults and is not directed at children under 13.

## Changes

If this policy changes, we will update this page and its effective date.

## Contact

`<contact email, e.g. hello@blueberrymandal.com>`

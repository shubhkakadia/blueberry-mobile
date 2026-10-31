# Home Management System → Expo app: migration plan

Source: `C:\Users\Shubh\OneDrive\Desktop\Home-Management-System`
([github.com/shubhkakadia/Home-Management-System](https://github.com/shubhkakadia/Home-Management-System))
Target: this repo (`blueberry-mobile`, Expo SDK 58, Expo Router, React 19.3, RN 0.88)

We port it one module at a time. Each module ends as a working, tested slice
of the app.

---

## 1. What exists today

The Home Management System has two halves:

| Part | Where | What it does |
| --- | --- | --- |
| **Bridge** (backend) | `src/` | Node + Express + `ws` + SQLite (`better-sqlite3`). Holds **one** TCP socket to the AirTouch 4 console on the LAN, polls it, runs the timer scheduler, logs zone runtime, and serves a REST API + a `/ws` live-state stream. Cookie sessions (`hms_session`). |
| **Web UI** (frontend) | `web/` | React 18 + Vite + Tailwind 4 PWA. Four tabs (Aircon, House, Activity, Settings) with segments, hash routing, its own small UI kit in `web/src/ui/`. |

### Decision: only the web UI moves here

The bridge **cannot** run on a phone. It needs an always-on process on the home
network: one persistent socket to the console, a scheduler that fires at 06:30,
and a SQLite file. So:

- The **bridge stays** in the Home-Management-System repo and keeps running on
  the home machine. It is unchanged unless a module below says otherwise.
- **This app replaces `web/`** as a native client of the bridge's existing API.
- The existing web PWA keeps working alongside it. We are not building an Expo
  *web* target. It would duplicate the PWA and would need CORS on the bridge.

### What we reuse and what we rewrite

| Reuse almost as-is (pure TS) | Rewrite for React Native |
| --- | --- |
| API types and request shapes (`api.ts`, `*Api.ts`) | Every `.tsx` screen (DOM + Tailwind → RN views + `StyleSheet`) |
| `useSystemState.ts` (optimistic patch layering, `useDebouncedValue`) | `web/src/ui/*` kit → a small RN kit in `src/components/ui/` |
| Helpers: `zones.ts`, `climateTheme.ts` tokens, `describeDays` / `describeNextRun` / `formatClock`, `money` / `billRange` / `billDays`, runtime range helpers | `useHashRoute`, `nav.ts` → Expo Router files |
| Validation rules are in the bridge already, so the client only mirrors them | `NativeInteractions.tsx` (pull-to-refresh, swipe rows), `Motion.tsx`, `Sheet`, `FormScreen`, `Toast` |

---

## 2. Cross-cutting concerns (solved once, in Modules 0–1)

### 2.1 Reaching the bridge
The web UI used relative URLs (same origin). The app needs a **bridge address**,
entered on the sign-in screen and kept on the device. Two expected kinds:

- **Tailscale Serve:** `https://<machine>.<tailnet>.ts.net`. Recommended:
  it is HTTPS, works away from home, and needs no cleartext exceptions.
- **LAN:** `http://192.168.x.x:8080`. Plain HTTP needs platform config:
  - Android blocks cleartext in release builds → enable it via `app.json` /
    `expo-build-properties`.
  - iOS needs the local-network usage description (and an ATS exception for
    `http`).

  Look up the exact keys in the SDK 58 docs when we get there.

One `request()` helper in `src/lib/api.ts` prefixes the base URL, sets JSON
headers, maps `401` to "signed out", and turns `{ error }` bodies into thrown
messages. Every web `*Api.ts` has its own copy of this today. Here they all share
one.

### 2.2 Auth
The bridge uses an `HttpOnly` cookie. React Native's `fetch` stores and resends
cookies through the native cookie jar, so **login should work with zero bridge
changes**. The risk is the WebSocket: `verifyClient` reads the cookie from the
upgrade request.

- **Spike in Module 1:** sign in, kill and relaunch the app, then confirm `/api/auth/me`
  and `/ws` both still authenticate on **iOS and Android**.
- **Fallback, only if the spike fails:** a small bridge change. `attachUser` and
  `verifyClient` also accept `Authorization: Bearer <token>`, login returns the
  token to native clients, and the app stores it with `expo-secure-store`.
- **Result (M1, Android):** the cookie authenticates both `fetch` and the `/ws`
  upgrade, and survives a force-stop. No bridge change is needed. iOS is still
  to be confirmed on a device.

### 2.3 Live state
`subscribe()` in `web/src/api.ts` opens `ws(s)://<host>/ws` and reconnects after
2 s. On mobile it also has to:
- close the socket when the app goes to the background, and reopen it plus
  refetch `/api/state` when it comes back (`AppState`).
- build the `ws` URL from the stored bridge address.

### 2.4 Browser APIs → native replacements

| Web | Native |
| --- | --- |
| Hash routes (`useHashRoute`, `nav.ts`) | Expo Router file routes |
| `window` `hms:unauthorized` event | Auth context; `request()` calls `signOut()` on 401 |
| `visibilitychange` / `focus` refresh (Checklist, Dine, Costs) | `AppState` + `useFocusEffect` |
| `localStorage` theme | Stored setting + `Appearance.setColorScheme` |
| `visualViewport` keyboard inset | `KeyboardAvoidingView` with `behavior="padding"` on **both** platforms (edge-to-edge Android doesn't resize for the keyboard) |
| `FormScreen` portal, `Sheet` | Router screens with `presentation: 'formSheet'` / `'modal'` |
| `PullToRefresh` | `RefreshControl` on `ScrollView` / `FlatList` |
| Swipe-to-delete rows | `ReanimatedSwipeable` (gesture-handler, already installed) |
| CSS / View Transitions motion | `react-native-reanimated` (already installed) |
| `lucide-react` + `icons.tsx` SVGs | `expo-symbols` (installed); check Android support in v58 docs |
| Geologica `.woff2` | Geologica `.ttf` via `expo-font` (RN can't load woff2) |
| Div-height bar charts | Plain `View`s with computed heights, no chart library |
| `<input type=range>` / `Slider` | `@expo/ui` slider if it fits, otherwise community slider |
| Date inputs (bill form) | `@expo/ui` date picker; check v58 docs |

### 2.5 Target route map

```
src/app/
  _layout.tsx              root Stack; auth guard (Stack.Protected), fonts, theme
  sign-in.tsx              bridge address + username + password
  (tabs)/_layout.tsx       NativeTabs: Aircon · House · Activity · Settings
  (tabs)/aircon/           now (index), timers/, timers/[id] (formSheet; id = "new" | number)
  (tabs)/house/            groceries, dinner (week), dinner/dishes
  (tabs)/activity/         rooms, timeline, costs
  (tabs)/settings/         general (index), plan, plan/[billId] (formSheet)
```

Each tab is a Stack. Its segments (Now / Timers, Groceries / Dinner, …) are
switched by a segmented control at the top, as in the web UI. The route names
match the web sections (`#/activity/costs` → `/activity/costs`), so deep links
carry over.

Non-route code lives outside `src/app/`: `src/lib/` (api, types, helpers),
`src/hooks/`, `src/components/` (+ `ui/`), `src/constants/theme.ts`.

---

## 3. Modules

The order puts daily aircon use on the phone as early as possible (M0–M3).
After that come the remaining House and Activity features. Each module lists
the source to port, the endpoints it uses, and what "done" means.

### M0 — Foundation
- Remove template demo screens and assets (`explore.tsx`, hint rows, web badge, animated icon).
- Theme: port the light/dark tokens from `web/src/index.css`, plus the climate
  tints from `web/src/climateTheme.ts`, into `src/constants/theme.ts`. Add
  Geologica TTF via `expo-font`.
- Tab shell: `NativeTabs` with the 4 tabs and empty placeholder screens.
- UI kit, **only what M1–M2 need first**: Button, Card, Field/Input, Alert,
  Toast, Skeleton. Port the rest (Chip, Switch, Sheet, EmptyState, Disclosure,
  Slider) when a module needs it.
- App name, scheme and icon placeholders in `app.json` (see open questions).

**Done when:** the app launches on iOS and Android with four themed tabs, in
light and dark mode. Lint and typecheck are clean.

**Notes (built 2026-10-31):**
- Tokens live in `src/constants/theme.ts` (`Colors`, `Type`, `Radius`,
  climate tints), icons in `src/constants/icons.ts`, and the kit in
  `src/components/ui/`.
- Geologica comes from `@expo-google-fonts/geologica`: six static weights
  (200–700) registered as one `Geologica` family via SDK 58's multi-face
  `useFonts`, so `fontWeight` picks the face.
- `expo-symbols` covers iOS (SF Symbols) and Android/web (Material Symbols) in
  SDK 58. Tab icons use NativeTabs' `sf` / `md` props.
- Removed the unused `expo-device`, `expo-image` and `expo-web-browser`. Kept
  `expo-glass-effect`, because expo-router depends on it.
- `web.output` is now `single`: server rendering caused hydration mismatches
  (wrong colour scheme) in the dev preview, and nothing here needs it.
- Reanimated entering animations are skipped on web (they leave views
  `position: absolute`). See `src/components/ui/motion.ts`.
- Android tabs use `labelVisibilityMode="labeled"`, so every tab shows its
  label as on the web (Material hides unselected labels by default).
- Verified on the Android emulator in Expo Go 58.0.5: tabs and navigation, the
  header, placeholders, and every kit component in light and dark mode
  (including Material icons, shadows, and the toast's exit animation). Also
  checked in the web preview. **Not verified on iOS:** this machine has no
  simulator, so large titles and the iOS 26 glass tab bar are unchecked.

### M1 — Connect & sign in
- Source: `Login.tsx`, `authApi.ts`, the session check in `App.tsx`.
- Endpoints: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `GET /healthz`.
- Sign-in screen: bridge address with a reachability check (`/healthz`),
  username and password. Show the server's error text, including the 429
  lockout message.
- Auth context: `undefined` = checking (skeleton), `null` = signed out (guarded
  routes). Any 401 drops the user to sign-in.
- Settings tab gets a minimal Account card with Sign out.
- **Run the cookie/WebSocket spike from §2.2 and record the result here.**

**Done when:** you can sign in, survive an app restart and sign out. A wrong
password and a lockout show the server's message.

**Notes (built 2026-10-31):**
- `src/lib/api.ts` holds `request()` (base URL, 15 s timeout, 401 → sign
  out, `{ error }` → message) and `authApi`. `src/lib/auth.tsx` holds
  `AuthProvider`, `useAuth` and `useUser`. The bridge address is in
  `expo-secure-store` and is stored only after a sign-in succeeds.
- The launch session check runs under the splash screen rather than a
  skeleton, so the app opens directly on the right screen. `/api/auth/me` times
  out after 5 s, and if the bridge can't be reached, sign-in says so.
- Sign-in checks `/healthz` before sending a password. Root stack guards use
  `Stack.Protected`, and the swap has no animation, as on the web.
- The password field is uncontrolled. On Android, echoing `value` back into a
  secure field swapped fast keystrokes, so the wrong password was sent.
- Tested on the Android emulator against a throwaway local bridge (copy of the
  bridge code, scratch DB, no aircon): wrong password, sign-in, force-stop
  and relaunch, the `/ws` spike, sign-out, a session revoked from the bridge
  CLI, and an unreachable bridge.
- Testing gotcha: adb key events make Gboard act as a hardware keyboard. Its
  Enter key left the incoming tab part-faded, which a person tapping Gboard's
  own Go key never triggered. Use on-screen keys when testing forms.

### M2 — Aircon · Now
- Source: `AirconNow.tsx` (largest screen), `useSystemState.ts`, `api.ts`,
  `zones.ts`, `climateTheme.ts`, `Layout.tsx` (`ConnectionPill`).
- Endpoints: `GET /api/state`, `/ws`, `POST /api/ac/:id/{power,mode,fan,setpoint}`,
  `POST /api/zones/:id/{power,percentage,setpoint}`, `PATCH /api/account/preferences`,
  `GET /api/schedules` (the "next timer" line only).
- Keep the optimistic patch layering exactly as it is. A poll landing mid-command
  must not snap a control back.
- Debounce the setpoint and damper sliders (`useDebouncedValue`, 350 ms).
- The page background follows the AC mode (climate theme).
- Show the connection pill and a toast with the "didn't accept X, so it's been
  set back" wording.
- AppState handling for the socket (§2.3).

**Done when:** on a real phone against the real bridge, power, mode, fan,
setpoint, zone power and damper all work. A change made from the wall console
shows up live. Background/foreground reconnects.

**Notes (built 2026-10-31):**
- Code: `src/lib/aircon.ts` (types, commands, `subscribe`),
  `src/hooks/use-system-state.ts` (the web's optimistic layering and debounce,
  unchanged in logic), `src/components/aircon-now.tsx` (the UI), and
  `src/app/(tabs)/aircon/index.tsx` (wiring, header pill, refusal toast).
- Climate colours use a `ThemeOverride` context in `src/hooks/use-theme.ts`, the
  native equivalent of the web's `climateVars`.
- Room switches are RN `Switch`. Dampers are the `@expo/ui` universal `Slider`
  (native, in Expo Go), tinted through its `Host`'s `seedColor`.
- The default room is kept in the auth context (`selectRoom`). On first use
  it's saved as the first room, as on the web; M3's room picker reuses this.
- **Tested against the real AirTouch** (found by the bridge's discovery at
  192.168.68.54) through a throwaway bridge with a scratch DB and a test
  account; the household DB was not touched. Covered: real state rendering, a
  change pushed from another client appearing live, a fan command from the app
  reaching the console, background → change → resume refetch with the socket
  reconnected, the refusal toast and revert, and the default room saved. The
  unit was off and left exactly as found.
- **Hardware run, approved (2026-10-31):** from the app, power on (brought up
  the default room, Hall), mode Cool → Fan, set point 25 → 26, and Hall's
  damper dragged to 75% (it snapped to the 5% steps). Each change was
  confirmed on the console and reflected in the UI, including the climate
  re-tint. Everything was then restored, and the console's final state matched
  the state recorded beforehand on every field. Room switches were exercised
  through power on and off; the switch itself wasn't toggled on hardware.
- Deferred polish: the web's motion (rolling digits, power ring, icon pop,
  sliding segment thumb, the colour cross-fade between modes), tinting the tab
  bar with the climate, and making the timer line open Timers (M4).
- As on the web, the pill shows the bridge's view of the console, so it stays
  "Live" if the phone itself loses the bridge. Commands then fail with
  "Couldn't reach the bridge".

### M3 — Settings · General
- Source: `Settings.tsx`, `useTheme.ts`, `ThemeProvider.tsx`.
- Endpoints: `GET /api/health`, `GET /api/state`, `PATCH /api/account/preferences`.
- Account (username, sign out), theme (system / light / dark, stored on the
  device), bridge status (connected, last update, console host, bridge
  address), default room picker.

**Done when:** all three web sections are present and the default room
persists on the bridge.

**Notes (built 2026-10-31):**
- Live state now comes from a `SystemStateProvider` around the tabs (the web's
  Dashboard), so Aircon and Settings share one socket and the default room is
  resolved and saved once.
- Theme: `src/lib/theme-preference.ts` stores the choice on the phone and
  applies it with `Appearance.setColorScheme`, which re-themes native views
  too. It's applied before the first frame, so there's no flash. `@expo/ui`
  hosts are given the app's scheme, since they otherwise follow the device's.
- The default room uses the `@expo/ui` universal `Picker` (a native dropdown)
  at a fixed width, as on the web.
- Added a bridge **Address** row (on the phone you type it in yourself). The
  web's footer and Sign out are kept. There's no console-host row and no
  `/api/health` call, because the web doesn't show them either.
- Tested on the Android emulator against the real console: the readouts
  (Connected, last update ticking, 5 rooms, address), choosing a default room
  (saved on the bridge, then restored), Dark applied at once and kept across a
  cold relaunch, then System.

### M4 — Aircon · Timers
- Source: `Schedules.tsx` (~960 lines: list + form + run history), `schedulesApi.ts`.
- Endpoints: `GET/POST /api/schedules`, `PATCH/DELETE /api/schedules/:id`,
  `POST /api/schedules/:id/run`, `GET /api/schedules/:id/runs`.
- List with enable switch and next-run text. Create/edit in a formSheet:
  name, start-day bitmask (presets: every day / weekdays / weekends), start and
  stop time, rooms, and optional mode, fan and setpoint limited to the unit's
  ability. Delete with confirm. Start now / Stop now, and run history.

**Done when:** a timer created on the phone fires on the bridge. Edit, delete
and run-now all match the web.

**Notes (built 2026-10-31):**
- Routes: `/aircon` (Now) and `/aircon/timers` are sections of the Aircon
  stack, switched by a `Segments` control (`src/components/segments.tsx`,
  sections in `src/constants/sections.ts`). They replace each other without
  animation. `/aircon/timers/[id]` (`new` or an id) is a modal form. Tapping
  the "next timer" line on Now opens Timers.
- `src/lib/schedules.ts` holds the web's whole API and helpers, including the
  overlap finder, ported unchanged. `TimerCard`, `TimerForm` and `Chip`/`Tag`
  follow the web's components.
- Times use `@react-native-community/datetimepicker` (in Expo Go): Android's
  clock dialog behind a field, iOS's compact inline picker. Deleting confirms
  with a native alert. Pull-to-refresh uses `RefreshControl`.
- Tested on the Android emulator through the test bridge (scratch DB; timers
  never fired): create (name, both times through the clock dialog, Weekdays,
  room, Fan, 22°), enable switch off and on, History, the overlap warning with
  a second timer, edit (prefilled; only the name changed on save), delete with
  confirmation, and validation blocking Save. Every write was checked against
  the bridge's stored timer. Both test timers were deleted afterwards.
- **Not tested:** Start now / Stop now. Start really turns the aircon on, so
  it's left for a run you approve.
- Not ported yet: the web's swipe-to-delete on a card (delete is in the
  form), and its list and history animations. The form opens inside the tab,
  so the tab bar stays visible under it; the web covers the whole app.
  The iOS time picker is unchecked.

### M5 — House · Groceries
- Source: `Checklist.tsx`, `checklistApi.ts`.
- Endpoints: `GET /api/checklists`, `GET/POST /api/checklists/:id/items`,
  `PATCH/DELETE /api/checklists/:id/items/:itemId`.
- Add item, tick/untick, swipe to delete, pull to refresh, refetch on focus
  and foreground so two people shopping stay in sync.

**Done when:** a change on one phone shows on another after refresh or refocus.

**Notes (built 2026-10-31):**
- House is a stack with Groceries (`/house`) and Dinner (`/house/dinner`,
  a placeholder until M6), switched by `Segments`.
- `src/lib/checklists.ts` holds the API, the list order and the "added"
  formatter. `src/components/grocery-row.tsx` is the row: a tick circle, the
  name, who added it and when, and swipe-left to Remove via `ReanimatedSwipeable`.
  Removing confirms with a native alert, and screen readers get Remove as an
  accessibility action. A `GestureHandlerRootView` now wraps the app.
- The web's logic is kept: optimistic ticking that reverts on refusal, no stale
  reload while a tick is in flight, pill counts in step, Indian Store first.
  Lists load from handlers rather than effects, which this project's React lint
  rules require.
- The list re-reads on screen focus, on return to the app, and on pull to
  refresh.
- Tested on the Android emulator through the test bridge: add (button and
  Done key), tick → Bought section and count, an item added by another client
  appearing on foreground, swipe → Remove → confirm, list switching, untick,
  and the Dinner segment. All test items were removed afterwards.
- Not ported: the web's row glide, tick-draw and list-slide animations.

### M6 — House · Dinner
- Source: `DineMenu.tsx`, `DishLibrary.tsx`, `dineApi.ts`.
- Endpoints: `GET/POST /api/dishes`, `PATCH/DELETE /api/dishes/:id`,
  `GET /api/dinner-menu[?week=]`, `PATCH /api/dinner-menu/:weekStart/days/:dayOffset`.
- **This week:** 7 days Mon–Sun, a dish picker plus notes (saved on blur). Show
  who set each, with dish and notes attributed separately. Page back through
  past weeks; forward stops at the current week.
- **Dishes:** add, rename, remove. A duplicate name shows the 409 message.
  Removed dishes show as `(removed)` in past weeks.

**Done when:** it matches the web for current and past weeks and for every
dish library action.

**Notes (built 2026-10-31):**
- Routes: `/house/dinner` (This week) and `/house/dinner/dishes`, a pushed
  screen so Back returns to the week, as the web's routed sub-view does. The
  This week | Dishes chips (`DinnerViews`) are kept on both.
- `src/lib/dine.ts` holds the web's API and date helpers, using fixed month and
  weekday names instead of `Intl`. "Today" uses the bridge's time zone through
  `Intl`, which Hermes supports; it falls back to the phone's date if a zone is
  missing.
- `DayCard` uses an `@expo/ui` `Picker` for the dish. A removed dish appears as
  "X (removed dish)" and choosing it does nothing, as on the web. The note
  saves when the field loses focus; drafts are keyed by week and day, so paging
  never carries one across.
- The week re-reads on screen focus (including coming back from Dishes), on
  return to the app, and on pull.
- Tested on the Android emulator through the test bridge:
  - dish library: add, a case-insensitive duplicate refused with the server's
    message, inline rename, and remove with confirmation
  - week: "Today" on the right day, picking a dish, a note with "Dish set
    by … · note by …", paging to last week and back via the label, and a dish
    removed elsewhere showing as "(removed dish)" with its note kept
  - all test data was cleared afterwards
- Fixed during testing: Android's default padding made the 38-pixel note field
  scroll its own text and swallow page drags.
- Not ported: the week-slide and meta-line swap animations.

### M7 — Activity · Rooms & Timeline
- Source: `Activity.tsx`, `ActivityRooms.tsx`, `ActivityTimeline.tsx`, `runtimeApi.ts`, `useRuntime.ts`.
- Endpoint: `GET /api/zone-runtime` (`preset=today|7d|30d|all`, `from`, `to`,
  `zone`, `limit`, `offset`).
- Per-room totals; a paginated session timeline with attribution (user /
  timer / external) and config snapshots. Add a "load more" or infinite list
  for pagination.

**Done when:** the totals and sessions match the web for each preset and room
filter.

**Notes (built 2026-10-31):**
- `RuntimeProvider` (`src/hooks/use-runtime.tsx`) wraps the Activity stack and
  owns the range and room filter, as the web's `Activity` does. Rooms
  (`/activity`) and Timeline (`/activity/timeline`) read the same period, and
  the filter is a modal route (`/activity/filter`) with a room picker and
  `DateField`s. Costs (`/activity/costs`) is a placeholder until M8.
- `src/lib/runtime.ts` holds the web's types and helpers. Day keys and clock
  times use `Intl` with the bridge's time zone via `formatToParts`, falling
  back to the phone's clock. "Today" is taken from when the data arrived,
  since lint rejects `Date.now()` during render.
- The timeline tag colours (`tag*` tokens) now live in `theme.ts`.
- Tested on the Android emulator against real history in the test bridge's
  database (the M2 hardware run, 7 Hall segments): Rooms totals, bars and
  "Who started it"; the Timeline's day heading, Adelaide clock times,
  modes and tags; the room and custom-date filter, carried across segments;
  "Show earlier" paging, checked with a temporary page size of 3; and Clear filters.
- **Web quirk, ported as is:** `groupByDay` folds consecutive same-actor
  segments of one room into a run, so a room repeats ("Hall, Hall, …"). It
  also takes a run's length as its longest segment, so the day total (1 m)
  can disagree with Rooms (2 m). Worth fixing in both apps together.
- Not ported: bar grow-in, rolling numbers, the sliding range thumb, and the
  room-reorder glide.

### M8 — Energy: Activity · Costs + Settings · Energy plan
- Source: `ActivityCosts.tsx`, `SettingsPlan.tsx`, `EnergyBillForm.tsx`, `energyApi.ts`.
- Endpoints: `GET /api/energy/costs`, `GET/POST /api/energy/bills`,
  `PUT/DELETE /api/energy/bills/:id`.
- Costs: monthly totals, forecast with the ±8% band, and the 3-hour runtime
  profile. Bars are plain Views. Refresh every 60 s while focused.
- Plan: bill list, then a bill form in a formSheet. The form has rate periods
  (add a second one), optional exact charges, discount, adjustments and
  date pickers. Money is integer cents, rates are dollars. Show the server's
  400 reconciliation errors inline.

**Done when:** a bill entered on the phone reconciles to the cent and shows up
in Costs exactly as on the web.

### M9 — Release
- EAS: `eas.json` with development / preview / production profiles, and a
  development build if any module added native code.
- Final name, icon and splash. Android cleartext / iOS local-network config if
  LAN `http` is supported (§2.1).
- Distribution: internal (TestFlight / internal track or ad-hoc APK), since this
  is a household app. OTA updates via `eas update`.

**Done when:** installed from a build (not Expo Go) on every household phone.

---

## 4. How each module is done

1. Read the source files listed for the module, and the bridge handlers for its
   endpoints (`src/server/http.ts`, `src/energy/http.ts`).
2. Check the SDK 58 docs (`https://docs.expo.dev/versions/v58.0.0/`) for any
   Expo/RN API touched. Install only with `npx expo install`.
3. Port: types and helpers first, then hooks, then screens.
4. `npx expo lint` and `npx tsc --noEmit` are clean.
5. Test on a real phone against the real bridge (the hardware matters: the
   console allows only a few connections, and its zones have no sensors).
6. Tick the module in the tracker below and commit.

## 5. Tracker

| # | Module | Status |
| --- | --- | --- |
| M0 | Foundation | ✅ (Android verified; iOS unchecked) |
| M1 | Connect & sign in | ✅ (Android verified; iOS unchecked) |
| M2 | Aircon · Now | ✅ on Android, tested on the real console (iOS unchecked) |
| M3 | Settings · General | ✅ (Android verified; iOS unchecked) |
| M4 | Aircon · Timers | ✅ on Android (run-now untested on hardware; iOS unchecked) |
| M5 | House · Groceries | ✅ (Android verified; iOS unchecked) |
| M6 | House · Dinner | ✅ (Android verified; iOS unchecked) |
| M7 | Activity · Rooms & Timeline | ✅ (Android verified; iOS unchecked) |
| M8 | Energy (Costs + Plan) | ☐ |
| M9 | Release | ☐ |

## 6. Open questions

1. **App name/identity:** keep `blueberry-mobile`, or rename to Home / HMS?
   This affects the bundle id, scheme and icon, and is cheapest to settle in M0.
2. **Bridge address:** Tailscale HTTPS only, or also plain LAN `http`? LAN
   adds the cleartext and local-network config work in M9.
3. **Design:** match the web's look exactly (the Bridge design, see
   `Home Aircon Bridge.html`), or use native iOS/Android controls where they
   differ?
4. **Push notifications** (e.g. "timer failed", "bridge offline"): not in the
   web app, so out of scope unless wanted. Adding them would need bridge changes.

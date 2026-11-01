# Blueberry Play Store promotional graphics

Created 1 November 2026 with the built-in image generation tool, using the app's
blue palette and features verified in the source and store setup guide.

| File | Dimensions | Purpose |
| --- | --- | --- |
| `feature-graphic.png` | 1024 × 500 | Play Console feature graphic |
| `01-aircon.png` | 1080 × 1920 | Aircon promotional infographic |
| `02-household.png` | 1080 × 1920 | Groceries and dinner promotional infographic |
| `03-energy.png` | 1080 × 1920 | Runtime and electricity promotional infographic |

All delivery files are opaque 24-bit RGB PNGs. The banner matches Google's
[feature graphic specification](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en).

The portrait cards are conceptual illustrations, not captured app screens.
They do not replace the actual screenshots needed for a complete store listing.
The graphics do not imply public registration; each portrait notes the household
server requirement. No files have been uploaded to Play Console.

## App screenshots

`screenshots/` holds eight captures of the real app, 1080 × 1920 opaque RGB PNGs,
for the Play Console phone screenshots slot. Taken 1 November 2026 on the Android
emulator in Expo Go, against a local fake bridge with made-up rooms, people, dishes
and bills, so no household data appears. The status bar uses Android's demo mode.

## Alt text

- Feature: Blueberry brings aircon, groceries, dinner and energy together, illustrated by a blue-accented miniature home.
- Aircon: Control individual rooms, adjust temperature and fan, and set recurring aircon timers with Blueberry.
- Household: Share a grocery list, plan weekly dinners and keep favourite dishes together with Blueberry.
- Energy: Explore room runtime, track electricity costs and see a bill-based forecast with Blueberry.

## Sources and export

The exact generation prompts are in `generation-prompts.json`. Generated masters
are saved in `originals/`. Re-export with `node scripts/export-play-store.cjs`
from the project root. Exporting only normalizes dimensions and RGB encoding;
it does not change the generated artwork or wording.

`blueberry-play-store-graphics.zip` contains the four delivery PNGs and this guide.

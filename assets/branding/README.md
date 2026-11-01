# Blueberry app icon

Artwork created with the built-in image generation tool. The transparent master is
`blueberry-source.png`. Platform exports live in `../images/`:

- `blueberry-icon.png`: 1024×1024 opaque RGB PNG for iOS and legacy Android.
- `blueberry-play-store.png`: 512×512 opaque PNG for the Play Store listing.
- `blueberry-adaptive-foreground.png`: 1024×1024 transparent Android layer.
- `blueberry-adaptive-monochrome.png`: matching white alpha mask for themed icons.
- `blueberry-favicon.png`: 64×64 opaque web favicon.
- `blueberry-splash.png`: 1024×1024 transparent splash artwork for light and dark backgrounds.

The sign-in screen uses `blueberry-icon.png`; Expo config references the platform,
splash, and web assets directly.

The Android background color is #DCEBF5. Foreground artwork is centered at 530px
high, within the central adaptive safe area. iOS corner masking is applied by the
OS. Re-export using `node scripts/export-icons.cjs` (existing Expo image tooling;
no additional dependencies). Build and install a new native binary to see launcher
icon changes; an OTA update does not replace installed native launcher icons.

Generation prompt:

> Create a premium app logo foreground for Blueberry, a calm household management mobile app. Single iconic blueberry with a subtle house-shaped cutout at its center, joining home and blueberry in one memorable silhouette. Rounded plump berry body in rich cobalt #1c64a6 with subtle dimensional blue shading, small elegant two-leaf crown in lighter blue (not green). Home cutout is genuinely transparent negative space with a simple pitched roof and rounded doorway, readable at tiny sizes. Sophisticated minimal soft-sculpted vector-like design, strong clean edges, no outlines, no text, no lettering, no detached decorations, no drop shadow outside silhouette, no background tile, no rounded square. Centered straight-on, symmetrical balance. Transparent background. Square 1024x1024 canvas, isolated symbol occupies approximately central 62 percent of width and height. This is a production app icon asset, not a mockup or presentation.

References: [Expo SDK 58 app config](https://docs.expo.dev/versions/v58.0.0/config/app/),
[Expo icon guide](https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/),
[Android adaptive icons](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive).

// Platform exports from the generated artwork; uses Expo's existing image tooling.
const path = require('node:path');
const fs = require('node:fs/promises');
const { PNG } = require('pngjs');
const Jimp = require(require.resolve('jimp-compact', {
  paths: [require.resolve('@expo/image-utils')],
}));
const root = path.resolve(__dirname, '..');

async function main() {
  const source = await Jimp.read(path.join(root, 'assets/branding/blueberry-source.png'));
  let left = source.bitmap.width, top = source.bitmap.height, right = 0, bottom = 0;
  source.scan(0, 0, source.bitmap.width, source.bitmap.height, (x, y, i) => {
    if (source.bitmap.data[i + 3] > 8) {
      left = Math.min(left, x); top = Math.min(top, y);
      right = Math.max(right, x); bottom = Math.max(bottom, y);
    }
  });
  const mark = source.clone().crop(left, top, right - left + 1, bottom - top + 1);
  const save = (img, name, opaque = false) => fs.writeFile(
    path.join(root, 'assets/images', name),
    PNG.sync.write(img.bitmap, { colorType: opaque ? 2 : 6, inputHasAlpha: true }),
  );
  function centered(size, height, background) {
    const layer = mark.clone().resize(Jimp.AUTO, height);
    return new Jimp(size, size, background).composite(layer,
      Math.round((size - layer.bitmap.width) / 2), Math.round((size - height) / 2));
  }
  // iOS is full-bleed RGB, with platform-applied corner masking.
  const icon = centered(1024, 760, '#DCEBF5');
  await save(icon, 'blueberry-icon.png', true);
  await save(icon.clone().resize(512, 512), 'blueberry-play-store.png', true);
  await save(icon.clone().resize(64, 64), 'blueberry-favicon.png', true);
  await save(centered(1024, 900, 0x00000000), 'blueberry-splash.png');
  // Artwork stays inside the central 66/108 adaptive icon safe area.
  const foreground = centered(1024, 530, 0x00000000);
  await save(foreground, 'blueberry-adaptive-foreground.png');
  const mono = foreground.clone();
  mono.scan(0, 0, 1024, 1024, (_x, _y, i) => {
    mono.bitmap.data[i] = 255;
    mono.bitmap.data[i + 1] = 255;
    mono.bitmap.data[i + 2] = 255;
  });
  await save(mono, 'blueberry-adaptive-monochrome.png');
  console.log('Exported iOS, Android adaptive, monochrome, Play Store, favicon, and splash assets.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });

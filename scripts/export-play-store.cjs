// Export generated promotional artwork at the store delivery dimensions.
const fs = require('node:fs/promises');
const path = require('node:path');
const { PNG } = require('pngjs');
const Jimp = require(require.resolve('jimp-compact', {
  paths: [require.resolve('@expo/image-utils')],
}));

async function main() {
  const destination = path.resolve(__dirname, '../assets/play-store');
  const specs = JSON.parse(await fs.readFile(path.join(destination, 'generation-prompts.json'), 'utf8'));
  for (const spec of specs) {
    const sourcePath = path.join(destination, 'originals', `${spec.file}.png`);
    await fs.mkdir(path.dirname(sourcePath), { recursive: true });
    try { await fs.access(sourcePath); }
    catch { await fs.copyFile(spec.source, sourcePath); }
    const artwork = await Jimp.read(sourcePath);
    // The generated ratios are very close to target; contain avoids trimming copy.
    artwork.background(0xdcebf5ff).contain(spec.width, spec.height);
    const bytes = PNG.sync.write(artwork.bitmap, { colorType: 2, inputHasAlpha: true });
    const outputPath = path.join(destination, `${spec.file}.png`);
    await fs.writeFile(outputPath, bytes);
    const check = PNG.sync.read(bytes);
    if (check.width !== spec.width || check.height !== spec.height || bytes[25] !== 2) {
      throw new Error(`Invalid export: ${spec.file}`);
    }
    console.log(`${spec.file}.png: ${check.width}x${check.height}, RGB PNG, ${bytes.length} bytes`);
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });

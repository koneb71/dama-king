import sharp from 'sharp';

const input = process.argv[2] ?? 'public/og-image.svg';
const output = process.argv[3] ?? 'public/og-image.png';

// Standard social/thumbnail size.
const width = Number(process.env.OG_WIDTH ?? 1200);
const height = Number(process.env.OG_HEIGHT ?? 630);

async function main() {
  await sharp(input, { density: 300 })
    .resize(width, height, { fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toFile(output);

  // eslint-disable-next-line no-console
  console.log(`Wrote ${output} (${width}x${height}) from ${input}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});


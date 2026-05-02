import sharp from 'sharp';

const VARIANTS = [
  { name: 'thumb', width: 400, avifQ: 60, webpQ: 75 },
  { name: 'medium', width: 1200, avifQ: 70, webpQ: 80 },
  { name: 'full', width: 2400, avifQ: 75, webpQ: 85 },
];

export async function generateVariants(filePath) {
  const src = sharp(filePath, { failOn: 'truncated' });
  const meta = await src.clone().rotate().metadata();
  const width = meta.width;
  const height = meta.height;

  const dominant = await getDominantColor(src.clone());

  const outputs = [];
  for (const v of VARIANTS) {
    const targetWidth = Math.min(v.width, width);
    const base = src.clone().rotate().resize({ width: targetWidth, withoutEnlargement: true });
    const avif = await base.clone().avif({ quality: v.avifQ, effort: 4 }).toBuffer();
    const webp = await base.clone().webp({ quality: v.webpQ }).toBuffer();
    outputs.push({ key: `${v.name}.avif`, body: avif, contentType: 'image/avif' });
    outputs.push({ key: `${v.name}.webp`, body: webp, contentType: 'image/webp' });
  }

  return { width, height, dominant, outputs };
}

async function getDominantColor(img) {
  const { dominant } = await img.stats();
  const { r, g, b } = dominant;
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;
}

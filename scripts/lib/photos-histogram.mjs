/**
 * Compute a 128-bin per-channel histogram (R/G/B/Luminance) from an image,
 * matching Afilmory's compression scheme so the detail page can render it
 * in Apple-style.
 *
 * Pixel sampling: image is resized to 800px wide first — histogram is a
 * statistical summary, so the downsample doesn't change the shape but
 * cuts decode + bucket time roughly 9x for a 2400px source.
 */
import sharp from 'sharp';

const SAMPLE_WIDTH = 800;

function compress256To128(channel) {
  const out = new Array(128).fill(0);
  for (let i = 0; i < 256; i++) out[Math.floor(i / 2)] += channel[i];
  return out;
}

export async function computeHistogram(filePath) {
  const { data, info } = await sharp(filePath)
    .resize({ width: SAMPLE_WIDTH, withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const r = new Array(256).fill(0);
  const g = new Array(256).fill(0);
  const b = new Array(256).fill(0);
  const luma = new Array(256).fill(0);

  const stride = info.channels; // 3 (RGB) after removeAlpha
  for (let i = 0; i < data.length; i += stride) {
    const R = data[i];
    const G = data[i + 1];
    const B = data[i + 2];
    r[R]++;
    g[G]++;
    b[B]++;
    luma[Math.round(0.2126 * R + 0.7152 * G + 0.0722 * B)]++;
  }

  return {
    red: compress256To128(r),
    green: compress256To128(g),
    blue: compress256To128(b),
    luminance: compress256To128(luma),
  };
}

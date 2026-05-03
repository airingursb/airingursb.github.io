/**
 * Per-photo Open Graph share card (1200×630 PNG).
 *
 * Visual: photo cover-cropped to 16:9 as background; EXIF line top-left
 * + ursb.me top-right; date bottom-left + title-or-place bottom-right;
 * subtle dark gradients top + bottom for legibility on bright shots.
 *
 * Runs locally during sync-photos so build-time stays fast and the OG
 * file is uploaded to R2 alongside thumb/medium/full variants.
 */
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONT_DIR = path.resolve(__dirname, '../../src/assets/fonts');

let _fonts = null;

async function getFonts() {
  if (!_fonts) {
    const [bold, regular, mono] = await Promise.all([
      fs.readFile(path.join(FONT_DIR, 'NotoSansSC-Bold.ttf')),
      fs.readFile(path.join(FONT_DIR, 'NotoSansSC-Regular.ttf')),
      fs.readFile(path.join(FONT_DIR, 'JetBrainsMono-Medium.ttf')),
    ]);
    _fonts = [
      { name: 'Noto Sans SC', data: bold, weight: 700, style: 'normal' },
      { name: 'Noto Sans SC', data: regular, weight: 400, style: 'normal' },
      { name: 'JetBrains Mono', data: mono, weight: 500, style: 'normal' },
    ];
  }
  return _fonts;
}

// "21 MAR 26 11:22AM" — UTC for cross-environment stability.
function formatTakenAt(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = months[d.getUTCMonth()];
  const year = String(d.getUTCFullYear()).slice(-2);
  let h = d.getUTCHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  return `${day} ${month} ${year} ${h}:${min}${ampm}`;
}

function buildExifLine(exif) {
  if (!exif) return '';
  const cameraShort = (exif.camera || '').replace(/^\S+\s+/, '');
  const bits = [
    cameraShort,
    exif.focalLength,
    exif.aperture ? `f/${String(exif.aperture).replace(/^f\//i, '')}` : null,
    exif.iso != null ? `ISO ${exif.iso}` : null,
  ].filter(Boolean);
  return bits.join('  ');
}

function buildPlaceText(place) {
  if (!place?.city) return '';
  if (place.country && place.country !== place.city) return `${place.city}, ${place.country}`;
  return place.city;
}

/**
 * @param {object} args
 * @param {string} args.filePath  Local path to a sharp-decodable image (JPEG after HEIC transcode)
 * @param {object} args.exif      normalizeExif() output
 * @param {string} [args.takenAt]
 * @param {string} [args.title]
 * @param {object} [args.place]
 * @returns {Promise<Buffer>} PNG buffer
 */
export async function generateOG({ filePath, exif, takenAt, title, place }) {
  const cropped = await sharp(filePath)
    .rotate()
    .resize(1200, 630, { fit: 'cover', position: 'center' })
    .jpeg({ quality: 85 })
    .toBuffer();
  const bgDataUrl = `data:image/jpeg;base64,${cropped.toString('base64')}`;

  const exifLine = buildExifLine(exif);
  const dateStr = formatTakenAt(takenAt);
  const placeStr = buildPlaceText(place);
  const bottomRight = title || placeStr;

  const fonts = await getFonts();

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          backgroundColor: '#000',
          fontFamily: 'JetBrains Mono',
        },
        children: [
          {
            type: 'img',
            props: {
              src: bgDataUrl,
              width: 1200,
              height: 630,
              style: { position: 'absolute', top: 0, left: 0, width: '1200px', height: '630px', objectFit: 'cover' },
            },
          },
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute', top: 0, left: 0,
                width: '100%', height: '120px',
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.65), rgba(0,0,0,0))',
                display: 'flex',
              },
              children: '',
            },
          },
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute', bottom: 0, left: 0,
                width: '100%', height: '120px',
                background: 'linear-gradient(to top, rgba(0,0,0,0.7), rgba(0,0,0,0))',
                display: 'flex',
              },
            },
          },
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute', top: '36px', left: '48px',
                color: '#fff', fontSize: '28px', fontFamily: 'JetBrains Mono',
                letterSpacing: '0.02em',
                textShadow: '0 1px 4px rgba(0,0,0,0.5)',
                display: 'flex',
              },
              children: exifLine,
            },
          },
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute', top: '36px', right: '48px',
                color: 'rgba(255,255,255,0.85)', fontSize: '24px', fontFamily: 'JetBrains Mono',
                letterSpacing: '0.04em',
                textShadow: '0 1px 4px rgba(0,0,0,0.5)',
                display: 'flex',
              },
              children: 'ursb.me',
            },
          },
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute', bottom: '38px', left: '48px',
                color: '#fff', fontSize: '26px', fontFamily: 'JetBrains Mono',
                letterSpacing: '0.04em',
                textShadow: '0 1px 4px rgba(0,0,0,0.6)',
                display: 'flex',
              },
              children: dateStr,
            },
          },
          ...(bottomRight
            ? [{
                type: 'div',
                props: {
                  style: {
                    position: 'absolute', bottom: '38px', right: '48px',
                    color: '#fff', fontSize: '24px', fontFamily: 'Noto Sans SC',
                    fontWeight: 500, letterSpacing: '0.02em',
                    textShadow: '0 1px 4px rgba(0,0,0,0.6)',
                    display: 'flex', maxWidth: '600px',
                  },
                  children: bottomRight,
                },
              }]
            : []),
        ],
      },
    },
    { width: 1200, height: 630, fonts },
  );

  // resvg only outputs PNG; transcode to JPEG for ~4x smaller payload and
  // wider crawler compatibility (notably WeChat, which is finicky with
  // larger PNGs on flaky CN routes).
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
  return await sharp(png).jpeg({ quality: 85, mozjpeg: true }).toBuffer();
}

// Stable hash of the inputs that affect OG output. Lets sync skip
// regeneration when nothing visible has changed (binary unchanged AND
// title/place/EXIF still the same).
export function computeOgHash({ sourceHash, title, place, exif, takenAt }) {
  const payload = JSON.stringify({
    sourceHash: sourceHash || '',
    title: title || '',
    place: place ? { city: place.city || '', country: place.country || '' } : null,
    exif: exif
      ? {
          camera: exif.camera || '',
          focalLength: exif.focalLength || '',
          aperture: exif.aperture || '',
          iso: exif.iso ?? null,
        }
      : null,
    takenAt: takenAt || '',
  });
  // 12-char fnv-1a-ish; we only need stable inequality detection, not crypto.
  let h = 2166136261;
  for (let i = 0; i < payload.length; i++) {
    h ^= payload.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

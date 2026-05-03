/**
 * Per-album Open Graph share card (1200×630 JPEG).
 *
 * Visual: a stack of up to 3 Polaroid-framed photos floating on a blurred,
 * dimmed cover-photo background. Right-side text block carries the album
 * tag, big title, count + date range, and Airing/ursb.me branding.
 *
 * The "stack of photos with white frames" reads instantly as "physical album"
 * — same mental model as iOS Photos albums, scrapbooks, and contact sheets.
 * It deliberately differs from the per-photo OG (which is a single bleed
 * photo) so that an album link feels distinct from a single-photo link.
 */
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONT_DIR = path.resolve(__dirname, '../../src/assets/fonts');

// Bump when the visual layout changes so existing OG cards regen even when
// the underlying inputs (name, count, covers) are identical.
const LAYOUT_VERSION = 'v2-polaroid-r3';

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

const W = 1200;
const H = 630;

// Encode an image file as a sharp-decodable buffer → cover-cropped JPEG → data URL.
async function toDataUrl(buf) {
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}

async function makePolaroidImage(filePath, size) {
  return await sharp(filePath)
    .rotate()
    .resize(size, size, { fit: 'cover', position: 'center' })
    .jpeg({ quality: 82 })
    .toBuffer();
}

async function makeBlurredBg(filePath) {
  return await sharp(filePath)
    .rotate()
    .resize(W, H, { fit: 'cover', position: 'center' })
    .blur(40)
    .modulate({ brightness: 0.45, saturation: 1.1 })
    .jpeg({ quality: 70 })
    .toBuffer();
}

function formatRange(earliest, latest) {
  const fmt = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  };
  const a = fmt(earliest);
  const b = fmt(latest);
  if (!a && !b) return '';
  if (!a) return b;
  if (!b) return a;
  return a === b ? a : `${a} – ${b}`;
}

/**
 * @param {object} args
 * @param {string} args.name
 * @param {number} args.count
 * @param {string} [args.earliest]
 * @param {string} [args.latest]
 * @param {string[]} args.coverFilePaths Up to 3 local sharp-decodable image paths
 * @returns {Promise<Buffer>} JPEG buffer
 */
export async function generateAlbumOG({ name, count, earliest, latest, coverFilePaths }) {
  const covers = (coverFilePaths || []).slice(0, 3);
  if (covers.length === 0) throw new Error('generateAlbumOG: at least one cover required');

  // Build assets in parallel: blurred BG + 3 polaroid photos
  const [bgBuf, ...polaroidBufs] = await Promise.all([
    makeBlurredBg(covers[0]),
    ...covers.map((fp) => makePolaroidImage(fp, 360)),
  ]);

  const bgUrl = await toDataUrl(bgBuf);
  const polaroidUrls = await Promise.all(polaroidBufs.map(toDataUrl));

  // Stack geometry — left half of canvas, slightly above vertical center.
  // Each Polaroid: 320×320 photo + 14px white frame (top/L/R) + 44px bottom
  // (caption strip). Card outer 348×378.
  //
  // Placements are indexed by cover order: cover[0] is the newest photo and
  // sits on top (foreground); the older two flare out to the back-left and
  // back-right. `z` controls paint order.
  // Stack lives in the left ~45% of the canvas; text block in the right ~50%.
  // Card outer is 348×378. Right-most cell edge after rotation must stay to
  // the LEFT of x≈540 so it doesn't crash into the "ALBUM" caption.
  const stackCenterX = 285;
  const stackCenterY = 320;
  const photoSize = 300;
  const cardW = photoSize + 14 * 2;            // 328
  const cardH = photoSize + 14 + 44;           // 358
  const placementsByCoverIndex = [
    { dx:    0, dy:  15, rot: -2, z: 10 }, // cover[0] foreground
    { dx: -110, dy:  -8, rot: -12, z: 1 }, // cover[1] back-left
    { dx:   80, dy: -25, rot:   8, z: 5 }, // cover[2] back-right
  ];

  // Build placement list for the actual cover count and sort by z so
  // foreground renders last (painter's algorithm).
  const pairs = covers.map((_, i) => ({
    coverIndex: i,
    placement: placementsByCoverIndex[i],
  }));
  pairs.sort((a, b) => a.placement.z - b.placement.z);

  const polaroidNodes = pairs.map(({ coverIndex, placement }) => {
    const left = stackCenterX + placement.dx - cardW / 2;
    const top = stackCenterY + placement.dy - cardH / 2;
    return {
      type: 'div',
      props: {
        style: {
          position: 'absolute',
          left: `${left}px`,
          top: `${top}px`,
          width: `${cardW}px`,
          height: `${cardH}px`,
          background: '#fafafa',
          padding: '14px 14px 44px',
          boxShadow: '0 28px 60px rgba(0,0,0,0.6), 0 6px 14px rgba(0,0,0,0.4)',
          transform: `rotate(${placement.rot}deg)`,
          display: 'flex',
        },
        children: {
          type: 'img',
          props: {
            src: polaroidUrls[coverIndex],
            width: photoSize,
            height: photoSize,
            style: { width: `${photoSize}px`, height: `${photoSize}px`, objectFit: 'cover' },
          },
        },
      },
    };
  });

  const dateStr = formatRange(earliest, latest);
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
          backgroundColor: '#0a0a0a',
          fontFamily: 'Noto Sans SC',
        },
        children: [
          // Blurred photo background
          {
            type: 'img',
            props: {
              src: bgUrl,
              width: W,
              height: H,
              style: { position: 'absolute', top: 0, left: 0, width: `${W}px`, height: `${H}px`, objectFit: 'cover' },
            },
          },
          // Subtle dark vignette layer for legibility
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute', top: 0, left: 0,
                width: '100%', height: '100%',
                background: 'linear-gradient(135deg, rgba(0,0,0,0.55), rgba(0,0,0,0.25) 45%, rgba(0,0,0,0.7))',
                display: 'flex',
              },
              children: '',
            },
          },
          // Polaroid stack
          ...polaroidNodes,
          // Right text block. Title font size adapts to length so long names
          // don't wrap; we never go below 36px to keep the card legible.
          (() => {
            // crude but stable: assume average 30px per CJK char and 20px per ASCII
            // char at 56px. Scale font down if the line would exceed the available
            // width (~560px).
            const cjk = (name.match(/[一-鿿぀-ヿ가-힯]/g) || []).length;
            const ascii = name.length - cjk;
            const baseFont = 56;
            const estimated = cjk * (baseFont * 0.95) + ascii * (baseFont * 0.55);
            const maxWidth = 560;
            const titleFont = estimated > maxWidth
              ? Math.max(36, Math.floor(baseFont * (maxWidth / estimated)))
              : baseFont;
            return {
              type: 'div',
              props: {
                style: {
                  position: 'absolute',
                  top: '125px',
                  right: '50px',
                  width: '560px',
                  display: 'flex',
                  flexDirection: 'column',
                },
                children: [
                  {
                    type: 'div',
                    props: {
                      style: {
                        color: 'rgba(255,255,255,0.65)',
                        fontFamily: 'JetBrains Mono',
                        fontSize: '22px',
                        letterSpacing: '0.24em',
                        marginBottom: '24px',
                        display: 'flex',
                      },
                      children: 'ALBUM',
                    },
                  },
                  {
                    type: 'div',
                    props: {
                      style: {
                        color: '#fff',
                        fontFamily: 'Noto Sans SC',
                        fontWeight: 700,
                        fontSize: `${titleFont}px`,
                        lineHeight: 1.1,
                        letterSpacing: '-0.01em',
                        textShadow: '0 2px 12px rgba(0,0,0,0.5)',
                        marginBottom: '26px',
                        display: 'flex',
                      },
                      children: name,
                    },
                  },
                  {
                    type: 'div',
                    props: {
                      style: {
                        color: 'rgba(255,255,255,0.85)',
                        fontFamily: 'JetBrains Mono',
                        fontSize: '24px',
                        letterSpacing: '0.04em',
                        textShadow: '0 1px 6px rgba(0,0,0,0.5)',
                        display: 'flex',
                      },
                      children: `${count} ${count === 1 ? 'PHOTO' : 'PHOTOS'}${dateStr ? `  ·  ${dateStr}` : ''}`,
                    },
                  },
                ],
              },
            };
          })(),
          // Branding line: bottom-right
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                bottom: '36px',
                right: '60px',
                color: 'rgba(255,255,255,0.7)',
                fontFamily: 'Noto Sans SC',
                fontWeight: 400,
                fontSize: '22px',
                letterSpacing: '0.06em',
                textShadow: '0 1px 4px rgba(0,0,0,0.5)',
                display: 'flex',
              },
              children: 'Airing  ·  ursb.me',
            },
          },
        ],
      },
    },
    { width: W, height: H, fonts },
  );

  const png = new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng();
  return await sharp(png).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
}

// Stable hash of inputs that affect album OG output. LAYOUT_VERSION is folded
// in so that visual-only redesigns force a regen even when content is unchanged.
export function computeAlbumOgHash({ name, count, earliest, latest, coverHashes }) {
  const payload = JSON.stringify({
    v: LAYOUT_VERSION,
    name: name || '',
    count: count || 0,
    earliest: earliest || '',
    latest: latest || '',
    coverHashes: (coverHashes || []).slice(0, 3).map((h) => (h || '').slice(0, 16)),
  });
  let h = 2166136261;
  for (let i = 0; i < payload.length; i++) {
    h ^= payload.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

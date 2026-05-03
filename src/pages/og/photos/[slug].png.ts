import type { APIRoute, GetStaticPaths } from 'astro';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import fs from 'node:fs';
import photosData from '../../../data/photos.json';

const photos = photosData as Array<any>;

const notoSansSCBold = fs.readFileSync('src/assets/fonts/NotoSansSC-Bold.ttf');
const notoSansSCRegular = fs.readFileSync('src/assets/fonts/NotoSansSC-Regular.ttf');
const jetBrainsMono = fs.readFileSync('src/assets/fonts/JetBrainsMono-Medium.ttf');

// Sambecker-style date: "21 MAR 26 11:22AM"
// Renders in UTC so the OG image is timezone-stable across build environments
// (CI runs on UTC; local Macs may not). Photo takenAt timestamps already lost
// their original camera-local TZ in the sync pipeline, so UTC is the consistent
// choice and matches the share modal as rendered for users in UTC locales.
function formatTakenAt(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
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

function buildExifLine(p: any): string {
  const cameraShort = (p.exif?.camera || '').replace(/^\S+\s+/, ''); // drop make
  const bits = [
    cameraShort,
    p.exif?.focalLength,
    p.exif?.aperture ? `f/${p.exif.aperture.replace(/^f\//, '')}` : null,
    p.exif?.iso != null ? `ISO ${p.exif.iso}` : null,
  ].filter(Boolean);
  return bits.join('  ');
}

export const getStaticPaths: GetStaticPaths = async () => {
  return photos.map((p) => ({
    params: { slug: p.slug },
    props: { photo: p },
  }));
};

export const GET: APIRoute = async ({ props }) => {
  const { photo } = props as { photo: any };

  // Fetch the medium variant from R2 and cover-crop to 1200×630 JPEG.
  // We use jpeg (not webp) so resvg embeds it correctly inside the SVG.
  const sourceUrl = photo.variants?.medium?.webp || photo.variants?.full?.webp;
  if (!sourceUrl) {
    return new Response('no source variant', { status: 500 });
  }
  const fetched = await fetch(sourceUrl).then((r) => r.arrayBuffer());
  const cropped = await sharp(Buffer.from(fetched))
    .rotate()
    .resize(1200, 630, { fit: 'cover', position: 'center' })
    .jpeg({ quality: 85 })
    .toBuffer();
  const bgDataUrl = `data:image/jpeg;base64,${cropped.toString('base64')}`;

  const exifLine = buildExifLine(photo);
  const dateStr = formatTakenAt(photo.takenAt);
  const placeStr = photo.place?.city
    ? photo.place.country && photo.place.country !== photo.place.city
      ? `${photo.place.city}, ${photo.place.country}`
      : photo.place.city
    : '';

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
          // Photo background
          {
            type: 'img',
            props: {
              src: bgDataUrl,
              width: 1200,
              height: 630,
              style: { position: 'absolute', top: 0, left: 0, width: '1200px', height: '630px', objectFit: 'cover' },
            },
          },
          // Top dark gradient for legibility
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '120px',
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.65), rgba(0,0,0,0))',
                display: 'flex',
              },
              children: '',
            },
          },
          // Bottom dark gradient
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: '100%',
                height: '120px',
                background: 'linear-gradient(to top, rgba(0,0,0,0.7), rgba(0,0,0,0))',
                display: 'flex',
              },
            },
          },
          // Top-left: EXIF line
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                top: '36px',
                left: '48px',
                color: '#fff',
                fontSize: '28px',
                fontFamily: 'JetBrains Mono',
                letterSpacing: '0.02em',
                textShadow: '0 1px 4px rgba(0,0,0,0.5)',
                display: 'flex',
              },
              children: exifLine,
            },
          },
          // Top-right: ursb.me brand
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                top: '36px',
                right: '48px',
                color: 'rgba(255,255,255,0.85)',
                fontSize: '24px',
                fontFamily: 'JetBrains Mono',
                letterSpacing: '0.04em',
                textShadow: '0 1px 4px rgba(0,0,0,0.5)',
                display: 'flex',
              },
              children: 'ursb.me',
            },
          },
          // Bottom-left: date
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                bottom: '38px',
                left: '48px',
                color: '#fff',
                fontSize: '26px',
                fontFamily: 'JetBrains Mono',
                letterSpacing: '0.04em',
                textShadow: '0 1px 4px rgba(0,0,0,0.6)',
                display: 'flex',
              },
              children: dateStr,
            },
          },
          // Bottom-right: place (or title if no place)
          ...(placeStr || photo.title
            ? [{
                type: 'div',
                props: {
                  style: {
                    position: 'absolute',
                    bottom: '38px',
                    right: '48px',
                    color: '#fff',
                    fontSize: '24px',
                    fontFamily: 'Noto Sans SC',
                    fontWeight: 500,
                    letterSpacing: '0.02em',
                    textShadow: '0 1px 4px rgba(0,0,0,0.6)',
                    display: 'flex',
                    maxWidth: '600px',
                  },
                  children: photo.title || placeStr,
                },
              }]
            : []),
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Noto Sans SC', data: notoSansSCBold, weight: 700, style: 'normal' },
        { name: 'Noto Sans SC', data: notoSansSCRegular, weight: 400, style: 'normal' },
        { name: 'JetBrains Mono', data: jetBrainsMono, weight: 500, style: 'normal' },
      ],
    },
  );

  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } });
  const png = resvg.render().asPng();

  return new Response(png, {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
};

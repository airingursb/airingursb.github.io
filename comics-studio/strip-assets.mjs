// comics-studio/strip-assets.mjs
// Shared helpers for publish.mjs and replace.mjs: env loading, WebP encoding, R2 upload.
//
// Every strip version lives at strip/<rowId>/v<N>/ on R2:
//   strip.png  — the original, kept for archive and for og:image / Telegram previews
//   strip.webp — what the site serves (panels.url); ~1/8 the bytes of the PNG

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

export const WEBP_QUALITY = 85;

// Load KEY=VALUE lines from the first files that define them; real env wins.
export function loadEnv(files) {
  for (const f of files) {
    if (!existsSync(f)) continue;
    for (const line of readFileSync(f, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const eq = trimmed.indexOf('=');
      const k = trimmed.slice(0, eq).trim();
      const v = trimmed.slice(eq + 1).trim();
      if (!(k in process.env)) process.env[k] = v;
    }
  }
}

export function envFiles(studioDir, repoRoot) {
  return [
    resolve(studioDir, '.env'),
    resolve(repoRoot, 'services/blog-api/.env'),
    resolve(repoRoot, '.env'),
  ];
}

export function requireEnv(keys) {
  const missing = keys.filter(k => !process.env[k]);
  if (missing.length) {
    console.error('Missing env vars:', missing.join(', '));
    process.exit(1);
  }
}

// Same pixels, WebP container. No resize: strips are ~1254px and the detail page shows them large.
export async function encodeStripWebp(input) {
  const { data, info } = await sharp(input)
    .webp({ quality: WEBP_QUALITY, effort: 6 })
    .toBuffer({ resolveWithObject: true });
  return { body: data, width: info.width, height: info.height };
}

// "…/strip/<id>/v3/strip.webp" → 4. Unknown or missing URL → 1.
export function nextStripVersion(url) {
  const m = /\/v(\d+)\/strip\.(?:png|webp)(?:$|\?)/.exec(url || '');
  return m ? Number(m[1]) + 1 : 1;
}

export function stripKeys(rowId, version) {
  const dir = `strip/${rowId}/v${version}`;
  return { png: `${dir}/strip.png`, webp: `${dir}/strip.webp` };
}

export function publicUrl(key) {
  return `${process.env.R2_PUBLIC_BASE.replace(/\/$/, '')}/${key}`;
}

// Upload PNG + WebP for one strip version; returns the panels fields to store.
export async function uploadStripVersion({ r2, rowId, version, pngBytes }) {
  const { PutObjectCommand } = await import('@aws-sdk/client-s3');
  const keys = stripKeys(rowId, version);
  const webp = await encodeStripWebp(pngBytes);
  const put = (Key, Body, ContentType) => r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key,
    Body,
    ContentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }));
  await put(keys.png, pngBytes, 'image/png');
  await put(keys.webp, webp.body, 'image/webp');
  return {
    url: publicUrl(keys.webp),
    original: publicUrl(keys.png),
    width: webp.width,
    height: webp.height,
    bytes: { png: pngBytes.length, webp: webp.body.length },
  };
}

export async function createR2() {
  const { S3Client } = await import('@aws-sdk/client-s3');
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

// strip-r2.ts — R2 upload (S3-compatible). Single text-free strip image per comic.
// Path uses row id (stable from creation), not issue number (assigned only at approval).
import { S3Client, PutObjectCommand } from 'npm:@aws-sdk/client-s3@^3.1048.0';

let _r2: S3Client | null = null;
function r2(): S3Client {
  if (_r2) return _r2;
  const required = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_PUBLIC_BASE'];
  for (const k of required) if (!Deno.env.get(k)) throw new Error(`${k} not set`);
  _r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${Deno.env.get('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: Deno.env.get('R2_ACCESS_KEY_ID')!,
      secretAccessKey: Deno.env.get('R2_SECRET_ACCESS_KEY')!,
    },
  });
  return _r2;
}

export async function uploadStrip(args: { rowId: string; attempt: number; body: Uint8Array }): Promise<string> {
  const key = `strip/${args.rowId}/v${args.attempt}/strip.png`;
  await r2().send(new PutObjectCommand({
    Bucket: Deno.env.get('R2_BUCKET'),
    Key: key,
    Body: args.body,
    ContentType: 'image/png',
  }));
  const base = (Deno.env.get('R2_PUBLIC_BASE') || '').replace(/\/$/, '');
  return `${base}/${key}`;
}

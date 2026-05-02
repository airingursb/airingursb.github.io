import { S3Client, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'node:crypto';

let _client = null;
function client() {
  if (_client) return _client;
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error('Missing R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY in env');
  }
  _client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
  return _client;
}

function md5Hex(buf) {
  return crypto.createHash('md5').update(buf).digest('hex');
}

export async function uploadIfChanged({ key, body, contentType }) {
  const Bucket = process.env.R2_BUCKET;
  if (!Bucket) throw new Error('Missing R2_BUCKET in env');
  const c = client();
  const localHash = md5Hex(body);

  try {
    const head = await c.send(new HeadObjectCommand({ Bucket, Key: key }));
    const remoteEtag = (head.ETag || '').replace(/"/g, '');
    if (remoteEtag === localHash) {
      return { key, status: 'unchanged' };
    }
  } catch (err) {
    if (err.$metadata?.httpStatusCode !== 404) throw err;
  }

  await c.send(
    new PutObjectCommand({
      Bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );
  return { key, status: 'uploaded' };
}

export function publicUrl(key) {
  const base = process.env.R2_PUBLIC_BASE;
  if (!base) throw new Error('Missing R2_PUBLIC_BASE in env');
  return `${base.replace(/\/$/, '')}/${key}`;
}

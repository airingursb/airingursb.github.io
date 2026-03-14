import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Parse a .env file manually without any external dependency.
 * Lines starting with # are comments, blank lines are skipped.
 * Values may be optionally quoted with single or double quotes.
 */
function parseEnvFile(filePath) {
  let content;
  try {
    content = readFileSync(filePath, 'utf8');
  } catch {
    // No .env file — that's fine; env vars may already be set in the process.
    return {};
  }

  const result = {};
  for (const raw of content.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;

    const key = line.slice(0, eqIdx).trim();
    let value = line.slice(eqIdx + 1).trim();

    // Strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }
  return result;
}

// Load .env from the service root (one level up from lib/)
const envPath = resolve(__dirname, '..', '.env');
const envVars = parseEnvFile(envPath);

// Merge parsed file values into process.env (process.env wins if already set)
for (const [key, value] of Object.entries(envVars)) {
  if (!(key in process.env)) {
    process.env[key] = value;
  }
}

const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  hmacSecret: process.env.HMAC_SECRET ?? '',
  openclaw: {
    url: process.env.OPENCLAW_URL ?? '',
    token: process.env.OPENCLAW_TOKEN ?? '',
    agentId: process.env.OPENCLAW_AGENT_ID ?? '',
  },
  supabase: {
    url: process.env.SUPABASE_URL ?? '',
    serviceKey: process.env.SUPABASE_SERVICE_KEY ?? '',
  },
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
};

export default config;

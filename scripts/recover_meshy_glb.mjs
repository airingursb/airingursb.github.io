#!/usr/bin/env node
/**
 * Recover a GLB from a Meshy task that succeeded server-side but failed
 * to download locally. Usage:
 *   node scripts/recover_meshy_glb.mjs <task_id> <output_name>
 *   e.g. node scripts/recover_meshy_glb.mjs 019e54d9-... penguin
 */
import { writeFile, mkdir, readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = join(ROOT, 'public/grove3d/models')
const API = 'https://api.meshy.ai/openapi/v2/text-to-3d'

async function loadEnv() {
  const raw = await readFile(join(ROOT, '.env'), 'utf8')
  const o = {}
  for (const l of raw.split('\n')) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) o[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return o
}

async function downloadWithRetry(url, dest, attempts = 5) {
  for (let i = 1; i <= attempts; i++) {
    try {
      const r = await fetch(url)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const buf = Buffer.from(await r.arrayBuffer())
      await writeFile(dest, buf)
      return buf.length
    } catch (e) {
      console.log(`  attempt ${i}/${attempts} failed: ${e.message}`)
      if (i === attempts) throw e
      await new Promise(r => setTimeout(r, 2000 * i))
    }
  }
}

async function main() {
  const [taskId, name] = process.argv.slice(2)
  if (!taskId || !name) {
    console.error('Usage: node scripts/recover_meshy_glb.mjs <task_id> <output_name>')
    process.exit(1)
  }
  const env = await loadEnv()
  const key = env.MESHY_API_KEY || env.MESHY_AI_API_KEY
  await mkdir(OUT_DIR, { recursive: true })

  const res = await fetch(`${API}/${taskId}`, {
    headers: { Authorization: `Bearer ${key}` },
  })
  if (!res.ok) throw new Error(`task fetch ${res.status}`)
  const j = await res.json()
  if (j.status !== 'SUCCEEDED') {
    console.error(`Task status: ${j.status}; cannot recover`)
    process.exit(1)
  }
  const url = j.model_urls?.glb
  if (!url) throw new Error('no glb url')
  const dest = join(OUT_DIR, `${name}.glb`)
  console.log(`Downloading ${name}.glb (task ${taskId})...`)
  const size = await downloadWithRetry(url, dest)
  console.log(`✓ ${name} saved ${(size / 1024 / 1024).toFixed(2)} MB → ${dest}`)
}

main().catch((e) => { console.error('Fatal:', e.message); process.exit(1) })

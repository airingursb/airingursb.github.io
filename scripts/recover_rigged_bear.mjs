#!/usr/bin/env node
/**
 * Recover the rigged bear GLBs from an already-succeeded rigging task.
 * Usage: node scripts/recover_rigged_bear.mjs <rigging_task_id>
 */
import { writeFile, mkdir, readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public/grove3d/models')
const V1_RIG = 'https://api.meshy.ai/openapi/v1/rigging'

async function env() {
  const raw = await readFile(join(ROOT, '.env'), 'utf8')
  const o = {}
  for (const l of raw.split('\n')) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) o[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return o.MESHY_API_KEY || o.MESHY_AI_API_KEY
}

async function downloadTo(url, dest) {
  for (let i = 1; i <= 5; i++) {
    try {
      const r = await fetch(url)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const buf = Buffer.from(await r.arrayBuffer())
      await writeFile(dest, buf)
      return buf.length
    } catch (e) {
      console.log(`  attempt ${i}/5: ${e.message}`)
      if (i === 5) throw e
      await new Promise(r => setTimeout(r, 2000 * i))
    }
  }
}

async function main() {
  const taskId = process.argv[2]
  if (!taskId) { console.error('Need rigging task id'); process.exit(1) }
  const key = await env()
  await mkdir(OUT, { recursive: true })

  const res = await fetch(`${V1_RIG}/${taskId}`, { headers: { Authorization: `Bearer ${key}` } })
  if (!res.ok) throw new Error(`task fetch ${res.status}`)
  const j = await res.json()
  if (j.status !== 'SUCCEEDED') { console.error(`status: ${j.status}`); process.exit(1) }
  const r = j.result
  const saves = [
    { name: 'bear.glb',      url: r.rigged_character_glb_url },
    { name: 'bear_walk.glb', url: r.basic_animations?.walking_glb_url },
    { name: 'bear_run.glb',  url: r.basic_animations?.running_glb_url },
  ]
  for (const s of saves) {
    if (!s.url) { console.warn(`  ⚠ ${s.name} — no url`); continue }
    const dest = join(OUT, s.name)
    const sz = await downloadTo(s.url, dest)
    console.log(`  ✓ ${s.name} (${(sz/1024/1024).toFixed(2)} MB)`)
  }
}
main().catch(e => { console.error('Fatal:', e.message); process.exit(1) })

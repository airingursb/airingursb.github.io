#!/usr/bin/env node
/**
 * Generate a bipedal Mochi bear with skeleton + walk/run animation clips.
 *
 * Pipeline:
 *   1. text-to-3d preview  (20 credits)  → base mesh, bipedal A-pose
 *   2. text-to-3d refine   (10 credits)  → painted texture
 *   3. rigging              (5 credits)  → skeleton + walking_glb + running_glb
 *   Total ~35 credits.
 *
 * Output (public/grove3d/models/):
 *   bear.glb         — rigged mesh (no clips baked, just bones)
 *   bear_walk.glb    — same rig + Walk animation clip
 *   bear_run.glb     — same rig + Run animation clip
 *
 * Usage: node scripts/generate_rigged_bear.mjs
 */

import { writeFile, mkdir, readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = join(ROOT, 'public/grove3d/models')
const V2 = 'https://api.meshy.ai/openapi/v2/text-to-3d'
const V1_RIG = 'https://api.meshy.ai/openapi/v1/rigging'

// Keep under Meshy 800-char limit.
const BEAR_PROMPT = `Stylized brown bear character standing upright bipedal on two legs in A-pose, NOT on all fours, NOT quadruped. Arms hanging at sides, two legs flat on ground. Compact rounded body with thick limbs. Small round ears solid shapes. Rounded muzzle, small triangular black nose. Round black eyes with light highlights, calm wise contemplative expression. Wearing a soft crimson knit scarf loosely wrapped around neck with one end hanging down chest. Cheek and body fur as 2-3 large angular shapes only, no small details. Soft toon-shaded coloring with baked light and shadow. Body deep cocoa brown, belly slightly lighter, scarf crimson red. Clean geometry, smooth surfaces, strong readable silhouette.`

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function loadEnv() {
  const raw = await readFile(join(ROOT, '.env'), 'utf8')
  const out = {}
  for (const l of raw.split('\n')) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return out
}

async function meshyPost(url, body, key) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`POST ${res.status}: ${text.slice(0, 300)}`)
  return JSON.parse(text).result
}

async function meshyPoll(taskId, label, baseUrl, key) {
  let last = -1
  while (true) {
    const res = await fetch(`${baseUrl}/${taskId}`, {
      headers: { Authorization: `Bearer ${key}` },
    })
    if (!res.ok) {
      console.warn(`  [${label}] poll ${res.status} retrying…`)
      await sleep(8000); continue
    }
    const j = await res.json()
    if (j.status === 'SUCCEEDED') {
      console.log(`  [${label}] ✓ done · ${j.consumed_credits ?? '?'} credits`)
      return j
    }
    if (j.status === 'FAILED' || j.status === 'CANCELED') {
      throw new Error(`${j.status}: ${j.task_error?.message || JSON.stringify(j.task_error)}`)
    }
    if (j.progress !== last) {
      console.log(`  [${label}] ${j.status} ${j.progress ?? 0}%`)
      last = j.progress
    }
    await sleep(5000)
  }
}

async function download(url, dest, attempts = 5) {
  for (let i = 1; i <= attempts; i++) {
    try {
      const r = await fetch(url)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const buf = Buffer.from(await r.arrayBuffer())
      await writeFile(dest, buf)
      return buf.length
    } catch (e) {
      console.log(`  download ${i}/${attempts}: ${e.message}`)
      if (i === attempts) throw e
      await sleep(2000 * i)
    }
  }
}

async function main() {
  const env = await loadEnv()
  const key = env.MESHY_API_KEY || env.MESHY_AI_API_KEY
  if (!key) { console.error('MESHY_API_KEY missing'); process.exit(1) }
  await mkdir(OUT_DIR, { recursive: true })

  console.log('=== Bipedal Mochi bear with rigging ===\n')

  console.log('[1/3] text-to-3d preview …')
  const previewId = await meshyPost(V2, {
    mode: 'preview',
    prompt: BEAR_PROMPT,
    ai_model: 'latest',
    pose_mode: 'a-pose',
    target_polycount: 12000,
    target_formats: ['glb'],
  }, key)
  console.log(`  preview task ${previewId}`)
  await meshyPoll(previewId, 'preview', V2, key)

  console.log('\n[2/3] text-to-3d refine …')
  const refineId = await meshyPost(V2, {
    mode: 'refine',
    preview_task_id: previewId,
    enable_pbr: false,
    remove_lighting: false,
    target_formats: ['glb'],
  }, key)
  console.log(`  refine task ${refineId}`)
  await meshyPoll(refineId, 'refine', V2, key)

  console.log('\n[3/3] rigging …')
  // height_meters 1.2 — matches our in-game player scale roughly (capsule
  // collider is 0.35 radius + 0.35 half-height ≈ 1.4 total). Slightly
  // shorter so a bear feels chunky rather than tall.
  const rigId = await meshyPost(V1_RIG, {
    input_task_id: refineId,
    height_meters: 1.2,
  }, key)
  console.log(`  rigging task ${rigId}`)
  const rigResult = await meshyPoll(rigId, 'rigging', V1_RIG, key)

  // Save all three: rigged mesh (no anim), walk clip, run clip
  console.log('\n[download] rigged GLBs …')
  const saves = [
    { name: 'bear.glb',      url: rigResult.rigged_character_glb_url },
    { name: 'bear_walk.glb', url: rigResult.basic_animations?.walking_glb_url },
    { name: 'bear_run.glb',  url: rigResult.basic_animations?.running_glb_url },
  ]
  for (const s of saves) {
    if (!s.url) { console.warn(`  ⚠ no url for ${s.name}, skipping`); continue }
    const dest = join(OUT_DIR, s.name)
    const sz = await download(s.url, dest)
    console.log(`  ✓ ${s.name} (${(sz / 1024 / 1024).toFixed(2)} MB)`)
  }

  console.log('\nDone. Rigged Mochi bear ready in public/grove3d/models/.')
}

main().catch((e) => { console.error('Fatal:', e.message); process.exit(1) })

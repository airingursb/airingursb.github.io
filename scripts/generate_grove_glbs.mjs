#!/usr/bin/env node
/**
 * scripts/generate_grove_glbs.mjs
 *
 * Generate the 12 Grove 3D avatar GLBs via Meshy text-to-3D API.
 *
 * Pipeline per character: POST preview → poll → POST refine (PBR) → poll → download GLB
 * Output: public/grove3d/models/{name}.glb
 *
 * Usage:
 *   node scripts/generate_grove_glbs.mjs               # all 12
 *   node scripts/generate_grove_glbs.mjs mochi         # just mochi (validate pipeline)
 *   node scripts/generate_grove_glbs.mjs mochi bear    # subset
 *
 * Env: MESHY_AI_API_KEY in .env (auto-loaded)
 * Cost: roughly 8–12 Meshy credits per character (preview + refine).
 */

import { writeFile, mkdir, readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = join(ROOT, 'public/grove3d/models')
const API = 'https://api.meshy.ai/openapi/v2/text-to-3d'

// Stylized creature design — toon-shaded smooth low-poly with angular accents.
// Reference: stylized sabertooth lynx (clean geometry, large smooth sections,
// 2-3 angular shapes for cheek fur, no fine detail, readable silhouette).
// Keep baked toon shading in texture → remove_lighting MUST be false.
const STYLE = 'Front-facing, centered, full body visible, neutral studio background. Simple clean geometry. Smooth surfaces. Strong readable silhouette. Head symmetrical with clear structure. Fur is represented as large smooth sections, not strands. Cheek and body fur represented with 2-3 large angular shapes only. No small details. Soft toon-shaded coloring with clear light and shadow regions baked into the texture.'

const CHARACTERS = [
  { name: 'bear', prompt:
    `A stylized brown bear cub creature. ${STYLE} Compact rounded body with thick limbs and broad paws. Small round ears, solid shapes. Rounded muzzle. Small triangular black nose. Round black eyes with light highlights, calm gentle expression. Fur color: warm cinnamon brown body, slightly lighter cream belly. Body fur in large smooth sections.` },
  { name: 'cat', prompt:
    `${STYLE} A cream-colored stylized house cat sitting alert with both front paws forward. Tall triangular ears with pink inner pads. Long curving tail wrapping around body. Big almond mossy-green eyes, subtle pink nose, tiny white whiskers. Soft cream body, lighter belly.` },
  { name: 'fox', prompt:
    `${STYLE} A small fox kit, alert pose facing forward. Triangular ears, pointed snout, bright orange-red fur with cream-white chest and white tail-tip. Big bushy tail held behind. Black paws like socks. Mischievous but kind, large round black eyes.` },
  { name: 'capybara', prompt:
    `${STYLE} A chubby capybara on all fours, big rounded body, tiny rounded ears, short blunt snout with two visible front teeth. Warm muddy brown with lighter cream belly. Sleepy half-lidded eyes, serene expression. No tail. Calm zen energy.` },
  { name: 'bird', prompt:
    `${STYLE} A small stylized songbird standing upright on two flat bird feet, wings slightly out. Round body, soft cobalt blue back with pale sky-blue belly. Bright orange beak, beady black eyes, small feathered ear-tufts on head. Spread fan tail-feathers.` },
  { name: 'bunny', prompt:
    `${STYLE} A small white rabbit standing upright on hind legs, soft cream-white all over, fluffy round white ball-tail. Tall upright ears with rose-pink inner pads. Pink twitchy nose, two small visible front teeth, large doe eyes. Innocent curious expression.` },
  { name: 'puppy', prompt:
    `${STYLE} A small caramel-brown puppy standing on four short stubby legs. Soft caramel body with darker chocolate ears and muzzle. Floppy ears hanging down past cheeks. Black button nose, bright dark eyes, pink tongue slightly visible. Short wagging tail. Light tan belly.` },
  { name: 'panda', prompt:
    `${STYLE} A small panda cub with classic black-and-white markings: white body, black ears, black around eyes forming patches, black arms and legs, black saddle around shoulders. Sitting friendly on hind legs. Big black eye patches. Tiny pink mouth. Chubby cuddly.` },
  { name: 'hamster', prompt:
    `${STYLE} A tiny golden hamster on all fours, very small and round. Soft golden-orange fur with cream belly. Tiny round ears, big bead-like eyes, twitchy whiskers. Small pink nose, two tiny visible front teeth. Stubby little limbs and small ball tail.` },
  { name: 'penguin', prompt:
    `${STYLE} A small emperor penguin chick standing upright on two flat orange feet, flippers slightly out from body. Visible flippers not just stubs. Classic tuxedo: glossy navy-black back and bright white front belly. Bright orange beak and feet. Round body, no neck. Big curious black eyes.` },
  { name: 'frog', prompt:
    `${STYLE} A small green tree frog in alert squat pose, four limbs visible on ground, head looking forward and up. Soft moss-green back with cream-yellow belly. Bulgy round eyes on top of head with vertical pupils, white sclera. Wide friendly mouth slightly upturned. Sticky toe pads.` },
  { name: 'mochi', prompt:
    `${STYLE} A larger chubbier brown bear NPC, bigger and darker than a normal bear cub. Body deep cocoa brown, ears nearly black. Standing on hind legs in slight forward-lean contemplative pose. Wearing a soft crimson knit scarf loosely wrapped around neck with one end hanging across chest. Soft thinking expression, eyes lowered slightly, gentle inward-angled brows. Light pink inner ear pads. Warm tan snout. Wise librarian energy.` },
]

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function loadDotEnv() {
  try {
    const raw = await readFile(join(ROOT, '.env'), 'utf8')
    const out = {}
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
    return out
  } catch { return {} }
}

async function meshyCreate(body, key) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`POST ${res.status}: ${text.slice(0, 200)}`)
  return JSON.parse(text).result
}

async function meshyPoll(taskId, key, label) {
  let lastProgress = -1
  while (true) {
    const res = await fetch(`${API}/${taskId}`, {
      headers: { Authorization: `Bearer ${key}` },
    })
    if (!res.ok) {
      // transient network issue — wait and retry
      console.warn(`[${label}] poll ${res.status}, retrying…`)
      await sleep(8000)
      continue
    }
    const j = await res.json()
    if (j.status === 'SUCCEEDED') {
      console.log(`[${label}] ✓ done · ${j.consumed_credits ?? '?'} credits`)
      return j
    }
    if (j.status === 'FAILED' || j.status === 'CANCELED') {
      const err = j.task_error?.message || JSON.stringify(j.task_error || {})
      throw new Error(`${j.status}: ${err}`)
    }
    if (j.progress != null && j.progress !== lastProgress) {
      console.log(`[${label}] ${j.status} ${j.progress}%`)
      lastProgress = j.progress
    }
    await sleep(5000)
  }
}

async function downloadTo(url, dest, attempts = 5) {
  for (let i = 1; i <= attempts; i++) {
    try {
      const r = await fetch(url)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const buf = Buffer.from(await r.arrayBuffer())
      await writeFile(dest, buf)
      return buf.length
    } catch (e) {
      console.log(`  download attempt ${i}/${attempts} failed: ${e.message}`)
      if (i === attempts) throw e
      await sleep(2000 * i)
    }
  }
}

async function generateOne(char, key) {
  const dest = join(OUT_DIR, `${char.name}.glb`)
  console.log(`\n=== ${char.name} ===`)
  // Stage 1: preview (untextured base mesh) — keep mesh smooth+rounded for chibi
  const previewId = await meshyCreate({
    mode: 'preview',
    prompt: char.prompt,
    ai_model: 'latest',
    pose_mode: 'a-pose',
    target_polycount: 12000,
    target_formats: ['glb'],
  }, key)
  console.log(`[${char.name}] preview task ${previewId}`)
  await meshyPoll(previewId, key, `${char.name}/preview`)

  // Stage 2: refine — stylized creature look with baked toon shading:
  //   enable_pbr=false → no metallic/normal maps, keeps flat material
  //   remove_lighting=false → KEEP baked toon shading (the angular fur
  //     sections in the reference image are baked highlights/shadows)
  const refineId = await meshyCreate({
    mode: 'refine',
    preview_task_id: previewId,
    enable_pbr: false,
    remove_lighting: false,
    target_formats: ['glb'],
  }, key)
  console.log(`[${char.name}] refine task ${refineId}`)
  const final = await meshyPoll(refineId, key, `${char.name}/refine`)

  const glbUrl = final.model_urls?.glb
  if (!glbUrl) throw new Error('no glb url in final response')
  const size = await downloadTo(glbUrl, dest)
  console.log(`[${char.name}] saved ${(size / 1024 / 1024).toFixed(2)} MB → ${dest}`)
  return { name: char.name, ok: true, size }
}

async function main() {
  const env = await loadDotEnv()
  const key =
    env.MESHY_API_KEY || env.MESHY_AI_API_KEY ||
    process.env.MESHY_API_KEY || process.env.MESHY_AI_API_KEY
  if (!key) {
    console.error('MESHY_API_KEY (or MESHY_AI_API_KEY) missing in .env')
    process.exit(1)
  }
  await mkdir(OUT_DIR, { recursive: true })

  const requested = process.argv.slice(2)
  const targets = requested.length
    ? CHARACTERS.filter(c => requested.includes(c.name))
    : CHARACTERS

  if (requested.length && targets.length === 0) {
    console.error(`No matching characters. Known: ${CHARACTERS.map(c => c.name).join(', ')}`)
    process.exit(1)
  }

  console.log(`Generating ${targets.length} character(s): ${targets.map(c => c.name).join(', ')}`)
  console.log(`Output: ${OUT_DIR}`)
  console.log(`Concurrency: 4 (Meshy may rate-limit if higher)\n`)

  // Limit concurrency — 4 workers from the queue
  const queue = [...targets]
  const results = []
  async function worker(workerId) {
    while (queue.length) {
      const c = queue.shift()
      if (!c) return
      try {
        const r = await generateOne(c, key)
        results.push(r)
      } catch (e) {
        console.error(`[${c.name}] FAILED: ${e.message}`)
        results.push({ name: c.name, ok: false, error: e.message })
      }
    }
  }
  await Promise.all([worker(1), worker(2), worker(3), worker(4)])

  console.log('\n=== Summary ===')
  for (const r of results) {
    console.log(r.ok ? `  ✓ ${r.name} (${(r.size / 1024 / 1024).toFixed(2)} MB)` : `  ✗ ${r.name}: ${r.error}`)
  }
  const failed = results.filter(r => !r.ok)
  if (failed.length) process.exit(1)
}

main().catch((e) => {
  console.error('Fatal:', e.message)
  process.exit(1)
})

import Phaser from 'phaser'
import { WALK_SPEED, type Region, type Species, SPECIES } from './config'
import { footstepDust } from './feedback'
import { walkSpeedMultiplier, onLevelUp } from './skills'
import { sortForRender as sortCosmeticsForRender } from './cosmetics'
import { getCurrentPhase } from './atmosphere'

// V23.29 — phase-aware shadow transform. Computed once per second per
// scene (phase changes slowly), reads getCurrentPhase. Sets scale and
// alpha so the shadow looks short+round at noon, long+faint at dawn
// (cast east) / dusk (cast west), and nearly invisible at night.
let _shadowPhaseCache: { until: number; scaleX: number; scaleY: number; alpha: number; offsetX: number } | null = null
function getShadowParams() {
  const now = performance.now()
  if (_shadowPhaseCache && now < _shadowPhaseCache.until) return _shadowPhaseCache
  const phase = getCurrentPhase()
  let params: { scaleX: number; scaleY: number; alpha: number; offsetX: number }
  switch (phase) {
    case 'dawn':  params = { scaleX: 2.0, scaleY: 0.7, alpha: 0.22, offsetX:  6 }; break
    case 'dusk':  params = { scaleX: 2.0, scaleY: 0.7, alpha: 0.22, offsetX: -6 }; break
    case 'night': params = { scaleX: 0.85, scaleY: 0.85, alpha: 0.12, offsetX: 0 }; break
    case 'day':
    default:      params = { scaleX: 1.0, scaleY: 1.0, alpha: 0.32, offsetX: 0 }; break
  }
  _shadowPhaseCache = { until: now + 1000, ...params }
  return _shadowPhaseCache
}
function applyShadowPhaseTransform(shadow: Phaser.GameObjects.Ellipse) {
  const p = getShadowParams()
  shadow.setScale(p.scaleX, p.scaleY)
  shadow.setAlpha(p.alpha)
  shadow.x = shadow.x + p.offsetX
}

// V9.7-review I3 fix: cache walkSpeedMultiplier (computed from skill XP via
// localStorage) so Bear.update doesn't read localStorage every frame. Refresh
// only on Wayfaring level-up.
// V10.7-review I1 fix: also recompute when the bunny pet hits max affection
// (it adds +5% via walkSpeedMultiplier but Wayfaring level didn't change,
// so the cache stayed stale). The cleanest invalidation hook is via the
// 'storage' event for cross-tab and a direct invalidation when pets.feedPet
// pushes the affection over 10.
let cachedWalkSpeedMultiplier = 1
let cachedInited = false
export function invalidateWalkSpeedCache() {
  cachedWalkSpeedMultiplier = walkSpeedMultiplier()
}
function getCachedWalkSpeedMultiplier(): number {
  if (!cachedInited) {
    cachedWalkSpeedMultiplier = walkSpeedMultiplier()
    onLevelUp((skill) => {
      if (skill === 'wayfaring') cachedWalkSpeedMultiplier = walkSpeedMultiplier()
    })
    cachedInited = true
  }
  return cachedWalkSpeedMultiplier
}

export type Direction = 'up' | 'down' | 'left' | 'right'
export type BearState = 'idle' | 'walk' | 'wave' | 'sit' | 'dance'

export function registerBearAnimations(scene: Phaser.Scene, regions: readonly Region[]) {
  for (const species of SPECIES) {
    for (const region of regions) {
      const key = `${species}_${region}`
      if (!scene.textures.exists(key)) continue  // species atlas may not be preloaded
      for (const dir of ['up', 'down', 'left', 'right'] as const) {
        const idleKey = `${key}_idle_${dir}`
        if (!scene.anims.exists(idleKey)) {
          scene.anims.create({
            key: idleKey,
            frames: [{ key, frame: `idle_${dir}` }],
            frameRate: 1, repeat: -1
          })
        }
        const walkKey = `${key}_walk_${dir}`
        if (!scene.anims.exists(walkKey)) {
          scene.anims.create({
            key: walkKey,
            frames: [
              { key, frame: `walk_${dir}_0` },
              { key, frame: `walk_${dir}_1` }
            ],
            frameRate: 8, repeat: -1
          })
        }
      }
      const waveKey = `${key}_wave`
      if (!scene.anims.exists(waveKey)) {
        scene.anims.create({ key: waveKey, frames: [{ key, frame: 'wave' }], frameRate: 1, repeat: 0 })
      }
      const sitKey = `${key}_sit`
      if (!scene.anims.exists(sitKey)) {
        scene.anims.create({ key: sitKey, frames: [{ key, frame: 'sit' }], frameRate: 1, repeat: 0 })
      }
    }
  }
}

export class Bear {
  scene: Phaser.Scene
  sprite: Phaser.GameObjects.Sprite
  region: Region
  species: Species = 'bear'
  target: { x: number; y: number } | null = null
  facing: Direction = 'down'
  state: BearState = 'idle'
  stateUntil = 0
  reducedMotion = false
  // V14.8-review C1 — public displayName accessor for nearby-peer queries
  // (group photo member list). The rendered nameLabel.text includes marriage
  // prefixes etc., so callers must read this raw field instead.
  displayName: string | null = null
  private baseY = 0
  private nameLabel?: Phaser.GameObjects.Text
  private heartLabel?: Phaser.GameObjects.Text
  private moodLabel?: Phaser.GameObjects.Text   // V17.1 — floating mood emoji
  // V18.0 — equipped cosmetic containers. Re-built whenever setCosmetics
  // is called OR when facing changes (per-frame redraw is cheap since
  // each cosmetic is 4-6 Graphics rects).
  private cosmeticContainers: Phaser.GameObjects.Container[] = []
  private cosmeticIds: string[] = []
  private lastCosmeticFacing: Direction | null = null
  private shadow?: Phaser.GameObjects.Ellipse  // V6.3 — soft ground shadow
  private lastDustAt = 0                       // V6.6 — last footstep-dust timestamp

  constructor(scene: Phaser.Scene, x: number, y: number, region: Region, species: Species = 'bear') {
    this.scene = scene
    this.region = region
    this.species = species
    // V6.3 — shadow rendered first so it sits behind the sprite
    this.shadow = scene.add.ellipse(x, y - 1, 14, 5, 0x000000, 0.32).setDepth(3)
    const texKey = `${species}_${region}`
    const finalKey = scene.textures.exists(texKey) ? texKey : `bear_${region}`
    this.sprite = scene.add.sprite(x, y, finalKey, 'idle_down')
    this.sprite.setOrigin(0.5, 1)
    this.baseY = y
    this.nameLabel = scene.add.text(x, y - 36, '', {
      fontFamily: 'ui-monospace, monospace',
      fontSize: '9px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
      resolution: 2
    }).setOrigin(0.5, 1).setDepth(6)
    this.heartLabel = scene.add.text(x, y - 46, '', {
      fontFamily: 'ui-monospace, monospace',
      fontSize: '10px',
      color: '#ffb0c0',
      resolution: 2
    }).setOrigin(0.5, 1).setDepth(6)
    // V17.1 — mood emoji floats just above the heart, sits hidden until
    // setMood() is called with a non-empty glyph
    this.moodLabel = scene.add.text(x, y - 56, '', {
      fontFamily: 'system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif',
      fontSize: '14px',
      resolution: 2
    }).setOrigin(0.5, 1).setDepth(6)
    this.playIdle()
  }

  /** V17.1 — set the floating mood emoji (empty/null clears it). */
  setMood(glyph: string | null) {
    if (!this.moodLabel) return
    this.moodLabel.setText(glyph ?? '')
  }

  /** V18.0 — set equipped cosmetic ids. Re-draws on next update tick.
   *  V18.6-review I2 — identity check ignores ordering by comparing the
   *  rendered key set, so a server reorder of the same items doesn't
   *  trigger an unnecessary rebuild. */
  setCosmetics(ids: string[]) {
    const a = sortCosmeticsForRender(this.cosmeticIds).map(d => d.id).join(',')
    const b = sortCosmeticsForRender(ids).map(d => d.id).join(',')
    if (a === b) return
    this.cosmeticIds = [...ids]
    this.lastCosmeticFacing = null   // force rebuild on next update()
  }

  private rebuildCosmetics() {
    for (const c of this.cosmeticContainers) c.destroy()
    this.cosmeticContainers = []
    if (this.cosmeticIds.length === 0) return
    const defs = sortCosmeticsForRender(this.cosmeticIds)
    for (const def of defs) {
      const container = def.draw(this.scene, this.facing)
      // V18.6-review I1 — sprite depth 5, labels depth 6. Sit cosmetics
      // exactly between (5.5) so they always render over the sprite but
      // never above the name/heart/mood labels at depth 6.
      container.setDepth(this.sprite.depth + 0.5)
      this.cosmeticContainers.push(container)
    }
  }

  setFriendshipLevel(level: number) {
    if (!this.heartLabel) return
    const map: Record<number, { glyph: string; color: string }> = {
      1: { glyph: '♡', color: '#ffb0c0' },
      2: { glyph: '♥', color: '#ff4060' },
      3: { glyph: '✦', color: '#ffd166' }
    }
    const cfg = map[level]
    if (!cfg) { this.heartLabel.setText(''); return }
    this.heartLabel.setText(cfg.glyph).setColor(cfg.color)
  }

  setDisplayName(name: string | null, opts?: { color?: string; prefix?: string }) {
    this.displayName = name && name.length > 0 ? name : null
    if (!this.nameLabel) return
    const text = this.displayName
      ? (opts?.prefix ? `${opts.prefix}${this.displayName}` : this.displayName)
      : ''
    this.nameLabel.setText(text)
    this.nameLabel.setColor(opts?.color ?? '#ffffff')
  }

  walkTo(x: number, y: number) {
    this.target = { x, y }
    const dx = x - this.sprite.x
    const dy = y - this.sprite.y
    this.facing = Math.abs(dx) > Math.abs(dy)
      ? (dx > 0 ? 'right' : 'left')
      : (dy > 0 ? 'down' : 'up')
    this.state = 'walk'
    this.playWalk()
  }

  setRemoteTarget(x: number, y: number, vx: number, vy: number) {
    this.target = { x, y }
    this.facing = Math.abs(vx) > Math.abs(vy)
      ? (vx >= 0 ? 'right' : 'left')
      : (vy >= 0 ? 'down' : 'up')
    if (this.state === 'idle') this.state = 'walk'
    if (this.state === 'walk') this.playWalk()
  }

  applyEmote(verb: string, durationMs: number, reducedMotion: boolean) {
    this.reducedMotion = reducedMotion
    const now = performance.now()
    if (verb === 'wave') {
      this.state = 'wave'
      this.stateUntil = now + durationMs
      this.playWave()
    } else if (verb === 'sit') {
      if (this.state === 'sit') {
        this.state = 'idle'
        this.stateUntil = 0
        this.playIdle()
      } else {
        this.state = 'sit'
        this.stateUntil = 0
        this.target = null
        this.playSit()
      }
    } else if (verb === 'dance') {
      this.state = 'dance'
      this.stateUntil = now + durationMs
      this.target = null
      this.baseY = this.sprite.y
      this.playWalk()
    }
  }

  update(dtMs: number, isPeer = false) {
    const now = performance.now()
    if (this.shadow) {
      this.shadow.x = this.sprite.x
      this.shadow.y = this.sprite.y - 1
      // V23.29 — phase-aware shadow shape. At dawn/dusk the sun is low
      // and shadows stretch sideways; at noon they're tight and round;
      // at night there's no sun-cast so the shadow nearly disappears.
      // Origin shifted to the casting edge so the stretch grows AWAY
      // from the bear rather than scaling out symmetrically.
      const t = applyShadowPhaseTransform
      if (t) t(this.shadow)
    }
    if (this.nameLabel) {
      this.nameLabel.x = this.sprite.x
      this.nameLabel.y = this.sprite.y - 36
    }
    if (this.heartLabel) {
      this.heartLabel.x = this.sprite.x
      this.heartLabel.y = this.sprite.y - 46
    }
    if (this.moodLabel) {
      this.moodLabel.x = this.sprite.x
      this.moodLabel.y = this.sprite.y - 56
    }
    // V18.0 — keep cosmetic containers anchored to the bear; rebuild if
    // facing changed so directional cosmetics (cap brim, glasses) update.
    if (this.cosmeticIds.length > 0 && this.facing !== this.lastCosmeticFacing) {
      this.lastCosmeticFacing = this.facing
      this.rebuildCosmetics()
    }
    for (const c of this.cosmeticContainers) {
      c.x = this.sprite.x
      c.y = this.sprite.y
    }

    if (this.stateUntil > 0 && now >= this.stateUntil) {
      this.state = 'idle'
      this.stateUntil = 0
      this.sprite.y = this.baseY
      this.playIdle()
    }

    if (this.state === 'sit' || this.state === 'wave') {
      return
    }

    if (this.state === 'dance') {
      if (!this.reducedMotion) {
        const bounce = Math.sin(now / 120) * 4
        this.sprite.y = this.baseY + bounce
      }
      return
    }

    if (!this.target) return
    const dx = this.target.x - this.sprite.x
    const dy = this.target.y - this.sprite.y
    const dist = Math.hypot(dx, dy)
    const arriveDist = isPeer ? 1 : 2
    if (dist <= arriveDist) {
      this.sprite.x = this.target.x
      this.sprite.y = this.target.y
      this.target = null
      this.state = 'idle'
      this.baseY = this.sprite.y
      this.playIdle()
      return
    }
    // V9.0 + V9.7-review I3 — Wayfaring perk; cached multiplier
    const mult = isPeer ? 1.2 : getCachedWalkSpeedMultiplier()
    const speed = WALK_SPEED * mult
    const step = Math.min((speed * dtMs) / 1000, dist)
    this.sprite.x += (dx / dist) * step
    this.sprite.y += (dy / dist) * step
    this.baseY = this.sprite.y
    // V6.6 — occasional footstep dust under feet (every ~280ms while walking)
    if (now - this.lastDustAt > 280 && !this.reducedMotion) {
      this.lastDustAt = now
      footstepDust(this.scene, this.sprite.x, this.sprite.y - 1)
    }
    if (this.reducedMotion) {
      this.sprite.anims.stop()
      this.sprite.setFrame(`walk_${this.facing}_0`)
    }
  }

  playWalk() {
    if (this.reducedMotion) {
      this.sprite.anims.stop()
      this.sprite.setFrame(`walk_${this.facing}_0`)
    } else {
      this.sprite.anims.play(`${this.species}_${this.region}_walk_${this.facing}`, true)
    }
  }
  playIdle() { this.sprite.anims.play(`${this.species}_${this.region}_idle_${this.facing}`, true) }
  playWave() { this.sprite.anims.play(`${this.species}_${this.region}_wave`, true) }
  playSit()  { this.sprite.anims.play(`${this.species}_${this.region}_sit`, true) }

  setRegion(region: Region) {
    if (region === this.region) return
    this.region = region
    const texKey = `${this.species}_${region}`
    this.sprite.setTexture(this.scene.textures.exists(texKey) ? texKey : `bear_${region}`)
    if (this.state === 'walk') this.playWalk()
    else if (this.state === 'wave') this.playWave()
    else if (this.state === 'sit') this.playSit()
    else this.playIdle()
  }

  // V6.5 — change species (e.g. user toggles bear ↔ cat).
  setSpecies(species: Species) {
    const texKey = `${species}_${this.region}`
    const wantKey = this.scene.textures.exists(texKey) ? texKey : `bear_${this.region}`
    // Re-apply even when species is unchanged if the current texture is stale.
    // (NPCs/peers are constructed with their real species but fall back to the
    // bear texture when the atlas isn't loaded yet; once it lands, species is
    // already === target, so an early `species === this.species` return would
    // leave them stuck as a bear. Compare the actual texture key instead.)
    if (species === this.species && this.sprite.texture.key === wantKey) return
    this.species = species
    this.sprite.setTexture(wantKey)
    if (this.state === 'walk') this.playWalk()
    else if (this.state === 'wave') this.playWave()
    else if (this.state === 'sit') this.playSit()
    else this.playIdle()
  }

  destroy() {
    this.nameLabel?.destroy()
    this.heartLabel?.destroy()
    this.moodLabel?.destroy()
    for (const c of this.cosmeticContainers) c.destroy()
    this.cosmeticContainers = []
    this.shadow?.destroy()
    this.sprite.destroy()
  }

  get x() { return this.sprite.x }
  get y() { return this.sprite.y }
}

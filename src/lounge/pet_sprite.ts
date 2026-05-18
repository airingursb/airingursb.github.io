// V10.2 → V10.8b — Pet follower sprite. Three distinct atlas families now:
//   - kitten → cat_<region>   (preloaded via existing ensureSpeciesLoaded)
//   - puppy  → puppy_<region> (lazy-loaded inline below)
//   - bunny  → bunny_<region> (lazy-loaded inline below)
// Tints are kept as a small accent (kitten = orange, puppy = warm, bunny = pale).

import Phaser from 'phaser'
import type { Region } from './config'
import { getPet, getPetSpecies, type PetState } from './pets'

// V10.8b — atlas-family selector for each pet species.
function atlasFamilyFor(species: PetState['species']): 'cat' | 'puppy' | 'bunny' {
  if (species === 'kitten') return 'cat'
  return species
}

/** Loads the per-region pet atlas + registers its animations, then resolves.
 *  Idempotent across calls for the same key. */
export async function ensurePetAtlasLoaded(
  scene: Phaser.Scene, species: PetState['species'], region: Region
): Promise<void> {
  const family = atlasFamilyFor(species)
  const key = `${family}_${region}`
  if (scene.textures.exists(key)) { registerPetAnims(scene, family, region); return }
  await new Promise<void>((resolve) => {
    scene.load.atlas(key,
      `/lounge/assets/sprites/${family}/${region}/sprite.png`,
      `/lounge/assets/sprites/${family}/${region}/sprite.json`)
    scene.load.once(`filecomplete-json-${key}`, () => { registerPetAnims(scene, family, region); resolve() })
    scene.load.once(`loaderror`, () => resolve())  // best-effort; PetSprite no-ops if missing
    scene.load.start()
  })
}

function registerPetAnims(scene: Phaser.Scene, family: string, region: Region) {
  const key = `${family}_${region}`
  for (const dir of ['up', 'down', 'left', 'right'] as const) {
    const idleKey = `${key}_idle_${dir}`
    if (!scene.anims.exists(idleKey)) {
      scene.anims.create({ key: idleKey, frames: [{ key, frame: `idle_${dir}` }], frameRate: 1, repeat: -1 })
    }
    const walkKey = `${key}_walk_${dir}`
    if (!scene.anims.exists(walkKey)) {
      scene.anims.create({ key: walkKey, frames: [{ key, frame: `walk_${dir}_0` }, { key, frame: `walk_${dir}_1` }], frameRate: 8, repeat: -1 })
    }
  }
}

const FOLLOW_OFFSET = 18           // px behind the player
const FOLLOW_SPEED = 0.12          // lerp factor per frame (~60fps)
const FOLLOW_STOP_DIST = 6         // px gap where pet stops fidgeting

export class PetSprite {
  private scene: Phaser.Scene
  private sprite?: Phaser.GameObjects.Sprite
  private nameLabel?: Phaser.GameObjects.Text
  private heartLabel?: Phaser.GameObjects.Text
  private shadow?: Phaser.GameObjects.Ellipse
  private region: Region
  private facing: 'up' | 'down' | 'left' | 'right' = 'down'
  private lastWalkAt = 0
  private state: 'idle' | 'walk' = 'idle'

  private atlasKey = 'cat_unknown'

  /** Pass an explicit `petOverride` to construct a peer's pet; omit to use
   *  the local player's pet (V10.2 behavior). */
  constructor(scene: Phaser.Scene, x: number, y: number, region: Region, petOverride?: { species: PetState['species']; name: string }) {
    this.scene = scene
    this.region = region
    const pet = petOverride
      ? { species: petOverride.species, name: petOverride.name, affection: 0, lastFedDay: null, adoptedAt: 0 } as PetState
      : getPet()
    if (!pet) return                  // no-op shell; getPet null = no adoption
    // V10.8b — pick atlas family by species (kitten→cat, puppy→puppy, bunny→bunny)
    const family = atlasFamilyFor(pet.species)
    const texKey = `${family}_${region}`
    this.atlasKey = texKey
    if (!scene.textures.exists(texKey)) return  // caller should have preloaded
    const def = getPetSpecies(pet.species)
    this.shadow = scene.add.ellipse(x, y - 1, 10, 4, 0x000000, 0.28).setDepth(3)
    this.sprite = scene.add.sprite(x, y, texKey, 'idle_down')
    this.sprite.setOrigin(0.5, 1).setScale(0.6).setTint(def.tint).setDepth(4)
    this.nameLabel = scene.add.text(x, y - 36, `${def.emoji} ${pet.name}`, {
      fontFamily: 'ui-monospace, monospace',
      fontSize: '8px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
      resolution: 2
    }).setOrigin(0.5, 1).setDepth(6)
    this.heartLabel = scene.add.text(x, y - 46, '', {
      fontFamily: 'ui-monospace, monospace',
      fontSize: '9px',
      color: '#ffb0c0',
      resolution: 2
    }).setOrigin(0.5, 1).setDepth(6)
    this.refreshHeart(pet)
    this.playIdle()
  }

  refreshHeart(pet: PetState = getPet()!) {
    if (!this.heartLabel || !pet) return
    if (pet.affection >= 10) this.heartLabel.setText('✦').setColor('#ffd166')
    else if (pet.affection >= 5) this.heartLabel.setText('♥').setColor('#ff4060')
    else if (pet.affection >= 1) this.heartLabel.setText('♡').setColor('#ffb0c0')
    else this.heartLabel.setText('')
  }

  /** Drive pet toward target each frame (player position + behind offset). */
  update(playerX: number, playerY: number, playerFacing: 'up'|'down'|'left'|'right') {
    if (!this.sprite || !this.shadow) return
    // Position the pet OFFSET pixels behind player, in opposite of player facing
    let targetX = playerX, targetY = playerY
    switch (playerFacing) {
      case 'up':    targetY = playerY + FOLLOW_OFFSET; break
      case 'down':  targetY = playerY - FOLLOW_OFFSET; break  // behind = above when facing down
      case 'left':  targetX = playerX + FOLLOW_OFFSET; break
      case 'right': targetX = playerX - FOLLOW_OFFSET; break
    }
    const dx = targetX - this.sprite.x
    const dy = targetY - this.sprite.y
    const dist = Math.hypot(dx, dy)
    if (dist > FOLLOW_STOP_DIST) {
      this.sprite.x += dx * FOLLOW_SPEED
      this.sprite.y += dy * FOLLOW_SPEED
      this.shadow.x = this.sprite.x
      this.shadow.y = this.sprite.y - 1
      this.facing = Math.abs(dx) > Math.abs(dy)
        ? (dx > 0 ? 'right' : 'left')
        : (dy > 0 ? 'down' : 'up')
      if (this.state !== 'walk') { this.state = 'walk'; this.playWalk() }
      this.lastWalkAt = performance.now()
    } else if (performance.now() - this.lastWalkAt > 200) {
      if (this.state !== 'idle') { this.state = 'idle'; this.playIdle() }
    }
    if (this.nameLabel) { this.nameLabel.x = this.sprite.x; this.nameLabel.y = this.sprite.y - 36 }
    if (this.heartLabel) { this.heartLabel.x = this.sprite.x; this.heartLabel.y = this.sprite.y - 46 }
  }

  /** Called when player clicks the pet — kicks a tiny hop animation. */
  hop() {
    if (!this.sprite) return
    const baseY = this.sprite.y
    this.scene.tweens.add({
      targets: this.sprite, y: baseY - 4, duration: 120, yoyo: true, ease: 'Sine.easeOut'
    })
  }

  getX(): number { return this.sprite?.x ?? 0 }
  getY(): number { return this.sprite?.y ?? 0 }

  destroy() {
    this.sprite?.destroy(); this.shadow?.destroy()
    this.nameLabel?.destroy(); this.heartLabel?.destroy()
    this.sprite = this.shadow = undefined
    this.nameLabel = this.heartLabel = undefined
  }

  private playIdle() {
    if (!this.sprite) return
    const key = `${this.atlasKey}_idle_${this.facing}`
    if (this.scene.anims.exists(key)) this.sprite.play(key)
  }
  private playWalk() {
    if (!this.sprite) return
    const key = `${this.atlasKey}_walk_${this.facing}`
    if (this.scene.anims.exists(key)) this.sprite.play(key)
  }
}

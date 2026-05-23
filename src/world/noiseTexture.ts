// Procedural noise normal map for ground/wood/stone micro-detail.
// Built once at runtime as a DataTexture so we don't ship binary
// texture assets but still escape "flat plastic Blender preview" feel.

import * as THREE from 'three'

/** Simple value-noise based normal map.
 *  Returns a tileable RGB normal-map DataTexture. */
export function makeNoiseNormalMap(size = 256, scale = 6, strength = 1.0) {
  const data = new Uint8Array(size * size * 4)
  // Step 1: build height field via summed cosines
  const h = new Float32Array(size * size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const fx = x / size
      const fy = y / size
      let v = 0
      v += Math.cos(fx * scale * Math.PI * 2) * 0.5
      v += Math.sin(fy * scale * Math.PI * 2) * 0.5
      v += Math.cos((fx + fy) * scale * Math.PI * 1.7) * 0.3
      v += Math.sin((fx - fy) * scale * Math.PI * 2.3) * 0.3
      // Per-pixel hash perturbation
      const r = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
      v += (r - Math.floor(r)) * 0.2
      h[y * size + x] = v
    }
  }
  // Step 2: convert to normals via cross-product of partial derivatives
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const xm = (x - 1 + size) % size
      const xp = (x + 1) % size
      const ym = (y - 1 + size) % size
      const yp = (y + 1) % size
      const dx = (h[y * size + xp] - h[y * size + xm]) * strength
      const dy = (h[yp * size + x] - h[ym * size + x]) * strength
      const n = new THREE.Vector3(-dx, -dy, 1.0).normalize()
      const i = (y * size + x) * 4
      data[i] = Math.round((n.x * 0.5 + 0.5) * 255)
      data[i + 1] = Math.round((n.y * 0.5 + 0.5) * 255)
      data[i + 2] = Math.round((n.z * 0.5 + 0.5) * 255)
      data[i + 3] = 255
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.needsUpdate = true
  return tex
}

// Singleton shared across components
let _sharedNoise: THREE.DataTexture | null = null
export function sharedNoiseMap() {
  if (!_sharedNoise) _sharedNoise = makeNoiseNormalMap(256, 8, 1.2)
  return _sharedNoise
}

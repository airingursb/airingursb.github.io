// Detailed log cabin — Airing's home + Chat hub.
//
// Now with Sub-A recommendations: log end-grain caps, chinking strips
// between logs, porch furniture (rocking chair + firewood pile +
// doormat + hanging flower basket), animated chimney smoke.

import { useRef, useMemo, useEffect, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getZone } from './zones'
import { getGust } from './wind'

// Rocking chair wrapper — gently rocks on its runners
function Rocker({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  useFrame((s) => {
    if (!ref.current) return
    // Slow rocking: ±0.05 rad around X, period ~3s
    const angle = Math.sin(s.clock.elapsedTime * 1.0) * 0.05
    ref.current.rotation.x = angle
    // Compensate Y position so contact stays at runner curvature
    ref.current.position.y = Math.abs(angle) * 0.08
  })
  return <group ref={ref}>{children}</group>
}

// V2 scene polish A1: tea cup on the rocker seat with rising steam.
// Implies "Airing just got up to greet you." The cup is parented INSIDE
// the rocker so it sways with the chair.
function RockerTeaCup() {
  const puffRefs = [useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null)]
  useFrame((s) => {
    const t = s.clock.elapsedTime
    puffRefs.forEach((r, i) => {
      const m = r.current
      if (!m) return
      // Each puff: rise from y0=0 to y=0.45, fade out, restart with offset
      const phase = ((t * 0.45 + i * 0.33) % 1)   // 0..1 over ~2.2s
      const rise = phase * 0.45
      m.position.y = rise
      m.position.x = Math.sin(t * 0.8 + i) * 0.012 * phase  // slight drift
      const baseScale = 0.018 + phase * 0.012
      m.scale.setScalar(baseScale)
      const mat = m.material as THREE.MeshBasicMaterial
      mat.opacity = Math.max(0, (1 - phase) * 0.55)
    })
  })
  // Cup sits on the back-right corner of seat (where you'd put it down
  // before getting up). Seat top y = 0.18 + 0.04 = 0.22 in rocker local.
  return (
    <group position={[0.15, 0.22, -0.12]}>
      {/* Cup body (ceramic) */}
      <mesh castShadow>
        <cylinderGeometry args={[0.04, 0.035, 0.05, 12]} />
        <meshStandardMaterial color="#F4EAD5" roughness={0.55} />
      </mesh>
      {/* Tea surface */}
      <mesh position={[0, 0.025, 0]}>
        <cylinderGeometry args={[0.036, 0.036, 0.004, 12]} />
        <meshStandardMaterial color="#6E4A2A" roughness={0.35} metalness={0.15} />
      </mesh>
      {/* Tiny handle */}
      <mesh position={[0.045, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.018, 0.005, 4, 8, Math.PI]} />
        <meshStandardMaterial color="#F4EAD5" roughness={0.55} />
      </mesh>
      {/* Saucer */}
      <mesh position={[0, -0.027, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.006, 14]} />
        <meshStandardMaterial color="#EFE2C4" roughness={0.6} />
      </mesh>
      {/* Steam puffs — small white spheres rising over ~2.2s loop */}
      <group position={[0, 0.04, 0]}>
        {puffRefs.map((r, i) => (
          <mesh key={`p${i}`} ref={r}>
            <sphereGeometry args={[1, 8, 6]} />
            <meshBasicMaterial color="#FFFFFF" transparent opacity={0} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

const LOG_LIGHT  = '#9E7A52'
const LOG_DARK   = '#6E4F31'
const LOG_END    = '#5A3D1F'
const CHINKING   = '#D4C4A8'
const STONE      = '#8E8579'
const STONE_DK   = '#6B6358'
const PLANK      = '#7A5B3C'
const DOOR_RED   = '#A03030'  // hero saturated accent (Sub-A iter-5 gap #5)
// Tightened palette (was 5 wildly-different browns → noise when viewed
// from above). Now 2 closely-related tones for cohesion + thin row
// shadows give shingle row direction.
const SHINGLE_BASE = '#5A3A20'
const SHINGLE_DARK = '#3A2418'
const SHINGLE_MOSS = '#7A9268'
const WINDOW     = '#FFE4A8'
const IRON       = '#2A2018'
const ROCKER     = '#5D452B'
const FLOWER_RED = '#E25A4C'
const FLOWER_YEL = '#FCD757'
const BASKET     = '#9E7A52'
const SMOKE      = '#E8E0D0'

const CABIN_W = 3.6
const CABIN_D = 3.0
const WALL_H  = 1.9
const LOG_R   = 0.13
const LOG_SEG = 7

function Log({ length, color = LOG_LIGHT }: { length: number; color?: string }) {
  return (
    <mesh castShadow receiveShadow>
      <cylinderGeometry args={[LOG_R, LOG_R, length, 8]} />
      <meshStandardMaterial color={color} roughness={0.92} flatShading />
    </mesh>
  )
}

function StoneBlock({ size }: { size: [number, number, number] }) {
  return (
    <mesh castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={STONE} roughness={0.95} flatShading />
    </mesh>
  )
}

function ChimneySmoke({ origin }: { origin: [number, number, number] }) {
  // Sub-A fix: useRef-in-array-literal (works but ESLint-flagged).
  // Single ref + array via callback.
  const refs = useRef<Array<THREE.Mesh | null>>([])
  useFrame((s) => {
    const t = s.clock.elapsedTime
    // V2 wave 3: smoke also reacts to gusts — drifts harder laterally
    // and rises slightly faster when wind kicks up.
    const gust = getGust(t)
    const driftBoost = 1 + gust * 2.0
    const riseBoost = 1 + gust * 0.3
    refs.current.forEach((m, i) => {
      if (!m) return
      const phase = (t * 0.3 * riseBoost + i * 0.6) % 3
      m.position.y = origin[1] + phase * 1.3
      m.position.x = origin[0] + Math.sin(t * 0.7 + i) * 0.15 * driftBoost + phase * 0.05 * driftBoost
      m.position.z = origin[2] + Math.cos(t * 0.5 + i * 0.7) * 0.10 * driftBoost
      const scale = 0.2 + phase * 0.4
      m.scale.setScalar(scale)
      ;(m.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.42 - phase * 0.14)
    })
  })
  return (
    <group>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} ref={(el) => { refs.current[i] = el }}>
          {/* Sub-A fix: base sphere 0.5 → 0.25 so first puff is wispy
              not a golf ball; meshBasicMaterial (unlit) so smoke
              doesn't flat-shade dark on the shadow side; opacity 0.5
              → 0.35 starting. */}
          <sphereGeometry args={[0.25, 8, 6]} />
          <meshBasicMaterial color={SMOKE} transparent opacity={0.35} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

// V2 wave-3 perf fix: 3×4 firewood pile as 2 InstancedMesh draws
// (logs + end-grain caps) instead of 24 individual mesh nodes.
function FirewoodPile() {
  const logsRef = useRef<THREE.InstancedMesh>(null)
  const capsRef = useRef<THREE.InstancedMesh>(null)
  // Build geometries once
  const logGeo  = useMemo(() => new THREE.CylinderGeometry(0.07, 0.07, 0.32, 8), [])
  const capGeo  = useMemo(() => new THREE.CylinderGeometry(0.07, 0.07, 0.02, 8), [])
  const logMatLight = useMemo(() => new THREE.MeshStandardMaterial({ color: LOG_LIGHT, roughness: 0.92 }), [])
  const logMatDark  = useMemo(() => new THREE.MeshStandardMaterial({ color: LOG_DARK,  roughness: 0.92 }), [])
  // Two InstancedMesh, one per color (12 logs total split by parity)
  // Actually simpler: per-instance color via setColorAt. Single mesh.
  const matLog = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.92 }), [])
  const matCap = useMemo(() => new THREE.MeshStandardMaterial({ color: LOG_END, flatShading: true }), [])

  useEffect(() => {
    const lm = logsRef.current
    const cm = capsRef.current
    if (!lm || !cm) return
    const dummy = new THREE.Object3D()
    const cLight = new THREE.Color(LOG_LIGHT)
    const cDark  = new THREE.Color(LOG_DARK)
    let idx = 0
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 3; col++) {
        dummy.position.set(0, 0.12 + row * 0.16, -0.25 + col * 0.18)
        dummy.rotation.set(Math.PI / 2, 0, 0)
        dummy.scale.set(1, 1, 1)
        dummy.updateMatrix()
        lm.setMatrixAt(idx, dummy.matrix)
        lm.setColorAt(idx, (row + col) % 2 ? cLight : cDark)

        // End-grain cap, offset on x
        dummy.position.set(0.16, 0.12 + row * 0.16, -0.25 + col * 0.18)
        dummy.rotation.set(0, 0, Math.PI / 2)
        dummy.updateMatrix()
        cm.setMatrixAt(idx, dummy.matrix)
        idx++
      }
    }
    lm.instanceMatrix.needsUpdate = true
    if (lm.instanceColor) lm.instanceColor.needsUpdate = true
    cm.instanceMatrix.needsUpdate = true
  }, [])

  // Dispose on unmount
  useEffect(() => () => {
    logGeo.dispose()
    capGeo.dispose()
    matLog.dispose()
    matCap.dispose()
    logMatLight.dispose()
    logMatDark.dispose()
  }, [logGeo, capGeo, matLog, matCap, logMatLight, logMatDark])

  return (
    <>
      <instancedMesh ref={logsRef} args={[logGeo, matLog, 12]} castShadow />
      <instancedMesh ref={capsRef} args={[capGeo, matCap, 12]} />
    </>
  )
}

export default function Cabin() {
  const z = getZone('chat')
  const [x, zPos] = z.pos

  const logsPerSide = LOG_SEG
  const logSpacing = LOG_R * 2 * 0.95
  const rowYs: number[] = []
  for (let i = 0; i < logsPerSide; i++) {
    rowYs.push(0.32 + LOG_R + i * logSpacing)
  }

  const doorW = 0.95
  const doorH = 1.5

  return (
    <group position={[x, 0, zPos]}>
      {/* === Stone foundation course === */}
      {[
        [-CABIN_W/2 + 0.15, 0.15, -CABIN_D/2 + 0.15, 0.5, 0.3, 0.5],
        [ CABIN_W/2 - 0.15, 0.15, -CABIN_D/2 + 0.15, 0.5, 0.3, 0.5],
        [-CABIN_W/2 + 0.15, 0.15,  CABIN_D/2 - 0.15, 0.5, 0.3, 0.5],
        [ CABIN_W/2 - 0.15, 0.15,  CABIN_D/2 - 0.15, 0.5, 0.3, 0.5],
        [-0.8, 0.15, -CABIN_D/2 + 0.15, 0.6, 0.3, 0.45],
        [ 0.8, 0.15, -CABIN_D/2 + 0.15, 0.6, 0.3, 0.45],
        [-CABIN_W/2 + 0.15, 0.15, 0, 0.45, 0.3, 0.6],
        [ CABIN_W/2 - 0.15, 0.15, 0, 0.45, 0.3, 0.6],
        [-0.8, 0.15,  CABIN_D/2 - 0.15, 0.6, 0.3, 0.45],
        [ 0.8, 0.15,  CABIN_D/2 - 0.15, 0.6, 0.3, 0.45],
      ].map((p, i) => (
        <group key={`f${i}`} position={[p[0] as number, p[1] as number, p[2] as number]}>
          <StoneBlock size={[p[3] as number, p[4] as number, p[5] as number]} />
        </group>
      ))}

      {/* Floor */}
      <mesh position={[0, 0.31, 0]} receiveShadow>
        <boxGeometry args={[CABIN_W - 0.2, 0.04, CABIN_D - 0.2]} />
        <meshStandardMaterial color={PLANK} roughness={0.9} />
      </mesh>

      {/* === Chinking strips between log rows === */}
      {rowYs.slice(0, -1).map((y, i) => {
        const cy = y + logSpacing / 2
        return (
          <group key={`ch${i}`}>
            {/* North wall chinking */}
            <mesh position={[0, cy, -CABIN_D/2 + LOG_R + 0.005]}>
              <boxGeometry args={[CABIN_W - 0.04, 0.04, 0.04]} />
              <meshStandardMaterial color={CHINKING} roughness={0.95} />
            </mesh>
            {/* South */}
            <mesh position={[0, cy, CABIN_D/2 - LOG_R - 0.005]}>
              <boxGeometry args={[CABIN_W - 0.04, 0.04, 0.04]} />
              <meshStandardMaterial color={CHINKING} roughness={0.95} />
            </mesh>
            {/* West */}
            <mesh position={[-CABIN_W/2 + LOG_R + 0.005, cy, 0]}>
              <boxGeometry args={[0.04, 0.04, CABIN_D - 0.04]} />
              <meshStandardMaterial color={CHINKING} roughness={0.95} />
            </mesh>
            {/* East */}
            <mesh position={[CABIN_W/2 - LOG_R - 0.005, cy, 0]}>
              <boxGeometry args={[0.04, 0.04, CABIN_D - 0.04]} />
              <meshStandardMaterial color={CHINKING} roughness={0.95} />
            </mesh>
          </group>
        )
      })}

      {/* === Log end-grain caps at all 4 corners === */}
      {[
        [-CABIN_W/2 + LOG_R, -CABIN_D/2 + LOG_R],
        [ CABIN_W/2 - LOG_R, -CABIN_D/2 + LOG_R],
        [-CABIN_W/2 + LOG_R,  CABIN_D/2 - LOG_R],
        [ CABIN_W/2 - LOG_R,  CABIN_D/2 - LOG_R],
      ].map(([cx, cz], ci) => (
        <group key={`end${ci}`}>
          {rowYs.map((y, i) => (
            <mesh key={`e${ci}-${i}`} position={[cx, y, cz]}>
              <cylinderGeometry args={[LOG_R + 0.005, LOG_R + 0.005, 0.02, 8]} />
              <meshStandardMaterial color={LOG_END} roughness={0.92} flatShading />
            </mesh>
          ))}
        </group>
      ))}

      {/* === Stacked logs — back, west, east walls === */}
      {rowYs.map((y, i) => (
        <group key={`bw${i}`} position={[0, y, -CABIN_D/2 + LOG_R]} rotation={[0, 0, Math.PI / 2]}>
          <Log length={CABIN_W} color={i % 2 ? LOG_LIGHT : LOG_DARK} />
        </group>
      ))}
      {rowYs.map((y, i) => (
        <group key={`ww${i}`} position={[-CABIN_W/2 + LOG_R, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <Log length={CABIN_D} color={i % 2 ? LOG_DARK : LOG_LIGHT} />
        </group>
      ))}
      {rowYs.map((y, i) => (
        <group key={`ew${i}`} position={[CABIN_W/2 - LOG_R, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <Log length={CABIN_D} color={i % 2 ? LOG_DARK : LOG_LIGHT} />
        </group>
      ))}

      {/* === Front wall with door cut-out === */}
      {rowYs.map((y, i) => {
        const aboveDoor = y > 0.32 + doorH
        if (aboveDoor) {
          return (
            <group key={`fw${i}`} position={[0, y, CABIN_D/2 - LOG_R]} rotation={[0, 0, Math.PI / 2]}>
              <Log length={CABIN_W} color={i % 2 ? LOG_LIGHT : LOG_DARK} />
            </group>
          )
        }
        const stripW = (CABIN_W - doorW) / 2 - 0.1
        return (
          <group key={`fw${i}`}>
            <group position={[-CABIN_W/2 + stripW/2 + 0.05, y, CABIN_D/2 - LOG_R]} rotation={[0, 0, Math.PI / 2]}>
              <Log length={stripW} color={i % 2 ? LOG_LIGHT : LOG_DARK} />
            </group>
            <group position={[ CABIN_W/2 - stripW/2 - 0.05, y, CABIN_D/2 - LOG_R]} rotation={[0, 0, Math.PI / 2]}>
              <Log length={stripW} color={i % 2 ? LOG_LIGHT : LOG_DARK} />
            </group>
          </group>
        )
      })}

      {/* === Door — painted red as the scene's hero accent ===
          Sub-A wave-3 fix: at dusk, multiple warm emissives (window,
          dormer, lanterns, firefly) compete; door is the only non-
          emissive warm anchor and visually disappears. Added tiny
          DOOR_RED emissive 0.15 so the door HOLDS its hero status
          across both themes without screaming. */}
      <group position={[0, 0.32 + doorH/2, CABIN_D/2]}>
        {[-0.3, -0.1, 0.1, 0.3].map((dx, i) => (
          <mesh key={`dp${i}`} position={[dx, 0, 0.01]} castShadow>
            <boxGeometry args={[0.21, doorH, 0.04]} />
            <meshStandardMaterial
              color={DOOR_RED}
              roughness={0.7}
              emissive={DOOR_RED}
              emissiveIntensity={0.15}
            />
          </mesh>
        ))}
        {[-doorH/2 + 0.2, doorH/2 - 0.2].map((dy, i) => (
          <mesh key={`ds${i}`} position={[0, dy, 0.04]} castShadow>
            <boxGeometry args={[doorW + 0.04, 0.08, 0.025]} />
            <meshStandardMaterial color={IRON} roughness={0.25} metalness={0.9} />
          </mesh>
        ))}
        <mesh position={[0.3, 0, 0.07]} castShadow>
          <sphereGeometry args={[0.05, 8, 6]} />
          <meshStandardMaterial color={IRON} roughness={0.2} metalness={0.95} />
        </mesh>
      </group>

      {/* Doormat */}
      <mesh position={[0, 0.33, CABIN_D/2 + 0.25]} receiveShadow>
        <boxGeometry args={[0.9, 0.02, 0.5]} />
        <meshStandardMaterial color="#7E5E40" roughness={0.95} />
      </mesh>
      {/* Doormat fringe (small lines) */}
      {[-0.4, -0.27, -0.14, 0, 0.14, 0.27, 0.4].map((dx, i) => (
        <mesh key={`dm${i}`} position={[dx, 0.34, CABIN_D/2 + 0.46]}>
          <boxGeometry args={[0.04, 0.005, 0.06]} />
          <meshStandardMaterial color="#4F3B26" />
        </mesh>
      ))}

      {/* === Window — recessed with interior room + warm glow + silhouette === */}
      <group position={[CABIN_W/2 - 0.08, 1.05, -0.5]}>
        {/* Recessed interior cavity */}
        <mesh position={[0, 0, -0.05]}>
          <boxGeometry args={[0.6, 0.6, 0.16]} />
          <meshStandardMaterial color="#3A2516" roughness={0.95} />
        </mesh>
        {/* Glowing back wall of cavity. Sub-A: 4 stacked warm emitters
            (back wall + front pane + pointLight + spotLight) made window
            the brightest pixel, competing with the hero red door. Cut
            back-wall emissive 1.2 → 0.5 to rebalance toward the door. */}
        <mesh position={[0, 0, -0.12]}>
          <planeGeometry args={[0.55, 0.55]} />
          <meshStandardMaterial color={WINDOW} emissive={WINDOW} emissiveIntensity={0.5} roughness={0.5} />
        </mesh>
        {/* Silhouette inside — a kettle on a stove */}
        <mesh position={[-0.1, -0.1, -0.10]}>
          <boxGeometry args={[0.12, 0.16, 0.02]} />
          <meshStandardMaterial color="#1a1410" />
        </mesh>
        <mesh position={[0.08, -0.05, -0.10]}>
          <sphereGeometry args={[0.08, 8, 6]} />
          <meshStandardMaterial color="#1a1410" />
        </mesh>
        {/* Interior point light visible through window. Sub-A: 1.4 →
            0.7 — keeps the warm glow without making window dominant. */}
        <pointLight position={[0, 0, -0.15]} color="#FFD58F" intensity={0.7} distance={3} decay={2} />
        {/* Spotlight at window mouth — spills warm glow onto porch */}
        <spotLight
          position={[0, 0, 0.05]}
          target-position={[0.4, -1.0, 1.5]}
          angle={0.7}
          penumbra={0.5}
          intensity={0.6}
          color="#FFE4A8"
          distance={3}
          decay={2}
        />
        {/* Window frame (glass + mullions in front of cavity) */}
        <mesh position={[0, 0, 0.05]}>
          <planeGeometry args={[0.6, 0.6]} />
          <meshStandardMaterial color={WINDOW} emissive={WINDOW} emissiveIntensity={0.55} transparent opacity={0.4} roughness={0.5} />
        </mesh>
        {[
          [0, 0.32, 0.7, 0.06],
          [0, -0.32, 0.7, 0.06],
          [-0.32, 0, 0.06, 0.7],
          [ 0.32, 0, 0.06, 0.7],
          [0, 0, 0.7, 0.04],
          [0, 0, 0.04, 0.7],
        ].map((p, i) => (
          <mesh key={`wf${i}`} position={[p[0], p[1], 0.07]}>
            <boxGeometry args={[p[2], p[3], 0.03]} />
            <meshStandardMaterial color={PLANK} roughness={0.85} />
          </mesh>
        ))}
      </group>

      {/* === Roof — geometrically-correct gable rebuild ===
          Two slabs that meet exactly at the ridge (was off by 0.7 unit
          before — old slabs were positioned by guess, this one uses
          atan2). Two real triangle gables via shapeGeometry (was 3-segment
          cone fake). Ridge cap + finials + dormer. */}
      {(() => {
        const ROOF_RISE = 1.05
        const X_OVERHANG = 0.32
        const Z_OVERHANG = 0.35
        const slabHalfWidth = CABIN_W / 2 + X_OVERHANG
        const slabLen = Math.hypot(slabHalfWidth, ROOF_RISE)
        const slabTilt = Math.atan2(ROOF_RISE, slabHalfWidth)
        const slabDepth = CABIN_D + 2 * Z_OVERHANG
        const SLAB_THICK = 0.1
        const N_ROWS = 6

        const gableShape = new THREE.Shape()
        gableShape.moveTo(-CABIN_W / 2, 0)
        gableShape.lineTo(CABIN_W / 2, 0)
        gableShape.lineTo(0, ROOF_RISE)
        gableShape.closePath()

        return (
          <>
            {/* Two roof slabs that meet at the ridge */}
            {(['left', 'right'] as const).map((side) => {
              const sign = side === 'left' ? -1 : 1
              // Pivot at the OUTER bottom corner (the eave). Tilt so the
              // INNER top edge lands at (0, WALL_H + ROOF_RISE, 0).
              // LEFT (sign=-1): tilt CCW (+slabTilt). RIGHT: tilt CW (-slabTilt).
              return (
                <group
                  key={`slab${side}`}
                  position={[sign * slabHalfWidth, WALL_H, 0]}
                  rotation={[0, 0, -sign * slabTilt]}
                >
                  {/* Slab — extends from pivot toward the ridge.
                      LEFT extends in local +X, RIGHT extends in local -X. */}
                  <mesh position={[-sign * slabLen / 2, 0, 0]} castShadow receiveShadow>
                    <boxGeometry args={[slabLen, SLAB_THICK, slabDepth]} />
                    <meshStandardMaterial color={SHINGLE_BASE} roughness={0.92} />
                  </mesh>

                  {/* Shingle row hint lines (narrow dark strips, perpendicular
                      to slope, running the full slab depth) */}
                  {Array.from({ length: N_ROWS - 1 }).map((_, i) => {
                    const frac = (i + 1) / N_ROWS
                    const xLocal = -sign * frac * slabLen
                    return (
                      <mesh
                        key={`rs${side}${i}`}
                        position={[xLocal, SLAB_THICK / 2 + 0.005, 0]}
                      >
                        <boxGeometry args={[0.025, 0.025, slabDepth - 0.08]} />
                        <meshStandardMaterial color={SHINGLE_DARK} roughness={0.95} />
                      </mesh>
                    )
                  })}

                  {/* 3 large moss patches (intentional weathering, not random
                      sprinkle). frac_eave_to_ridge × frac_along_depth. */}
                  {[
                    [0.30, 0.28],
                    [0.55, -0.42],
                    [0.78, 0.18],
                  ].map((p, i) => (
                    <mesh
                      key={`mp${side}${i}`}
                      position={[-sign * p[0] * slabLen, SLAB_THICK / 2 + 0.008, p[1] * slabDepth]}
                      castShadow
                    >
                      <boxGeometry args={[0.32, 0.02, 0.42]} />
                      <meshStandardMaterial color={SHINGLE_MOSS} roughness={0.92} flatShading />
                    </mesh>
                  ))}
                </group>
              )
            })}

            {/* Front + back gable triangles — REAL triangle shapes */}
            {[CABIN_D / 2 + 0.005, -(CABIN_D / 2 + 0.005)].map((zz, i) => (
              <mesh
                key={`gable${i}`}
                position={[0, WALL_H, zz]}
                rotation={[0, i === 1 ? Math.PI : 0, 0]}
                castShadow
                receiveShadow
              >
                <shapeGeometry args={[gableShape]} />
                <meshStandardMaterial
                  color={LOG_DARK}
                  roughness={0.92}
                  side={THREE.DoubleSide}
                  flatShading
                />
              </mesh>
            ))}

            {/* Ridge cap along the top — sits exactly on the meeting line */}
            <mesh position={[0, WALL_H + ROOF_RISE + 0.04, 0]} castShadow>
              <boxGeometry args={[0.26, 0.14, slabDepth + 0.04]} />
              <meshStandardMaterial color={LOG_DARK} roughness={0.9} />
            </mesh>

            {/* Two small dark finial caps at each end of the ridge */}
            {[(CABIN_D / 2 + Z_OVERHANG + 0.04), -(CABIN_D / 2 + Z_OVERHANG + 0.04)].map((zz, i) => (
              <mesh
                key={`fnl${i}`}
                position={[0, WALL_H + ROOF_RISE + 0.2, zz]}
                castShadow
              >
                <coneGeometry args={[0.1, 0.22, 4]} />
                <meshStandardMaterial color={STONE_DK} metalness={0.4} roughness={0.55} flatShading />
              </mesh>
            ))}

            {/* Dormer skylight on LEFT (front) slab — position computed
                from slab pivot + 55% up the slope. Uses the exact same
                slabTilt so the dormer base sits flush on the slab face. */}
            {(() => {
              const dormerSlopeFrac = 0.55
              const dx = -slabHalfWidth + dormerSlopeFrac * slabHalfWidth   // -slabHalfWidth + 55% * slabHalfWidth
              const dy = WALL_H + dormerSlopeFrac * ROOF_RISE
              const dz = -CABIN_D * 0.2
              return (
                <group
                  position={[dx, dy + SLAB_THICK + 0.02, dz]}
                  rotation={[0, 0, slabTilt]}
                >
                  {/* Dormer box body */}
                  <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
                    <boxGeometry args={[0.7, 0.42, 0.56]} />
                    <meshStandardMaterial color={LOG_LIGHT} roughness={0.9} />
                  </mesh>
                  {/* Tiny pyramidal roof above dormer */}
                  <mesh position={[0, 0.5, 0]} castShadow>
                    <coneGeometry args={[0.42, 0.2, 4]} />
                    <meshStandardMaterial color={SHINGLE_DARK} roughness={0.95} flatShading />
                  </mesh>
                  {/* Glowing window pane */}
                  <mesh position={[0, 0.24, 0.282]}>
                    <planeGeometry args={[0.45, 0.24]} />
                    <meshStandardMaterial
                      color={WINDOW}
                      emissive={WINDOW}
                      emissiveIntensity={0.55}
                      roughness={0.4}
                      metalness={0.2}
                    />
                  </mesh>
                  {/* Window cross-frame */}
                  <mesh position={[0, 0.24, 0.288]}>
                    <boxGeometry args={[0.45, 0.02, 0.005]} />
                    <meshStandardMaterial color={LOG_DARK} roughness={0.9} />
                  </mesh>
                  <mesh position={[0, 0.24, 0.288]}>
                    <boxGeometry args={[0.02, 0.24, 0.005]} />
                    <meshStandardMaterial color={LOG_DARK} roughness={0.9} />
                  </mesh>
                </group>
              )
            })()}
          </>
        )
      })()}

      {/* === Chimney === */}
      <group position={[CABIN_W / 2 - 0.5, 0, -CABIN_D / 4]}>
        {Array.from({ length: 7 }).map((_, i) => (
          <mesh key={`chs${i}`} position={[0, 0.5 + i * 0.32, 0]} castShadow>
            <boxGeometry args={[0.45 + (i % 2 ? 0.03 : -0.03), 0.28, 0.45 + (i % 2 ? -0.02 : 0.02)]} />
            <meshStandardMaterial color={i % 2 ? STONE : STONE_DK} roughness={0.95} flatShading />
          </mesh>
        ))}
        <mesh position={[0, 0.5 + 7 * 0.32 + 0.06, 0]} castShadow>
          <boxGeometry args={[0.55, 0.08, 0.55]} />
          <meshStandardMaterial color={STONE_DK} roughness={0.95} />
        </mesh>
        {/* Smoke */}
        <ChimneySmoke origin={[0, 0.5 + 7 * 0.32 + 0.3, 0]} />
      </group>

      {/* === Firewood pile against chimney ===
          Sub-A perf fix: was 48 individual meshes (12 logs × 2 colors
          + 12 end-grain caps × 2 = 48 draws). Now 2 InstancedMesh:
          one for logs (12), one for end-grain caps (12). 24 draws →
          2 draws. */}
      <group position={[CABIN_W / 2 + 0.4, 0, -CABIN_D / 4 + 0.05]}>
        <FirewoodPile />
      </group>

      {/* === Front porch === */}
      <group position={[0, 0, CABIN_D / 2 + 0.6]}>
        <mesh position={[0, 0.28, 0]} receiveShadow castShadow>
          <boxGeometry args={[CABIN_W - 0.2, 0.08, 1.0]} />
          <meshStandardMaterial color={PLANK} roughness={0.88} />
        </mesh>
        <mesh position={[0, 0.12, 0.6]} castShadow>
          <boxGeometry args={[CABIN_W - 0.6, 0.16, 0.3]} />
          <meshStandardMaterial color={LOG_DARK} roughness={0.9} />
        </mesh>
        {[-(CABIN_W / 2 - 0.2), (CABIN_W / 2 - 0.2)].map((px, i) => (
          <mesh key={`pp${i}`} position={[px, 0.95, 0.4]} castShadow>
            <cylinderGeometry args={[0.08, 0.08, 1.3, 8]} />
            <meshStandardMaterial color={LOG_DARK} roughness={0.9} />
          </mesh>
        ))}
        <mesh position={[0, 1.55, 0.4]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, CABIN_W - 0.2, 8]} />
          <meshStandardMaterial color={LOG_DARK} roughness={0.9} />
        </mesh>
        {[-1.2, -0.6, 0.6, 1.2].map((bx, i) => (
          <mesh key={`bal${i}`} position={[bx, 0.55, 0.45]} castShadow>
            <cylinderGeometry args={[0.045, 0.045, 0.55, 6]} />
            <meshStandardMaterial color={PLANK} roughness={0.9} />
          </mesh>
        ))}
        {[-1.0, 1.0].map((rx, i) => (
          <mesh key={`tr${i}`} position={[rx, 0.83, 0.45]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.045, 0.045, 0.4, 6]} />
            <meshStandardMaterial color={PLANK} roughness={0.9} />
          </mesh>
        ))}

        {/* V2 wave 3: pair of geta sandals beside the door — mirrors
            the onsen 脱衣場 geta, implying "Airing's home" instead of
            "Airing's at the spring". */}
        <group position={[0.6, 0.34, -0.32]}>
          {[-0.10, 0.10].map((gx, i) => (
            <group key={`pgeta${i}`} position={[gx, 0, i * 0.05]} rotation={[0, i === 0 ? 0.10 : -0.12, 0]}>
              <mesh castShadow>
                <boxGeometry args={[0.18, 0.022, 0.09]} />
                <meshStandardMaterial color="#8E6A45" roughness={0.88} />
              </mesh>
              {/* Two teeth */}
              <mesh position={[-0.055, -0.022, 0]}>
                <boxGeometry args={[0.022, 0.035, 0.09]} />
                <meshStandardMaterial color="#5D452B" roughness={0.92} />
              </mesh>
              <mesh position={[0.055, -0.022, 0]}>
                <boxGeometry args={[0.022, 0.035, 0.09]} />
                <meshStandardMaterial color="#5D452B" roughness={0.92} />
              </mesh>
              {/* V-thong straps */}
              <mesh position={[0, 0.016, 0.022]} rotation={[0.4, 0, 0]}>
                <cylinderGeometry args={[0.003, 0.003, 0.055, 4]} />
                <meshStandardMaterial color="#3A2818" roughness={0.85} />
              </mesh>
              <mesh position={[0, 0.016, -0.022]} rotation={[-0.4, 0, 0]}>
                <cylinderGeometry args={[0.003, 0.003, 0.055, 4]} />
                <meshStandardMaterial color="#3A2818" roughness={0.85} />
              </mesh>
            </group>
          ))}
        </group>

        {/* === Rocking chair — actually rocks now === */}
        <Rocker>
        <group position={[-0.9, 0.35, 0]}>
          {/* Seat */}
          <mesh position={[0, 0.18, 0]} castShadow>
            <boxGeometry args={[0.5, 0.08, 0.45]} />
            <meshStandardMaterial color={ROCKER} roughness={0.88} />
          </mesh>
          {/* Back rest — vertical slats */}
          {[-0.18, -0.06, 0.06, 0.18].map((bx, i) => (
            <mesh key={`bk${i}`} position={[bx, 0.45, -0.18]} castShadow>
              <boxGeometry args={[0.04, 0.46, 0.04]} />
              <meshStandardMaterial color={ROCKER} roughness={0.88} />
            </mesh>
          ))}
          {/* Top rail */}
          <mesh position={[0, 0.68, -0.18]} castShadow>
            <boxGeometry args={[0.5, 0.06, 0.04]} />
            <meshStandardMaterial color={ROCKER} roughness={0.88} />
          </mesh>
          {/* Curved runners (rockers). Sub-A fix: runners now rotated
              [0, π/2, 0] so the arc faces FORE-AFT (z axis), matching
              the rocking rotation in Rocker (which rotates X = pitch).
              Previously runners curved in XY plane while chair rocked
              on X → chair tipped sideways while runners stayed flat. */}
          {[-0.18, 0.18].map((rx, i) => (
            <mesh key={`rk${i}`} position={[rx, 0.04, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
              <torusGeometry args={[0.3, 0.025, 4, 12, Math.PI]} />
              <meshStandardMaterial color={ROCKER} roughness={0.88} />
            </mesh>
          ))}
          {/* V2 A1: tea cup with rising steam — inside Rocker so it
              rocks with the chair. "Airing just got up to greet you." */}
          <RockerTeaCup />
        </group>
        </Rocker>

        {/* V2 wave 3: small bonsai in a ceramic pot on the right side
            of the porch — balances the rocker on the left visually +
            adds a careful-keeper detail (bonsai = years of attention). */}
        <group position={[1.1, 0.34, 0.15]}>
          {/* Ceramic pot — earthen brown with tan rim */}
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.11, 0.09, 0.10, 12]} />
            <meshStandardMaterial color="#7E5A38" roughness={0.92} />
          </mesh>
          {/* Pot rim */}
          <mesh position={[0, 0.052, 0]}>
            <torusGeometry args={[0.11, 0.012, 4, 16]} />
            <meshStandardMaterial color="#A07840" roughness={0.85} />
          </mesh>
          {/* Soil top */}
          <mesh position={[0, 0.052, 0]}>
            <cylinderGeometry args={[0.10, 0.10, 0.005, 12]} />
            <meshStandardMaterial color="#3A2516" roughness={0.97} />
          </mesh>
          {/* Bonsai trunk — short twisting cylinder */}
          <mesh position={[0.015, 0.13, 0]} rotation={[0.05, 0, 0.15]} castShadow>
            <cylinderGeometry args={[0.014, 0.022, 0.14, 6]} />
            <meshStandardMaterial color="#5D3D1F" roughness={0.94} flatShading />
          </mesh>
          {/* Trunk upper bend */}
          <mesh position={[0.025, 0.20, 0.005]} rotation={[0.10, 0, -0.10]} castShadow>
            <cylinderGeometry args={[0.011, 0.014, 0.07, 6]} />
            <meshStandardMaterial color="#5D3D1F" roughness={0.94} flatShading />
          </mesh>
          {/* Foliage clouds — Sub-A fix: was 3 near-identical greens
              reading as one blob. Pushed contrast (dark/mid/light)
              so the 3 cloud-pruned tiers actually read as tiers. */}
          <mesh position={[0.05, 0.24, 0]} castShadow>
            <sphereGeometry args={[0.07, 10, 8]} />
            <meshStandardMaterial color="#5C8A4C" roughness={0.93} flatShading />
          </mesh>
          <mesh position={[-0.05, 0.21, 0.02]} castShadow>
            <sphereGeometry args={[0.06, 10, 8]} />
            <meshStandardMaterial color="#2E4A26" roughness={0.93} flatShading />
          </mesh>
          <mesh position={[0.07, 0.27, -0.03]} castShadow>
            <sphereGeometry args={[0.045, 10, 8]} />
            <meshStandardMaterial color="#86A668" roughness={0.93} flatShading />
          </mesh>
        </group>

        {/* === Hanging flower basket from awning beam === */}
        <group position={[1.0, 1.3, 0.4]}>
          {/* Hanging chain */}
          <mesh position={[0, 0.18, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.4, 4]} />
            <meshStandardMaterial color={IRON} roughness={0.7} metalness={0.5} />
          </mesh>
          {/* Basket */}
          <mesh position={[0, -0.05, 0]} castShadow>
            <cylinderGeometry args={[0.15, 0.12, 0.16, 10]} />
            <meshStandardMaterial color={BASKET} roughness={0.9} />
          </mesh>
          {/* Flowers + leaves overflowing */}
          <mesh position={[0, 0.04, 0]}>
            <sphereGeometry args={[0.16, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#5A7A4C" roughness={0.94} flatShading />
          </mesh>
          {/* Petals */}
          {[
            [0.08, 0.07, FLOWER_RED],
            [-0.08, 0.06, FLOWER_YEL],
            [0.0, 0.1, FLOWER_RED],
            [0.06, 0.08, FLOWER_YEL],
            [-0.04, 0.09, FLOWER_RED],
          ].map(([px, py, color], i) => (
            <mesh key={`pet${i}`} position={[px as number, py as number, 0]}>
              <sphereGeometry args={[0.04, 6, 5]} />
              <meshStandardMaterial color={color as string} roughness={0.8} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  )
}

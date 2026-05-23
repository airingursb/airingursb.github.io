import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * 樱花树 v2 · 真曲枝 + 千片花瓣
 *
 * 改进点:
 *   - 每棵树独立 seed (mulberry32), 不再"4 棵长一样"
 *   - 枝条用 QuadraticBezierCurve3 + 自定义 taper TubeGeometry, 弯曲收尖
 *   - 花瓣 100+ per twig (umbel 状簇), hero 总量 ~10000
 *   - hero / accent 结构差异显著 (枝数 / 撒展度 / trunk 粗度)
 *   - 共享 canvas-drawn petal texture (alphaMap)
 */

/* ─────────────────────────────────────────────────────────────────────
 * seedable PRNG (mulberry32) — 每棵树独立 seed = 真不同
 * ─────────────────────────────────────────────────────────────────────*/
function mulberry32(seed: number) {
  return () => {
    let t = (seed = (seed + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ─────────────────────────────────────────────────────────────────────
 * Petal texture (canvas, shared across all sakura)
 * ─────────────────────────────────────────────────────────────────────*/
let sharedPetalTex: THREE.CanvasTexture | null = null;
function getPetalTexture(): THREE.CanvasTexture {
  if (sharedPetalTex) return sharedPetalTex;
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);
  ctx.translate(size / 2, size / 2);

  for (let i = 0; i < 5; i++) {
    ctx.save();
    ctx.rotate((i / 5) * Math.PI * 2);
    const grad = ctx.createRadialGradient(0, -size * 0.32, 1, 0, -size * 0.22, size * 0.36);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.5, '#fce0ea');
    grad.addColorStop(1, '#f6a8c4');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-size * 0.2, -size * 0.1, -size * 0.22, -size * 0.36, 0, -size * 0.45);
    ctx.bezierCurveTo(size * 0.22, -size * 0.36, size * 0.2, -size * 0.1, 0, 0);
    ctx.fill();
    ctx.strokeStyle = 'rgba(232, 130, 165, 0.4)';
    ctx.lineWidth = size * 0.008;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -size * 0.4);
    ctx.stroke();
    ctx.restore();
  }

  // shrub center disc
  const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.11);
  cg.addColorStop(0, '#fce3a8');
  cg.addColorStop(0.55, '#e76d8e');
  cg.addColorStop(1, 'rgba(231,109,142,0)');
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.11, 0, Math.PI * 2);
  ctx.fill();

  // stamens
  ctx.strokeStyle = '#fbd373';
  ctx.lineWidth = size * 0.015;
  ctx.lineCap = 'round';
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * size * 0.13, Math.sin(a) * size * 0.13);
    ctx.stroke();
    ctx.fillStyle = '#fdf6a8';
    ctx.beginPath();
    ctx.arc(Math.cos(a) * size * 0.14, Math.sin(a) * size * 0.14, size * 0.02, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  sharedPetalTex = tex;
  return tex;
}

/* ─────────────────────────────────────────────────────────────────────
 * Make a tapered tube along ANY THREE.Curve (single continuous mesh, no gaps)
 * Used for trunk (CatmullRom through multiple sway points) and branches (Bezier)
 * ─────────────────────────────────────────────────────────────────────*/
function makeTaperedTube(
  curve: THREE.Curve<THREE.Vector3>,
  r0: number,
  r1: number,
  segments = 12,
  radialSegments = 8,
): THREE.BufferGeometry {
  const geo = new THREE.TubeGeometry(curve, segments, 1, radialSegments, false);
  const pos = geo.attributes.position;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const r = r0 + (r1 - r0) * t;
    const cp = curve.getPointAt(t);
    for (let j = 0; j <= radialSegments; j++) {
      const idx = i * (radialSegments + 1) + j;
      const px = pos.getX(idx) - cp.x;
      const py = pos.getY(idx) - cp.y;
      const pz = pos.getZ(idx) - cp.z;
      pos.setXYZ(idx, cp.x + px * r, cp.y + py * r, cp.z + pz * r);
    }
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/* ─────────────────────────────────────────────────────────────────────
 * Sakura tree
 * ─────────────────────────────────────────────────────────────────────*/
interface SakuraProps {
  position: [number, number, number];
  seed?: number;     // per-tree unique → different structure
  size?: number;
  density?: number;  // 0..1 multiplier on petal count
  rotY?: number;
  hero?: boolean;    // hero = many wide branches, accent = compact
  tint?: THREE.Color | string; // base color tendency
}

interface Branch {
  start: THREE.Vector3;
  control: THREE.Vector3;
  end: THREE.Vector3;
  r0: number;
  r1: number;
}
interface TrunkData {
  points: THREE.Vector3[];
  r0: number;
  r1: number;
}

interface PetalData {
  pos: [number, number, number];
  scale: number;
  rot: [number, number, number];
  tint: THREE.Color;
}

export function Sakura({
  position, seed = 1234, size = 1, density = 1, rotY = 0, hero = false, tint = '#fad9e4',
}: SakuraProps) {
  const tex = useMemo(() => (typeof document !== 'undefined' ? getPetalTexture() : null), []);
  const baseTint = useMemo(() => new THREE.Color(tint as any), [tint]);

  // Build entire tree from seed
  const tree = useMemo(() => {
    const rnd = mulberry32(seed);

    const mainBranches: Branch[] = [];
    const secBranches: Branch[] = [];
    const twigs: Branch[] = [];
    const petals: PetalData[] = [];

    /* TRUNK — single CatmullRom through 6 sway points (no segment gaps) */
    const trunkHeight = hero ? 4.5 + rnd() * 0.8 : 3.0 + rnd() * 0.6;
    const trunkR0 = hero ? 0.55 + rnd() * 0.18 : 0.32 + rnd() * 0.1;
    const trunkR1 = trunkR0 * 0.4;
    const trunkPoints: THREE.Vector3[] = [];
    const swayAmp = hero ? 0.32 : 0.18;
    const swayK = 5; // points along trunk
    for (let i = 0; i <= swayK; i++) {
      const t = i / swayK;
      const y = t * trunkHeight;
      // gentle S-curve via sin offset
      const sx = Math.sin(t * Math.PI * 1.2 + seed * 0.011) * swayAmp * (0.4 + t * 0.6);
      const sz = Math.cos(t * Math.PI * 1.4 + seed * 0.013) * swayAmp * (0.3 + t * 0.7);
      trunkPoints.push(new THREE.Vector3(sx, y, sz));
    }
    const trunkCurve = new THREE.CatmullRomCurve3(trunkPoints, false, 'catmullrom', 0.3);
    const trunkTop = trunkPoints[trunkPoints.length - 1].clone();

    /* MAIN BRANCHES — fan outward from trunk top */
    const mainCount = hero ? 7 + Math.floor(rnd() * 2) : 4 + Math.floor(rnd() * 2);
    for (let i = 0; i < mainCount; i++) {
      const az = (i / mainCount) * Math.PI * 2 + (rnd() - 0.5) * 0.4;
      // direction: mostly outward, slight up
      const upTilt = hero ? 0.35 + rnd() * 0.35 : 0.45 + rnd() * 0.3;
      const dir = new THREE.Vector3(
        Math.cos(az),
        upTilt,
        Math.sin(az),
      ).normalize();
      const len = hero ? 3.0 + rnd() * 1.4 : 1.5 + rnd() * 0.7;
      const end = trunkTop.clone().addScaledVector(dir, len);
      // arch midway control point — bend upward then droop at end (weeping sakura)
      const ctrl = trunkTop.clone().addScaledVector(dir, len * 0.45);
      ctrl.y += hero ? 0.6 + rnd() * 0.4 : 0.3 + rnd() * 0.2;
      // tip droops slightly
      end.y -= hero ? 0.4 + rnd() * 0.4 : 0.2 + rnd() * 0.2;
      mainBranches.push({
        start: trunkTop.clone(), control: ctrl, end,
        r0: hero ? 0.20 + rnd() * 0.05 : 0.13 + rnd() * 0.04,
        r1: hero ? 0.10 + rnd() * 0.02 : 0.06 + rnd() * 0.02,
      });

      /* SECONDARY BRANCHES — 4 per main for hero, 3 for accent */
      const secCount = hero ? 4 : 3;
      for (let s = 0; s < secCount; s++) {
        const tSec = 0.35 + s * 0.18 + rnd() * 0.1;
        const secStart = trunkTop.clone().lerp(end, Math.min(1, tSec));
        const secDir = dir.clone().add(new THREE.Vector3(
          (rnd() - 0.5) * 0.9,
          (rnd() - 0.5) * 0.45,
          (rnd() - 0.5) * 0.9,
        )).normalize();
        const secLen = hero ? 1.3 + rnd() * 0.7 : 0.7 + rnd() * 0.4;
        const secEnd = secStart.clone().addScaledVector(secDir, secLen);
        secEnd.y -= rnd() * 0.3; // slight droop
        const secCtrl = secStart.clone().lerp(secEnd, 0.5)
          .add(new THREE.Vector3(0, rnd() * 0.25, 0));
        secBranches.push({
          start: secStart, control: secCtrl, end: secEnd,
          r0: hero ? 0.09 + rnd() * 0.02 : 0.06 + rnd() * 0.02,
          r1: hero ? 0.04 : 0.025,
        });

        /* TWIGS — 4 per secondary for hero, 3 for accent */
        const twigCount = hero ? 4 : 3;
        for (let tw = 0; tw < twigCount; tw++) {
          const tTwig = 0.4 + tw * 0.18 + rnd() * 0.08;
          const twigStart = secStart.clone().lerp(secEnd, Math.min(1, tTwig));
          const twigDir = secDir.clone().add(new THREE.Vector3(
            (rnd() - 0.5) * 1.0,
            (rnd() - 0.5) * 0.6,
            (rnd() - 0.5) * 1.0,
          )).normalize();
          const twigLen = hero ? 0.6 + rnd() * 0.3 : 0.4 + rnd() * 0.2;
          const twigEnd = twigStart.clone().addScaledVector(twigDir, twigLen);
          twigEnd.y -= rnd() * 0.25;
          const twigCtrl = twigStart.clone().lerp(twigEnd, 0.5)
            .add(new THREE.Vector3(0, rnd() * 0.15, 0));
          twigs.push({
            start: twigStart, control: twigCtrl, end: twigEnd,
            r0: hero ? 0.035 : 0.025,
            r1: 0.015,
          });

          /* PETALS — dense umbel at twig end + scattered along */
          const petalCount = Math.floor(((hero ? 90 : 55) + rnd() * 35) * density);
          for (let pi = 0; pi < petalCount; pi++) {
            // 75% bunched near the end of twig, 25% along
            const along = pi < petalCount * 0.75
              ? 0.82 + rnd() * 0.18
              : 0.3 + rnd() * 0.5;
            const onTwig = twigStart.clone().lerp(twigEnd, along);
            // 3D scatter as umbel: tighter near twig
            const r = (1 - along) * 0.15 + rnd() * 0.55;
            const azP = rnd() * Math.PI * 2;
            const elP = (rnd() - 0.5) * 0.9;
            const off = new THREE.Vector3(
              Math.cos(azP) * Math.cos(elP) * r,
              Math.sin(elP) * r - 0.12, // slight droop in cluster
              Math.sin(azP) * Math.cos(elP) * r,
            );
            const ppos = onTwig.clone().add(off);
            // tint variation around base
            const r_ = baseTint.r * (0.88 + rnd() * 0.18);
            const g_ = baseTint.g * (0.85 + rnd() * 0.2);
            const b_ = baseTint.b * (0.9 + rnd() * 0.15);
            petals.push({
              pos: [ppos.x, ppos.y, ppos.z],
              scale: 0.16 + rnd() * 0.16,
              rot: [rnd() * Math.PI * 2, rnd() * Math.PI * 2, rnd() * Math.PI * 2],
              tint: new THREE.Color(
                Math.min(1, r_), Math.min(1, g_), Math.min(1, b_),
              ),
            });
          }
        }
      }
    }

    /* CANOPY FLUFF — background petals that fill the gaps between branches.
     * Distributed in a flattened ellipsoid (umbrella shape) centered above
     * the trunk top. Density tuned to make the canopy read as a continuous
     * cloud silhouette rather than spiky branch+blob alternation.
     */
    const fluffCount = Math.floor((hero ? 1400 : 700) * density);
    const canopyRX = hero ? 5.2 : 2.6;   // horizontal radius (umbrella spread)
    const canopyRY = hero ? 2.0 : 1.4;   // vertical radius (flatter for umbrella)
    const canopyCY = trunkTop.y + (hero ? 1.4 : 1.0); // center height above trunk
    for (let i = 0; i < fluffCount; i++) {
      // sample inside ellipsoid using rejection — biased outward for umbrella shape
      let x = 0, y = 0, z = 0, ok = false;
      for (let try_ = 0; try_ < 4; try_++) {
        x = (rnd() * 2 - 1) * canopyRX;
        z = (rnd() * 2 - 1) * canopyRX;
        y = (rnd() * 2 - 1) * canopyRY;
        const e = (x * x + z * z) / (canopyRX * canopyRX) + (y * y) / (canopyRY * canopyRY);
        if (e <= 1) { ok = true; break; }
      }
      if (!ok) continue;
      // tint variation
      const r_ = baseTint.r * (0.88 + rnd() * 0.18);
      const g_ = baseTint.g * (0.85 + rnd() * 0.2);
      const b_ = baseTint.b * (0.9 + rnd() * 0.15);
      petals.push({
        pos: [x, canopyCY + y, z],
        scale: 0.22 + rnd() * 0.18, // slightly bigger than tip petals to fill
        rot: [rnd() * Math.PI * 2, rnd() * Math.PI * 2, rnd() * Math.PI * 2],
        tint: new THREE.Color(Math.min(1, r_), Math.min(1, g_), Math.min(1, b_)),
      });
    }

    return { trunkCurve, trunkR0, trunkR1, mainBranches, secBranches, twigs, petals };
  }, [seed, hero, density, baseTint]);

  // build geometries (memoized — only when tree changes)
  const trunkGeo = useMemo(
    () => makeTaperedTube(tree.trunkCurve, tree.trunkR0, tree.trunkR1, 28, 12),
    [tree],
  );
  const mainGeos = useMemo(
    () => tree.mainBranches.map((b) => makeTaperedTube(
      new THREE.QuadraticBezierCurve3(b.start, b.control, b.end),
      b.r0, b.r1, 10, 7,
    )),
    [tree],
  );
  const secGeos = useMemo(
    () => tree.secBranches.map((b) => makeTaperedTube(
      new THREE.QuadraticBezierCurve3(b.start, b.control, b.end),
      b.r0, b.r1, 8, 6,
    )),
    [tree],
  );
  const twigGeos = useMemo(
    () => tree.twigs.map((b) => makeTaperedTube(
      new THREE.QuadraticBezierCurve3(b.start, b.control, b.end),
      b.r0, b.r1, 6, 5,
    )),
    [tree],
  );

  // wind sway — root-only rotation, cheap
  const groupRef = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!groupRef.current) return;
    const t = performance.now() / 1000;
    groupRef.current.rotation.x = Math.sin(t * 0.4 + seed * 0.01) * 0.012;
    groupRef.current.rotation.z = Math.cos(t * 0.55 + seed * 0.013) * 0.012;
  });

  return (
    <group ref={groupRef} position={position} rotation={[0, rotY, 0]} scale={size}>
      {/* Trunk — single continuous mesh, no segment gaps */}
      <mesh castShadow geometry={trunkGeo}>
        <meshPhysicalMaterial color="#241410" roughness={0.92} metalness={0.04} />
      </mesh>
      {/* Main branches */}
      {mainGeos.map((g, i) => (
        <mesh key={`mb${i}`} castShadow geometry={g}>
          <meshPhysicalMaterial color="#2e1c12" roughness={0.9} flatShading={false} />
        </mesh>
      ))}
      {/* Secondary */}
      {secGeos.map((g, i) => (
        <mesh key={`sb${i}`} castShadow geometry={g}>
          <meshPhysicalMaterial color="#2a1812" roughness={0.9} />
        </mesh>
      ))}
      {/* Twigs */}
      {twigGeos.map((g, i) => (
        <mesh key={`tw${i}`} castShadow geometry={g}>
          <meshPhysicalMaterial color="#1f120c" roughness={0.92} />
        </mesh>
      ))}
      {/* Petals — instancedMesh */}
      <instancedMesh
        args={[undefined, undefined, tree.petals.length]}
        frustumCulled={false}
        ref={(m) => {
          if (!m) return;
          const dummy = new THREE.Object3D();
          for (let i = 0; i < tree.petals.length; i++) {
            const p = tree.petals[i];
            dummy.position.set(p.pos[0], p.pos[1], p.pos[2]);
            dummy.rotation.set(p.rot[0], p.rot[1], p.rot[2]);
            dummy.scale.setScalar(p.scale);
            dummy.updateMatrix();
            m.setMatrixAt(i, dummy.matrix);
            m.setColorAt(i, p.tint);
          }
          m.instanceMatrix.needsUpdate = true;
          if (m.instanceColor) m.instanceColor.needsUpdate = true;
        }}
      >
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial
          map={tex || undefined}
          alphaMap={tex || undefined}
          color="#fce3ea"
          emissive="#fce3ea"
          emissiveIntensity={0.25}
          alphaTest={0.45}
          side={THREE.DoubleSide}
        />
      </instancedMesh>

      {/* moss ring at base */}
      <mesh receiveShadow position={[0, 0.04, 0]}>
        <torusGeometry args={[hero ? 0.85 : 0.55, 0.18, 6, 20]} />
        <meshStandardMaterial color="#5a7a48" roughness={0.95} flatShading />
      </mesh>
    </group>
  );
}

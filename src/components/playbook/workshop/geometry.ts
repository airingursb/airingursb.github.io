import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { Materials } from './materials';

type Triple = readonly [number, number, number];
type BoxSpec = { readonly size: Triple; readonly at: Triple; readonly radius?: number; readonly rotate?: Triple };
export function box(parent: THREE.Object3D, material: THREE.Material, spec: BoxSpec) {
  const radius = Math.min(spec.radius ?? .025, ...spec.size.map(n => n / 3));
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(...spec.size, 2, radius), material);
  mesh.position.set(...spec.at); if (spec.rotate) mesh.rotation.set(...spec.rotate);
  mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
export function rod(parent: THREE.Object3D, material: THREE.Material, spec: { readonly from: Triple; readonly to: Triple; readonly radius: number }) {
  const a = new THREE.Vector3(...spec.from), b = new THREE.Vector3(...spec.to);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(spec.radius * .8, spec.radius, a.distanceTo(b), 8), material);
  mesh.position.copy(a).add(b).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
  mesh.castShadow = true; parent.add(mesh); return mesh;
}
export function plant(parent: THREE.Object3D, m: Materials, spec: { readonly at: Triple; readonly scale: number }) {
  const group = new THREE.Group(); group.position.set(...spec.at); group.scale.setScalar(spec.scale); parent.add(group);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(.24, .18, .35, 16), m.paper);
  pot.position.y = .175; pot.castShadow = pot.receiveShadow = true; group.add(pot);
  const soil = new THREE.Mesh(new THREE.CylinderGeometry(.215, .215, .02, 16), m.soil); soil.position.y = .348; group.add(soil);
  rod(group, m.edge, { from: [0, .3, 0], to: [.04, 1.45, 0], radius: .035 });
  const leafGeometry = new THREE.SphereGeometry(1, 8, 6);
  const branches: Triple[] = [[-.35, 1.1, .12], [.32, 1.34, -.1], [.02, 1.66, .08], [-.24, 1.47, -.2], [.25, .98, .2]];
  for (const end of branches) rod(group, m.edge, { from: [.02, .65, 0], to: end, radius: .02 });
  const dummy = new THREE.Object3D();
  m.leaf.forEach((material, color) => {
    const leaves = new THREE.InstancedMesh(leafGeometry, material, 40); leaves.castShadow = true; leaves.receiveShadow = true;
    for (let i = 0; i < 40; i++) {
      const n = i * 3 + color, center = branches[n % branches.length];
      if (!center) continue;
      const angle = n * 2.399, distance = .08 + .23 * (Math.sin(n * 1.73) * .5 + .5);
      dummy.position.set(center[0] + Math.cos(angle) * distance, center[1] + Math.sin(n * 2.7) * .2, center[2] + Math.sin(angle) * distance);
      dummy.scale.set(.13, .025, .063); dummy.rotation.set(Math.sin(n) * .7, angle, Math.cos(n) * .8); dummy.updateMatrix(); leaves.setMatrixAt(i, dummy.matrix);
    }
    group.add(leaves);
  });
  return group;
}

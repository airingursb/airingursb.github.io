import { Mesh, SphereGeometry, CylinderGeometry, TorusGeometry, Vector3, Group } from 'three';
import type { Material, Object3D } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export type XYZ = readonly [number, number, number];
export function box(size: XYZ, material: Material, radius = .025) {
  const mesh = new Mesh(new RoundedBoxGeometry(...size, 2, radius), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
export function ball(size: XYZ, material: Material) {
  const mesh = new Mesh(new SphereGeometry(1, 24, 16), material);
  mesh.scale.set(...size);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
export function cylinder(size: XYZ, material: Material) {
  const mesh = new Mesh(new CylinderGeometry(size[0], size[1], size[2], 20), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
export function ring(radius: number, tube: number, material: Material) {
  const mesh = new Mesh(new TorusGeometry(radius, tube, 8, 48), material);
  mesh.castShadow = true;
  return mesh;
}
export function place<T extends Object3D>(parent: Object3D, object: T, position: XYZ): T {
  object.position.set(...position);
  parent.add(object);
  return object;
}
export function rod(from: XYZ, to: XYZ, style: { readonly radius: number; readonly material: Material }) {
  const a = new Vector3(...from), b = new Vector3(...to), delta = b.clone().sub(a);
  const mesh = cylinder([style.radius, style.radius, delta.length()], style.material);
  mesh.position.copy(a.add(b).multiplyScalar(.5));
  mesh.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), delta.normalize());
  return mesh;
}
export function group(parent: Object3D, position: XYZ) {
  return place(parent, new Group(), position);
}

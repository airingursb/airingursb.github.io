import * as THREE from 'three';
import { box, plant, rod } from './geometry';
import { canvasTexture, type Materials } from './materials';

export function makeRoom(m: Materials) {
  const room = new THREE.Group();
  box(room, m.edge, { size: [9.2, .22, 5.2], at: [0, -.15, 0], radius: .08 });
  for (let row = 0; row < 13; row++) {
    for (let col = 0; col < 3; col++) {
      box(room, m.wood, { size: [3.02, .07, .388], at: [-3.04 + col * 3.04, -.015, -2.4 + row * .4], radius: .012 });
    }
  }
  box(room, m.wall, { size: [4.7, 2.85, .16], at: [-2.2, 1.43, -2.55] });
  box(room, m.wall, { size: [1, 2.85, .16], at: [4.05, 1.43, -2.55] });
  box(room, m.wall, { size: [3.2, .95, .16], at: [1.95, .475, -2.55] });
  box(room, m.wall, { size: [3.2, .35, .16], at: [1.95, 2.675, -2.55] });
  box(room, m.wall, { size: [.16, 2.85, 4.9], at: [-4.56, 1.43, -.05] });
  for (const [x, z] of [[-4.5, -2.5], [4.5, -2.5], [-4.5, 2.4]]) box(room, m.wood, { size: [.19, 3, .2], at: [x ?? 0, 1.45, z ?? 0] });
  box(room, m.wood, { size: [9, .12, .23], at: [0, 2.9, -2.55] });
  box(room, m.wood, { size: [.23, .12, 5], at: [-4.56, 2.9, -.05] });
  box(room, m.wood, { size: [9, .18, .12], at: [0, .12, -2.43] });
  box(room, m.wood, { size: [.12, .18, 4.9], at: [-4.44, .12, 0] });
  for (const x of [.38, 1.95, 3.52]) box(room, m.wood, { size: [.11, 1.66, .2], at: [x, 1.72, -2.51] });
  for (const y of [.94, 2.5]) box(room, m.wood, { size: [3.32, .12, .2], at: [1.95, y, -2.5] });
  box(room, m.wood, { size: [3.54, .1, .47], at: [1.95, .88, -2.3] });
  const skyMaterial = new THREE.MeshBasicMaterial({ color: '#dfead7' });
  box(room, skyMaterial, { size: [3.1, 1.5, .03], at: [1.95, 1.73, -2.66] });
  const horizon = new THREE.Group(); room.add(horizon);
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(.35 + (i % 3) * .05, 16, 12), m.leaf[i % 3]);
    leaf.scale.set(1, 1.3, .15); leaf.position.set(.62 + i * .48, 1.1 + Math.sin(i) * .18, -2.62); horizon.add(leaf);
  }
  rod(room, m.edge, { from: [.16, 2.64, -2.22], to: [3.78, 2.64, -2.22], radius: .035 });
  const curtains = new THREE.Group(); curtains.position.set(.28, 1.72, -2.2); room.add(curtains);
  const curtainMaterial = new THREE.MeshStandardMaterial({ color: '#e7dcc7', roughness: 1, side: THREE.DoubleSide });
  const curtainGeometry = new THREE.PlaneGeometry(.65, 1.76, 24, 2);
  const points = curtainGeometry.attributes.position;
  if (points) for (let i = 0; i < points.count; i++) points.setZ(i, Math.cos(points.getX(i) * 36) * .045);
  curtainGeometry.computeVertexNormals();
  const curtain = new THREE.Mesh(curtainGeometry, curtainMaterial); curtain.position.x = .2; curtain.castShadow = true; curtains.add(curtain);
  const curtainRight = curtain.clone(); curtainRight.position.x = 2.9; curtains.add(curtainRight);
  plant(room, m, { at: [-3.8, 0, -1.75], scale: 1.3 });
  plant(room, m, { at: [3.6, .7, -1.4], scale: .75 });
  box(room, m.wood, { size: [.7, .08, .7], at: [3.6, .67, -1.4] });
  for (const x of [3.35, 3.85]) for (const z of [-1.65, -1.15]) box(room, m.wood, { size: [.07, .65, .07], at: [x, .325, z] });
  box(room, m.wood, { size: [1.1, .09, .48], at: [-.8, 2.22, -2.2] });
  plant(room, m, { at: [-1.03, 2.26, -2.2], scale: .4 });
  for (let i = 0; i < 4; i++) box(room, i % 2 ? m.paper : m.green, { size: [.075, .35 + i * .02, .2], at: [-.65 + i * .085, 2.47, -2.24], rotate: [0, 0, .04] });
  const botanical = canvasTexture(ctx => {
    ctx.fillStyle = '#f6f0e0'; ctx.fillRect(0, 0, 512, 512); ctx.strokeStyle = '#798366'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(230, 435); ctx.quadraticCurveTo(235, 280, 275, 70); ctx.stroke();
    ctx.fillStyle = '#84916d';
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(250 + (i % 2 ? 38 : -38), 120 + i * 60, 44, 17, i % 2 ? -.6 : .6, 0, Math.PI * 2); ctx.fill(); }
  });
  box(room, m.wood, { size: [.62, .8, .05], at: [-2.4, 2.04, -2.4] });
  const art = new THREE.Mesh(new THREE.PlaneGeometry(.56, .73), new THREE.MeshBasicMaterial({ map: botanical })); art.position.set(-2.4, 2.04, -2.365); room.add(art);
  return { room, curtains, curtain, curtainRight, skyMaterial };
}

import * as THREE from 'three';
import { box, rod } from './geometry';
import { canvasTexture, type Materials } from './materials';

export function furnish(room: THREE.Group, m: Materials) {
  const bench = new THREE.Group(); bench.name = "living-scenes"; bench.position.set(-2.35, 0, -1.44); room.add(bench);
  for (const x of [-1.05, 1.05]) for (const z of [-.26, .26]) box(bench, m.edge, { size: [.12, .62, .12], at: [x, .31, z] });
  for (const z of [-.28, -.06, .16, .36]) box(bench, m.wood, { size: [2.42, .095, .19], at: [0, .65, z] });
  for (const x of [-1.12, 1.12]) {
    box(bench, m.edge, { size: [.09, 1.28, .1], at: [x, .72, -.3] });
    box(bench, m.wood, { size: [.12, .08, .77], at: [x, .99, .02] });
    box(bench, m.edge, { size: [.07, .35, .07], at: [x, .83, .34] });
  }
  for (const y of [.94, 1.17]) box(bench, m.wood, { size: [2.36, .18, .08], at: [0, y, -.3] });
  box(bench, m.cloth, { size: [.7, .49, .22], at: [-.45, .94, -.1], radius: .1, rotate: [-.15, -.05, .06] });
  const desk = new THREE.Group(); desk.name = "living-scenes"; desk.position.set(-1.65, 0, .45); room.add(desk);
  box(desk, m.rug, { size: [3.24, .035, 1.98], at: [0, .026, .07], radius: .05 });
  for (let i = 0; i < 38; i++) {
    for (const z of [-.98, 1.1]) rod(desk, m.rug, { from: [-1.51 + i * .08, .024, z], to: [-1.52 + i * .08, .024, z + (z < 0 ? -.08 : .08)], radius: .012 });
  }
  box(desk, m.wood, { size: [2.6, .12, 1.1], at: [0, .65, 0], radius: .05 });
  for (const x of [-1.1, 1.1]) for (const z of [-.4, .4]) box(desk, m.edge, { size: [.12, .58, .12], at: [x, .32, z], rotate: [0, 0, x * -.025] });
  box(desk, m.edge, { size: [2.3, .14, .07], at: [0, .54, .4] });

  const book = new THREE.Group(); book.name = "reading-companion"; book.position.set(1.8, .65, .58); room.add(book);
  box(room, m.wood, { size: [2.8, .12, 1.95], at: [1.8, .57, .58], radius: .04 });
  for (const x of [.6, 3]) for (const z of [-.2, 1.35]) box(room, m.edge, { size: [.12, .54, .12], at: [x, .27, z] });
  box(book, m.green, { size: [2.68, .095, 1.85], at: [0, -.015, 0], radius: .025 });
  box(book, m.edge, { size: [.1, .12, 1.85], at: [0, .02, 0], radius: .025 });
  const pageTexture = canvasTexture(ctx => {
    ctx.fillStyle = '#fff7e3'; ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#bcb39a'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 13; i++) { ctx.beginPath(); ctx.moveTo(56, 120 + i * 23); ctx.lineTo(440 - (i % 4) * 13, 120 + i * 23); ctx.stroke(); }
    ctx.fillStyle = '#718951'; ctx.font = 'italic 36px Georgia'; ctx.fillText('Field notes', 55, 77);
    ctx.font = '20px Georgia'; ctx.fillText('02', 424, 462);
  });
  for (const side of [-1, 1]) {
    const half = new THREE.Group(); half.position.set(side * .03, .13, 0); half.rotation.z = side * .16; book.add(half);
    for (let p = 0; p < 5; p++) box(half, m.paper, { size: [1.24 - p * .008, .018, 1.67 - p * .007], at: [side * (.62 - p * .004), -.05 + p * .018, (p % 2) * .005], radius: .006 });
    const geometry = new THREE.PlaneGeometry(1.24, 1.67, 20, 1);
    const position = geometry.attributes.position;
    if (position) for (let i = 0; i < position.count; i++) position.setZ(i, .045 + Math.cos(position.getX(i) * 2.5) * .09);
    geometry.computeVertexNormals();
    const page = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ map: pageTexture, roughness: .95, side: THREE.DoubleSide }));
    page.rotation.x = -Math.PI / 2; page.position.set(side * .62, .025, 0); page.receiveShadow = true; half.add(page);
  }
  box(book, m.green, { size: [.07, .008, .9], at: [.1, .11, .58], rotate: [0, -.08, 0] });
  const bird = new THREE.Group(); bird.position.set(2.15, .97, -2.12); bird.scale.setScalar(1.4); room.add(bird);
  const cream = new THREE.MeshStandardMaterial({ color: '#eee1c9', roughness: .95 });
  const brown = new THREE.MeshStandardMaterial({ color: '#a18c70', roughness: .9 });
  const black = new THREE.MeshStandardMaterial({ color: '#3d362d', roughness: .7 });
  const shape = (material: THREE.Material, at: readonly [number, number, number], size: readonly [number, number, number]) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), material); mesh.position.set(...at); mesh.scale.set(...size); mesh.castShadow = true; bird.add(mesh); return mesh;
  };
  shape(cream, [0, .18, 0], [.17, .18, .12]); shape(brown, [-.015, .35, .01], [.13, .12, .12]);
  shape(cream, [-.035, .31, .06], [.11, .07, .095]);
  shape(brown, [.07, .2, .09], [.09, .13, .055]); shape(black, [-.085, .36, .104], [.016, .016, .012]);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(.035, .1, 8), m.edge); beak.rotation.z = Math.PI / 2; beak.position.set(-.15, .31, .02); bird.add(beak);
  const tail = shape(brown, [.12, .11, -.05], [.2, .035, .055]); tail.rotation.z = -.25;
  for (const z of [-.045, .045]) rod(bird, m.edge, { from: [0, .035, z], to: [0, .105, z], radius: .012 });
  const stations = {
    'living-scenes': new THREE.Vector3(-1.65, .5, 1.56),
    'reading-companion': new THREE.Vector3(1.85, .4, 1.8),
  };
  return { bird, stations };
}

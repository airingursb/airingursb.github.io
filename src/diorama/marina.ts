import { BoxGeometry, ExtrudeGeometry, Group, Mesh, Shape, EdgesGeometry, LineSegments } from 'three';
import type { Materials } from './palette';
import { ball, box, place, rod } from './primitives';

/** The bay-facing facade bows outward at the foot of each tower. */
function bow(y: number, strength: number) {
  return strength * (1 - y / 2.65) ** 3;
}

export function marina(m: Materials) {
  const root = new Group();
  root.name = 'Marina Bay Sands · three curved towers and cantilevered SkyPark';
  for (const [index, x] of [-.96, -.12, .72].entries()) {
    const strength = .40 - index * .10;
    const tower = new Mesh(new BoxGeometry(.55, 2.65, .34, 1, 28, 1), m.hotelGlass);
    const positions = tower.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i) + 1.325;
      positions.setZ(i, positions.getZ(i) + bow(y, strength));
    }
    tower.geometry.computeVertexNormals();
    place(root, tower, [x, 1.405, 0]);
    tower.castShadow = true;
    tower.receiveShadow = true;
    // Pale side blades make the double-loaded, splayed tower section legible.
    for (const side of [-1, 1]) {
      const blade = new Mesh(new BoxGeometry(.045, 2.65, .39, 1, 28, 1), m.chalk);
      const vertices = blade.geometry.attributes.position;
      for (let i = 0; i < vertices.count; i++) {
        vertices.setZ(i, vertices.getZ(i) + bow(vertices.getY(i) + 1.325, strength));
      }
      blade.geometry.computeVertexNormals();
      place(root, blade, [x + side * .286, 1.405, 0]);
      blade.castShadow = true;
    }
    for (let floor = 0; floor < 48; floor++) {
      const y = .11 + floor * .0548;
      place(root, box([.54, .011, .015], m.skyline, .002), [x, y, .182 + bow(y - .08, strength)]);
      place(root, box([.54, .009, .014], m.skyline, .002), [x, y, -.182 + bow(y - .08, strength)]);
    }
    for (let col = 0; col < 7; col++) {
      for (let section = 0; section < 9; section++) {
        const low = .10 + section * .29, high = low + .29;
        root.add(rod([x - .23 + col * .076, low, .185 + bow(low - .08, strength)],
          [x - .23 + col * .076, high, .185 + bow(high - .08, strength)], {radius: .0035, material: m.skyline}));
      }
    }
    for (const side of [-1, 1]) {
      root.add(rod([x + side * .20, 2.73, 0], [x, 2.83, .03], {radius: .024, material: m.chalk}));
    }
  }
  const outline = new Shape();
  outline.moveTo(-1.42, -.26);
  outline.bezierCurveTo(-1.67, -.20, -1.66, .19, -1.38, .29);
  outline.bezierCurveTo(-.50, .36, .96, .36, 1.65, .18);
  outline.bezierCurveTo(1.93, .10, 1.94, -.06, 1.67, -.18);
  outline.bezierCurveTo(.97, -.37, -.58, -.36, -1.42, -.26);
  const hull = new Mesh(new ExtrudeGeometry(outline, {depth: .09, bevelEnabled: true,
    bevelSegments: 4, steps: 1, bevelSize: .07, bevelThickness: .07, curveSegments: 24}), m.chalk);
  hull.rotation.x = Math.PI / 2;
  place(root, hull, [0, 2.91, 0]);
  hull.castShadow = true;
  hull.receiveShadow = true;
  const deck = new Mesh(new ExtrudeGeometry(outline, {depth: .015, bevelEnabled: false, curveSegments: 24}), m.woodLight);
  deck.rotation.x = Math.PI / 2;
  place(root, deck, [0, 2.985, 0]);
  place(root, box([1.62, .016, .18], m.water, .04), [-.39, 3.003, .145]);
  place(root, box([1.95, .016, .12], m.leaf, .05), [-.33, 3.003, -.14]);
  for (let i = 0; i < 16; i++) {
    place(root, ball([.037, .062 + (i % 3) * .01, .04], i % 2 ? m.leaf : m.leafLight), [-1.22 + i * .117, 3.062, -.14]);
  }
  for (let i = 0; i < 14; i++) {
    place(root, box([.039, .018, .072], m.chalk, .008), [-1.10 + i * .115, 3.009, -.008]);
  }
  const railGeometry = new ExtrudeGeometry(outline, {depth: .07, bevelEnabled: false, curveSegments: 24});
  // Only perimeter edges remain, keeping the pool and observation deck open.
  const edgeGeometry = new EdgesGeometry(railGeometry, 35);
  const railing = new LineSegments(edgeGeometry, m.hotelRail);
  railing.rotation.x = -Math.PI / 2;
  railing.position.set(0, 2.995, 0);
  root.add(railing);
  railGeometry.dispose();
  place(root, box([2.7, .13, .72], m.skyline, .05), [-.12, .1, .07]);
  return root;
}

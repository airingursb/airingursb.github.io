import { CatmullRomCurve3, Group, Mesh, MeshStandardMaterial, TubeGeometry, Vector3 } from 'three';
import { ball, box, cylinder, group, place, rod } from './primitives';
import type { XYZ } from './primitives';
import { createRidgeMaterials } from './ridge-materials';
import { createRidgeForest } from './ridge-forest';

export function createRidge(parent: Group) {
  const materials = createRidgeMaterials(), {m} = materials;
  const forest = createRidgeForest(parent);
  function curve(root: Group, points: readonly XYZ[], radius: number, material: MeshStandardMaterial) {
    const mesh = new Mesh(new TubeGeometry(new CatmullRomCurve3(points.map(point => new Vector3(...point))), 16, radius, 7, false), material);
    mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh);
    return mesh;
  }

  for (let i = 0; i < 18; i++) {
    const side = i % 2 ? -1 : 1, x = side * (2.2 + (i * .47) % 1.55), z = -2.65 + (i * .83) % 5.25;
    const rock = place(parent, ball([.19 + (i % 3) * .07, .13 + (i % 4) * .025, .17 + (i % 5) * .025], i % 4 ? m.stone : m.canopy), [x, .22, z]);
    rock.rotation.set(i * .3, i * .73, i * .19);
  }

  for (const x of [-1.45, 1.45]) {
    place(parent, box([.18, .21, 5.62], m.grain, .012), [x, .77, 0]);
    for (const z of [-2.5, -.8, .9, 2.5]) {
      place(parent, box([.22, .79, .22], m.grain, .018), [x, .48, z]);
      parent.add(rod([x, .3, z - .42], [x, .81, z + .26], { radius: .045, material: m.timber }));
    }
  }
  for (let i = 0; i < 28; i++) {
    const z = -2.7 + i * .2;
    place(parent, box([3.4, .12, .19], i % 7 === 0 ? m.woodShade : i % 3 === 0 ? m.woodLight : m.timber, .023), [0, .94, z]);
    for (const x of [-1.44, 1.44]) place(parent, cylinder([.012, .012, .006], m.metal), [x, 1.003, z]);
  }
  for (const side of [-1, 1]) {
    const end = side === 1 ? .7 : 2.7;
    const intervals = Math.ceil((end + 2.7) / .9);
    for (let post = 0; post <= intervals; post++) {
      const z = -2.7 + post / intervals * (end + 2.7);
      place(parent, box([.16, .94, .16], m.grain, .014), [side * 1.79, 1.39, z]);
      place(parent, box([.16, .055, .16], m.timber, .012), [side * 1.79, 1.887, z]);
    }
    place(parent, box([.17, .11, end + 2.8], m.timber, .02), [side * 1.79, 1.79, (end - 2.7) / 2]);
  }
  for (const side of [-1, 1]) {
    const end = side === 1 ? .7 : 2.7;
    for (const y of [1.18, 1.39, 1.59]) parent.add(rod([side * 1.79, y, -2.7], [side * 1.79, y, end], {radius: .012, material: m.metal}));
  }
  for (let step = 0; step < 4; step++) {
    const x = 1.92 + step * .4, y = .78 - step * .2;
    place(parent, box([.43, .16, 1.04], m.timber, .015), [x, y, 2.03]);
    for (const z of [1.65, 2.41]) place(parent, box([.09, y, .09], m.grain, .008), [x, y / 2, z]);
  }
  for (const z of [1.47, 2.6]) {
    parent.add(rod([1.81, 1.63, z], [3.2, .83, z], { radius: .037, material: m.timber }));
    for (const [x, y] of [[1.92, .79], [3.1, .19]]) place(parent, box([.075, .7, .075], m.grain), [x, y + .31, z]);
  }

  curve(parent, [[-3.2, 1.73, -1.5], [-2.75, 2.05, -1.44], [-2.1, 2.16, -1.27], [-1.74, 2.27, -1.44]], .057, m.grain);
  const squirrel = group(parent, [-2.12, 2.2, -1.3]); squirrel.rotation.y = -.42; squirrel.scale.setScalar(1.15);
  place(squirrel, ball([.16, .22, .12], m.timber), [0, .19, 0]);
  place(squirrel, ball([.13, .12, .105], m.timber), [.02, .44, .07]);
  place(squirrel, ball([.082, .065, .073], m.stone), [.025, .403, .145]);
  for (const side of [-1, 1]) {
    place(squirrel, ball([.042, .083, .04], m.timber), [side * .075, .557, .06]);
    place(squirrel, ball([.045, .045, .087], m.grain), [side * .105, .032, .064]);
    place(squirrel, ball([.014, .017, .012], m.leafShade), [side * .079, .462, .15]);
    place(squirrel, ball([.004, .005, .004], m.stone), [side * .083, .468, .161]);
    squirrel.add(rod([side * .114, .3, .025], [side * .04, .267, .16], { radius: .027, material: m.timber }));
  }
  place(squirrel, ball([.037, .049, .04], m.grain), [0, .27, .18]);
  curve(squirrel, [[-.02, .08, -.08], [-.11, .26, -.22], [-.08, .57, -.24], [.025, .66, -.15]], .096, m.timber);
  for (let i = 0; i < 9; i++) curve(squirrel, [[-.065 + i * .014, .13, -.16], [-.15 + i * .019, .4, -.29], [-.1 + i * .02, .6, -.21]], .008, m.grain);

  const birds = Array.from({ length: 3 }, (_, index) => {
    const bird = group(parent, [0, 0, 0]);
    place(bird, ball([.065, .042, .145], m.bird), [0, 0, 0]);
    place(bird, ball([.044, .044, .047], m.bird), [0, .02, .13]);
    const beak = place(bird, ball([.019, .014, .041], m.grain), [0, .014, .177]); beak.rotation.x = -.12;
    const wings = [-1, 1].map(side => {
      const wing = group(bird, [side * .045, .01, -.01]);
      const shoulder = place(wing, ball([.17, .024, .073], m.bird), [side * .12, 0, -.006]); shoulder.rotation.y = side * .13;
      for (let feather = 0; feather < 5; feather++) {
        const mesh = place(wing, ball([.095, .013, .025], m.bird), [side * (.24 + feather * .007), -.008, -.074 + feather * .033]);
        mesh.rotation.y = side * (-.45 + feather * .15);
      }
      return { wing, side };
    });
    for (const side of [-1, 1]) {
      const tail = place(bird, ball([.028, .015, .085], m.bird), [side * .025, -.01, -.165]); tail.rotation.y = side * -.22;
    }
    bird.scale.setScalar(1.05 + index * .13);
    bird.traverse(object => { if (object instanceof Mesh) object.castShadow = false; });
    return { bird, wings };
  });
  const companionRoot = group(parent, [0, 0, 0]);
  const runtime = {
    companionRoot,
    anchors: [new Vector3(-1.17, 1.15, 1.28), new Vector3(-1.8, 2.48, -1.02), new Vector3(2.7, 6.85, 1.2)],
    update(time: number) {
      birds.forEach(({ bird, wings }, index) => {
        const angle = time * .42 + index * Math.PI * 2 / 3;
        const dx = 2.35 * Math.cos(angle), dz = -.65 * Math.sin(angle), dy = .44 * Math.cos(angle * 2);
        bird.position.set(2.35 * Math.sin(angle), 6.2 + index * .18 + Math.sin(angle * 2) * .22, 1.7 + Math.cos(angle) * .65);
        bird.rotation.set(-Math.atan2(dy, Math.hypot(dx, dz)), Math.atan2(dx, dz), -.25 * Math.sin(angle), 'YXZ');
        const wingbeat = Math.sin(time * 7 + index * 2) * (.12 + .38 * (.5 + .5 * Math.sin(time * .9 + index)));
        wings.forEach(({ wing, side }) => { wing.rotation.z = side * (.09 + wingbeat); });
      });
    },
    dispose() { materials.dispose(); forest.dispose(); },
  };
  runtime.update(0);
  return runtime;
}

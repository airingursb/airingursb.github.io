import { Group, InstancedMesh, Matrix4, Mesh, Quaternion, SphereGeometry, Vector3 } from 'three';
import { ball, box, group, place, rod } from './primitives';
import { gameColors as colors, gameMatte } from './game-style';

const sample = (seed: number) => { const n = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };

export function createRidgeForest(parent: Group) {
  const m = {
    leaf: gameMatte(colors.leaf), light: gameMatte(colors.leafLight), shade: gameMatte(colors.leafShade),
    grass: gameMatte(colors.grass), grassLight: gameMatte(colors.grassLight), bark: gameMatte(colors.woodShade),
    earth: gameMatte(colors.earth), earthShade: gameMatte(colors.earthShade), earthStone: gameMatte(colors.earthStone),
    blossom: gameMatte(colors.blossom), gold: gameMatte(colors.flowerGold),
  };
  place(parent, box([8.6, .58, 6.15], m.earth, .09), [0, -.22, 0]);
  place(parent, box([8.65, .16, 6.2], m.grass, .075), [0, .09, 0]);
  for (let i = 0; i < 13; i++) {
    const x = -3.94 + i * .655;
    place(parent, box([.62, .18, .055], i % 3 ? m.earthStone : m.earthShade, .035), [x, -.26, 3.075]);
    place(parent, box([.045, .09, .04], m.earthShade, .015), [x + .16, -.08, 3.094]);
  }
  for (let i = 0; i < 9; i++) {
    const z = -2.7 + i * .66;
    place(parent, box([.055, .18, .5], i % 3 ? m.earthStone : m.earthShade, .035), [4.299, -.26, z]);
  }
  for (const [x, z, width, depth] of [[-3.25,-2.05,1.9,1.7],[2.95,-2.1,2.5,1.7],[-3.45,.1,1.45,1.8]] as const) {
    place(parent, box([width,.23,depth], m.earth, .035), [x,.25,z]);
    place(parent, box([width+.035,.09,depth+.035], m.grassLight, .035), [x,.405,z]);
  }
  const canopy = new SphereGeometry(1, 24, 16);
  const vertices = canopy.getAttribute('position');
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i), y = vertices.getY(i), z = vertices.getZ(i);
    const angle = Math.atan2(z, x), scallop = 1 + .055 * Math.cos(angle * 7) * (1 - y * y);
    vertices.setXYZ(i, x * scallop, y * (1 + .035 * Math.cos(angle * 5)), z * scallop);
  }
  canopy.computeVertexNormals();
  const trees = [[-3.18,-1.62,3.4,1],[-3.16,.7,2.65,.85],[-1.72,-2.55,3.75,.92],[.7,-2.67,3.55,.93],[2.8,-2.03,3.1,.98],[3.5,-.24,2.2,.73]] as const;
  trees.forEach(([x,z,height,size], index) => {
    const tree = group(parent, [x,.17,z]);
    tree.add(rod([0,0,0],[.06,height,0], {radius:.16, material:m.bark}));
    for (let root = 0; root < 4; root++) {
      const a = root * Math.PI / 2 + .3;
      tree.add(rod([0,.42,0],[Math.cos(a)*.32,0,Math.sin(a)*.32], {radius:.10,material:m.bark}));
    }
    for (let limb = 0; limb < 3; limb++) {
      const a = limb * 2.1 + index;
      tree.add(rod([.035,height*.54,0],[Math.cos(a)*.7,height*.86,Math.sin(a)*.55], {radius:.09,material:m.bark}));
    }
    const lobes = [[0,-.27,0,1.05,.62,.91],[-.65,0,-.03,.72,.59,.72],[.59,.1,.1,.78,.65,.76],[.04,.48,-.1,.85,.64,.77],[-.05,-.04,.52,.74,.52,.65]] as const;
    lobes.forEach(([dx,dy,dz,sx,sy,sz], lobe) => {
      const crown = place(tree,new Mesh(canopy,lobe===0?m.shade:lobe===3?m.light:m.leaf),[dx*size,height+dy*size,dz*size]);
      crown.scale.set(sx*size,sy*size,sz*size); crown.castShadow=true; crown.receiveShadow=true;
    });
    for (let leaf = 0; leaf < 5; leaf++) {
      const a = leaf*2.4 + index;
      const accent = place(tree,ball([.13,.035,.23],m.light),[Math.cos(a)*.7*size,height+.66*size,Math.sin(a)*.48*size]);
      accent.rotation.set(.12,a,.3);
    }
  });
  const blade = new SphereGeometry(1, 10, 8), bladeVertices = blade.getAttribute('position');
  for (let i = 0; i < bladeVertices.count; i++) {
    const t = (bladeVertices.getY(i) + 1) / 2;
    bladeVertices.setXYZ(i, bladeVertices.getX(i)*.12*(1-t*.45)+t*t*.18, t, bladeVertices.getZ(i)*.065);
  }
  blade.computeVertexNormals();
  const tones = [m.leaf, m.light, m.grassLight], matrices: Matrix4[][] = tones.map(() => []);
  for (let patch = 0; patch < 46; patch++) {
    const x = (patch%2?-1:1)*(2.15+sample(patch*4)*1.73), z = -2.8+sample(patch*7)*5.48;
    if (x>1.8&&z>1.15) continue;
    const floor = (x < -2.7 && z > -.8 && z < 1) || (z < -1.2 && (x < -2.3 || x > 1.7)) ? .455 : .18;
    for (let leaf = 0; leaf < 11; leaf++) {
      const angle = leaf*2.399+patch, radius = Math.sqrt(sample(leaf+patch*17))*.25;
      const rotation = new Quaternion().setFromAxisAngle(new Vector3(0,1,0),angle);
      const size = .25+sample(patch*19+leaf)*.3;
      matrices[leaf%3]?.push(new Matrix4().compose(new Vector3(x+Math.cos(angle)*radius,floor,z+Math.sin(angle)*radius),rotation,new Vector3(1,size,1)));
    }
  }
  matrices.forEach((items, tone) => {
    const grass = new InstancedMesh(blade,tones[tone],items.length);
    items.forEach((matrix,index)=>grass.setMatrixAt(index,matrix)); grass.castShadow=true; grass.receiveShadow=true; parent.add(grass);
  });
  for (const [x,z] of [[-3.4,2.4],[-2.6,2.62],[3.66,.62],[-3.8,1.7],[2.7,-1.05]] as const) {
    const flowers = group(parent,[x,.17,z]);
    for (let flower=0;flower<3;flower++) {
      const fx=Math.cos(flower*2.4)*.18, fz=Math.sin(flower*2.4)*.18, h=.22+flower*.06;
      flowers.add(rod([fx,0,fz],[fx,h,fz],{radius:.018,material:m.shade}));
      for (let petal=0;petal<5;petal++) {
        const a=petal*Math.PI*2/5;
        const mesh=place(flowers,ball([.065,.034,.10],m.blossom),[fx+Math.sin(a)*.065,h,fz+Math.cos(a)*.065]);mesh.rotation.y=a;
      }
      place(flowers,ball([.04,.038,.04],m.gold),[fx,h+.02,fz]);
    }
  }
  return {dispose() { Object.values(m).forEach(material=>material.dispose()); canopy.dispose(); blade.dispose(); }};
}

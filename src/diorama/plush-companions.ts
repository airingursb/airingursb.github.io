import { Box3, BufferGeometry, Group, Material, Mesh, MeshStandardMaterial, Texture } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

function release(root: Group) {
  const geometries = new Set<BufferGeometry>(), materials = new Set<Material>(), textures = new Set<Texture>();
  root.traverse(object => {
    if (!(object instanceof Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      for (const value of Object.values(material)) if (value instanceof Texture) textures.add(value);
    }
  });
  geometries.forEach(value => value.dispose());
  materials.forEach(value => value.dispose());
  textures.forEach(value => value.dispose());
}

export function loadPlushCompanions(parent: Group, invalidate: () => void) {
  const root = new Group();
  root.name = 'Panda V3 and Moflow V2 · sitting together';
  root.visible = false;
  parent.add(root);
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  let disposed = false;
  const seats = [
    {file: 'panda-v3', x: -1.60, z: .05, angle: .14},
    {file: 'moflow-v2', x: -.48, z: .04, angle: .10},
  ] as const;
  function dispose() { disposed = true; root.removeFromParent(); release(root); root.clear(); }
  const ready = Promise.all(seats.map(async seat => {
    const gltf = await loader.loadAsync(`/diorama/models/${seat.file}.glb`);
    const model = gltf.scene;
    if (disposed) { release(model); return; }
    model.traverse(object => {
      if (!(object instanceof Mesh)) return;
      const fur = object.material instanceof MeshStandardMaterial && object.material.name.endsWith('web hair');
      object.castShadow = !fur;
      object.receiveShadow = !fur;
      if (fur && object.material instanceof MeshStandardMaterial) {
        // Exported normals point out of the coat, irrespective of ribbon winding.
        // Undo Three.js back-face flipping to preserve the studio groom shading.
        object.material.onBeforeCompile = shader => {
          shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_begin>',
            '#include <normal_fragment_begin>\n#ifdef DOUBLE_SIDED\nnormal *= faceDirection;\n#endif');
        };
      }
    });
    model.scale.setScalar(.53);
    model.rotation.y = seat.angle;
    model.updateMatrixWorld(true);
    const bounds = new Box3().setFromObject(model);
    model.position.set(seat.x - (bounds.min.x + bounds.max.x) / 2, .649 - bounds.min.y, seat.z);
    root.add(model);
    invalidate();
  })).then(() => {
    if (!disposed) { root.visible = true; invalidate(); }
  }, error => { dispose(); throw error; });
  return {ready, dispose};
}

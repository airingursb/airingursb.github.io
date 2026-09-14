import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeMaterials } from './materials';
import { makeRoom } from './room';
import { furnish } from './exhibits';
import { loadActors } from './actors';

export type Station = 'living-scenes' | 'reading-companion';
export function createWorkshop(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const environment = new RoomEnvironment(); const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(environment, .05); scene.environment = env.texture; scene.environmentIntensity = .3; environment.dispose(); pmrem.dispose();
  const material = makeMaterials(); const architecture = makeRoom(material); scene.add(architecture.room);
  const furniture = furnish(architecture.room, material);
  const sky = new THREE.HemisphereLight('#e7eef3', '#9c866a', 1.35); scene.add(sky);
  const sun = new THREE.DirectionalLight('#fff0d6', 2.6); sun.position.set(-3, 8, 5); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = sun.shadow.camera.bottom = -7; sun.shadow.camera.right = sun.shadow.camera.top = 7;
  sun.shadow.camera.near = .1; sun.shadow.camera.far = 22; sun.shadow.normalBias = .025; sun.shadow.bias = -.0002; sun.shadow.radius = 4; scene.add(sun);
  const windowLight = new THREE.PointLight('#ffd58c', 0, 8, 2); windowLight.position.set(2, 2.1, -1.7); scene.add(windowLight);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: .07 }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -.28; shadow.receiveShadow = true; scene.add(shadow);
  const camera = new THREE.OrthographicCamera(-6, 6, 4, -4, .1, 60);
  const origin = new THREE.Vector3(7.7, 6.3, 11.8), home = new THREE.Vector3(0, 1, 0);
  camera.position.copy(origin); camera.lookAt(home);
  const look = home.clone(), desiredLook = home.clone(); let selected: Station | undefined, zoom = 1, desiredZoom = 1, hover: Station | undefined;
  let width = 1, height = 1, closed = false, birdTime = 0, dark = false, disposed = false;
  let actors: Awaited<ReturnType<typeof loadActors>> | undefined;
  const markers = { ...furniture.stations, bird: new THREE.Vector3(2.15, 1.3, -2.12), curtain: new THREE.Vector3(.63, 2.05, -2.1) };
  const ready = loadActors(architecture.room).then(result => { if (disposed) dispose(); else actors = result; });
  function dispose() {
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
    scene.traverse(object => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Sprite) {
        if (object instanceof THREE.Mesh) geometries.add(object.geometry);
        for (const item of Array.isArray(object.material) ? object.material : [object.material]) {
          materials.add(item); if ('map' in item && item.map instanceof THREE.Texture) textures.add(item.map);
        }
      }
    });
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
    sun.shadow.map?.dispose(); env.dispose(); renderer.dispose(); disposed = true;
  }
  return {
    ready,
    pick(x: number, y: number) {
      const ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2(x * 2 - 1, 1 - y * 2), camera);
      const first = ray.intersectObjects(architecture.room.children, true)[0];
      let object: THREE.Object3D | null = first?.object ?? null;
      while (object) { if (object.name === 'living-scenes' || object.name === 'reading-companion') return object.name; object = object.parent; }
      return undefined;
    },
    resize(w: number, h: number) {
      width = w; height = h; renderer.setSize(w, h, false);
      camera.position.copy(origin); camera.lookAt(home); camera.updateMatrixWorld();
      const points = [];
      for (const x of [-4.7, 4.7]) for (const y of [-.3, 3.3]) for (const z of [-2.7, 2.7]) points.push(new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse));
      const bounds = new THREE.Box3().setFromPoints(points), center = bounds.getCenter(new THREE.Vector3());
      const span = bounds.getSize(new THREE.Vector3());
      const halfWidth = Math.max(span.x * .53, span.y * .54 * w / h);
      const halfHeight = halfWidth * h / w;
      camera.left = center.x - halfWidth; camera.right = center.x + halfWidth;
      camera.top = center.y + halfHeight; camera.bottom = center.y - halfHeight; camera.updateProjectionMatrix();
    },
    select(station: Station | undefined, compact: boolean) {
      selected = station; desiredZoom = station && !compact ? 1.18 : 1;
      desiredLook.copy(home); if (station && !compact) desiredLook.x = station === 'living-scenes' ? -.7 : .7;
    },
    highlight(station: Station | undefined) { hover = station; },
    point(x: number, y: number) { actors?.point(x, y); },
    bird() { birdTime = .7; },
    curtain() { closed = !closed; return closed; },
    theme(isDark: boolean) {
      dark = isDark; renderer.toneMappingExposure = dark ? .92 : 1.05;
      sky.intensity = dark ? .8 : 1.35; sun.intensity = dark ? .8 : 2.6; windowLight.intensity = dark ? 14 : 0;
      architecture.skyMaterial.color.set(dark ? '#687d89' : '#dfead7');
    },
    render(delta: number, still: boolean) {
      const ease = still ? 1 : 1 - Math.exp(-delta / .16);
      look.lerp(desiredLook, ease); zoom += (desiredZoom - zoom) * ease;
      camera.position.copy(origin).add(look).sub(home); camera.lookAt(look); camera.zoom = zoom; camera.updateProjectionMatrix();
      const spread = closed ? 2.7 : 1;
      architecture.curtain.scale.x += (spread - architecture.curtain.scale.x) * ease;
      architecture.curtainRight.scale.x = architecture.curtain.scale.x;
      architecture.curtain.position.x = .2 + (architecture.curtain.scale.x - 1) * .29;
      architecture.curtainRight.position.x = 2.9 - (architecture.curtain.scale.x - 1) * .29;
      sun.intensity += ((dark ? .8 : closed ? 2.5 : 2.6) - sun.intensity) * ease;
      if (birdTime > 0) { birdTime = Math.max(0, birdTime - delta); furniture.bird.position.y = .97 + (still ? 0 : Math.abs(Math.sin(birdTime * Math.PI / .35)) * .12); furniture.bird.rotation.y = still ? -.25 : Math.sin(birdTime * 8) * .2; }
      const frame = actors?.update(delta, still);
      renderer.render(scene, camera);
      const locations = Object.fromEntries(Object.entries(markers).map(([name, position]) => { const v = position.clone().project(camera); return [name, { x: (v.x + 1) * width / 2, y: (1 - v.y) * height / 2 }]; }));
      return { locations, frame, selected, hover, calls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
    },
    dispose,
  };
}

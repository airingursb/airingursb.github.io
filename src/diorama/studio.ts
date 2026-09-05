import { Scene, Group, OrthographicCamera, WebGLRenderer, HemisphereLight, DirectionalLight, Mesh, PlaneGeometry, ShadowMaterial, Vector3, PCFShadowMap, AgXToneMapping, PMREMGenerator, MeshStandardMaterial, Texture, BufferGeometry, Material } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

type Character = 'duo' | 'panda' | 'moflow';
type View = 'front' | 'side' | 'back';
const notes = { duo: '宽宽的脸、短短的爪，靠在一起就很好。', panda: '一点点憨，一点点软。今天也想赖着不动。', moflow: '小小一团，抱着一整颗心。' } as const;

export function mountStudio(host: HTMLElement) {
  const status = document.querySelector<HTMLElement>('#studio-status');
  const note = document.querySelector<HTMLElement>('#character-note');
  const controlsHost = document.querySelector<HTMLElement>('#studio-controls');
  let disposed = false;
  let selection: Character = 'duo';
  const events = new AbortController();
  const scene = new Scene();
  const root = new Group(); scene.add(root);
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
  renderer.toneMapping = AgXToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = PCFShadowMap;
  const environmentScene = new RoomEnvironment();
  const generator = new PMREMGenerator(renderer);
  const environment = generator.fromScene(environmentScene, 0.04);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.45;
  environmentScene.dispose(); generator.dispose();
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', '熊猫和 Moflow 三维模型。拖动或方向键旋转，加减键缩放，零键复位。');
  host.prepend(canvas);
  const camera = new OrthographicCamera(-3, 3, 2, -2, 0.1, 60);
  const orbit = new OrbitControls(camera, canvas);
  orbit.enablePan = false; orbit.minZoom = 0.65; orbit.maxZoom = 2.4;
  orbit.minPolarAngle = 0.3; orbit.maxPolarAngle = Math.PI / 2 + 0.14;
  orbit.zoomSpeed = 0.7; orbit.rotateSpeed = 0.6;
  scene.add(new HemisphereLight('#fff8e9', '#a2a393', 1.3));
  const light = new DirectionalLight('#fff3df', 3.2);
  light.position.set(-3, 6, 5); light.castShadow = true;
  light.shadow.mapSize.set(2048, 2048);
  light.shadow.camera.left = -4; light.shadow.camera.right = 4;
  light.shadow.camera.top = 4; light.shadow.camera.bottom = -4;
  light.shadow.normalBias = 0.014; light.shadow.bias = -0.0002;
  light.shadow.radius = 5;
  scene.add(light);
  const fill = new DirectionalLight('#e8f2ff', 1.1); fill.position.set(4, 3, -2); scene.add(fill);
  const floor = new Mesh(new PlaneGeometry(30, 30), new ShadowMaterial({ opacity: 0.11 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.005; floor.receiveShadow = true; scene.add(floor);
  const loaded = new Map<'panda' | 'moflow', Group>();
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  function draw() { if (!disposed && !document.hidden) renderer.render(scene, camera); }
  function resize() {
    const width = host.clientWidth, height = host.clientHeight, aspect = width / height;
    const halfWidth = selection === 'duo' ? 2.15 : 1.43;
    const halfHeight = Math.max(selection === 'moflow' ? 1.1 : 1.5, halfWidth / aspect);
    camera.left = -halfHeight * aspect; camera.right = halfHeight * aspect;
    camera.top = halfHeight; camera.bottom = -halfHeight;
    camera.updateProjectionMatrix(); renderer.setSize(width, height); draw();
  }
  function view(value: View) {
    orbit.target.set(0, selection === 'moflow' ? 0.84 : 1.25, 0);
    const angles = { front: 0, side: Math.PI / 2, back: Math.PI } as const;
    const angle = angles[value];
    camera.position.set(Math.sin(angle) * 8, orbit.target.y + 1.35, Math.cos(angle) * 8);
    camera.zoom = 1; camera.updateProjectionMatrix(); orbit.update();
    document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === value)));
    draw();
  }
  function select(value: Character) {
    selection = value;
    const panda = loaded.get('panda'), moflow = loaded.get('moflow');
    if (panda) { panda.visible = value !== 'moflow'; panda.position.x = value === 'duo' ? -0.79 : 0; }
    if (moflow) { moflow.visible = value !== 'panda'; moflow.position.x = value === 'duo' ? 0.98 : 0; }
    document.querySelectorAll<HTMLButtonElement>('[data-character]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.character === value)));
    if (note) note.textContent = notes[value];
    view('front'); resize();
  }
  function zoom(delta: number) {
    camera.zoom = Math.max(orbit.minZoom, Math.min(orbit.maxZoom, camera.zoom + delta));
    camera.updateProjectionMatrix(); draw();
  }
  function release(group: Group) {
    const geometries = new Set<BufferGeometry>(), materials = new Set<Material>(), textures = new Set<Texture>();
    group.traverse(object => {
      if (!(object instanceof Mesh)) return;
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        materials.add(material);
        if (material instanceof MeshStandardMaterial) {
          for (const texture of [material.map, material.normalMap, material.roughnessMap, material.metalnessMap, material.emissiveMap, material.aoMap]) if (texture) textures.add(texture);
        }
      }
    });
    geometries.forEach(item => item.dispose()); materials.forEach(item => item.dispose()); textures.forEach(item => item.dispose());
  }
  document.querySelectorAll<HTMLButtonElement>('[data-character]').forEach(button => button.addEventListener('click', () => {
    const value = button.dataset.character;
    if (value === 'duo' || value === 'panda' || value === 'moflow') select(value);
  }, { signal: events.signal }));
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button => button.addEventListener('click', () => {
    const value = button.dataset.view;
    if (value === 'front' || value === 'side' || value === 'back') view(value);
  }, { signal: events.signal }));
  document.querySelectorAll<HTMLButtonElement>('[data-zoom]').forEach(button => button.addEventListener('click', () => zoom(button.dataset.zoom === '1' ? 0.18 : -0.18), { signal: events.signal }));
  document.querySelector('#studio-reset')?.addEventListener('click', () => view('front'), { signal: events.signal });
  canvas.addEventListener('keydown', event => {
    if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','0'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === '0') view('front');
    if (event.key === '+' || event.key === '=') zoom(0.18);
    if (event.key === '-') zoom(-0.18);
    if (event.key.startsWith('Arrow')) {
      document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', 'false'));
      const offset = camera.position.clone().sub(orbit.target);
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') offset.applyAxisAngle(new Vector3(0,1,0), event.key === 'ArrowLeft' ? -0.15 : 0.15);
      else offset.y = Math.max(0.15, Math.min(7, offset.y + (event.key === 'ArrowUp' ? 0.4 : -0.4)));
      camera.position.copy(orbit.target).add(offset); orbit.update(); draw();
    }
  }, { signal: events.signal });
  orbit.addEventListener('change', draw);
  canvas.addEventListener('pointerdown', () => document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed','false')), { signal: events.signal });
  document.addEventListener('visibilitychange', draw, { signal: events.signal });
  const observer = new ResizeObserver(resize); observer.observe(host); view('front'); resize();
  for (const id of ['panda', 'moflow'] as const) {
    const version = id === 'panda' ? 'v3' : 'v2';
    loader.load(`/diorama/models/${id}-${version}.glb`, gltf => {
      if (disposed) { release(gltf.scene); return; }
      gltf.scene.traverse(object => {
        if (!(object instanceof Mesh)) return;
        const fur = object.material instanceof MeshStandardMaterial && object.material.name.endsWith('web hair');
        object.castShadow = !fur; object.receiveShadow = !fur;
        if (fur && object.material instanceof MeshStandardMaterial) {
          object.material.onBeforeCompile = shader => {
            // Groom ribbons carry outward coat normals on both visible sides.
            shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_begin>',
              '#include <normal_fragment_begin>\n#ifdef DOUBLE_SIDED\nnormal *= faceDirection;\n#endif');
          };
        }
      });
      root.add(gltf.scene); loaded.set(id, gltf.scene); select(selection);
      if (loaded.size === 2) {
        if (status) status.hidden = true;
        controlsHost?.querySelectorAll('button').forEach(button => { button.disabled = false; });
      }
    }, undefined, () => { if (!disposed && status) status.textContent = '模型暂时未能载入。可以刷新重试，或下载下方模型文件。'; });
  }
  window.addEventListener('pageshow', draw, { signal: events.signal });
  window.addEventListener('pagehide', event => {
    if (event.persisted) return;
    disposed = true; events.abort(); observer.disconnect(); orbit.dispose(); release(root);
    floor.geometry.dispose(); floor.material.dispose(); environment.dispose(); renderer.dispose(); canvas.remove();
  }, { signal: events.signal });
}

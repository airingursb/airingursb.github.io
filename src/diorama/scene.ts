import { Scene, Group, LineSegments, OrthographicCamera, WebGLRenderer, AmbientLight, HemisphereLight, DirectionalLight, PlaneGeometry, Mesh, ShadowMaterial, Vector3, PCFShadowMap, ACESFilmicToneMapping, SRGBColorSpace } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createBusan } from './busan';
import type { SceneKind } from './stories';
import { createMaterials } from './palette';
import { landscape } from './landscape';
import { shelter, bicycle } from './props';
import { place } from './primitives';
import { createWeather } from './weather';
import { loadPlushCompanions } from './plush-companions';

export function createDiorama(host: HTMLElement, kind: SceneKind = 'marina') {
  const night = kind === 'busan';
  const scene=new Scene(), root=new Group(); scene.add(root);
  const m=createMaterials();
  const busan=night?createBusan(root):null;
  if (!night) {
    landscape(root,m); shelter(root,m);
    const bike1=place(root,bicycle(m),[1.3,.14,1.62]); bike1.rotation.y=-.22; bike1.rotation.z=-.06;
    const bike2=place(root,bicycle(m),[1.43,.14,.72]); bike2.rotation.y=-.36; bike2.scale.setScalar(.88);
  }
  const camera=new OrthographicCamera(-6,6,5,-5,.1,80);
  const home=new Vector3(10,night?9.6:8.2,night?14:12);
  camera.position.copy(home);
  const renderer=new WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.7));
  renderer.shadowMap.autoUpdate=false; renderer.shadowMap.needsUpdate=true;
  renderer.shadowMap.enabled=true; renderer.shadowMap.type=PCFShadowMap;
  renderer.outputColorSpace=SRGBColorSpace; renderer.toneMapping=ACESFilmicToneMapping; renderer.toneMappingExposure=1.05;
  const canvas=renderer.domElement; canvas.tabIndex=0;
  canvas.setAttribute('aria-label',`${night?'釜山生日夜海':'雨里的滨海湾'}三维箱庭。方向键旋转，加减键缩放，数字零恢复视角。`);
  canvas.setAttribute('role','img'); host.prepend(canvas);
  const controls=new OrbitControls(camera,canvas);
  controls.target.set(0,.65,0); controls.enablePan=false;
  controls.minPolarAngle=.4; controls.maxPolarAngle=1.35;
  controls.minAzimuthAngle=-1.35; controls.maxAzimuthAngle=1.5;
  controls.minZoom=.7; controls.maxZoom=1.9; controls.zoomSpeed=.65;
  controls.enableDamping=true; controls.dampingFactor=.07; controls.rotateSpeed=.6;
  scene.add(new AmbientLight(night?'#a9c9dd':'#e1e8df',night?.4:.8),new HemisphereLight(night?'#a7cce5':'#eff4ed',night?'#796c58':'#b0a894',night?.75:1.3));
  const sun=new DirectionalLight(night?'#bedbed':'#dce6ed',night?.75:1.8); sun.position.set(-3,9,6); sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-7; sun.shadow.camera.right=7;
  sun.shadow.camera.top=7; sun.shadow.camera.bottom=-7; sun.shadow.normalBias=.04; sun.shadow.bias=-.00015;
  sun.shadow.radius=4; scene.add(sun);
  const fill=new DirectionalLight(night?'#ffd6a1':'#b9d5da',night?.85:1); fill.position.set(4,5,-4); scene.add(fill);
  const floor=new Mesh(new PlaneGeometry(200,200),new ShadowMaterial({opacity:.12}));
  floor.rotation.x=-Math.PI/2; floor.position.y=-.43; floor.receiveShadow=true; scene.add(floor);
  const weather=night?null:createWeather(root,m);
  const motionQuery=window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused=motionQuery.matches, disposed=false, time=0, previous=performance.now(), dirty=true;
  const companions=loadPlushCompanions(busan?.companionRoot??root,()=>{dirty=true;renderer.shadowMap.needsUpdate=true;});
  controls.enableDamping=!motionQuery.matches;
  function updateMotion() {
    controls.enableDamping=!motionQuery.matches;
    if(motionQuery.matches) paused=true;
    dirty=true;
  }
  motionQuery.addEventListener('change',updateMotion);
  const anchors=busan?.anchors??[new Vector3(-2.58,.80,.58),new Vector3(1.8,.65,1.8),new Vector3(1.8,1.8,-2.05)];
  const markers=Array.from(host.querySelectorAll<HTMLElement>('[data-hotspot]'));
  const projected=new Vector3();
  function resize() {
    const width=host.clientWidth,height=host.clientHeight,aspect=width/height;
    const span=aspect<1.1?(night?5.8:5.1)/aspect:(night?4.4:3.95);
    camera.left=-span*aspect; camera.right=span*aspect; camera.top=span; camera.bottom=-span;
    camera.updateProjectionMatrix(); renderer.setSize(width,height); dirty=true;
  }
  const observer=new ResizeObserver(resize); observer.observe(host);
  function render(now: number) {
    if(disposed) return;
    const delta=Math.min((now-previous)/1000,.05); previous=now;
    if(document.hidden) return;
    const changed=controls.update();
    if(!paused) { time+=delta; weather?.update(time); busan?.update(time); }
    if(paused&&!changed&&!dirty) return;
    renderer.render(scene,camera); dirty=false;
    markers.forEach((marker,i)=>{
      const anchor=anchors[i]; if(!anchor) return;
      projected.copy(anchor).project(camera);
      marker.style.transform=`translate(${(projected.x*.5+.5)*host.clientWidth}px,${(-projected.y*.5+.5)*host.clientHeight}px) translate(-50%,-50%)`;
    });
  }
  function reset() { camera.position.copy(home); controls.target.set(0,.65,0); camera.zoom=1; camera.updateProjectionMatrix(); controls.update(); dirty=true; }
  function zoom(amount: number) { camera.zoom=Math.max(.7,Math.min(1.9,camera.zoom+amount)); camera.updateProjectionMatrix(); dirty=true; }
  function key(event: KeyboardEvent) {
    if(['+','=','-','0','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) event.preventDefault();
    if(event.key==='0') reset();
    if(event.key==='+'||event.key==='=') zoom(.12);
    if(event.key==='-') zoom(-.12);
    if(event.key==='ArrowLeft'||event.key==='ArrowRight') {
      const offset=camera.position.clone().sub(controls.target);
      offset.applyAxisAngle(new Vector3(0,1,0),event.key==='ArrowLeft'?-.12:.12);
      camera.position.copy(controls.target).add(offset); dirty=true;
    }
    if(event.key==='ArrowUp'||event.key==='ArrowDown') {camera.position.y=Math.max(3,Math.min(16,camera.position.y+(event.key==='ArrowUp'?.7:-.7))); dirty=true;}
  }
  canvas.addEventListener('keydown',key);
  controls.addEventListener('change',()=>{dirty=true;});
  renderer.setAnimationLoop(render); resize(); controls.update();
  return {
    reset, zoom, ready: companions.ready,
    setPaused(value: boolean) { paused=value || motionQuery.matches; dirty=true; },
    isPaused:()=>paused,
    dispose() {
      disposed=true; companions.dispose(); motionQuery.removeEventListener('change',updateMotion); weather?.dispose(); busan?.dispose(); renderer.setAnimationLoop(null); observer.disconnect(); controls.dispose();
      canvas.removeEventListener('keydown',key);
      scene.traverse(object=>{if(object instanceof Mesh || object instanceof LineSegments) object.geometry.dispose();});
      m.furIvory.bumpMap?.dispose();
      Object.values(m).forEach(material=>material.dispose()); floor.material.dispose(); renderer.dispose(); canvas.remove();
    },
  };
}

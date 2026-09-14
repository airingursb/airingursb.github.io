import * as THREE from 'three';
import clips from '../../../assets/bear-study/daily.json';
import pandaManifest from '../../../../public/oil-motion/blog-pet/motion.json';
import { BearAtlasCache } from '../../bear-study/atlas-cache';
import { angleToCircularFrame } from '../../../lib/blog-pet-animator';

type Atlas = { readonly columns: number; readonly frameCount: number; readonly cellWidth: number; readonly cellHeight: number };
function actor(parent: THREE.Group, image: HTMLImageElement, spec: { readonly at: readonly [number, number, number]; readonly size: readonly [number, number]; readonly atlas: Atlas; readonly pixel: boolean }) {
  const canvas = document.createElement('canvas'); canvas.width = spec.atlas.cellWidth; canvas.height = spec.atlas.cellHeight;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = spec.pixel ? THREE.NearestFilter : THREE.LinearFilter;
  texture.magFilter = spec.pixel ? THREE.NearestFilter : THREE.LinearFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, alphaTest: .025, toneMapped: false }));
  sprite.position.set(...spec.at); sprite.scale.set(...spec.size, 1); sprite.name = spec.pixel ? "living-scenes" : "reading-companion"; parent.add(sprite);
  let current = -1;
  return (frame: number) => {
    const next = Math.max(0, Math.min(spec.atlas.frameCount - 1, Math.round(frame)));
    if (!ctx || current === next) return;
    current = next; ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, (next % spec.atlas.columns) * canvas.width, Math.floor(next / spec.atlas.columns) * canvas.height, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
    texture.needsUpdate = true;
  };
}
export async function loadActors(room: THREE.Group) {
  const panda = new Image(); panda.src = '/oil-motion/blog-pet/motion.webp';
  const [bear] = await Promise.all([new BearAtlasCache(clips).get('typing'), panda.decode()]);
  const drawBear = actor(room, bear, { at: [-1.65, 1.4, .42], size: [2.58, 1.51], atlas: clips.typing, pixel: true });
  const drawPanda = actor(room, panda, { at: [1.8, 1.66, .47], size: [1.58, 1.58], atlas: pandaManifest, pixel: false });
  let time = 0, frame = 0, target = 0;
  drawBear(0); drawPanda(0);
  return {
    point(x: number, y: number) { target = angleToCircularFrame(x, y, pandaManifest.frameCount, pandaManifest.startAngleRadians); },
    update(delta: number, still: boolean) {
      if (!still) time += delta;
      const difference = ((target - frame + 81) % 54) - 27;
      frame = still ? target : (frame + difference * (1 - Math.exp(-delta / .11)) + 54) % 54;
      drawBear(still ? 0 : Math.floor(time * clips.typing.fps) % clips.typing.frameCount); drawPanda(frame);
      return { bear: still ? 0 : Math.floor(time * 12) % 140, panda: Math.round(frame) };
    },
  };
}

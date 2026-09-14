import * as THREE from 'three';

export const palette = { oak: '#c69b69', edge: '#ab7e50', light: '#dfc39a', wall: '#eee7da', paper: '#fff7e3', sage: '#718951', darkLeaf: '#4e6740', lightLeaf: '#98aa6b', soil: '#504032' } as const;

export function canvasTexture(paint: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) paint(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function makeMaterials() {
  const grain = canvasTexture(ctx => {
    ctx.fillStyle = '#dfc39a'; ctx.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y += 2) {
      const shade = .06 + (Math.sin(y * 12.7) + 1) * .045;
      ctx.strokeStyle = `rgba(110,69,28,${shade})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, y);
      for (let x = 0; x <= 512; x += 8) ctx.lineTo(x, y + Math.sin(x * .02 + y) * 2 + Math.sin(x * .006 + y) * 3);
      ctx.stroke();
    }
  });
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
  const cloth = canvasTexture(ctx => {
    ctx.fillStyle = '#ece6d6'; ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = '#71836b';
    for (let n = 0; n < 8; n++) { ctx.globalAlpha = .45; ctx.fillRect(n * 64, 0, 30, 512); ctx.fillRect(0, n * 64, 512, 30); }
    ctx.globalAlpha = .1; ctx.fillStyle = '#ffffff';
    for (let n = 0; n < 512; n += 3) { ctx.fillRect(n, 0, 1, 512); ctx.fillRect(0, n, 512, 1); }
  });
  const weave = canvasTexture(ctx => {
    ctx.fillStyle = '#d9c9a8'; ctx.fillRect(0, 0, 512, 512);
    for (let n = 0; n < 512; n += 4) {
      ctx.fillStyle = n % 8 ? '#e7dcc3' : '#c5b697';
      ctx.fillRect(n, 0, 2, 512); ctx.globalAlpha = .45;
      ctx.fillRect(0, n, 512, 2); ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = '#9b9e7c'; ctx.lineWidth = 6;
    ctx.strokeRect(18, 18, 476, 476); ctx.lineWidth = 2; ctx.strokeRect(30, 30, 452, 452);
  });
  const mat = (color: string, roughness = .85) => new THREE.MeshStandardMaterial({ color, roughness });
  return {
    wood: new THREE.MeshStandardMaterial({ map: grain, color: '#d5b38b', roughness: .72 }),
    edge: mat(palette.edge, .7), wall: mat(palette.wall), paper: mat(palette.paper),
    green: mat(palette.sage), soil: mat(palette.soil),
    cloth: new THREE.MeshStandardMaterial({ map: cloth, roughness: 1 }),
    rug: new THREE.MeshStandardMaterial({ map: weave, roughness: 1 }), leaf: [mat(palette.darkLeaf), mat(palette.sage), mat(palette.lightLeaf)],
  };
}
export type Materials = ReturnType<typeof makeMaterials>;

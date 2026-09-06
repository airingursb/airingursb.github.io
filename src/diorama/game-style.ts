import { CanvasTexture, MeshStandardMaterial, SRGBColorSpace } from 'three';

export const gameColors = {
  grass: '#9dcc53', grassLight: '#badf6b', leaf: '#62b84b', leafLight: '#8dd260', leafShade: '#37874b',
  earth: '#cba172', earthShade: '#b0855e', earthStone: '#dfbe91', wood: '#c89050',
  woodLight: '#e6b873', woodShade: '#9c663d', stone: '#bdc6b1', cream: '#fff2cf',
  coral: '#ed957a', teal: '#64aaa0', charcoal: '#303e46', blossom: '#fff4cf', flowerGold: '#f2c957',
} as const;

export const gameMatte = (color: string) => new MeshStandardMaterial({color, roughness: .78});

export function createGameWoodGrain() {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 512, 128);
    for (let line = 0; line < 15; line++) {
      ctx.strokeStyle = line % 3 ? '#f0e5d5' : '#e6d6bf'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x <= 512; x += 8) {
        const y = line * 9 + Math.sin(x * .019 + line) * 2;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace; texture.anisotropy = 4;
  return texture;
}

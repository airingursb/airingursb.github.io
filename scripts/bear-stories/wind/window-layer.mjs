import sharp from 'sharp';

export const windowRegion = { left: 194, top: 38, width: 90, height: 70 };
const width = 320;
const height = 192;
const paneWidth = 53;
const paneHeight = 50;

export async function loadWindowLayers() {
  const read = name => sharp(new URL(name, import.meta.url).pathname).ensureAlpha().raw().toBuffer();
  const [frame, texture] = await Promise.all([read('./window-frame-reference.png'), read('./window-pane-reference.png')]);
  const panes = [];
  for (let step = 0; step <= 8; step++) {
    const amount = step / 8;
    const left = 205 + Math.round(37 * amount);
    const top = 48 + Math.round(5 * amount);
    const bottom = 97 - Math.round(5 * amount);
    const pane = Buffer.alloc(width * height * 4);
    for (let x = left; x <= 257; x++) {
      const u = (x - left) / (257 - left);
      const upper = Math.round(top + (48 - top) * u);
      const lower = Math.round(bottom + (97 - bottom) * u);
      const textureX = Math.round(u * (paneWidth - 1));
      for (let y = upper; y <= lower; y++) {
        const textureY = Math.round((y - upper) / (lower - upper) * (paneHeight - 1));
        const at = (textureY * paneWidth + textureX) * 4;
        texture.copy(pane, (y * width + x) * 4, at, at + 4);
      }
    }
    // A small latch belongs to the moving free edge, never outside the fixed jamb.
    for (let y = 75; y <= 80; y++) for (let x = left + 1; x <= left + 3; x++) {
      const at = (y * width + x) * 4;
      pane.set(y === 75 || y === 80 || x === left + 1 ? [41, 30, 23, 255] : [124, 73, 32, 255], at);
    }
    panes.push(pane);
  }
  return { frame, panes };
}

function connectedForeground(source, kind) {
  const eligible = new Uint8Array(width * height);
  const seen = new Uint8Array(width * height);
  const mask = new Uint8Array(width * height);
  const neighbors = point => [point - 1, point + 1, point - width, point + width]
    .filter(next => next >= 0 && next < width * height && Math.abs(next % width - point % width) <= 1);
  for (let y = 38; y < 135; y++) for (let x = 90; x < 258; x++) {
    const point = y * width + x;
    const [r, g, b, a] = source.subarray(point * 4, point * 4 + 4);
    const color = kind === 'cloth'
      ? g > r + 3 && g > b + 3 && r > 45 && g < 215
      : kind === 'paper' ? r > 190 && g > 160 && b > 110 && r >= g - 3 && g > b + 9
      : r > 115 && r < 195 && g > 65 && g < 138 && b > 25 && b < 95 && r - g > 36 && g - b > 24;
    if (a && color) eligible[point] = 1;
  }
  let largest = [];
  const paper = [];
  const cloth = [];
  for (let point = 0; point < eligible.length; point++) {
    if (!eligible[point] || seen[point]) continue;
    const group = [point];
    seen[point] = 1;
    let attachedLeft = false;
    let extendsOutside = false;
    let minX = width;
    let maxX = 0;
    let maxY = 0;
    for (let at = 0; at < group.length; at++) {
      const x = group[at] % width;
      const y = Math.floor(group[at] / width);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      if (x < windowRegion.left || y >= windowRegion.top + windowRegion.height) extendsOutside = true;
      if (x >= 198 && x <= 212 && y >= 44 && y <= 47) attachedLeft = true;
      const near = [...neighbors(group[at]), group[at] - width - 1, group[at] - width + 1, group[at] + width - 1, group[at] + width + 1];
      for (const next of near) {
        if (!eligible[next] || seen[next]) continue;
        seen[next] = 1;
        group.push(next);
      }
    }
    if ((kind !== 'cloth' || attachedLeft) && group.length > largest.length) largest = group;
    if (kind === 'cloth' && (attachedLeft || minX <= 210 && maxX <= 216 && maxY <= 70)) cloth.push(...group);
    if (kind === 'paper' && (extendsOutside || maxY >= 85 && group.length >= 60 && maxX - minX >= 14)) paper.push(...group);
  }
  for (const point of kind === 'paper' ? paper : kind === 'cloth' ? cloth : largest) {
    mask[point] = 1;
    const x = point % width;
    const y = Math.floor(point / width);
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const next = (y + dy) * width + x + dx;
      if (next < 0 || next >= mask.length) continue;
      const [r, g, b, a] = source.subarray(next * 4, next * 4 + 4);
      const outline = kind === 'cloth' ? r < 100 && g < 110 && b < 90
        : kind === 'paper' ? r < 180 && g < 140 && b < 120 && r > g + 20 && g > b + 12
        : r < 110 && g < 80 && b < 65;
      if (a && outline) mask[next] = 1;
    }
  }
  // Keep cream ear / coral cheek pixels enclosed by the original bear contour.
  const outside = new Uint8Array(width * height);
  const flood = [0];
  outside[0] = 1;
  for (let at = 0; at < flood.length; at++) for (const next of neighbors(flood[at])) {
    if (outside[next] || mask[next]) continue;
    outside[next] = 1;
    flood.push(next);
  }
  for (let point = 0; point < mask.length; point++) if (!outside[point]) mask[point] = 1;
  return mask;
}

export function repairWindow(pixels, clip, frame, layers) {
  const source = Buffer.from(pixels);
  const step = clip === 'window' ? Math.max(0, Math.min(8, 50 - frame)) : 8;
  const pane = layers.panes[step];
  const cloth = connectedForeground(source, 'cloth');
  const bear = connectedForeground(source, 'bear');
  const paper = connectedForeground(source, 'paper');
  let preservedPawPixels = 0;
  let preservedClothPixels = 0;
  for (let y = windowRegion.top; y < windowRegion.top + windowRegion.height; y++) {
    for (let x = windowRegion.left; x < windowRegion.left + windowRegion.width; x++) {
      const point = y * width + x;
      const offset = point * 4;
      layers.frame.copy(pixels, offset, offset, offset + 4);
      if (pane[offset + 3]) pane.copy(pixels, offset, offset, offset + 4);
      if (cloth[point] || bear[point] || paper[point]) source.copy(pixels, offset, offset, offset + 4);
      preservedPawPixels += bear[point];
      preservedClothPixels += cloth[point];
    }
  }
  return { paneStep: step, preservedPawPixels, preservedClothPixels };
}

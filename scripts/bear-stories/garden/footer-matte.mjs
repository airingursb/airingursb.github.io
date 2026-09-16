import { removeMatte } from './matte.mjs';

// The actor mask includes enclosed background gaps. Apply the colour matte to
// its whole silhouette, while preserving connected cream details and water.
export function removeFooterMatte(rgb, width, height) {
  const result = removeMatte(rgb, width, height);
  const cream = new Uint8Array(width * height);
  const visited = new Uint8Array(cream.length);
  for (let pixel = 0; pixel < cream.length; pixel++) {
    const [r,g,b] = rgb.subarray(pixel * 3, pixel * 3 + 3);
    cream[pixel] = r > 215 && g > 205 && b > 155 && r >= g && r - g < 22 && g - b > 10 ? 1 : 0;
  }
  for (let start = 0; start < cream.length; start++) {
    if (!cream[start] || visited[start]) continue;
    const component = [start];
    visited[start] = 1;
    for (let index = 0; index < component.length; index++) {
      const pixel = component[index], x = pixel % width, y = Math.floor(pixel / width);
      for (const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const nx = x + dx, ny = y + dy, neighbor = ny * width + nx;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height || !cream[neighbor] || visited[neighbor]) continue;
        visited[neighbor] = 1;
        component.push(neighbor);
      }
    }
    const rows = component.map(pixel => Math.floor(pixel / width));
    const columns = component.map(pixel => pixel % width);
    if (component.length < 12 || Math.max(...rows) - Math.min(...rows) < 3 || Math.max(...columns) - Math.min(...columns) < 3) continue;
    for (const pixel of component) {
      rgb.copy(result, pixel * 4, pixel * 3, pixel * 3 + 3);
      result[pixel * 4 + 3] = 255;
    }
  }
  // This footer's water extends to the pot, to the right of the older scene.
  for (let y = 146; y < 202; y++) for (let x = 260; x < Math.min(306, width - 1); x++) {
    const pixel = y * width + x, offset = pixel * 3;
    if (rgb[offset + 1] <= rgb[offset] + 3 || rgb[offset + 2] <= rgb[offset] + 3) continue;
    let supported = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const neighbor = ((y + dy) * width + x + dx) * 3;
      if (rgb[neighbor + 1] > rgb[neighbor] + 15 && rgb[neighbor + 2] > rgb[neighbor] + 20) supported++;
    }
    if (supported < 2) continue;
    rgb.copy(result, pixel * 4, offset, offset + 3);
    result[pixel * 4 + 3] = 255;
  }
  return result;
}

/** Adaptive matte for H3's changing, nearly uniform studio backgrounds. */
export function extractMatte(raw, width, height, options = {}) {
  const count = width * height;
  if (raw.length !== count * 4) throw new Error('Expected tightly packed RGBA pixels');
  const pixels = Buffer.from(raw);
  const backdrop = new Float32Array(height * 3);
  const strip = Math.max(3, Math.floor(width * .035));
  for (let y = 0; y < height; y++) {
    const channels = [[], [], []];
    for (let dy = -3; dy <= 3; dy++) {
      const row = Math.max(0, Math.min(height - 1, y + dy));
      for (let x = 0; x < strip; x += 2) {
        for (const column of [x, width - x - 1]) {
          const offset = (row * width + column) * 4;
          for (let c = 0; c < 3; c++) channels[c].push(raw[offset + c]);
        }
      }
    }
    for (let c = 0; c < 3; c++) {
      channels[c].sort((a, b) => a - b);
      backdrop[y * 3 + c] = channels[c][Math.floor(channels[c].length / 2)];
    }
  }
  const global = [0, 1, 2].map(c => {
    const values = Array.from({ length: height }, (_, y) => backdrop[y * 3 + c]).sort((a, b) => a - b);
    return values[Math.floor(values.length / 2)];
  });
  // A departing bird may briefly occupy one edge strip; it cannot redefine a row.
  for (let y = 0; y < height; y++) {
    const distance = Math.hypot(...global.map((value, c) => value - backdrop[y * 3 + c]));
    if (distance > 18) for (let c = 0; c < 3; c++) backdrop[y * 3 + c] = global[c];
  }
  const background = new Uint8Array(count);
  const possible = new Uint8Array(count);
  for (let p = 0; p < count; p++) {
    const i = p * 4, row = Math.floor(p / width) * 3;
    let dot = 0, norm = 0, delta = 0;
    for (let c = 0; c < 3; c++) {
      dot += raw[i + c] * backdrop[row + c];
      norm += backdrop[row + c] ** 2;
      delta += (raw[i + c] - backdrop[row + c]) ** 2;
    }
    const scale = dot / Math.max(1, norm);
    let residual = 0;
    for (let c = 0; c < 3; c++) residual += (raw[i + c] - backdrop[row + c] * scale) ** 2;
    // General colors are removable only when connected to the exterior.
    // The cart backboard and enclosed paper can legitimately match the backdrop.
    // This authored palette has no purple: coral cheeks have blue below green.
    // Reject chroma-subsampling flecks whose green contamination defeats color distance.
    const keyColored = raw[i] > raw[i + 1] + 24 && raw[i + 2] > raw[i + 1] + 24;
    // Cyan/blue key gaps in the closed paw/book grip are outside this warm/sage palette.
    const coolGap = backdrop[row + 1] > backdrop[row] + 15 && backdrop[row + 2] > backdrop[row] + 28 && delta < 24 ** 2;
    background[p] = keyColored || coolGap ? 1 : 0;
    possible[p] = delta < 39 ** 2 || keyColored || (options.shadows !== false && scale > .30 && scale < 1.17 && residual < (p >= count * .78 ? 48 : 31) ** 2) ? 1 : 0;
  }
  const queue = new Int32Array(count), visited = new Uint8Array(count);
  let head = 0, tail = 0;
  const enqueue = p => {
    if (!visited[p] && possible[p]) { visited[p] = 1; queue[tail++] = p; }
  };
  for (let x = 0; x < width; x++) { enqueue(x); enqueue(count - width + x); }
  for (let y = 1; y < height - 1; y++) { enqueue(y * width); enqueue(y * width + width - 1); }
  while (head < tail) {
    const p = queue[head++], x = p % width;
    background[p] = 1;
    if (x > 0) enqueue(p - 1);
    if (x < width - 1) enqueue(p + 1);
    if (p >= width) enqueue(p - width);
    if (p < count - width) enqueue(p + width);
  }
  // Distance from backing defines a narrow reconstruction band, not an erosion.
  const depth = new Uint8Array(count).fill(255);
  head = 0; tail = 0;
  for (let p = 0; p < count; p++) if (background[p]) { depth[p] = 0; queue[tail++] = p; }
  while (head < tail) {
    const p = queue[head++], x = p % width, distance = depth[p] + 1;
    if (distance > 6) continue;
    for (const n of [x > 0 ? p - 1 : -1, x < width - 1 ? p + 1 : -1, p >= width ? p - width : -1, p < count - width ? p + width : -1]) {
      if (n >= 0 && depth[n] > distance) { depth[n] = distance; queue[tail++] = n; }
    }
  }
  let decontaminated = 0;
  for (let p = 0; p < count; p++) {
    const i = p * 4;
    if (background[p]) { pixels.fill(0, i, i + 4); continue; }
    if (depth[p] > 4) continue;
    const x = p % width, y = Math.floor(p / width), row = y * 3;
    let best;
    for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) {
      const nx = x + dx, ny = y + dy;
      if ((!dx && !dy) || nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const n = ny * width + nx, j = n * 4;
      if (depth[n] < 2 || Math.max(raw[j], raw[j + 1], raw[j + 2]) > 180) continue;
      if (raw[j + 2] > raw[j + 1] + 20 && raw[j] > raw[j + 1] + 20) continue;
      let dot = 0, norm = 0;
      for (let c = 0; c < 3; c++) {
        dot += (raw[i + c] - backdrop[row + c]) * (raw[j + c] - backdrop[row + c]);
        norm += (raw[j + c] - backdrop[row + c]) ** 2;
      }
      const alpha = Math.max(0, Math.min(1, dot / Math.max(1, norm)));
      if (alpha > .98) continue;
      let residual = 0;
      for (let c = 0; c < 3; c++) residual += (raw[i + c] - (raw[j + c] * alpha + backdrop[row + c] * (1 - alpha))) ** 2;
      const error = Math.sqrt(residual);
      if (error > 64) continue;
      const score = error + Math.hypot(dx, dy) * 1.5;
      if (!best || score < best.score) best = { j, alpha, score };
    }
    if (!best) continue;
    for (let c = 0; c < 3; c++) pixels[i + c] = raw[best.j + c];
    pixels[i + 3] = best.alpha < .12 ? 0 : Math.round(best.alpha * 255);
    decontaminated++;
  }
  // Codec flecks disconnected from any authored prop are not part of the actor.
  visited.fill(0);
  for (let start = 0; start < count; start++) {
    if (visited[start] || pixels[start * 4 + 3] < 12) continue;
    head = 0; tail = 1; queue[0] = start; visited[start] = 1;
    while (head < tail) {
      const p = queue[head++], x = p % width, y = Math.floor(p / width);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy, n = ny * width + nx;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height || visited[n] || pixels[n * 4 + 3] < 12) continue;
        visited[n] = 1; queue[tail++] = n;
      }
    }
    if (tail <= 16) for (let index = 0; index < tail; index++) pixels.fill(0, queue[index] * 4, queue[index] * 4 + 4);
  }
  let area = 0, edgePixels = 0;
  const bounds = { left: width, top: height, right: 0, bottom: 0 };
  for (let p = 0; p < count; p++) {
    if (pixels[p * 4 + 3] < 32) continue;
    const x = p % width, y = Math.floor(p / width);
    area++;
    if (!x || !y || x === width - 1 || y === height - 1) edgePixels++;
    bounds.left = Math.min(bounds.left, x); bounds.right = Math.max(bounds.right, x);
    bounds.top = Math.min(bounds.top, y); bounds.bottom = Math.max(bounds.bottom, y);
  }
  return { pixels, report: { area, edgePixels, bounds, decontaminated, background: Array.from(backdrop.slice(Math.floor(height / 2) * 3, Math.floor(height / 2) * 3 + 3)) } };
}

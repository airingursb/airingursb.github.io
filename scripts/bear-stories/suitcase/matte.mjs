const background = 250;

export function extractMatte(raw, width, height) {
  const pixels = Buffer.from(raw);
  const count = width * height;
  const adjacent = pixel => {
    const x = pixel % width, y = Math.floor(pixel / width), result = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if ((dx || dy) && x + dx >= 0 && x + dx < width && y + dy >= 0 && y + dy < height) result.push((y + dy) * width + x + dx);
    }
    return result;
  };
  const neutral = pixel => {
    const i = pixel * 4;
    const high = Math.max(raw[i], raw[i + 1], raw[i + 2]);
    return { high, range: high - Math.min(raw[i], raw[i + 1], raw[i + 2]) };
  };
  const outside = new Uint8Array(count), visited = new Uint8Array(count), queue = [];
  for (let x = 0; x < width; x++) queue.push(x, count - width + x);
  for (let y = 0; y < height; y++) queue.push(y * width, y * width + width - 1);
  for (let at = 0; at < queue.length; at++) {
    const pixel = queue[at];
    if (visited[pixel]) continue;
    visited[pixel] = 1;
    const color = neutral(pixel);
    if (color.high < 185 || color.range > 18) continue;
    outside[pixel] = 1;
    queue.push(...adjacent(pixel));
  }
  // Retain the existing paw/case backdrop seeds; their chroma limit protects cream details.
  for (let p = 0; p < count; p++) {
    const color = neutral(p);
    if (p % width < width * 0.45 && Math.floor(p / width) > height * 0.52 && color.high >= 235 && color.range <= 12) outside[p] = 1;
  }
  const band = new Uint8Array(count);
  for (let p = 0; p < count; p++) {
    if (outside[p]) { pixels[p * 4 + 3] = 0; continue; }
    if (adjacent(p).some(n => outside[n])) band[p] = 1;
  }
  for (let p = 0; p < count; p++) if (!outside[p] && !band[p] && adjacent(p).some(n => band[n] === 1)) band[p] = 2;

  let decontaminated = 0;
  for (let p = 0; p < count; p++) {
    if (!band[p]) continue;
    const i = p * 4, high = neutral(p).high;
    if (high < 55) continue;
    const x = p % width, y = Math.floor(p / width);
    let best;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      if ((!dx && !dy) || x + dx < 0 || x + dx >= width || y + dy < 0 || y + dy >= height) continue;
      const n = (y + dy) * width + x + dx, color = neutral(n);
      if (outside[n] || band[n] === 1 || color.high > 180 || color.high > high - 12 || (color.range < 12 && color.high > 55)) continue;
      const j = n * 4;
      let numerator = 0, denominator = 0;
      for (let c = 0; c < 3; c++) {
        numerator += (background - raw[i + c]) * (background - raw[j + c]);
        denominator += (background - raw[j + c]) ** 2;
      }
      const alpha = Math.max(0, Math.min(1, numerator / denominator));
      if (alpha > 0.96) continue;
      let error = 0;
      for (let c = 0; c < 3; c++) error += (raw[i + c] - (raw[j + c] * alpha + background * (1 - alpha))) ** 2;
      error = Math.sqrt(error / 3);
      if (error > 14) continue;
      const score = error + Math.hypot(dx, dy) * 1.5;
      if (!best || score < best.score) best = { j, alpha, score };
    }
    if (!best) continue;
    for (let c = 0; c < 3; c++) pixels[i + c] = raw[best.j + c];
    pixels[i + 3] = Math.round(best.alpha * 255);
    decontaminated++;
  }
  const report = { area: 0, decontaminated, touchesEdge: false };
  for (let p = 0; p < count; p++) {
    if (!pixels[p * 4 + 3]) continue;
    report.area++;
    if (p % width === 0 || p % width === width - 1 || p < width || p >= count - width) report.touchesEdge = true;
  }
  return { pixels, report };
}

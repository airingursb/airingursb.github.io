export function removeMatte(pixels, width, height) {
  const visited = new Uint8Array(width * height);
  const queue = [];
  const neighbors = (point) => {
    const x = point % width;
    const y = Math.floor(point / width);
    const result = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if ((dx || dy) && x + dx >= 0 && x + dx < width && y + dy >= 0 && y + dy < height) {
          result.push((y + dy) * width + x + dx);
        }
      }
    }
    return result;
  };
  for (let x = 0; x < width; x++) queue.push(x, (height - 1) * width + x);
  for (let y = 0; y < height; y++) queue.push(y * width, y * width + width - 1);
  for (let at = 0; at < queue.length; at++) {
    const point = queue[at];
    if (visited[point]) continue;
    visited[point] = 1;
    const index = point * 4;
    const max = Math.max(...pixels.subarray(index, index + 3));
    const min = Math.min(...pixels.subarray(index, index + 3));
    if (min < 190 || max - min > 20) continue;
    pixels[index + 3] = 0;
    queue.push(...neighbors(point));
  }
  let cleaned = 0;
  let removed = 0;
  const seen = new Uint8Array(width * height);
  for (let point = 0; point < width * height; point++) {
    if (seen[point] || !pixels[point * 4 + 3]) continue;
    const group = [point];
    seen[point] = 1;
    for (let at = 0; at < group.length; at++) {
      for (const neighbor of neighbors(group[at])) {
        if (seen[neighbor] || !pixels[neighbor * 4 + 3]) continue;
        seen[neighbor] = 1;
        group.push(neighbor);
      }
    }
    // Keep detached sheets and the window; only tiny codec debris is discarded.
    if (group.length < 5) {
      for (const member of group) pixels[member * 4 + 3] = 0;
      removed += group.length;
    }
  }
  for (let pass = 0; pass < 2; pass++) {
    const before = Buffer.from(pixels);
    for (let point = 0; point < width * height; point++) {
      const index = point * 4;
      if (!before[index + 3]) continue;
      const nearby = neighbors(point);
      if (!nearby.some(neighbor => !before[neighbor * 4 + 3])) continue;
      const max = Math.max(...before.subarray(index, index + 3));
      const min = Math.min(...before.subarray(index, index + 3));
      if (max < 80 || max - min > 75) continue;
      const outline = nearby.filter(neighbor => before[neighbor * 4 + 3] && Math.max(...before.subarray(neighbor * 4, neighbor * 4 + 3)) < 80);
      if (!outline.length) continue;
      const darkest = outline.reduce((left, right) => before[left * 4] < before[right * 4] ? left : right);
      before.copy(pixels, index, darkest * 4, darkest * 4 + 3);
      cleaned++;
    }
  }
  const opaque = Array.from({ length: width * height }, (_, point) => point).filter(point => pixels[point * 4 + 3]);
  return {
    cleaned, removed, area: opaque.length,
    touchesEdge: opaque.some(point => point % width === 0 || point % width === width - 1 || point < width || point >= width * (height - 1)),
  };
}

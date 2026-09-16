export function removeMatte(rgb, width, height) {
  const count = width * height;
  const waterInterior = new Uint8Array(count);
  for (let y = 146; y < height - 1; y++) for (let x = 154; x < Math.min(285, width - 1); x++) {
    const offset = (y * width + x) * 3;
    if (rgb[offset + 1] <= rgb[offset] + 3 || rgb[offset + 2] <= rgb[offset] + 3) continue;
    let supported = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const neighbor = ((y + dy) * width + x + dx) * 3;
      if (rgb[neighbor + 1] > rgb[neighbor] + 15 && rgb[neighbor + 2] > rgb[neighbor] + 20) supported++;
    }
    if (supported >= 2) waterInterior[y * width + x] = 1;
  }
  const rgba = Buffer.alloc(count * 4);
  for (let pixel = 0; pixel < count; pixel++) {
    const source = pixel * 3, target = pixel * 4;
    rgb.copy(rgba, target, source, source + 3);
    const low = Math.min(...rgb.subarray(source, source + 3));
    const high = Math.max(...rgb.subarray(source, source + 3));
    const x = pixel % width, y = Math.floor(pixel / width);
    const water = x >= 154 && x < 285 && y > 145 && rgb[source + 2] > rgb[source] + 8 && rgb[source + 1] > rgb[source] + 4;
    rgba[target + 3] = low > 215 && high - low < 35 && !water && !waterInterior[pixel] ? 0 : 255;
  }
  const keyed = Buffer.from(rgba);
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    const offset = (y * width + x) * 4;
    if (!keyed[offset + 3] || waterInterior[y * width + x]) continue;
    let boundary = false, interior = 255;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const neighbor = ((y + dy) * width + x + dx) * 4;
      if (!keyed[neighbor + 3]) boundary = true;
      else interior = Math.min(interior, ...keyed.subarray(neighbor, neighbor + 3));
    }
    const low = Math.min(...keyed.subarray(offset, offset + 3));
    if (!boundary || interior >= 150 || low <= interior + 35) continue;
    const coverage = Math.max(.01, Math.min(1, (245 - low) / (245 - interior)));
    rgba[offset + 3] = Math.round(255 * coverage);
    for (let channel = 0; channel < 3; channel++) rgba[offset + channel] = Math.max(0, Math.min(255,
      Math.round((keyed[offset + channel] - 245 * (1 - coverage)) / coverage)));
  }
  const clean = Buffer.from(rgba);
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    const offset = (y * width + x) * 4;
    if (!rgba[offset + 3] || waterInterior[y * width + x]) continue;
    const low = Math.min(...rgba.subarray(offset, offset + 3));
    const high = Math.max(...rgba.subarray(offset, offset + 3));
    if (low < 100 || high - low > 28) continue;
    let boundary = false, interior = 255;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      if (x + dx < 0 || x + dx >= width || y + dy < 0 || y + dy >= height) continue;
      const neighbor = ((y + dy) * width + x + dx) * 4;
      if (Math.abs(dx) <= 2 && Math.abs(dy) <= 2 && !rgba[neighbor + 3]) boundary = true;
      if (rgba[neighbor + 3] && Math.max(...rgba.subarray(neighbor, neighbor + 3)) < 145) {
        interior = Math.min(interior, ...rgba.subarray(neighbor, neighbor + 3));
      }
    }
    if (!boundary || interior >= 145 || low < interior + 35) continue;
    // Unmix only the narrow neutral matte band; warm muzzle/flowers and blue water keep their colours.
    const coverage = Math.max(.01, Math.min(1, (245 - low) / (245 - interior)));
    clean[offset + 3] = Math.round(255 * coverage);
    for (let channel = 0; channel < 3; channel++) clean[offset + channel] = Math.max(0, Math.min(255,
      Math.round((rgba[offset + channel] - 245 * (1 - coverage)) / coverage)));
  }
  return clean;
}

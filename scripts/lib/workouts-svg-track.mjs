// Generate a small SVG path "d" for a thumbnail track preview (viewBox 100x60).
// Equirectangular projection; aspect ratio is preserved by scaling to the
// smaller axis. Padding 4px on each side.

const VW = 100;
const VH = 60;
const PAD = 4;

/**
 * @param {Array<{lat:number,lng:number}>} route
 * @returns {string}
 */
export function generateTrackSvg(route) {
  if (!route || route.length < 2) return '';
  let minLat = Infinity, maxLat = -Infinity;
  let minLng = Infinity, maxLng = -Infinity;
  for (const p of route) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }
  const dLat = Math.max(maxLat - minLat, 1e-9);
  const dLng = Math.max(maxLng - minLng, 1e-9);

  const innerW = VW - PAD * 2;
  const innerH = VH - PAD * 2;
  // Preserve aspect ratio
  const scale = Math.min(innerW / dLng, innerH / dLat);
  const drawnW = dLng * scale;
  const drawnH = dLat * scale;
  const offsetX = PAD + (innerW - drawnW) / 2;
  const offsetY = PAD + (innerH - drawnH) / 2;

  /** @param {{lat:number,lng:number}} p */
  function project(p) {
    const x = offsetX + (p.lng - minLng) * scale;
    const y = offsetY + (maxLat - p.lat) * scale;     // flip y
    return [round(x), round(y)];
  }

  const [x0, y0] = project(route[0]);
  let d = `M ${x0} ${y0}`;
  for (let i = 1; i < route.length; i++) {
    const [x, y] = project(route[i]);
    d += ` L ${x} ${y}`;
  }
  return d;
}

function round(n) {
  return Math.round(n * 100) / 100;
}

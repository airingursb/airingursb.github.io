// Douglas-Peucker simplification on (lat, lng) points.
// Tolerance is in degrees (lat/lng are degrees). For a personal workout
// at hiking scale, 0.00005° ≈ 5 m at the equator — good default.
//
// All non-coordinate fields on each point are preserved verbatim.

/**
 * @param {Array<{lat:number,lng:number} & Record<string,unknown>>} points
 * @param {number} tolerance - perpendicular distance threshold (in degrees)
 * @returns {typeof points}
 */
export function simplifyRoute(points, tolerance) {
  if (!Array.isArray(points) || points.length <= 2) return points.slice();

  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;

  /** @param {number} start @param {number} end */
  function recurse(start, end) {
    if (end <= start + 1) return;
    let maxDist = 0;
    let idx = -1;
    const a = points[start];
    const b = points[end];
    for (let i = start + 1; i < end; i++) {
      const d = perpDistance(points[i], a, b);
      if (d > maxDist) { maxDist = d; idx = i; }
    }
    if (idx !== -1 && maxDist > tolerance) {
      keep[idx] = 1;
      recurse(start, idx);
      recurse(idx, end);
    }
  }

  recurse(0, points.length - 1);

  const out = [];
  for (let i = 0; i < points.length; i++) {
    if (keep[i]) out.push(points[i]);
  }
  return out;
}

function perpDistance(p, a, b) {
  const dx = b.lng - a.lng;
  const dy = b.lat - a.lat;
  if (dx === 0 && dy === 0) {
    const ex = p.lng - a.lng;
    const ey = p.lat - a.lat;
    return Math.hypot(ex, ey);
  }
  const num = Math.abs(dy * p.lng - dx * p.lat + b.lng * a.lat - b.lat * a.lng);
  const den = Math.hypot(dx, dy);
  return num / den;
}

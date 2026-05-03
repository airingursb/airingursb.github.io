// Linear interpolation of a sparse time-bucketed series onto an arbitrary t value.
// Buckets must be sorted by t ascending.

/**
 * @param {Array<{t:number,value:number}>} buckets
 * @param {number} t
 * @returns {number}
 */
export function interpolateSeries(buckets, t) {
  if (!buckets || buckets.length === 0) return 0;
  if (t <= buckets[0].t) return buckets[0].value;
  if (t >= buckets[buckets.length - 1].t) return buckets[buckets.length - 1].value;

  // binary search for the bracket
  let lo = 0;
  let hi = buckets.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (buckets[mid].t <= t) lo = mid; else hi = mid;
  }
  const a = buckets[lo];
  const b = buckets[hi];
  if (a.t === b.t) return a.value;
  const k = (t - a.t) / (b.t - a.t);
  return a.value + k * (b.value - a.value);
}

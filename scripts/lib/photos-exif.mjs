const MAKE_NORMALIZE = {
  SONY: 'Sony',
  NIKON: 'Nikon',
  CANON: 'Canon',
  FUJIFILM: 'Fujifilm',
  'NIKON CORPORATION': 'Nikon',
};

function normalizeMakeModel(make, model) {
  if (!model) return null;
  const m = (make || '').toUpperCase();
  const cleanMake = MAKE_NORMALIZE[m] || (make || '').trim();
  if (!cleanMake) return model.trim();
  if (model.toLowerCase().startsWith(cleanMake.toLowerCase())) return model.trim();
  return `${cleanMake} ${model.trim()}`;
}

function formatShutter(t) {
  if (t == null) return null;
  if (t >= 1) return `${t}s`;
  const denom = Math.round(1 / t);
  return `1/${denom}`;
}

export function normalizeExif(raw) {
  return {
    camera: normalizeMakeModel(raw.Make, raw.Model),
    lens: raw.LensModel || raw.Lens || null,
    iso: raw.ISO ?? null,
    shutter: formatShutter(raw.ExposureTime),
    aperture: raw.FNumber != null ? `f/${raw.FNumber}` : null,
    focalLength: raw.FocalLength != null ? `${Math.round(raw.FocalLength)}mm` : null,
    takenAt: raw.DateTimeOriginal instanceof Date ? raw.DateTimeOriginal.toISOString() : null,
  };
}

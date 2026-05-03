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

// EXIF FNumber from some cameras (notably iPhone) comes back as a raw float
// like 1.7799999713880652; format it as a clean photographer-style string
// ("f/1.8", "f/2", never "f/2.0"). Accepts a number or an already-formatted
// "f/x" string so we can clean up existing manifest entries in place.
export function cleanAperture(value) {
  if (value == null || value === '') return null;
  const s = String(value).trim();
  const m = s.match(/^f\/?(\d+(?:\.\d+)?)/i);
  const raw = m ? parseFloat(m[1]) : Number(s);
  if (!Number.isFinite(raw)) return null;
  const rounded = Math.round(raw * 10) / 10; // 1 dp
  const text = rounded % 1 === 0 ? String(rounded) : rounded.toFixed(1);
  return `f/${text}`;
}

export function normalizeExif(raw) {
  return {
    camera: normalizeMakeModel(raw.Make, raw.Model),
    lens: raw.LensModel || raw.Lens || null,
    iso: raw.ISO ?? null,
    shutter: formatShutter(raw.ExposureTime),
    aperture: cleanAperture(raw.FNumber),
    focalLength: raw.FocalLength != null ? `${Math.round(raw.FocalLength)}mm` : null,
    takenAt: raw.DateTimeOriginal instanceof Date ? raw.DateTimeOriginal.toISOString() : null,
  };
}

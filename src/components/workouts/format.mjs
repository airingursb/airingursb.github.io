// src/components/workouts/format.mjs
// Pure formatters — used by both build-time scripts and the React components.
// The .ts wrapper re-exports these with type signatures.

export function formatPace(secPerKm) {
  if (!secPerKm || secPerKm <= 0 || !isFinite(secPerKm)) return '—';
  const total = Math.round(secPerKm);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}'${String(s).padStart(2, '0')}"`;
}

export const formatPaceSecPerKm = formatPace;

export function formatDistance(km) {
  if (!km || km <= 0) return '—';
  return `${km.toFixed(2)} km`;
}

export function formatDuration(sec) {
  if (sec == null || sec < 0) return '—';
  const total = Math.round(sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const TYPE_LABEL_ZH = {
  hiking:  '徒步',
  walking: '步行',
  running: '跑步',
  cycling: '骑行',
  other:   '运动',
};
const TYPE_LABEL_EN = {
  hiking:  'Hiking',
  walking: 'Walking',
  running: 'Running',
  cycling: 'Cycling',
  other:   'Workout',
};

/** Render a workout type label localized for ZH or EN. */
export function formatTypeLabel(type, lang = 'zh') {
  const dict = lang === 'en' ? TYPE_LABEL_EN : TYPE_LABEL_ZH;
  return dict[type] ?? dict.other;
}

/** Build the default `${date} · <type>` title used when a workout has no mdx title. */
export function defaultWorkoutTitle(isoStart, type, lang = 'zh') {
  return `${isoStart.slice(0, 10)} · ${formatTypeLabel(type, lang)}`;
}

export function formatRelativeDate(iso, locale = 'zh-CN') {
  const target = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.round((now - target) / 1000);
  const days = Math.floor(diffSec / 86400);
  if (locale.startsWith('zh')) {
    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7)   return `${days} 天前`;
    if (days < 30)  return `${Math.floor(days / 7)} 周前`;
    return new Date(iso).toLocaleDateString('zh-CN');
  } else {
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7)   return `${days} days ago`;
    if (days < 30)  return `${Math.floor(days / 7)} weeks ago`;
    return new Date(iso).toLocaleDateString('en-US');
  }
}

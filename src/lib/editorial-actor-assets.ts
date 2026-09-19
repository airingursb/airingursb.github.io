type EditorialClip = {
  readonly asset: string;
  readonly frames: number;
  readonly loop?: boolean;
  readonly rest?: string;
};
export type EditorialManifest = {
  readonly version: 1;
  readonly width: number;
  readonly height: number;
  readonly columns: number;
  readonly fps: number;
  readonly poster: string;
  readonly clips: Readonly<Record<string, EditorialClip>>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function positiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= 4096;
}

function localAsset(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*\.(png|webp|avif)$/.test(value) && !value.split('/').includes('..');
}

export function parseEditorialManifest(value: unknown): EditorialManifest | null {
  if (!isRecord(value) || value.version !== 1 || !positiveInteger(value.width) || !positiveInteger(value.height)
    || !positiveInteger(value.columns) || typeof value.fps !== 'number' || !Number.isFinite(value.fps)
    || value.fps < 1 || value.fps > 60 || !localAsset(value.poster) || !isRecord(value.clips)) return null;
  const clips = new Map<string, EditorialClip>();
  for (const [name, clip] of Object.entries(value.clips)) {
    if (!isRecord(clip) || !localAsset(clip.asset) || !positiveInteger(clip.frames)
      || (clip.loop !== undefined && typeof clip.loop !== 'boolean')
      || (clip.rest !== undefined && (typeof clip.rest !== 'string' || clip.rest.length === 0))) return null;
    clips.set(name, {
      asset: clip.asset, frames: clip.frames,
      ...(typeof clip.loop === 'boolean' ? { loop: clip.loop } : {}),
      ...(typeof clip.rest === 'string' ? { rest: clip.rest } : {}),
    });
  }
  return { version: 1, width: value.width, height: value.height, columns: value.columns, fps: value.fps, poster: value.poster, clips: Object.fromEntries(clips) };
}

export async function loadEditorialManifest(url: string): Promise<EditorialManifest | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    return response.ok ? parseEditorialManifest(await response.json()) : null;
  } catch (error) {
    if (error instanceof Error) return null;
    throw error;
  }
}

const atlases = new Map<string, Promise<HTMLImageElement | null>>();

export function loadEditorialAtlas(url: string): Promise<HTMLImageElement | null> {
  const cached = atlases.get(url);
  if (cached) {
    atlases.delete(url);
    atlases.set(url, cached);
    return cached;
  }
  const atlas = new Image();
  atlas.decoding = 'async';
  const loading = new Promise<HTMLImageElement | null>(resolve => {
    const timeout = window.setTimeout(() => { atlas.src = ''; resolve(null); }, 12000);
    atlas.src = url;
    void atlas.decode().then(() => {
      window.clearTimeout(timeout);
      resolve(atlas);
    }, () => {
      window.clearTimeout(timeout);
      resolve(null);
    });
  });
  atlases.set(url, loading);
  if (atlases.size > 2) {
    const oldest = atlases.keys().next().value;
    if (oldest) atlases.delete(oldest);
  }
  void loading.then(image => {
    if (!image && atlases.get(url) === loading) atlases.delete(url);
  });
  return loading;
}

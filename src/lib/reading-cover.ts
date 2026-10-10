const reachability = new Map<string, Promise<boolean>>();

export function readingCoverLabel(
  item: { title: string; title_en?: string | null; slug: string },
  lang: 'zh' | 'en' = 'zh',
): string {
  const title = lang === 'en' ? item.title_en || item.title : item.title;
  return `"${title}" (${item.slug})`;
}

export function warnMissingReadingCover(label: string, url: string, error: unknown): void {
  const detail = error instanceof Error ? error.message : String(error);
  console.warn(`[reading] skip missing cover for ${label}: ${url} (${detail})`);
}

export function resetReadingCoverReachability(): void {
  reachability.clear();
}

async function probeReadingCover(url: string): Promise<boolean> {
  if (!url) return false;

  try {
    const head = await fetch(url, { method: 'HEAD', redirect: 'manual' });
    if (head.status === 200) return true;
    if (head.status !== 405 && head.status !== 501) return false;
  } catch {
    // Some hosts reject HEAD; fall through to GET, same as Astro's asset loader.
  }

  try {
    const response = await fetch(url, { method: 'GET', redirect: 'manual' });
    response.body?.cancel?.();
    return response.status === 200;
  } catch {
    return false;
  }
}

export async function readingCoverIsReachable(url: string): Promise<boolean> {
  let pending = reachability.get(url);
  if (!pending) {
    pending = probeReadingCover(url);
    reachability.set(url, pending);
  }
  return pending;
}

export async function loadReadingCover<T>(
  label: string,
  url: string,
  load: () => Promise<T>,
): Promise<T | null> {
  try {
    if (!(await readingCoverIsReachable(url))) {
      throw new Error('cover is not reachable (HTTP not 200)');
    }
    return await load();
  } catch (error) {
    warnMissingReadingCover(label, url, error);
    return null;
  }
}

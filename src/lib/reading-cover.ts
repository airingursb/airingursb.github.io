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

function isImageContentType(value: string | null): boolean {
  const type = value?.split(';', 1)[0]?.trim().toLowerCase();
  return Boolean(type?.startsWith('image/'));
}

async function consumeBody(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch {
    await response.arrayBuffer().catch(() => undefined);
  }
}

async function probeReadingCover(url: string): Promise<boolean> {
  if (!url) return false;

  try {
    // GET the exact URL Astro will fetch. HEAD is not trustworthy here:
    // R2/CF can answer HEAD 200 while a plain GET still returns a cached 404 HTML page.
    const response = await fetch(url, { method: 'GET', redirect: 'follow' });
    const reachable = response.status === 200 && isImageContentType(response.headers.get('content-type'));
    await consumeBody(response);
    return reachable;
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
      throw new Error('cover is not reachable (GET must return 200 image/*)');
    }
    return await load();
  } catch (error) {
    warnMissingReadingCover(label, url, error);
    return null;
  }
}

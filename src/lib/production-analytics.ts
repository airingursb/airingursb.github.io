/** Hostnames that may load Umami and record production post views. */
export const PRODUCTION_ANALYTICS_HOSTS = ['ursb.me', 'www.ursb.me', 'airingursb.github.io'] as const;

const LOCAL_DEV_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

export function isProductionAnalyticsHost(hostname: string): boolean {
  return (PRODUCTION_ANALYTICS_HOSTS as readonly string[]).includes(hostname);
}

export function hostnameOf(value: string | null | undefined): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  try {
    const url = trimmed.includes('://') ? new URL(trimmed) : new URL(`http://${trimmed}`);
    return url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  } catch {
    return '';
  }
}

export function isLocalDevSource(...values: Array<string | null | undefined>): boolean {
  return values.some((value) => LOCAL_DEV_HOSTS.has(hostnameOf(value)));
}

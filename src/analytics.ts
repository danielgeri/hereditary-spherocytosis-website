/**
 * Privacy-first, cookieless interaction tracking via GoatCounter (hs-atlas.goatcounter.com).
 * Automatically no-ops on localhost, when offline, or when blocked by a content blocker.
 */

interface GoatCounterApi {
  count?: (opts: { path: string; title?: string; event?: boolean }) => void;
}

declare global {
  interface Window {
    goatcounter?: GoatCounterApi;
  }
}

const sentOnce = new Set<string>();

function isLocalhost(): boolean {
  if (typeof window === 'undefined') return true;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
}

function sendToGoatCounter(path: string, title?: string): boolean {
  if (typeof window === 'undefined' || isLocalhost()) return false;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
  if (typeof window.goatcounter?.count !== 'function') return false;
  try {
    window.goatcounter.count({ path, title: title ?? path, event: true });
    return true;
  } catch {
    return false;
  }
}

/** Records a cookieless custom event at most once per browser session. */
export function trackEventOnce(path: string, title?: string): void {
  if (sentOnce.has(path)) return;
  sentOnce.add(path);

  if (!sendToGoatCounter(path, title) && !isLocalhost() && typeof window !== 'undefined') {
    // If async count.js hasn't finished loading yet on initial page load, retry once briefly
    window.setTimeout(() => {
      sendToGoatCounter(path, title);
    }, 1500);
  }
}

/** Records a cookieless SPA pageview when navigating between prerendered SEO routes. */
export function trackPageview(path: string, title?: string): void {
  if (typeof window === 'undefined' || isLocalhost()) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  if (typeof window.goatcounter?.count !== 'function') return;
  try {
    window.goatcounter.count({ path, title: title ?? document.title, event: false });
  } catch {
    // Silent no-op
  }
}

/** Last segment of a URL path (browser-safe, no Node `path`). */
function basenameUrlPath(p: string): string {
  const clean = p.replace(/\\/g, '/');
  const parts = clean.split('/').filter(Boolean);
  return parts.length ? parts[parts.length - 1] : clean;
}

/**
 * Absolute URL for displaying an organization logo on the current site.
 * Rewrites legacy `/uploads/...` and strips wrong host from absolute URLs
 * (e.g. http://localhost:3000/...) so HTTPS pages do not block mixed content.
 */
export function resolveOrganizationLogoUrl(logoUrl: string | null | undefined): string {
  if (logoUrl == null || typeof logoUrl !== 'string') return '';
  const s = logoUrl.trim();
  if (!s) return '';

  let pathname = s;
  if (/^https?:\/\//i.test(s)) {
    try {
      pathname = new URL(s).pathname;
    } catch {
      return '';
    }
  }

  if (!pathname.startsWith('/')) pathname = `/${pathname}`;

  if (pathname.startsWith('/uploads/')) {
    pathname = `/api/uploads/${basenameUrlPath(pathname)}`;
  }

  if (pathname.startsWith('/api/uploads/')) {
    return `${window.location.origin}${pathname}`;
  }

  if (/^https?:\/\//i.test(s)) return s;
  return `${window.location.origin}${pathname}`;
}

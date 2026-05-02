import path from 'path';

/**
 * Normalize stored organization.logoUrl to a relative path served by this API:
 * `/api/uploads/<filename>`.
 * Fixes legacy values (full localhost URL, `/uploads/...`, duplicates, etc.).
 */
export function normalizeOrganizationLogoUrlForApi(stored: string | null | undefined): string | null {
  if (stored == null || typeof stored !== 'string') return null;
  const s = stored.trim();
  if (!s) return null;

  let filename: string;
  try {
    if (/^https?:\/\//i.test(s)) {
      filename = path.basename(new URL(s).pathname);
    } else {
      filename = path.basename(s.startsWith('/') ? s : `/${s}`);
    }
  } catch {
    return null;
  }

  if (!filename || filename === '.' || filename === '..' || filename.includes('..')) return null;

  return `/api/uploads/${filename}`;
}

export function mapOrganizationLogoInPlace<T extends { logoUrl?: string | null }>(org: T): T {
  const next = normalizeOrganizationLogoUrlForApi(org.logoUrl ?? null);
  return { ...org, logoUrl: next };
}

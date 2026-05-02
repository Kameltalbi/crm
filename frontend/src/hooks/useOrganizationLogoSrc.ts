import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { resolveOrganizationLogoUrl } from '@/lib/organizationLogo';

/**
 * Logo affiché : d’abord l’URL publique (fallback), puis remplacé par un blob chargé via
 * `GET /organizations/logo` (avec JWT), car `<img src="/api/uploads/...">` n’envoie pas le token.
 */
export function useOrganizationLogoSrc(logoUrl: string | null | undefined): string {
  const trimmed = logoUrl?.trim() ?? '';
  const [src, setSrc] = useState(() => (trimmed ? resolveOrganizationLogoUrl(logoUrl) : ''));

  useEffect(() => {
    if (!trimmed) {
      setSrc('');
      return;
    }

    const fallback = resolveOrganizationLogoUrl(logoUrl);
    setSrc(fallback);

    let blobUrl: string | null = null;
    let cancelled = false;

    void (async () => {
      try {
        const { data } = await api.get<Blob>('/organizations/logo', { responseType: 'blob' });
        if (cancelled) return;
        if (!(data instanceof Blob) || data.size === 0) return;
        blobUrl = URL.createObjectURL(data);
        setSrc(blobUrl);
      } catch {
        /* garde le fallback */
      }
    })();

    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [trimmed, logoUrl]);

  return trimmed ? src : '';
}

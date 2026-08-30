// Untrusted: in an href, `javascript:` runs in this origin and `data:` can carry a page.
const SAFE_SCHEMES = ['http:', 'https:', 'mailto:'];

export const safeExternalHref = (value: string | null | undefined): string | undefined => {
  const raw = (value ?? '').trim();
  if (!raw) return undefined;

  // A bare domain is the common case and is not a scheme at all, so treat it as https.
  if (/^[\w.-]+\.[a-z]{2,}(\/|$|\?|#)/i.test(raw)) return `https://${raw}`;

  try {
    // Absolute only; a value with no scheme was handled above.
    const parsed = new URL(raw);
    return SAFE_SCHEMES.includes(parsed.protocol) ? parsed.href : undefined;
  } catch {
    return undefined;
  }
};

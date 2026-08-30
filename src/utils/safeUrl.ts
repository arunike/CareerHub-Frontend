// A URL the user typed, or one that arrived from a Google Sheets import, is untrusted. Rendered
// straight into href, `javascript:` runs in this origin on click, and `data:` can carry a page.
const SAFE_SCHEMES = ['http:', 'https:', 'mailto:'];

export const safeExternalHref = (value: string | null | undefined): string | undefined => {
  const raw = (value ?? '').trim();
  if (!raw) return undefined;

  // A bare domain is the common case and is not a scheme at all, so treat it as https.
  if (/^[\w.-]+\.[a-z]{2,}(\/|$|\?|#)/i.test(raw)) return `https://${raw}`;

  try {
    // Absolute only: these are outbound links, and a value with no scheme has already been
    // handled above or is not a link at all.
    const parsed = new URL(raw);
    return SAFE_SCHEMES.includes(parsed.protocol) ? parsed.href : undefined;
  } catch {
    return undefined;
  }
};

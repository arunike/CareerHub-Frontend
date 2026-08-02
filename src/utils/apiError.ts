const NOISY_KEYS = new Set(['non_field_errors', 'detail', '__all__']);

const humanizeField = (key: string) =>
  key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
    .trim();

const flatten = (value: unknown): string[] => {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(flatten);
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).flatMap(flatten);
  }
  return [];
};

export const getApiErrorMessage = (error: unknown, fallback: string): string => {
  const data = (error as { response?: { data?: unknown } })?.response?.data;

  if (typeof data === 'string' && data.trim() && !data.trim().startsWith('<')) {
    return data.trim();
  }

  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;

    // A plain detail/error string is already user-facing.
    for (const key of ['detail', 'error', 'message']) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }

    // Otherwise surface field errors, naming the field so it can be found.
    const parts: string[] = [];
    for (const [key, value] of Object.entries(record)) {
      const messages = flatten(value);
      if (messages.length === 0) continue;
      parts.push(
        NOISY_KEYS.has(key) ? messages.join(' ') : `${humanizeField(key)}: ${messages.join(' ')}`
      );
    }
    // Two is enough to act on; more becomes a wall of text in a toast.
    if (parts.length > 0) return parts.slice(0, 2).join(' · ');
  }

  return fallback;
};

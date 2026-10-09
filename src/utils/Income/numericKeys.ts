// The API keys years as strings; the lookups are numeric.
export const numericKeys = <T>(source: unknown): Record<number, T> | undefined => {
  if (!source || typeof source !== 'object') return undefined;
  const entries = Object.entries(source as Record<string, T>).map(
    ([year, value]) => [Number(year), value] as const
  );
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
};

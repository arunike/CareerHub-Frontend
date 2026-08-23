// Aborted requests are expected whenever a newer action replaces an in-flight one.
export const isCanceledRequest = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  ('code' in error || 'name' in error) &&
  ((error as { code?: string }).code === 'ERR_CANCELED' ||
    (error as { name?: string }).name === 'CanceledError' ||
    (error as { name?: string }).name === 'AbortError');

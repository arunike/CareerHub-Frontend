// Only a refusal ends the session; a dropped connection signed people out mid-draft.
export const isSessionRejection = (error: unknown): boolean => {
  const status = (error as { response?: { status?: unknown } } | null)?.response?.status;
  return typeof status === 'number' && status >= 400 && status < 500;
};

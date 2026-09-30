import { useCallback, useState } from 'react';

// Four pages hand-rolled the same loading/failed/try-finally triad around different fetches.
export const useLoadStatus = (initialLoading = true) => {
  const [loading, setLoading] = useState(initialLoading);
  const [failed, setFailed] = useState(false);

  const run = useCallback(async (work: () => Promise<void>, onError?: (error: unknown) => void) => {
    setLoading(true);
    setFailed(false);
    try {
      await work();
    } catch (error) {
      setFailed(true);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, failed, run };
};

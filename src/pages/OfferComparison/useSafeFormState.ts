import { useCallback, useState } from 'react';

type PatchArg<T> = Partial<T> | ((prev: T) => Partial<T>);

export const useSafeFormState = <T,>(initial: T) => {
  const [state, setState] = useState<T>(initial);

  const patch = useCallback((updates: PatchArg<T>) => {
    setState((prev) => ({
      ...prev,
      ...(typeof updates === 'function' ? updates(prev) : updates),
    }));
  }, []);

  const setField = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setState((prev) => ({ ...prev, [key]: value }));
  }, []);

  return { state, setState, patch, setField };
};

export const useSafeNullableFormState = <T,>(initial: T | null = null) => {
  const [state, setState] = useState<T | null>(initial);

  const patch = useCallback((updates: PatchArg<T>) => {
    setState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        ...(typeof updates === 'function' ? updates(prev) : updates),
      };
    });
  }, []);

  const setField = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setState((prev) => (prev ? { ...prev, [key]: value } : prev));
  }, []);

  return { state, setState, patch, setField };
};


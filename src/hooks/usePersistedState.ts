import { useEffect, useState } from 'react';

type Options<T> = {
  serialize?: (value: T) => string;
  deserialize?: (raw: string) => T;
};

export const usePersistedState = <T,>(
  key: string,
  initialValue: T | (() => T),
  options?: Options<T>,
) => {
  const serialize = options?.serialize ?? ((value: T) => JSON.stringify(value));
  const deserialize = options?.deserialize ?? ((raw: string) => JSON.parse(raw) as T);

  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw != null) return deserialize(raw);
    } catch (error) {
      console.error(`Failed to read persisted state for key "${key}"`, error);
    }
    return typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, serialize(state));
    } catch (error) {
      console.error(`Failed to persist state for key "${key}"`, error);
    }
  }, [key, state, serialize]);

  return [state, setState] as const;
};

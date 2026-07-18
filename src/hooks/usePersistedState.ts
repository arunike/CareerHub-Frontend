import { useEffect, useRef, useState } from 'react';

type Options<T> = {
  serialize?: (value: T) => string;
  deserialize?: (raw: string) => T;
};

export const usePersistedState = <T>(
  key: string,
  initialValue: T | (() => T),
  options?: Options<T>
) => {
  const serializeRef = useRef(options?.serialize);

  useEffect(() => {
    serializeRef.current = options?.serialize;
  }, [options?.serialize]);

  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw != null) {
        return options?.deserialize ? options.deserialize(raw) : (JSON.parse(raw) as T);
      }
    } catch (error) {
      console.error(`Failed to read persisted state for key "${key}"`, error);
    }
    return typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue;
  });

  useEffect(() => {
    try {
      const serialized = serializeRef.current ? serializeRef.current(state) : JSON.stringify(state);
      localStorage.setItem(key, serialized);
    } catch (error) {
      console.error(`Failed to persist state for key "${key}"`, error);
    }
  }, [key, state]);

  return [state, setState] as const;
};

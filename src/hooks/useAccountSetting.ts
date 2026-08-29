import { useCallback, useEffect, useRef, useState } from 'react';
import { getUserSettings, updateUserSettings } from '../api/availability';

// Anything the user typed or arranged has to follow them to another device, so the account is the
// source of truth and localStorage is only a cache that lets the page render before the fetch lands.
const readCache = <T>(cacheKey: string, fallback: T): T => {
  try {
    const raw = window.localStorage.getItem(cacheKey);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeCache = <T>(cacheKey: string, value: T) => {
  try {
    window.localStorage.setItem(cacheKey, JSON.stringify(value));
  } catch {
    // A blocked or full quota must not stop the account save below.
  }
};

// Several of these mount on one page, so concurrent callers share a single request.
let inflight: Promise<Record<string, unknown>> | null = null;

const fetchSettings = () => {
  if (!inflight) {
    inflight = getUserSettings()
      .then((response) => (response.data ?? {}) as Record<string, unknown>)
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
};

// "Never set", which is what lets a first load lift the cache. Checked all the way down: a
// container whose slots are all empty — `{nodes: {}, labels: {}}` — holds nothing, and treating
// it as a value made every first load push a pointless save.
export const isEmptySetting = (value: unknown): boolean => {
  if (value == null) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') {
    const slots = Object.values(value as Record<string, unknown>);
    return slots.length === 0 || slots.every(isEmptySetting);
  }
  // A number, string or boolean is a real value, including 0 and false.
  return false;
};

// debounceMs coalesces high-frequency writes: dragging a graph node fires on every frame, and
// each frame must not become a request.
export const useAccountSetting = <T>(
  field: string,
  fallback: T,
  cacheKey: string,
  debounceMs = 0
) => {
  const [value, setValue] = useState<T>(() => readCache(cacheKey, fallback));
  const [loaded, setLoaded] = useState(false);
  // Read in the adopt-the-cache effect without making it re-run on every keystroke.
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const settings = await fetchSettings();
        if (cancelled) return;
        const remote = settings[field] as T | undefined;

        if (!isEmptySetting(remote)) {
          setValue(remote as T);
          writeCache(cacheKey, remote as T);
        } else if (!isEmptySetting(valueRef.current)) {
          // First load after this shipped: lift what the browser already holds into the account.
          await updateUserSettings({ [field]: valueRef.current });
        }
      } catch {
        // Offline or an older backend: the cache keeps the page working.
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [cacheKey, field]);

  const timerRef = useRef<number | undefined>(undefined);
  const pendingRef = useRef<{ value: T } | null>(null);

  const push = useCallback(
    (next: T) => {
      pendingRef.current = null;
      updateUserSettings({ [field]: next }).catch(() => {
        // Kept in the cache, so the next successful save carries it up.
      });
    },
    [field]
  );

  const persist = useCallback(
    (next: T) => {
      setValue(next);
      writeCache(cacheKey, next);
      if (debounceMs <= 0) {
        push(next);
        return;
      }
      pendingRef.current = { value: next };
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => push(next), debounceMs);
    },
    [cacheKey, debounceMs, push]
  );

  // Flushed, not dropped: a drag released just before navigating away still has to be saved.
  useEffect(
    () => () => {
      window.clearTimeout(timerRef.current);
      if (pendingRef.current) push(pendingRef.current.value);
    },
    [push]
  );

  return { value, setValue: persist, loaded } as const;
};

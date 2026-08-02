import { useCallback, useRef, useState } from 'react';

// Tailwind classes for a field that failed validation.
export const INVALID_FIELD_CLASS = '!border-rose-400 focus:!border-rose-400 focus:!shadow-none';

type FocusableNode =
  | (HTMLElement & { input?: never; nativeElement?: never })
  | {
      focus?: () => void;
      input?: HTMLElement | null;
      nativeElement?: HTMLElement | null;
      scrollIntoView?: never;
    }
  | null;

const elementOf = (node: FocusableNode): HTMLElement | null => {
  if (!node) return null;
  if (typeof (node as HTMLElement).scrollIntoView === 'function') return node as HTMLElement;
  const wrapped = node as { input?: HTMLElement | null; nativeElement?: HTMLElement | null };
  return wrapped.nativeElement ?? wrapped.input ?? null;
};

type FieldRule = {
  value: string | number | null | undefined;
  // Used in the message, e.g. "Name is required".
  label: string;
};

export const useRequiredFields = <K extends string>() => {
  const refs = useRef(new Map<K, FocusableNode>());
  const [errors, setErrors] = useState<Partial<Record<K, string>>>({});

  const register = useCallback(
    (key: K) => ({
      ref: (node: FocusableNode) => {
        refs.current.set(key, node);
      },
    }),
    []
  );

  const errorFor = useCallback((key: K) => errors[key], [errors]);

  const clearError = useCallback((key: K) => {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const clearAll = useCallback(() => setErrors({}), []);

  const validate = useCallback((rules: Partial<Record<K, FieldRule>>) => {
    const found: Partial<Record<K, string>> = {};

    for (const [key, rule] of Object.entries(rules) as [K, FieldRule][]) {
      const value = typeof rule.value === 'string' ? rule.value.trim() : rule.value;
      if (value === '' || value === null || value === undefined) {
        found[key] = `${rule.label} is required`;
      }
    }

    setErrors(found);

    const firstKey = (Object.keys(rules) as K[]).find((key) => found[key]);
    if (!firstKey) return true;

    const node = refs.current.get(firstKey) ?? null;
    elementOf(node)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Focus after the scroll starts so the browser does not jump twice.
    window.setTimeout(() => (node as { focus?: () => void } | null)?.focus?.(), 150);
    return false;
  }, []);

  return { register, errorFor, validate, clearError, clearAll };
};

import { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';

// One page at a time owns unsaved work, so a single slot is enough.
interface Guard {
  isDirty: boolean;
  label: string;
}

interface UnsavedChangesApi {
  register: (guard: Guard | null) => void;
  // False means the caller should stay put.
  confirmLeave: () => Promise<boolean>;
  isDirty: () => boolean;
  label: () => string;
}

const NOOP: UnsavedChangesApi = {
  register: () => {},
  confirmLeave: async () => true,
  isDirty: () => false,
  label: () => '',
};

const UnsavedChangesContext = createContext<UnsavedChangesApi>(NOOP);

export const UnsavedChangesProvider = ({
  children,
  confirm,
}: {
  children: ReactNode;
  // Supplied by the app so the prompt can use the project's own dialog.
  confirm: (label: string) => Promise<boolean>;
}) => {
  const guard = useRef<Guard | null>(null);

  // The browser's own prompt is the only thing that can catch a refresh or a closed tab.
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!guard.current?.isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  const api = useMemo<UnsavedChangesApi>(
    () => ({
      register: (next) => {
        guard.current = next;
      },
      confirmLeave: async () => {
        if (!guard.current?.isDirty) return true;
        return confirm(guard.current.label);
      },
      isDirty: () => Boolean(guard.current?.isDirty),
      label: () => guard.current?.label ?? '',
    }),
    [confirm]
  );

  return <UnsavedChangesContext.Provider value={api}>{children}</UnsavedChangesContext.Provider>;
};

export const useUnsavedChangesApi = () => useContext(UnsavedChangesContext);

// Call from any page that can hold unsaved work.
export const useUnsavedChanges = (isDirty: boolean, label: string) => {
  const { register } = useUnsavedChangesApi();

  useEffect(() => {
    register({ isDirty, label });
    return () => register(null);
  }, [register, isDirty, label]);
};

import { useCallback, useRef } from 'react';
import type { PointerEvent } from 'react';

const DOUBLE_TAP_WINDOW_MS = 350;

type LastTap = {
  dayTimestamp: number;
  occurredAt: number;
};

const useCalendarDoubleTap = (onDateDoubleTap?: (day: Date) => void) => {
  const lastTapRef = useRef<LastTap | null>(null);

  return useCallback(
    (pointerEvent: PointerEvent<HTMLElement>, day: Date) => {
      if (pointerEvent.pointerType === 'mouse' || !onDateDoubleTap) return;

      const dayTimestamp = day.getTime();
      const occurredAt = pointerEvent.timeStamp;
      const lastTap = lastTapRef.current;

      if (
        lastTap?.dayTimestamp === dayTimestamp &&
        occurredAt - lastTap.occurredAt <= DOUBLE_TAP_WINDOW_MS
      ) {
        lastTapRef.current = null;
        pointerEvent.preventDefault();
        onDateDoubleTap(day);
        return;
      }

      lastTapRef.current = { dayTimestamp, occurredAt };
    },
    [onDateDoubleTap]
  );
};

export default useCalendarDoubleTap;

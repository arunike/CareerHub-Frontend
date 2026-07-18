import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
} from 'react';

type UseMobileSheetDragOptions = {
  isOpen: boolean;
  onClose: () => void;
};

const EXPAND_THRESHOLD = 52;
const COLLAPSE_THRESHOLD = 72;
const CLOSE_THRESHOLD = 136;
const DRAG_SLOP = 5;

export const useMobileSheetDrag = ({ isOpen, onClose }: UseMobileSheetDragOptions) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const activePointerIdRef = useRef<number | null>(null);
  const startYRef = useRef(0);
  const latestOffsetRef = useRef(0);
  const minimumOffsetRef = useRef(0);
  const maximumOffsetRef = useRef(0);
  const didDragRef = useRef(false);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    if (isOpen) return;
    setIsExpanded(false);
    setIsDragging(false);
    setDragOffset(0);
    activePointerIdRef.current = null;
    latestOffsetRef.current = 0;
    minimumOffsetRef.current = 0;
    maximumOffsetRef.current = 0;
    didDragRef.current = false;
    suppressClickRef.current = false;
  }, [isOpen]);

  const resetDrag = useCallback(() => {
    activePointerIdRef.current = null;
    latestOffsetRef.current = 0;
    minimumOffsetRef.current = 0;
    maximumOffsetRef.current = 0;
    setIsDragging(false);
    setDragOffset(0);
  }, []);

  const handlePointerDown = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    activePointerIdRef.current = event.pointerId;
    startYRef.current = event.clientY;
    latestOffsetRef.current = 0;
    minimumOffsetRef.current = 0;
    maximumOffsetRef.current = 0;
    didDragRef.current = false;
    suppressClickRef.current = false;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (activePointerIdRef.current !== event.pointerId) return;

      const rawOffset = event.clientY - startYRef.current;
      if (Math.abs(rawOffset) >= DRAG_SLOP) {
        didDragRef.current = true;
      }

      const nextOffset = isExpanded
        ? Math.max(0, rawOffset)
        : Math.max(-160, Math.min(rawOffset, window.innerHeight));

      latestOffsetRef.current = nextOffset;
      minimumOffsetRef.current = Math.min(minimumOffsetRef.current, nextOffset);
      maximumOffsetRef.current = Math.max(maximumOffsetRef.current, nextOffset);
      setDragOffset(nextOffset);
      event.preventDefault();
    },
    [isExpanded]
  );

  const finishDrag = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (activePointerIdRef.current !== event.pointerId) return;

      const offset = latestOffsetRef.current;
      const minimumOffset = minimumOffsetRef.current;
      const maximumOffset = maximumOffsetRef.current;
      const didDrag = didDragRef.current;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      resetDrag();

      if (!didDrag) return;
      suppressClickRef.current = true;

      if (!isExpanded && minimumOffset <= -EXPAND_THRESHOLD) {
        setIsExpanded(true);
      } else if (isExpanded && maximumOffset >= COLLAPSE_THRESHOLD) {
        setIsExpanded(false);
      } else if (!isExpanded && minimumOffset > -DRAG_SLOP && offset >= CLOSE_THRESHOLD) {
        onClose();
      }
    },
    [isExpanded, onClose, resetDrag]
  );

  const handlePointerCancel = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (activePointerIdRef.current !== event.pointerId) return;
      suppressClickRef.current = didDragRef.current;
      const shouldExpand = !isExpanded && minimumOffsetRef.current <= -EXPAND_THRESHOLD;
      resetDrag();
      if (shouldExpand) setIsExpanded(true);
    },
    [isExpanded, resetDrag]
  );

  const handleHandleClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      event.preventDefault();
      return;
    }
    setIsExpanded((current) => !current);
  }, []);

  const visualOffset = dragOffset < 0 ? dragOffset * 0.16 : dragOffset;
  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sheetStyle: CSSProperties = {
    transform: visualOffset ? `translate3d(0, ${visualOffset}px, 0)` : undefined,
    transition:
      isDragging || prefersReducedMotion
        ? 'none'
        : 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1), height 220ms cubic-bezier(0.16, 1, 0.3, 1), max-height 220ms cubic-bezier(0.16, 1, 0.3, 1), border-radius 220ms cubic-bezier(0.16, 1, 0.3, 1)',
    willChange: isDragging ? 'transform' : undefined,
  };

  return {
    isExpanded,
    isDragging,
    sheetStyle,
    handleProps: {
      onClick: handleHandleClick,
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: finishDrag,
      onPointerCancel: handlePointerCancel,
      onLostPointerCapture: finishDrag,
    },
  };
};

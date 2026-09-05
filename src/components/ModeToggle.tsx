import { useCallback, useLayoutEffect, useRef, useState } from 'react';

interface Thumb {
  left: number;
  width: number;
}

// Segmented control with a thumb that slides between options rather than blinking to the new one.
const ModeToggle = <T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (next: T) => void;
}) => {
  const [thumb, setThumb] = useState<Thumb | null>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());

  const place = useCallback(() => {
    const active = buttons.current.get(value);
    if (!active || active.offsetWidth === 0) return;
    setThumb((current) =>
      current?.left === active.offsetLeft && current.width === active.offsetWidth
        ? current
        : { left: active.offsetLeft, width: active.offsetWidth }
    );
  }, [value]);

  // A control inside a modal is laid out after mount, and a font swap moves it again.
  const trackRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      place();
      const observer = new ResizeObserver(place);
      observer.observe(node);
      return () => observer.disconnect();
    },
    [place]
  );

  useLayoutEffect(place, [place, options]);

  return (
    <div
      ref={trackRef}
      role="radiogroup"
      className="relative inline-flex items-center rounded-lg bg-slate-100 p-0.5 ring-1 ring-inset ring-slate-900/[0.04]"
    >
      {thumb && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0.5 rounded-[7px] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.10),0_0_0_1px_rgba(15,23,42,0.04)] transition-[transform,width] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{ width: thumb.width, transform: `translateX(${thumb.left}px)`, left: 0 }}
        />
      )}
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          ref={(node) => {
            if (node) buttons.current.set(option.value, node);
            else buttons.current.delete(option.value);
          }}
          onClick={() => onChange(option.value)}
          className={`relative z-10 min-h-8 rounded-[7px] px-2 text-center text-[10px] font-semibold transition-colors duration-150 sm:min-h-0 sm:py-1 ${
            value === option.value ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default ModeToggle;

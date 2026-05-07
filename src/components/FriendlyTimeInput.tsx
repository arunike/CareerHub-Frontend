import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import dayjs, { type Dayjs } from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

type FriendlyTimeInputProps = {
  id?: string;
  value?: Dayjs | null;
  onChange?: (value: Dayjs | null) => void;
  minuteStep?: number;
  className?: string;
  disabled?: boolean;
  allowClear?: boolean;
  placeholder?: string;
};

const DISPLAY_FORMAT = 'h:mm A';
const optionBaseClass =
  'flex w-full items-center justify-center rounded-md font-medium tabular-nums transition';
const desktopOptionClass = 'mb-0.5 h-9 text-sm last:mb-0';
const mobileOptionClass = 'mb-0.5 min-h-12 text-lg last:mb-0';
const activeOptionClass =
  'bg-white text-gray-950 shadow-[0_1px_8px_rgba(15,23,42,0.08)] ring-1 ring-gray-200';
const inactiveOptionClass = 'text-gray-500 hover:bg-white hover:text-gray-900';
const columnClass = 'overflow-y-auto rounded-md bg-gray-50/70 p-1 ring-1 ring-gray-100';

const normalizeMinute = (minute: number, step: number) => Math.round(minute / step) * step;

const parseTime = (rawValue: string, minuteStep: number) => {
  const value = rawValue.trim().toLowerCase().replace(/\s+/g, '');
  if (!value) return null;

  const formats = [
    'h:mma',
    'h:mmA',
    'h:mm a',
    'hmm',
    'hmma',
    'hha',
    'ha',
    'H:mm',
    'HH:mm',
    'Hmm',
    'HHmm',
  ];

  let parsed = dayjs(value, formats, true);
  if (!parsed.isValid()) {
    const compact = value.match(/^(\d{1,2})(\d{2})([ap]m?|)$/);
    if (compact) {
      const [, hour, minute, suffix] = compact;
      const normalizedSuffix = suffix === 'p' ? 'pm' : suffix === 'a' ? 'am' : suffix || '';
      parsed = dayjs(`${hour}:${minute}${normalizedSuffix}`, ['h:mma', 'H:mm'], true);
    }
  }

  if (!parsed.isValid()) return null;

  const roundedMinute = normalizeMinute(parsed.minute(), minuteStep);
  if (roundedMinute >= 60) {
    return parsed.minute(0).second(0).millisecond(0).add(1, 'hour');
  }

  return parsed.minute(roundedMinute).second(0).millisecond(0);
};

const formatDisplay = (value?: Dayjs | null) =>
  value?.isValid() ? value.format(DISPLAY_FORMAT) : '';

const buildMinuteOptions = (minuteStep: number) => {
  const safeMinuteStep = Math.max(1, Math.min(60, minuteStep));
  const minutes: number[] = [];

  for (let minute = 0; minute < 60; minute += safeMinuteStep) {
    minutes.push(minute);
  }

  return minutes;
};

const roundTime = (value: Dayjs, minuteStep: number) => {
  const roundedMinute = normalizeMinute(value.minute(), minuteStep);
  if (roundedMinute >= 60) {
    return value.minute(0).second(0).millisecond(0).add(1, 'hour');
  }

  return value.minute(roundedMinute).second(0).millisecond(0);
};

const getSheetParts = (value: Dayjs) => {
  const hour = Number(value.format('h'));
  const minute = value.minute();
  const period = value.format('A') as 'AM' | 'PM';

  return { hour, minute, period };
};

const createTimeFromParts = (
  baseValue: Dayjs,
  hour: number,
  minute: number,
  period: 'AM' | 'PM'
) => {
  let hour24 = hour % 12;
  if (period === 'PM') hour24 += 12;

  return baseValue.hour(hour24).minute(minute).second(0).millisecond(0);
};

const FriendlyTimeInput = ({
  id,
  value = null,
  onChange,
  minuteStep = 5,
  className,
  disabled = false,
  allowClear = false,
  placeholder = 'Select time',
}: FriendlyTimeInputProps) => {
  const [draft, setDraft] = useState(formatDisplay(value));
  const [open, setOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetValue, setSheetValue] = useState<Dayjs>(() =>
    roundTime(value ?? dayjs(), minuteStep)
  );
  const wrapperRef = useRef<HTMLDivElement>(null);
  const desktopPickerRef = useRef<HTMLDivElement>(null);
  const minuteOptions = useMemo(() => buildMinuteOptions(minuteStep), [minuteStep]);
  const sheetParts = useMemo(() => getSheetParts(sheetValue), [sheetValue]);
  const highlightedTime = useMemo(() => {
    const parsedDraft = parseTime(draft, minuteStep);
    return parsedDraft ?? value ?? null;
  }, [draft, minuteStep, value]);
  const desktopValue = highlightedTime?.isValid()
    ? roundTime(highlightedTime, minuteStep)
    : roundTime(value ?? dayjs(), minuteStep);
  const desktopParts = useMemo(() => getSheetParts(desktopValue), [desktopValue]);

  useEffect(() => {
    if (!open) setDraft(formatDisplay(value));
  }, [open, value]);

  useEffect(() => {
    if (!sheetOpen) {
      setSheetValue(roundTime(value ?? dayjs(), minuteStep));
    }
  }, [minuteStep, sheetOpen, value]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  useEffect(() => {
    if (!open || !highlightedTime?.isValid()) return;

    window.requestAnimationFrame(() => {
      const activeMinute = desktopPickerRef.current?.querySelector<HTMLButtonElement>(
        `[data-minute="${desktopParts.minute}"]`
      );
      activeMinute?.scrollIntoView({ block: 'nearest' });
    });
  }, [desktopParts.minute, highlightedTime, open]);

  const commit = (rawValue: string) => {
    const parsed = parseTime(rawValue, minuteStep);
    if (parsed) {
      onChange?.(parsed);
      setDraft(formatDisplay(parsed));
      return;
    }

    if (allowClear && !rawValue.trim()) {
      onChange?.(null);
      setDraft('');
      return;
    }

    setDraft(formatDisplay(value));
  };

  const updateSheetValue = (next: Partial<ReturnType<typeof getSheetParts>>) => {
    const parts = { ...sheetParts, ...next };
    setSheetValue(createTimeFromParts(sheetValue, parts.hour, parts.minute, parts.period));
  };

  const updateDesktopValue = (next: Partial<ReturnType<typeof getSheetParts>>) => {
    const parts = { ...desktopParts, ...next };
    const nextValue = createTimeFromParts(desktopValue, parts.hour, parts.minute, parts.period);
    onChange?.(nextValue);
    setDraft(formatDisplay(nextValue));
  };

  const openSheet = () => {
    if (disabled) return;
    setSheetValue(roundTime(value ?? dayjs(), minuteStep));
    setSheetOpen(true);
  };

  const inputClasses = clsx(
    'h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-900 outline-none transition',
    'hover:border-blue-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-100',
    'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400',
    className
  );

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        id={id}
        type="button"
        value={formatDisplay(value) || placeholder}
        disabled={disabled}
        onClick={openSheet}
        className={clsx(
          inputClasses,
          'cursor-pointer text-left sm:hidden',
          !value && 'text-gray-400'
        )}
      />

      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={draft}
        disabled={disabled}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setDraft(event.target.value);
          setOpen(true);
        }}
        onBlur={() => commit(draft)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commit(draft);
            setOpen(false);
          }
          if (event.key === 'Escape') {
            setDraft(formatDisplay(value));
            setOpen(false);
          }
        }}
        className={clsx(inputClasses, 'hidden sm:block')}
      />

      {open && !disabled && (
        <div
          ref={desktopPickerRef}
          className="absolute left-0 right-0 top-full z-[1055] mt-2 hidden rounded-lg border border-gray-200 bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,0.14)] sm:block"
        >
          <div className="mb-3 text-center text-base font-semibold tracking-wide text-gray-950">
            {desktopValue.format(DISPLAY_FORMAT)}
          </div>
          <div className="grid grid-cols-[1fr_1fr_0.75fr] gap-2">
            <div className={clsx(columnClass, 'max-h-56')}>
              {Array.from({ length: 12 }, (_, index) => index + 1).map((hour) => {
                const active = desktopParts.hour === hour;
                return (
                  <button
                    key={hour}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => updateDesktopValue({ hour })}
                    className={clsx(
                      optionBaseClass,
                      desktopOptionClass,
                      active ? activeOptionClass : inactiveOptionClass
                    )}
                  >
                    {String(hour).padStart(2, '0')}
                  </button>
                );
              })}
            </div>

            <div className={clsx(columnClass, 'max-h-56')}>
              {minuteOptions.map((minute) => {
                const active = desktopParts.minute === minute;
                return (
                  <button
                    key={minute}
                    data-minute={minute}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => updateDesktopValue({ minute })}
                    className={clsx(
                      optionBaseClass,
                      desktopOptionClass,
                      active ? activeOptionClass : inactiveOptionClass
                    )}
                  >
                    {String(minute).padStart(2, '0')}
                  </button>
                );
              })}
            </div>

            <div className={columnClass}>
              {(['AM', 'PM'] as const).map((period) => {
                const active = desktopParts.period === period;
                return (
                  <button
                    key={period}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => updateDesktopValue({ period })}
                    className={clsx(
                      optionBaseClass,
                      desktopOptionClass,
                      active ? activeOptionClass : inactiveOptionClass
                    )}
                  >
                    {period}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {sheetOpen && !disabled && (
        <div className="fixed inset-0 z-[2000] sm:hidden">
          <button
            type="button"
            aria-label="Close time picker"
            className="absolute inset-0 bg-black/35"
            onClick={() => setSheetOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-white shadow-[0_-18px_50px_rgba(15,23,42,0.18)]">
            <div className="mx-auto mt-2 h-1 w-11 rounded-full bg-gray-300" />
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <button
                type="button"
                className="min-h-11 rounded-md px-2 text-sm font-medium text-gray-500"
                onClick={() => setSheetOpen(false)}
              >
                Cancel
              </button>
              <div className="text-lg font-semibold tracking-wide text-gray-950">
                {sheetValue.format(DISPLAY_FORMAT)}
              </div>
              <button
                type="button"
                className="min-h-11 rounded-md px-2 text-sm font-semibold text-gray-950"
                onClick={() => {
                  onChange?.(sheetValue);
                  setDraft(formatDisplay(sheetValue));
                  setSheetOpen(false);
                }}
              >
                OK
              </button>
            </div>

            <div className="grid grid-cols-[1fr_1fr_0.8fr] gap-2 px-4 py-4">
              <div className={clsx(columnClass, 'max-h-64')}>
                {Array.from({ length: 12 }, (_, index) => index + 1).map((hour) => {
                  const active = sheetParts.hour === hour;
                  return (
                    <button
                      key={hour}
                      type="button"
                      onClick={() => updateSheetValue({ hour })}
                      className={clsx(
                        optionBaseClass,
                        mobileOptionClass,
                        active ? activeOptionClass : inactiveOptionClass
                      )}
                    >
                      {String(hour).padStart(2, '0')}
                    </button>
                  );
                })}
              </div>

              <div className={clsx(columnClass, 'max-h-64')}>
                {minuteOptions.map((minute) => {
                  const active = sheetParts.minute === minute;
                  return (
                    <button
                      key={minute}
                      type="button"
                      onClick={() => updateSheetValue({ minute })}
                      className={clsx(
                        optionBaseClass,
                        mobileOptionClass,
                        active ? activeOptionClass : inactiveOptionClass
                      )}
                    >
                      {String(minute).padStart(2, '0')}
                    </button>
                  );
                })}
              </div>

              <div className={columnClass}>
                {(['AM', 'PM'] as const).map((period) => {
                  const active = sheetParts.period === period;
                  return (
                    <button
                      key={period}
                      type="button"
                      onClick={() => updateSheetValue({ period })}
                      className={clsx(
                        optionBaseClass,
                        mobileOptionClass,
                        active ? activeOptionClass : inactiveOptionClass
                      )}
                    >
                      {period}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-3">
              <button
                type="button"
                className="min-h-11 rounded-md px-3 text-sm font-semibold text-gray-700"
                onClick={() => setSheetValue(roundTime(dayjs(), minuteStep))}
              >
                Now
              </button>
              {allowClear && (
                <button
                  type="button"
                  className="min-h-11 rounded-md px-3 text-sm font-medium text-gray-500"
                  onClick={() => {
                    onChange?.(null);
                    setDraft('');
                    setSheetOpen(false);
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FriendlyTimeInput;

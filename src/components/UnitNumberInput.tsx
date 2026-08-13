import { InputNumber } from 'antd';
import type { InputNumberProps } from 'antd';
import { twMerge } from 'tailwind-merge';

// Every numeric field in the app goes through this component so the stepper and
// the unit chip stay identical everywhere. Currency reads before the number,
// everything else after — but the stored value is always a plain number, so the
// unit is display only and never round-trips into saved data.
export type NumberUnit =
  | '$'
  | '%'
  | '$/hr'
  | '$/mo'
  | '$/yr'
  | 'days'
  | 'days/wk'
  | 'hrs'
  | 'hrs/day'
  | 'min'
  | 'sec'
  | 'wks'
  | 'mo'
  | 'yrs'
  | '×';

const ADDONS: Record<NumberUnit, { before?: string; after?: string }> = {
  $: { before: '$' },
  '%': { after: '%' },
  '$/hr': { before: '$', after: '/hr' },
  '$/mo': { before: '$', after: '/mo' },
  '$/yr': { before: '$', after: '/yr' },
  days: { after: 'days' },
  'days/wk': { after: 'days/wk' },
  hrs: { after: 'hrs' },
  'hrs/day': { after: 'hrs/day' },
  min: { after: 'min' },
  sec: { after: 'sec' },
  wks: { after: 'wks' },
  mo: { after: 'mo' },
  yrs: { after: 'yrs' },
  '×': { after: '×' },
};

type Props = Omit<
  InputNumberProps<number>,
  'value' | 'onChange' | 'addonBefore' | 'addonAfter' | 'prefix' | 'suffix' | 'formatter' | 'parser'
> & {
  // Omit for a plain count with no unit chip.
  unit?: NumberUnit;
  // Opt-in escape hatch for fields where people naturally type something other than a
  // bare number, e.g. "1h30" for a duration. It only ever converts input into the plain
  // number that gets stored — no unit character survives into the value.
  parseText?: (raw: string) => number | null;
  // Optional so antd Form.Item can inject them.
  value?: number | null;
  onChange?: (value: number | null) => void;
};

const clamp = (value: number, min?: number, max?: number) => {
  let next = value;
  if (typeof min === 'number') next = Math.max(min, next);
  if (typeof max === 'number') next = Math.min(max, next);
  return next;
};

// antd v6 renders addons as a flex `ant-space-compact` row: the addon chips size to
// content but the number box keeps its default 90px, so the group has to be told to
// grow or it collapses inside a wider container. Padding is trimmed from antd's
// default so a one character unit reads as a chip rather than a slab.
const GROUP = [
  '[&_.ant-input-number-addon]:px-1.5',
  '[&>.ant-input-number]:flex-1',
  '[&>.ant-input-number]:min-w-0',
].join(' ');

// Tailwind utilities live in @layer utilities and antd injects its runtime CSS
// unlayered, so an unlayered antd rule wins no matter the specificity. Nothing in a
// class can beat `.ant-input-number { width: 90px }` — only an inline style can. The
// addon case escapes this because antd sets no flex rule for [&>*]:flex-1 to lose to.
const setsOwnWidth = (className?: string) => /(?:^|\s)!?(?:w-|max-w-)/.test(className ?? '');

const UnitNumberInput = ({
  unit,
  value,
  onChange,
  min,
  max,
  className,
  style,
  parseText,
  ...rest
}: Props) => {
  const addon = unit ? ADDONS[unit] : undefined;
  const fillWidth = !addon && !setsOwnWidth(className);
  return (
    <InputNumber
      {...rest}
      min={min}
      max={max}
      value={value ?? null}
      onChange={(next) => onChange?.(next == null ? null : clamp(Number(next), min, max))}
      {...(parseText
        ? {
            parser: ((raw?: string) => {
              const text = (raw ?? '').trim();
              // Empty means the user is clearing the field; gibberish means they slipped,
              // so hold the last good value rather than silently zeroing it.
              if (!text) return '' as unknown as number;
              const parsed = parseText(text);
              return (parsed == null ? (value ?? '') : parsed) as number;
            }) as never,
            formatter: ((val?: number | string) => (val == null ? '' : String(val))) as never,
          }
        : {})}
      addonBefore={addon?.before}
      addonAfter={addon?.after}
      // With an addon antd puts className on the inner .ant-input-number, so width
      // has to go on rootClassName or the group collapses inside its container.
      className="w-full"
      rootClassName={twMerge('w-full', GROUP, className)}
      style={fillWidth ? { width: '100%', ...style } : style}
    />
  );
};

export default UnitNumberInput;

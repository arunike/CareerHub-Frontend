import { InputNumber } from 'antd';
import type { InputNumberProps } from 'antd';
import { twMerge } from 'tailwind-merge';

export type NumberUnit =
  | '$'
  | '%'
  | '$/hr'
  | '$/day'
  | '$/mo'
  | '$/yr'
  | 'days'
  | 'days/wk'
  | 'hrs'
  | 'hrs/day'
  | 'min'
  | 'mi'
  | 'mpg'
  | '$/gal'
  | 'sec'
  | 'wks'
  | 'mo'
  | 'yrs'
  | '×';

const ADDONS: Record<NumberUnit, { before?: string; after?: string }> = {
  $: { before: '$' },
  '%': { after: '%' },
  '$/hr': { before: '$', after: '/hr' },
  '$/day': { before: '$', after: '/day' },
  '$/mo': { before: '$', after: '/mo' },
  '$/yr': { before: '$', after: '/yr' },
  days: { after: 'days' },
  mi: { after: 'mi' },
  mpg: { after: 'mpg' },
  '$/gal': { before: '$', after: '/gal' },
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
  // Opt-in parser for input like "1h30"; only the plain number is stored.
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

// antd sizes the number box to 90px, so the compact row must be told to grow.
const GROUP = [
  '[&_.ant-input-number-addon]:px-1.5',
  '[&>.ant-input-number]:flex-1',
  '[&>.ant-input-number]:min-w-0',
].join(' ');

// antd's CSS is unlayered, so only an inline style can beat .ant-input-number's width.
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
              // Empty clears; unparseable holds the last good value rather than zeroing it.
              if (!text) return '' as unknown as number;
              const parsed = parseText(text);
              return (parsed == null ? (value ?? '') : parsed) as number;
            }) as never,
            formatter: ((val?: number | string) => (val == null ? '' : String(val))) as never,
          }
        : {})}
      addonBefore={addon?.before}
      addonAfter={addon?.after}
      // With an addon antd puts className on the inner input, so width goes on rootClassName.
      className="w-full"
      rootClassName={twMerge('w-full', GROUP, className)}
      style={fillWidth ? { width: '100%', ...style } : style}
    />
  );
};

export default UnitNumberInput;

import { InputNumber } from 'antd';
import { displayText, fieldWidthStyle, groupDigits, parseMoney } from './numberField';

interface Props {
  value: number | null;
  onChange: (value: number | null) => void;
  size?: 'small' | 'middle';
  placeholder?: string;
  max?: number;
  // Fixed pixel width. Omit it and the field grows with what is typed.
  width?: number;
  // Fills its container instead of sizing to content, for grid and stacked layouts.
  fullWidth?: boolean;
  minChars?: number;
  className?: string;
}

export const MoneyInput = ({
  value,
  onChange,
  size = 'middle',
  placeholder,
  max = 1_000_000_000,
  width,
  fullWidth = false,
  minChars = 6,
  className,
}: Props) => (
  <InputNumber
    size={size}
    className={className}
    style={
      fullWidth
        ? { width: '100%' }
        : width
          ? { width, maxWidth: '100%' }
          : fieldWidthStyle(displayText(value), size, minChars)
    }
    prefix="$"
    min={0}
    max={max}
    step={100}
    placeholder={placeholder}
    value={value}
    formatter={(raw) => {
      if (raw === undefined || raw === null) return '';
      const text = String(raw);
      return text === '' ? '' : groupDigits(text);
    }}
    parser={(raw) => parseMoney(raw) as unknown as number}
    onChange={(next) => onChange(next === null ? null : Number(next))}
  />
);

export default MoneyInput;

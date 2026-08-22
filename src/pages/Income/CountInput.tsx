import { InputNumber } from 'antd';
import { displayText, fieldWidthStyle } from './numberField';

interface Props {
  value: number | null;
  onChange: (value: number | null) => void;
  size?: 'small' | 'middle';
  max?: number;
  minChars?: number;
  // Fills its container instead of sizing to content, for grid and stacked layouts.
  fullWidth?: boolean;
}

// A plain count, not a percentage or an amount: "× 10" reads as ten payments.
export const CountInput = ({
  value,
  onChange,
  size = 'middle',
  max = 999,
  minChars = 2,
  fullWidth = false,
}: Props) => (
  <InputNumber
    size={size}
    style={
      fullWidth ? { width: '100%' } : fieldWidthStyle(displayText(value, false), size, minChars)
    }
    prefix="×"
    min={0}
    max={max}
    step={1}
    value={value}
    onChange={(next) => onChange(next === null ? null : Number(next))}
  />
);

export default CountInput;

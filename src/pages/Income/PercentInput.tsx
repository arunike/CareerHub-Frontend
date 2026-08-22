import { InputNumber } from 'antd';
import { displayText, fieldWidthStyle } from './numberField';

interface Props {
  value: number | null;
  onChange: (value: number | null) => void;
  size?: 'small' | 'middle';
  max?: number;
  step?: number;
  minChars?: number;
  disabled?: boolean;
}

export const PercentInput = ({
  value,
  onChange,
  size = 'middle',
  max = 100,
  step = 1,
  minChars = 3,
  disabled,
}: Props) => (
  <InputNumber
    size={size}
    // Percents are never grouped, so the raw digits drive the width.
    style={fieldWidthStyle(displayText(value, false), size, minChars)}
    suffix="%"
    min={0}
    max={max}
    step={step}
    disabled={disabled}
    value={value}
    onChange={(next) => onChange(next === null ? null : Number(next))}
  />
);

export default PercentInput;

// Integer part only, so 30000000.00 reads as 30,000,000.00.
export const groupDigits = (raw: string) => {
  const [whole, fraction] = raw.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
};

export const parseMoney = (raw: string | undefined) => {
  const cleaned = (raw ?? '').replace(/[^\d.]/g, '');
  const [whole, ...rest] = cleaned.split('.');
  // Keep at most one decimal point so a stray second one cannot produce NaN.
  return rest.length > 0 ? `${whole}.${rest.join('')}` : whole;
};

// Inline width: antd's unlayered CSS outranks Tailwind utilities.
const CHROME_REM = { small: 3.4, middle: 3.9 } as const;

export const fieldWidthStyle = (
  text: string,
  size: 'small' | 'middle',
  minChars: number
): React.CSSProperties => ({
  width: `calc(${Math.max(minChars, text.length)}ch + ${CHROME_REM[size]}rem)`,
  maxWidth: '100%',
});

export const displayText = (value: number | null | undefined, grouped = true) => {
  if (value === null || value === undefined) return '';
  const raw = String(value);
  return grouped ? groupDigits(raw) : raw;
};

// Calculated values are rounded before they reach a field; typed values are left alone.
export const roundCents = (value: number) => Math.round(value * 100) / 100;

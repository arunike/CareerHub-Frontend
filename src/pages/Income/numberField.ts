// Group only the integer part, so 30000000.00 reads as 30,000,000.00 rather than having
// commas pushed into the decimals.
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

// Room for the affix, the horizontal padding, the stepper handlers and the caret. Tailwind
// width classes cannot be used: antd injects unlayered CSS, which outranks layered utilities.
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

// Money is shown to the cent. Anything we calculate is rounded before it reaches a field;
// what the user typed is left exactly as they typed it.
export const roundCents = (value: number) => Math.round(value * 100) / 100;

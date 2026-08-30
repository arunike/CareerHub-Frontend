import { describe, expect, it } from 'vitest';
import { displayText, fieldWidthStyle, groupDigits, parseMoney, roundCents } from './numberField';

describe('groupDigits', () => {
  it('groups a large whole number', () => {
    expect(groupDigits('30000000')).toBe('30,000,000');
  });

  it('keeps commas out of the decimal part', () => {
    expect(groupDigits('30000000.00')).toBe('30,000,000.00');
  });

  it('leaves short numbers alone', () => {
    expect(groupDigits('120')).toBe('120');
    expect(groupDigits('1000')).toBe('1,000');
  });

  it('handles a trailing decimal point mid-typing', () => {
    expect(groupDigits('1234.')).toBe('1,234.');
  });

  it('handles an empty string', () => {
    expect(groupDigits('')).toBe('');
  });
});

describe('parseMoney', () => {
  it('strips the grouping and currency symbols', () => {
    expect(parseMoney('$30,000,000.00')).toBe('30000000.00');
  });

  it('drops a stray second decimal point rather than producing NaN', () => {
    expect(Number(parseMoney('1.2.3'))).not.toBeNaN();
    expect(parseMoney('1.2.3')).toBe('1.23');
  });

  it('ignores letters', () => {
    expect(parseMoney('abc123')).toBe('123');
  });

  it('handles undefined', () => {
    expect(parseMoney(undefined)).toBe('');
  });
});

describe('displayText', () => {
  it('groups money values', () => {
    expect(displayText(30000000)).toBe('30,000,000');
  });

  it('leaves percents ungrouped', () => {
    expect(displayText(1000, false)).toBe('1000');
  });

  it('renders an empty string for no value', () => {
    expect(displayText(null)).toBe('');
    expect(displayText(undefined)).toBe('');
  });
});

describe('fieldWidthStyle', () => {
  it('grows as the text gets longer', () => {
    const chars = (style: React.CSSProperties) =>
      Number(String(style.width).match(/([\d.]+)ch/)![1]);
    expect(chars(fieldWidthStyle('5', 'middle', 3))).toBeLessThan(
      chars(fieldWidthStyle('30,000,000', 'middle', 3))
    );
  });

  it('counts the grouping commas, not just the digits', () => {
    expect(fieldWidthStyle('30,000,000', 'middle', 3).width).toContain('10ch');
  });

  it('never shrinks below the minimum', () => {
    expect(fieldWidthStyle('', 'middle', 4).width).toContain('4ch');
  });

  it('never exceeds its container', () => {
    expect(fieldWidthStyle('123456789', 'middle', 3).maxWidth).toBe('100%');
  });

  it('reserves room for the stepper handlers', () => {
    expect(fieldWidthStyle('5', 'middle', 3).width).toContain('3.9rem');
    expect(fieldWidthStyle('5', 'small', 3).width).toContain('3.4rem');
  });
});

describe('roundCents', () => {
  it('cuts a calculated figure to the cent', () => {
    // 160,000 over 26 paychecks, which is what leaked into the field at full float width.
    expect(roundCents(160000 / 26)).toBe(6153.85);
    expect(roundCents(5538.461538461538)).toBe(5538.46);
  });

  it('leaves a figure that is already exact alone', () => {
    expect(roundCents(6000)).toBe(6000);
    expect(roundCents(15.24)).toBe(15.24);
    expect(roundCents(0)).toBe(0);
  });

  it('rounds to the nearer cent and keeps the sign', () => {
    expect(roundCents(1.006)).toBe(1.01);
    expect(roundCents(1.004)).toBe(1);
    expect(roundCents(-1.006)).toBe(-1.01);
  });

  it('cannot round a binary float that only looks like a half', () => {
    // 1.005 is really 1.00499…, so it rounds down, as toFixed(2) does.
    expect(roundCents(1.005)).toBe(1);
    expect(Number((1.005).toFixed(2))).toBe(1);
  });

  it('never returns more than two decimals', () => {
    for (const value of [1 / 3, 2 / 3, 160000 / 26, 82612.9 / 24, 1e-9]) {
      const decimals = (String(roundCents(value)).split('.')[1] ?? '').length;
      expect(decimals).toBeLessThanOrEqual(2);
    }
  });
});

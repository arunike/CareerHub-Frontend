import { describe, expect, it } from 'vitest';
import { chartSeriesForTheme } from './chartColors';
import { SEGMENTS } from '../utils/Experience/compensationBreakdownFormat';

const hueOf = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const span = max - Math.min(r, g, b);
  if (span === 0) return 0;
  const raw =
    max === r ? ((g - b) / span) % 6 : max === g ? (b - r) / span + 2 : (r - g) / span + 4;
  return (((raw * 60) % 360) + 360) % 360;
};

const apart = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

describe('the three pay parts', () => {
  it('is what the breakdown lists, so every key resolves to a series colour', () => {
    const series = chartSeriesForTheme('light');
    expect(SEGMENTS.map((segment) => segment.key)).toEqual(['base', 'bonus', 'equity']);
    SEGMENTS.forEach((segment) => expect(series[segment.key]).toMatch(/^#[0-9a-f]{6}$/));
  });

  it('carries no colour of its own, which is what let it disagree with the charts', () => {
    SEGMENTS.forEach((segment) => expect(segment).not.toHaveProperty('color'));
  });

  (['light', 'dark'] as const).forEach((theme) => {
    it(`reads as three hues in ${theme}, not two blues`, () => {
      const series = chartSeriesForTheme(theme);
      const hues = {
        base: hueOf(series.base),
        bonus: hueOf(series.bonus),
        equity: hueOf(series.equity),
      };
      // 60 degrees apart is the gap at which two adjacent swatches stop reading as one colour.
      expect(apart(hues.base, hues.bonus)).toBeGreaterThan(60);
      expect(apart(hues.base, hues.equity)).toBeGreaterThan(60);
      expect(apart(hues.bonus, hues.equity)).toBeGreaterThan(60);
    });
  });
});

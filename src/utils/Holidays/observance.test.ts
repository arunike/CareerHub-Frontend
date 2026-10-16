import { describe, expect, it } from 'vitest';
import { ignoreListAfter } from './observance';

describe('ignoreListAfter', () => {
  const DATE = '2026-07-01';

  it('adds the name when a day stops being observed', () => {
    expect(ignoreListAfter([], 'Observed Day A', DATE, false)).toEqual(['Observed Day A']);
  });

  it('keeps the list unchanged when the day is already ignored by name', () => {
    const list = ['Observed Day A'];
    expect(ignoreListAfter(list, 'Observed Day A', DATE, false)).toBe(list);
  });

  it('keeps the list unchanged when the day is already ignored by date', () => {
    const list = [DATE];
    expect(ignoreListAfter(list, 'Observed Day A', DATE, false)).toBe(list);
  });

  it('drops both forms when a day becomes observed again', () => {
    expect(
      ignoreListAfter(['Observed Day A', DATE, 'Observed Day B'], 'Observed Day A', DATE, true)
    ).toEqual(['Observed Day B']);
  });

  it('leaves other years alone, which is why the stored list is read before it is written', () => {
    expect(ignoreListAfter(['Observed Day B'], 'Observed Day A', DATE, true)).toEqual([
      'Observed Day B',
    ]);
  });
});

import { describe, expect, it } from 'vitest';
import { observedDaysOf } from './observedDays';
import type { Holiday } from '../../types';

const holiday = (date: string, is_ignored?: boolean) =>
  ({
    id: 1,
    date,
    description: 'Holiday',
    is_recurring: false,
    is_locked: false,
    is_ignored,
  }) as Holiday;

describe('observedDaysOf', () => {
  it('observes a federal holiday', () => {
    expect(observedDaysOf([holiday('2026-07-03')]).has('2026-07-03')).toBe(true);
  });

  it('treats an ignored holiday as a working day', () => {
    expect(observedDaysOf([holiday('2026-07-03', true)]).has('2026-07-03')).toBe(false);
  });
});

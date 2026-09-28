import { describe, expect, it } from 'vitest';
import { daysApart, localDay } from './localDay';

describe('localDay', () => {
  it('lands on midnight local, not UTC, so the calendar day does not shift', () => {
    const day = localDay('2026-07-01');
    expect(day.getFullYear()).toBe(2026);
    expect(day.getMonth()).toBe(6);
    expect(day.getDate()).toBe(1);
    expect(day.getHours()).toBe(0);
  });
});

describe('daysApart', () => {
  it('counts whole days forward', () => {
    expect(daysApart('2026-07-01', '2026-07-03')).toBe(2);
  });

  it('counts across a month end', () => {
    expect(daysApart('2026-07-31', '2026-08-01')).toBe(1);
  });

  it('survives a daylight-saving change, where a naive division gives 0.96 of a day', () => {
    expect(daysApart('2026-11-01', '2026-11-02')).toBe(1);
  });
});

import { describe, expect, it } from 'vitest';
import { grossPinDrift, grossPinSignature } from './grossPinDrift';
import { clearFieldFromPeriods } from './periodDeductions';

// 165000 over 26, then a raise to 181500 from the third paycheck.
const FLAT = 165000 / 26;
const RAISED = 181500 / 26;
const scheduled = { 3: RAISED, 4: RAISED };
const periods = [
  { periodIndex: 1, payDate: '2026-07-01' },
  { periodIndex: 2, payDate: '2026-07-15' },
  { periodIndex: 3, payDate: '2026-07-29' },
  { periodIndex: 4, payDate: '2026-08-12' },
];

describe('grossPinDrift', () => {
  it('says nothing when no paycheck pins a gross', () => {
    expect(grossPinDrift([{ periodIndex: 3, dental: 10 }], periods, scheduled, FLAT)).toEqual([]);
  });

  it('says nothing when the pin still matches the schedule', () => {
    expect(
      grossPinDrift([{ periodIndex: 3, regularGross: RAISED }], periods, scheduled, FLAT)
    ).toEqual([]);
  });

  it('ignores a pin that differs only by rounding cents', () => {
    expect(
      grossPinDrift([{ periodIndex: 3, regularGross: RAISED - 0.4 }], periods, scheduled, FLAT)
    ).toEqual([]);
  });

  it('reports a paycheck the raise cannot reach', () => {
    expect(
      grossPinDrift([{ periodIndex: 3, regularGross: FLAT }], periods, scheduled, FLAT)
    ).toEqual([{ periodIndex: 3, pinned: FLAT, scheduled: RAISED, payDate: '2026-07-29' }]);
  });

  it('falls back to the flat rate for a period the schedule does not name', () => {
    expect(
      grossPinDrift([{ periodIndex: 1, regularGross: 1000 }], periods, scheduled, FLAT)
    ).toEqual([{ periodIndex: 1, pinned: 1000, scheduled: FLAT, payDate: '2026-07-01' }]);
  });

  it('reports a hand-typed gross too, so the user is asked rather than overruled', () => {
    const drift = grossPinDrift([{ periodIndex: 2, regularGross: 9000 }], periods, scheduled, FLAT);
    expect(drift).toHaveLength(1);
  });
});

describe('the pay date a paycheck is named by', () => {
  it('falls back to null when the schedule has no period for the pin', () => {
    const drift = grossPinDrift([{ periodIndex: 99, regularGross: 1 }], periods, scheduled, FLAT);
    expect(drift[0].payDate).toBeNull();
  });
});

describe('grossPinSignature', () => {
  it('changes when a later raise moves the scheduled rate again', () => {
    const first = grossPinDrift([{ periodIndex: 3, regularGross: FLAT }], periods, scheduled, FLAT);
    const later = grossPinDrift(
      [{ periodIndex: 3, regularGross: FLAT }],
      periods,
      { 3: 200000 / 26 },
      FLAT
    );
    expect(grossPinSignature(first)).not.toBe(grossPinSignature(later));
  });
});

describe('clearFieldFromPeriods', () => {
  it('releases only the named paychecks', () => {
    const rows = [
      { periodIndex: 2, regularGross: FLAT, dental: 10 },
      { periodIndex: 3, regularGross: FLAT, dental: 10 },
    ];
    expect(clearFieldFromPeriods(rows, 'regularGross', [3])).toEqual([
      { periodIndex: 2, regularGross: FLAT, dental: 10 },
      { periodIndex: 3, dental: 10 },
    ]);
  });

  it('drops a row that held nothing but the pin, so the paycheck stops reading as adjusted', () => {
    expect(
      clearFieldFromPeriods([{ periodIndex: 3, regularGross: FLAT }], 'regularGross', [3])
    ).toEqual([]);
  });
});

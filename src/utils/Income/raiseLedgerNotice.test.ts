import { describe, expect, it } from 'vitest';
import { raiseLedgerNotice } from './raiseSchedule';
import type { RaiseEntry } from '../../types';

const periods = [
  { periodIndex: 18, payDate: '2026-10-01' },
  { periodIndex: 19, payDate: '2026-10-02' },
  { periodIndex: 20, payDate: '2026-12-25' },
];

const raise = (over: Partial<RaiseEntry> = {}): RaiseEntry =>
  ({
    id: 'r1',
    date: '2026-10-01',
    effective_date: '2026-10-01',
    type: 'merit',
    base_before: 165000,
    base_after: 181500,
    ...over,
  }) as RaiseEntry;

const notice = (over: Partial<Parameters<typeof raiseLedgerNotice>[0]> = {}) =>
  raiseLedgerNotice({
    raises: [raise()],
    periods,
    fallbackSalary: 165000,
    hasLinkedOffer: true,
    ...over,
  });

describe('raiseLedgerNotice', () => {
  it('says nothing when the raise re-rates a paycheck', () => {
    expect(notice()).toBeNull();
  });

  it('says nothing when there is no raise to explain', () => {
    expect(notice({ raises: [] })).toBeNull();
  });

  it('names the missing offer link, which is where raises are stored', () => {
    const text = notice({ hasLinkedOffer: false });
    expect(text).toContain('No offer is linked');
    // Names the whole gap, not just raises: benefits and match are on the offer too.
    expect(text).toContain('employer match');
  });

  it('names an entry with no new base pay', () => {
    expect(notice({ raises: [raise({ base_after: 0 })] })).toContain('no new base pay');
  });

  it('names a raise dated past the last paycheck of the year', () => {
    const late = notice({ raises: [raise({ date: '2027-03-01' })] });
    expect(late).toContain('2027-03-01');
    expect(late).toContain('after the last paycheck');
  });

  it('names the case where the new base already is the base in use', () => {
    // The offer was edited to the raised figure as well, so the step changes nothing.
    expect(notice({ fallbackSalary: 181500 })).toContain('same base pay');
  });
});

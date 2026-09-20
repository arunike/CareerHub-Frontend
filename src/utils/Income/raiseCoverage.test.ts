import { describe, expect, it } from 'vitest';
import { describeRaiseCoverage, raiseCoverageOf } from './raiseCoverage';
import type { RaiseEntry } from '../../types';

const raise = (date: string): RaiseEntry => ({ id: date, date }) as RaiseEntry;

describe('raiseCoverageOf', () => {
  it('counts what is recorded and what actually moved a paycheck', () => {
    expect(raiseCoverageOf([raise('2026-10-01')], 6)).toEqual({
      recorded: 1,
      reRated: 6,
      firstDate: '2026-10-01',
    });
  });

  it('takes the earliest date however the entries are ordered', () => {
    expect(raiseCoverageOf([raise('2027-07-01'), raise('2026-07-01')], 3).firstDate).toBe(
      '2026-07-01'
    );
  });

  it('has no date to report when none is set', () => {
    expect(raiseCoverageOf([{ id: 'x' } as RaiseEntry], 0).firstDate).toBeNull();
  });
});

describe('describeRaiseCoverage', () => {
  it('says so plainly when the role carries no raise at all', () => {
    // The case that produced silence: a role linked to an offer that holds no history.
    expect(describeRaiseCoverage({ recorded: 0, reRated: 0, firstDate: null })).toBe(
      'No raises are recorded against this role.'
    );
  });

  it('flags a raise that moved nothing, rather than staying quiet', () => {
    expect(describeRaiseCoverage({ recorded: 1, reRated: 0, firstDate: '2026-10-01' })).toContain(
      're-rating no paycheck'
    );
  });

  it('reports what a working raise did, with the date it started', () => {
    const text = describeRaiseCoverage({ recorded: 1, reRated: 6, firstDate: '2026-10-01' });
    expect(text).toContain('re-rating 6 paychecks');
    expect(text).toContain('from 2026-10-01');
  });

  it('agrees with itself on singulars', () => {
    expect(describeRaiseCoverage({ recorded: 1, reRated: 1, firstDate: null })).toContain(
      '1 raise recorded, re-rating 1 paycheck'
    );
  });
});

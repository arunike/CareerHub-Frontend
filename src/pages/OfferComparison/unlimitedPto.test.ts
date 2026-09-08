import { describe, expect, it } from 'vitest';
import { DEFAULT_UNLIMITED_PTO_DAYS, scoreTimeOff } from './decisionScoring';
import type { OfferLike as Offer } from './calculations';

const offer = (over: Partial<Offer> = {}) =>
  ({
    is_unlimited_pto: true,
    sick_leave_days: 0,
    sick_leave_included_in_unlimited_pto: true,
    holiday_days: 11,
    ...over,
  }) as Offer;

describe('unlimited PTO is scored on what you would actually take', () => {
  it('defaults to a number someone would really book, not the old 25', () => {
    expect(DEFAULT_UNLIMITED_PTO_DAYS).toBe(20);
    expect(scoreTimeOff(offer()).totalPaidDays).toBe(20 + 11);
  });

  it('uses the figure recorded on the offer when one is set', () => {
    expect(scoreTimeOff(offer({ unlimited_pto_planning_days: 12 })).totalPaidDays).toBe(12 + 11);
    expect(scoreTimeOff(offer({ unlimited_pto_planning_days: 30 })).totalPaidDays).toBe(30 + 11);
  });

  it('says in the breakdown how many days it assumed', () => {
    expect(scoreTimeOff(offer({ unlimited_pto_planning_days: 14 })).label).toContain(
      '14 planning days'
    );
  });

  it('scores a cautious policy below a generous one', () => {
    const cautious = scoreTimeOff(offer({ unlimited_pto_planning_days: 10 }));
    const generous = scoreTimeOff(offer({ unlimited_pto_planning_days: 28 }));
    expect(cautious.score).toBeLessThan(generous.score);
  });

  it('ignores the stored PTO days while unlimited is on', () => {
    const withStale = offer({ pto_days: 45, unlimited_pto_planning_days: 15 });
    expect(scoreTimeOff(withStale).totalPaidDays).toBe(15 + 11);
  });

  it('still reads pto_days for a normal policy', () => {
    const limited = offer({ is_unlimited_pto: false, pto_days: 17 });
    expect(scoreTimeOff(limited).totalPaidDays).toBe(17 + 11);
  });

  it('treats a zero entry as zero rather than falling back to the default', () => {
    expect(scoreTimeOff(offer({ unlimited_pto_planning_days: 0 })).totalPaidDays).toBe(11);
  });
});

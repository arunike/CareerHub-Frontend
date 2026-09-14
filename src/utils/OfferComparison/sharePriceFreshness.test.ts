import { describe, expect, it } from 'vitest';
import { isSharePriceStale } from './sharePriceFreshness';

describe('isSharePriceStale', () => {
  it('is fresh when the stored price already carries today', () => {
    expect(isSharePriceStale('2026-09-12', '2026-09-12')).toBe(false);
  });

  it('is stale the next day', () => {
    expect(isSharePriceStale('2026-09-11', '2026-09-12')).toBe(true);
  });

  it('treats a missing or unusable date as stale, so a first fetch happens', () => {
    expect(isSharePriceStale(null, '2026-09-12')).toBe(true);
    expect(isSharePriceStale(undefined, '2026-09-12')).toBe(true);
    expect(isSharePriceStale('', '2026-09-12')).toBe(true);
  });

  it('does not refetch a date in the future, which would loop on a clock skew', () => {
    expect(isSharePriceStale('2026-09-13', '2026-09-12')).toBe(false);
  });

  it('reads a timestamp down to its date', () => {
    expect(isSharePriceStale('2026-09-12T20:00:00Z', '2026-09-12')).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import {
  annualLimits,
  federalTable,
  isModelledYear,
  modelledYears,
  normalizeApiTables,
  resolveTaxYear,
  type TaxTableOverrides,
} from './index';
import type { JurisdictionTable } from '../../../../types/tax';

const FAKE_2027: JurisdictionTable = {
  year: 2027,
  jurisdiction: 'federal',
  tier: 'full',
  standardDeduction: {
    SINGLE: 1,
    MARRIED_FILING_JOINTLY: 1,
    MARRIED_FILING_SEPARATELY: 1,
    HEAD_OF_HOUSEHOLD: 1,
  },
  brackets: {
    SINGLE: [{ cap: Infinity, rate: 0.1 }],
    MARRIED_FILING_JOINTLY: [{ cap: Infinity, rate: 0.1 }],
    MARRIED_FILING_SEPARATELY: [{ cap: Infinity, rate: 0.1 }],
    HEAD_OF_HOUSEHOLD: [{ cap: Infinity, rate: 0.1 }],
  },
  supplementalRate: 0.22,
  payrollTaxes: [],
};

const overrides: TaxTableOverrides = { federal: { 2027: FAKE_2027 } };

const NEWEST = modelledYears()[0];
const OLDEST = modelledYears().at(-1)!;

describe('resolveTaxYear', () => {
  it('resolves a modelled year to itself', () => {
    expect(resolveTaxYear(2024)).toEqual({ year: 2024, kind: 'exact' });
  });

  it('resolves a future year to the newest published one', () => {
    expect(resolveTaxYear(NEWEST + 4)).toEqual({
      year: NEWEST,
      kind: 'later',
      requested: NEWEST + 4,
    });
  });

  it('resolves an old year to the earliest published one, not the newest', () => {
    expect(resolveTaxYear(2010)).toEqual({ year: OLDEST, kind: 'earlier', requested: 2010 });
  });

  it('picks the nearest year rather than a distant one', () => {
    // 2010 predates every table, so it borrows the oldest rather than the newest.
    expect(federalTable(2010).year).toBe(OLDEST);
    expect(annualLimits(2010).year).toBeLessThanOrEqual(OLDEST);
  });
});

describe('API-supplied years', () => {
  it('extends the modelled range without a frontend change', () => {
    expect(modelledYears(overrides)).toEqual([2027, ...modelledYears()]);
    expect(isModelledYear(2027, overrides)).toBe(true);
    expect(isModelledYear(2027)).toBe(false);
  });

  it('resolves the supplied year to the supplied table', () => {
    expect(resolveTaxYear(2027, overrides)).toEqual({ year: 2027, kind: 'exact' });
    expect(federalTable(2027, overrides)).toBe(FAKE_2027);
  });

  it('moves the future fallback to the newest supplied year', () => {
    expect(resolveTaxYear(2030, overrides)).toEqual({ year: 2027, kind: 'later', requested: 2030 });
  });

  it('keeps a hand-verified year authoritative over the generated one', () => {
    // The generated bundle also covers 2026; the reviewed table is the one that wins.
    expect(federalTable(2026).source).toContain('Rev. Proc.');
  });

  it('can replace a bundled year', () => {
    const replaced: TaxTableOverrides = {
      federal: { 2026: { ...FAKE_2027, year: 2026 } },
    };
    expect(federalTable(2026, replaced).brackets!.SINGLE).toHaveLength(1);
    expect(federalTable(2026).brackets!.SINGLE).toHaveLength(7);
  });

  it('falls back to bundled limits when only a table is supplied', () => {
    expect(annualLimits(2027, overrides).elective401k).toBeGreaterThan(0);
  });
});

describe('normalizeApiTables', () => {
  it('reads a null top-bracket cap as unbounded', () => {
    const normalized = normalizeApiTables({
      2027: {
        ...FAKE_2027,
        brackets: {
          SINGLE: [
            { cap: 100, rate: 0.1 },
            { cap: null as unknown as number, rate: 0.37 },
          ],
          MARRIED_FILING_JOINTLY: [{ cap: null as unknown as number, rate: 0.1 }],
          MARRIED_FILING_SEPARATELY: [{ cap: null as unknown as number, rate: 0.1 }],
          HEAD_OF_HOUSEHOLD: [{ cap: null as unknown as number, rate: 0.1 }],
        },
      },
    });
    expect(normalized![2027].brackets!.SINGLE[1].cap).toBe(Infinity);
    expect(normalized![2027].brackets!.SINGLE[0].cap).toBe(100);
  });

  it('turns string keys from JSON into numeric years', () => {
    const normalized = normalizeApiTables({ 2027: FAKE_2027 });
    expect(Object.keys(normalized!)).toEqual(['2027']);
    expect(normalized![2027].year).toBe(2027);
  });

  it('passes undefined through', () => {
    expect(normalizeApiTables(undefined)).toBeUndefined();
  });
});

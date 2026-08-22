import { describe, expect, it } from 'vitest';
import { FEDERAL_HISTORY, LIMITS_HISTORY } from './federal-history';
import { FEDERAL_2026, LIMITS_2026 } from './federal-2026';
import { annualLimits, federalTable, isModelledYear, MODELLED_YEARS } from './index';
import { annualLiability } from '../liability';

const YEARS = [2022, 2023, 2024, 2025];

describe('modelled years', () => {
  it('covers an unbroken run of years ending at the newest', () => {
    expect(MODELLED_YEARS[0]).toBe(2026);
    // Generated tables extend the run back to 2018; every year in between is present.
    expect(MODELLED_YEARS.at(-1)).toBeLessThanOrEqual(2022);
    for (let index = 1; index < MODELLED_YEARS.length; index += 1) {
      expect(MODELLED_YEARS[index - 1] - MODELLED_YEARS[index]).toBe(1);
    }
  });

  it('models pre-2018 years, personal exemption included', () => {
    expect(isModelledYear(2017)).toBe(true);
    expect(federalTable(2017).personalExemption).toBe(4050);
    expect(federalTable(2018).personalExemption ?? 0).toBe(0);
  });

  it('reports each of them as modelled', () => {
    for (const year of [...YEARS, 2026]) expect(isModelledYear(year)).toBe(true);
  });

  it('still reports an unmodelled year', () => {
    expect(isModelledYear(2010)).toBe(false);
  });

  it('resolves each year to its own table, not 2026', () => {
    for (const year of YEARS) {
      expect(federalTable(year).year).toBe(year);
      expect(federalTable(year)).not.toBe(FEDERAL_2026);
      expect(annualLimits(year).year).toBe(year);
      expect(annualLimits(year)).not.toBe(LIMITS_2026);
    }
  });
});

describe('each historic table is well formed', () => {
  for (const year of YEARS) {
    const table = FEDERAL_HISTORY[year];

    it(`${year} has all four filing statuses with seven rates`, () => {
      for (const status of [
        'SINGLE',
        'MARRIED_FILING_JOINTLY',
        'MARRIED_FILING_SEPARATELY',
        'HEAD_OF_HOUSEHOLD',
      ] as const) {
        expect(table.brackets![status]).toHaveLength(7);
        expect(table.brackets![status].at(-1)!.cap).toBe(Infinity);
        expect(table.brackets![status].at(-1)!.rate).toBe(0.37);
      }
    });

    it(`${year} has ascending bracket caps`, () => {
      for (const brackets of Object.values(table.brackets!)) {
        const caps = brackets.map((bracket) => bracket.cap);
        expect([...caps].sort((a, b) => a - b)).toEqual(caps);
      }
    });

    it(`${year} sets married filing separately at half the joint thresholds`, () => {
      const joint = table.brackets!.MARRIED_FILING_JOINTLY;
      const separate = table.brackets!.MARRIED_FILING_SEPARATELY;
      for (let index = 0; index < joint.length - 1; index += 1) {
        expect(separate[index].cap).toBeCloseTo(joint[index].cap / 2, 6);
      }
    });

    it(`${year} carries a Social Security wage base and an uncapped Medicare`, () => {
      const socialSecurity = table.payrollTaxes.find((tax) => tax.label === 'Social Security')!;
      const medicare = table.payrollTaxes.find((tax) => tax.label === 'Medicare')!;
      expect(socialSecurity.wageBase).toBeGreaterThan(100000);
      expect(medicare.wageBase).toBeNull();
    });
  }
});

describe('the figures move in the right direction over time', () => {
  it('raises the standard deduction each year', () => {
    const single = [2022, 2023, 2024, 2025, 2026].map(
      (year) => federalTable(year).standardDeduction!.SINGLE
    );
    expect([...single].sort((a, b) => a - b)).toEqual(single);
  });

  it('raises the Social Security wage base each year', () => {
    const bases = [2022, 2023, 2024, 2025, 2026].map(
      (year) =>
        federalTable(year).payrollTaxes.find((tax) => tax.label === 'Social Security')!.wageBase!
    );
    expect([...bases].sort((a, b) => a - b)).toEqual(bases);
  });

  it('raises the deferral limit each year', () => {
    const limits = [2022, 2023, 2024, 2025, 2026].map((year) => annualLimits(year).elective401k);
    expect([...limits].sort((a, b) => a - b)).toEqual(limits);
  });

  it('taxes the same income less in a later year, as brackets widen', () => {
    const earlier = annualLiability(120000, federalTable(2022), 'SINGLE');
    const later = annualLiability(120000, federalTable(2026), 'SINGLE');
    expect(later).toBeLessThan(earlier);
  });
});

describe('hand-computed checks against the published tables', () => {
  // 2024 single: 100,000 - 14,600 standard deduction = 85,400 taxable.
  it('matches a 2024 single filer', () => {
    const expected = 11600 * 0.1 + (47150 - 11600) * 0.12 + (85400 - 47150) * 0.22;
    expect(annualLiability(100000, federalTable(2024), 'SINGLE')).toBeCloseTo(expected, 6);
  });

  // 2025 married filing jointly: 200,000 - 31,500 = 168,500 taxable.
  it('matches a 2025 joint filer', () => {
    const expected = 23850 * 0.1 + (96950 - 23850) * 0.12 + (168500 - 96950) * 0.22;
    expect(annualLiability(200000, federalTable(2025), 'MARRIED_FILING_JOINTLY')).toBeCloseTo(
      expected,
      6
    );
  });

  // 2022 head of household: 80,000 - 19,400 = 60,600 taxable.
  it('matches a 2022 head of household', () => {
    const expected = 14650 * 0.1 + (55900 - 14650) * 0.12 + (60600 - 55900) * 0.22;
    expect(annualLiability(80000, federalTable(2022), 'HEAD_OF_HOUSEHOLD')).toBeCloseTo(
      expected,
      6
    );
  });
});

describe('limits history', () => {
  it('has a source citation for every year', () => {
    for (const year of YEARS) {
      expect(LIMITS_HISTORY[year].source).toBeTruthy();
      expect(FEDERAL_HISTORY[year].source).toBeTruthy();
    }
  });

  it('keeps family HSA above self-only', () => {
    for (const year of YEARS) {
      expect(LIMITS_HISTORY[year].hsaFamily).toBeGreaterThan(LIMITS_HISTORY[year].hsaSelf);
    }
  });
});

import type { AnnualLimits, JurisdictionTable, TaxBracket } from '../../../../types/tax';

interface YearFigures {
  year: number;
  source: string;
  standardDeduction: { single: number; joint: number; headOfHousehold: number };
  brackets: {
    single: TaxBracket[];
    joint: TaxBracket[];
    headOfHousehold: TaxBracket[];
  };
  socialSecurityWageBase: number;
}

// Married filing separately is set by statute at half the joint thresholds, and its
// standard deduction equals the single filer's.
const halved = (brackets: TaxBracket[]): TaxBracket[] =>
  brackets.map((bracket) => ({
    cap: bracket.cap === Infinity ? Infinity : bracket.cap / 2,
    rate: bracket.rate,
  }));

const federalTableFor = (figures: YearFigures): JurisdictionTable => ({
  year: figures.year,
  jurisdiction: 'federal',
  tier: 'full',
  source: figures.source,
  standardDeduction: {
    SINGLE: figures.standardDeduction.single,
    MARRIED_FILING_JOINTLY: figures.standardDeduction.joint,
    MARRIED_FILING_SEPARATELY: figures.standardDeduction.single,
    HEAD_OF_HOUSEHOLD: figures.standardDeduction.headOfHousehold,
  },
  brackets: {
    SINGLE: figures.brackets.single,
    MARRIED_FILING_JOINTLY: figures.brackets.joint,
    MARRIED_FILING_SEPARATELY: halved(figures.brackets.joint),
    HEAD_OF_HOUSEHOLD: figures.brackets.headOfHousehold,
  },
  supplementalRate: 0.22,
  supplementalHighRate: 0.37,
  supplementalHighThreshold: 1000000,
  payrollTaxes: [
    {
      label: 'Social Security',
      rate: 0.062,
      wageBase: figures.socialSecurityWageBase,
      appliesAbove: null,
    },
    { label: 'Medicare', rate: 0.0145, wageBase: null, appliesAbove: null },
    // Employers withhold the surtax once wages pass $200,000 regardless of filing status;
    // the threshold is statutory and is not indexed.
    { label: 'Additional Medicare', rate: 0.009, wageBase: null, appliesAbove: 200000 },
  ],
});

const YEARS: YearFigures[] = [
  {
    year: 2025,
    // Standard deductions were raised for 2025 by the One Big Beautiful Bill Act.
    source: 'IRS Rev. Proc. 2024-40, as amended for 2025 by OBBBA',
    standardDeduction: { single: 15750, joint: 31500, headOfHousehold: 23625 },
    socialSecurityWageBase: 176100,
    brackets: {
      single: [
        { cap: 11925, rate: 0.1 },
        { cap: 48475, rate: 0.12 },
        { cap: 103350, rate: 0.22 },
        { cap: 197300, rate: 0.24 },
        { cap: 250525, rate: 0.32 },
        { cap: 626350, rate: 0.35 },
        { cap: Infinity, rate: 0.37 },
      ],
      joint: [
        { cap: 23850, rate: 0.1 },
        { cap: 96950, rate: 0.12 },
        { cap: 206700, rate: 0.22 },
        { cap: 394600, rate: 0.24 },
        { cap: 501050, rate: 0.32 },
        { cap: 751600, rate: 0.35 },
        { cap: Infinity, rate: 0.37 },
      ],
      headOfHousehold: [
        { cap: 17000, rate: 0.1 },
        { cap: 64850, rate: 0.12 },
        { cap: 103350, rate: 0.22 },
        { cap: 197300, rate: 0.24 },
        { cap: 250500, rate: 0.32 },
        { cap: 626350, rate: 0.35 },
        { cap: Infinity, rate: 0.37 },
      ],
    },
  },
  {
    year: 2024,
    source: 'IRS Rev. Proc. 2023-34',
    standardDeduction: { single: 14600, joint: 29200, headOfHousehold: 21900 },
    socialSecurityWageBase: 168600,
    brackets: {
      single: [
        { cap: 11600, rate: 0.1 },
        { cap: 47150, rate: 0.12 },
        { cap: 100525, rate: 0.22 },
        { cap: 191950, rate: 0.24 },
        { cap: 243725, rate: 0.32 },
        { cap: 609350, rate: 0.35 },
        { cap: Infinity, rate: 0.37 },
      ],
      joint: [
        { cap: 23200, rate: 0.1 },
        { cap: 94300, rate: 0.12 },
        { cap: 201050, rate: 0.22 },
        { cap: 383900, rate: 0.24 },
        { cap: 487450, rate: 0.32 },
        { cap: 731200, rate: 0.35 },
        { cap: Infinity, rate: 0.37 },
      ],
      headOfHousehold: [
        { cap: 16550, rate: 0.1 },
        { cap: 63100, rate: 0.12 },
        { cap: 100500, rate: 0.22 },
        { cap: 191950, rate: 0.24 },
        { cap: 243700, rate: 0.32 },
        { cap: 609350, rate: 0.35 },
        { cap: Infinity, rate: 0.37 },
      ],
    },
  },
  {
    year: 2023,
    source: 'IRS Rev. Proc. 2022-38',
    standardDeduction: { single: 13850, joint: 27700, headOfHousehold: 20800 },
    socialSecurityWageBase: 160200,
    brackets: {
      single: [
        { cap: 11000, rate: 0.1 },
        { cap: 44725, rate: 0.12 },
        { cap: 95375, rate: 0.22 },
        { cap: 182100, rate: 0.24 },
        { cap: 231250, rate: 0.32 },
        { cap: 578125, rate: 0.35 },
        { cap: Infinity, rate: 0.37 },
      ],
      joint: [
        { cap: 22000, rate: 0.1 },
        { cap: 89450, rate: 0.12 },
        { cap: 190750, rate: 0.22 },
        { cap: 364200, rate: 0.24 },
        { cap: 462500, rate: 0.32 },
        { cap: 693750, rate: 0.35 },
        { cap: Infinity, rate: 0.37 },
      ],
      headOfHousehold: [
        { cap: 15700, rate: 0.1 },
        { cap: 59850, rate: 0.12 },
        { cap: 95350, rate: 0.22 },
        { cap: 182100, rate: 0.24 },
        { cap: 231250, rate: 0.32 },
        { cap: 578100, rate: 0.35 },
        { cap: Infinity, rate: 0.37 },
      ],
    },
  },
  {
    year: 2022,
    source: 'IRS Rev. Proc. 2021-45',
    standardDeduction: { single: 12950, joint: 25900, headOfHousehold: 19400 },
    socialSecurityWageBase: 147000,
    brackets: {
      single: [
        { cap: 10275, rate: 0.1 },
        { cap: 41775, rate: 0.12 },
        { cap: 89075, rate: 0.22 },
        { cap: 170050, rate: 0.24 },
        { cap: 215950, rate: 0.32 },
        { cap: 539900, rate: 0.35 },
        { cap: Infinity, rate: 0.37 },
      ],
      joint: [
        { cap: 20550, rate: 0.1 },
        { cap: 83550, rate: 0.12 },
        { cap: 178150, rate: 0.22 },
        { cap: 340100, rate: 0.24 },
        { cap: 431900, rate: 0.32 },
        { cap: 647850, rate: 0.35 },
        { cap: Infinity, rate: 0.37 },
      ],
      headOfHousehold: [
        { cap: 14650, rate: 0.1 },
        { cap: 55900, rate: 0.12 },
        { cap: 89050, rate: 0.22 },
        { cap: 170050, rate: 0.24 },
        { cap: 215950, rate: 0.32 },
        { cap: 539900, rate: 0.35 },
        { cap: Infinity, rate: 0.37 },
      ],
    },
  },
];

export const FEDERAL_HISTORY: Record<number, JurisdictionTable> = Object.fromEntries(
  YEARS.map((figures) => [figures.year, federalTableFor(figures)])
);

// Contribution limits are federal and apply regardless of residence.
export const LIMITS_HISTORY: Record<number, AnnualLimits> = {
  2025: {
    year: 2025,
    elective401k: 23500,
    catchUp401k: 7500,
    hsaSelf: 4300,
    hsaFamily: 8550,
    fsa: 3300,
    source: 'IRS Notice 2024-80, Rev. Proc. 2024-25',
  },
  2024: {
    year: 2024,
    elective401k: 23000,
    catchUp401k: 7500,
    hsaSelf: 4150,
    hsaFamily: 8300,
    fsa: 3200,
    source: 'IRS Notice 2023-75, Rev. Proc. 2023-23',
  },
  2023: {
    year: 2023,
    elective401k: 22500,
    catchUp401k: 7500,
    hsaSelf: 3850,
    hsaFamily: 7750,
    fsa: 3050,
    source: 'IRS Notice 2022-55, Rev. Proc. 2022-24',
  },
  2021: {
    year: 2021,
    elective401k: 19500,
    catchUp401k: 6500,
    hsaSelf: 3600,
    hsaFamily: 7200,
    fsa: 2750,
    source: 'IRS Notice 2020-79, Rev. Proc. 2020-32',
  },
  2020: {
    year: 2020,
    elective401k: 19500,
    catchUp401k: 6500,
    hsaSelf: 3550,
    hsaFamily: 7100,
    fsa: 2750,
    source: 'IRS Notice 2019-59, Rev. Proc. 2019-25',
  },
  2019: {
    year: 2019,
    elective401k: 19000,
    catchUp401k: 6000,
    hsaSelf: 3500,
    hsaFamily: 7000,
    fsa: 2700,
    source: 'IRS Notice 2018-83, Rev. Proc. 2018-30',
  },
  2017: {
    year: 2017,
    elective401k: 18000,
    catchUp401k: 6000,
    hsaSelf: 3400,
    hsaFamily: 6750,
    fsa: 2600,
    source: 'IRS Notice 2016-62, Rev. Proc. 2016-28',
  },
  2016: {
    year: 2016,
    elective401k: 18000,
    catchUp401k: 6000,
    hsaSelf: 3350,
    hsaFamily: 6750,
    fsa: 2550,
    source: 'IRS Notice 2015-75, Rev. Proc. 2015-30',
  },
  2015: {
    year: 2015,
    elective401k: 18000,
    catchUp401k: 6000,
    hsaSelf: 3350,
    hsaFamily: 6650,
    fsa: 2550,
    source: 'IRS Notice 2014-70, Rev. Proc. 2014-30',
  },
  2014: {
    year: 2014,
    elective401k: 17500,
    catchUp401k: 5500,
    hsaSelf: 3300,
    hsaFamily: 6550,
    fsa: 2500,
    source: 'IRS Notice 2013-73, Rev. Proc. 2013-25',
  },
  2013: {
    year: 2013,
    elective401k: 17500,
    catchUp401k: 5500,
    hsaSelf: 3250,
    hsaFamily: 6450,
    fsa: 2500,
    source: 'IRS Notice 2012-67, Rev. Proc. 2012-26',
  },
  2018: {
    year: 2018,
    elective401k: 18500,
    catchUp401k: 6000,
    hsaSelf: 3450,
    hsaFamily: 6900,
    fsa: 2650,
    source: 'IRS Notice 2017-64, Rev. Proc. 2018-18',
  },
  2022: {
    year: 2022,
    elective401k: 20500,
    catchUp401k: 6500,
    hsaSelf: 3650,
    hsaFamily: 7300,
    fsa: 2850,
    source: 'IRS Notice 2021-61, Rev. Proc. 2021-25',
  },
};

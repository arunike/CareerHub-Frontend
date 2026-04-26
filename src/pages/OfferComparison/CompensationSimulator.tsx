import { useMemo, useState, type ReactNode } from 'react';
import { InputNumber, Select, Tooltip } from 'antd';
import {
  BankOutlined,
  CarOutlined,
  CoffeeOutlined,
  DollarOutlined,
  InfoCircleOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import type { ScenarioRow } from './offerAdjustmentsTypes';

type OfferWithCompFields = ScenarioRow['offer'] & {
  base_salary?: number;
  bonus?: number;
  sign_on?: number;
  equity?: number;
  equity_total_grant?: number | null;
  equity_vesting_percent?: number | null;
  equity_vesting_schedule?: number[];
};

type EquityPreset = 'downside' | 'base' | 'upside' | 'custom';

const formatCurrency = (value: number, options?: Intl.NumberFormatOptions) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
    ...options,
  }).format(Number.isFinite(value) ? value : 0);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const Explain = ({ title }: { title: ReactNode }) => (
  <Tooltip title={title} placement="top">
    <InfoCircleOutlined className="ml-1 inline-flex cursor-help text-[11px] text-slate-400" />
  </Tooltip>
);

const getEquityGrowth = (preset: EquityPreset, customGrowthPct: number) => {
  if (preset === 'downside') return -20;
  if (preset === 'upside') return 25;
  if (preset === 'custom') return customGrowthPct;
  return 0;
};

const getTotalGrant = (offer: OfferWithCompFields) => {
  const annualEquity = Number(offer.equity || 0);
  const explicitGrant = Number(offer.equity_total_grant || 0);
  if (explicitGrant > 0) return explicitGrant;
  const vestPct = Number(offer.equity_vesting_percent || 25);
  return vestPct > 0 ? annualEquity / (vestPct / 100) : annualEquity * 4;
};

const buildGrossVestingYears = (row: ScenarioRow, equityGrowthPct: number) => {
  const offer = row.offer as OfferWithCompFields;
  const totalGrant = getTotalGrant(offer);
  const vestPct = clamp(Number(offer.equity_vesting_percent || 25), 1, 100);
  const explicitSchedule = Array.isArray(offer.equity_vesting_schedule)
    ? offer.equity_vesting_schedule.slice(0, 4).map((pct) => clamp(Number(pct) || 0, 0, 100))
    : [];
  const schedule =
    explicitSchedule.length > 0
      ? Array.from({ length: 4 }, (_, index) => explicitSchedule[index] ?? 0)
      : null;
  const vestingYears = clamp(Math.round(100 / vestPct), 1, 6);
  const annualGrantSlice = totalGrant / vestingYears;
  const growthMultiplier = equityGrowthPct / 100;

  return Array.from({ length: 4 }, (_, index) => {
    const year = index + 1;
    const vestedGrant = schedule ? totalGrant * ((schedule[index] || 0) / 100) : year > vestingYears ? 0 : annualGrantSlice;
    const marketValue = vestedGrant * Math.pow(1 + growthMultiplier, year - 1);
    return Math.max(0, marketValue);
  });
};

const buildVestingYears = (row: ScenarioRow, equityGrowthPct: number) => {
  const afterTaxMultiplier = 1 - row.usedEquityTaxRate / 100;
  return buildGrossVestingYears(row, equityGrowthPct).map((value) => value * afterTaxMultiplier);
};

const CompensationSimulator = ({ scenarioRows }: { scenarioRows: ScenarioRow[] }) => {
  const [equityPreset, setEquityPreset] = useState<EquityPreset>('base');
  const [customEquityGrowthPct, setCustomEquityGrowthPct] = useState(10);
  const [rentOverride, setRentOverride] = useState<number | null>(null);
  const [commuteOverride, setCommuteOverride] = useState<number | null>(null);
  const [monthlyFoodBudget, setMonthlyFoodBudget] = useState(650);

  const equityGrowthPct = getEquityGrowth(equityPreset, customEquityGrowthPct);

  const rows = useMemo(() => {
    return scenarioRows.map((row) => {
      const offer = row.offer as OfferWithCompFields;
      const preTaxCashMonthly = (Number(offer.base_salary || 0) + Number(offer.bonus || 0)) / 12;
      const afterTaxCashMonthly = (row.afterTaxBase + row.afterTaxBonus) / 12;
      const preTaxSignOnMonthly = Number(offer.sign_on || 0) / 12;
      const afterTaxSignOnMonthly = Number(row.afterTaxSignOn || 0) / 12;
      const grossVestingYears = buildGrossVestingYears(row, equityGrowthPct);
      const vestingYears = buildVestingYears(row, equityGrowthPct);
      const grossEquityMonthly = grossVestingYears[0] / 12;
      const equityMonthly = vestingYears[0] / 12;
      const monthlyRent = rentOverride ?? row.monthlyRent;
      const monthlyCommute = commuteOverride ?? row.commuteAnnualCost / 12;
      const monthlyFoodPerk = row.freeFoodAnnualValue / 12;
      const monthlyFoodNet = Math.max(0, monthlyFoodBudget - monthlyFoodPerk);
      const monthlyFixedCosts = monthlyRent + monthlyCommute + monthlyFoodNet;
      const monthlyTakeHome = afterTaxCashMonthly + equityMonthly;
      const yearOneMonthly = monthlyTakeHome + afterTaxSignOnMonthly;
      const leftoverMonthly = monthlyTakeHome - monthlyFixedCosts;
      const ptoValue =
        row.is_unlimited_pto || row.pto_days <= 0
          ? null
          : ((Number(offer.base_salary || 0) + Number(offer.bonus || 0)) / 260) * row.pto_days;

      return {
        key: `${row.kind}-${String(row.offer.id || row.appName)}`,
        row,
        monthlyTakeHome,
        yearOneMonthly,
        leftoverMonthly,
        monthlyRent,
        monthlyCommute,
        monthlyFoodNet,
        monthlyFoodPerk,
        ptoValue,
        vestingYears,
        grossVestingYears,
        preTaxCashMonthly,
        afterTaxCashMonthly,
        preTaxSignOnMonthly,
        afterTaxSignOnMonthly,
        grossEquityMonthly,
        equityMonthly,
        monthlyFixedCosts,
      };
    });
  }, [commuteOverride, equityGrowthPct, monthlyFoodBudget, rentOverride, scenarioRows]);

  const strongestMonthly = rows.reduce(
    (best, row) => Math.max(best, row.leftoverMonthly),
    rows[0]?.leftoverMonthly ?? 0,
  );
  const totalVestingByYear = rows.reduce(
    (acc, row) => row.vestingYears.map((value, index) => acc[index] + value),
    [0, 0, 0, 0],
  );

  if (scenarioRows.length === 0) {
    return null;
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-1">
            <DollarOutlined />
            Compensation simulator
          </div>
          <h2 className="mt-3 text-xl font-bold text-slate-950">Monthly take-home and vesting scenarios</h2>
          <p className="mt-1 text-sm text-slate-500">
            Uses the same tax, rent, commute, food perk, PTO, and equity assumptions as the comparison rows.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <label className="min-w-0">
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
              Equity market
            </span>
            <Select
              value={equityPreset}
              onChange={setEquityPreset}
              className="w-full min-w-36"
              options={[
                { value: 'downside', label: 'Downside -20%' },
                { value: 'base', label: 'Base 0%' },
                { value: 'upside', label: 'Upside +25%' },
                { value: 'custom', label: 'Custom' },
              ]}
            />
          </label>
          <label className="min-w-0">
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
              Custom growth
            </span>
            <InputNumber
              value={customEquityGrowthPct}
              onChange={(value) => setCustomEquityGrowthPct(Number(value ?? 0))}
              min={-80}
              max={300}
              addonAfter="%"
              disabled={equityPreset !== 'custom'}
              className="w-full"
            />
          </label>
          <label className="min-w-0">
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
              Rent override
            </span>
            <InputNumber
              value={rentOverride}
              onChange={(value) => setRentOverride(value == null ? null : Number(value))}
              min={0}
              prefix="$"
              placeholder="Saved"
              className="w-full"
            />
          </label>
          <label className="min-w-0">
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
              Commute override
            </span>
            <InputNumber
              value={commuteOverride}
              onChange={(value) => setCommuteOverride(value == null ? null : Number(value))}
              min={0}
              prefix="$"
              placeholder="Saved"
              className="w-full"
            />
          </label>
          <label className="min-w-0">
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
              Food budget
            </span>
            <InputNumber
              value={monthlyFoodBudget}
              onChange={(value) => setMonthlyFoodBudget(Number(value ?? 0))}
              min={0}
              prefix="$"
              className="w-full"
            />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 border-b border-slate-100 md:grid-cols-4">
        {[
          { icon: <BankOutlined />, label: 'Best leftover/mo', value: formatCurrency(strongestMonthly) },
          { icon: <LineChartOutlined />, label: 'Equity scenario', value: `${equityGrowthPct > 0 ? '+' : ''}${equityGrowthPct}%` },
          { icon: <CarOutlined />, label: 'Commute mode', value: commuteOverride == null ? 'Saved per offer' : formatCurrency(commuteOverride) },
          { icon: <CoffeeOutlined />, label: 'Food budget', value: formatCurrency(monthlyFoodBudget) },
        ].map((item) => (
          <div key={item.label} className="px-5 py-4 border-r border-slate-100 last:border-r-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span className="text-slate-400">{item.icon}</span>
              {item.label}
              {item.label === 'Best leftover/mo' && (
                <Explain title="Highest monthly leftover among visible offers. Formula: take-home/mo minus rent, commute, and net food cost." />
              )}
              {item.label === 'Equity scenario' && (
                <Explain title="Applies this stock growth or decline assumption to each future vesting year before equity tax." />
              )}
              {item.label === 'Commute mode' && (
                <Explain title="Uses each offer's saved commute cost unless you enter a monthly override above." />
              )}
              {item.label === 'Food budget' && (
                <Explain title="Monthly food budget before subtracting any saved company food perk." />
              )}
            </div>
            <div className="mt-1 text-lg font-bold text-slate-950">{item.value}</div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[1040px] w-full text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="text-left font-bold px-5 py-3">Offer</th>
              <th className="text-right font-bold px-4 py-3">
                Take-home/mo
                <Explain title="Main value is after tax: base cash + bonus + first-year equity vesting, divided by 12. The small line shows the pre-tax monthly equivalent and tax rates." />
              </th>
              <th className="text-right font-bold px-4 py-3">
                Year-1/mo
                <Explain title="Take-home/mo plus sign-on spread across the first 12 months. Small line compares after-tax and pre-tax sign-on." />
              </th>
              <th className="text-right font-bold px-4 py-3">
                Rent
                <Explain title="Saved monthly rent estimate or your rent override. Saved estimates scale from the reference rent by local cost-of-living index." />
              </th>
              <th className="text-right font-bold px-4 py-3">
                Commute
                <Explain title="Saved commute cost annualized from daily/monthly/yearly, then divided by 12, or your monthly override." />
              </th>
              <th className="text-right font-bold px-4 py-3">
                Food
                <Explain title="Monthly food budget minus the monthly value of any saved company food perk. Never drops below $0." />
              </th>
              <th className="text-right font-bold px-4 py-3">
                PTO value
                <Explain title="Estimated pre-tax PTO value: (base salary + bonus) divided by 260 workdays, multiplied by PTO days. Unlimited PTO is shown as Unlimited." />
              </th>
              <th className="text-right font-bold px-4 py-3">
                Leftover/mo
                <Explain title="Take-home/mo minus monthly rent, commute, and net food cost. This is cash-flow leftover before other personal expenses." />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((item) => (
              <tr key={item.key} className="hover:bg-slate-50/70">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-950">{item.row.appName}</span>
                    {item.row.offer.is_current && (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{item.row.homeLocationLabel}</div>
                </td>
                <td className="px-4 py-4 text-right font-semibold text-slate-900">
                  <Tooltip
                    title={
                      <div>
                        <div>Before-tax cash/mo: {formatCurrency(item.preTaxCashMonthly)}</div>
                        <div>After-tax cash/mo: {formatCurrency(item.afterTaxCashMonthly)}</div>
                        <div>Before-tax equity/mo: {formatCurrency(item.grossEquityMonthly)}</div>
                        <div>After-tax equity/mo: {formatCurrency(item.equityMonthly)}</div>
                        <div>
                          Tax rates: base {item.row.usedBaseTaxRate}%, bonus {item.row.usedBonusTaxRate}%, equity{' '}
                          {item.row.usedEquityTaxRate}%
                        </div>
                      </div>
                    }
                  >
                    <div className="cursor-help">
                      <div>{formatCurrency(item.monthlyTakeHome)}</div>
                      <div className="mt-0.5 text-[10px] font-medium text-slate-400">
                        Before tax {formatCurrency(item.preTaxCashMonthly + item.grossEquityMonthly)}
                      </div>
                      <div className="text-[10px] font-medium text-slate-400">
                        Tax {item.row.usedBaseTaxRate}% / {item.row.usedBonusTaxRate}% / {item.row.usedEquityTaxRate}%
                      </div>
                    </div>
                  </Tooltip>
                </td>
                <td className="px-4 py-4 text-right">
                  <Tooltip
                    title={`Take-home/mo + sign-on/mo. Sign-on before tax: ${formatCurrency(item.preTaxSignOnMonthly)}; after tax: ${formatCurrency(item.afterTaxSignOnMonthly)}.`}
                  >
                    <div className="cursor-help">
                      <div className="font-semibold text-slate-900">{formatCurrency(item.yearOneMonthly)}</div>
                      {item.preTaxSignOnMonthly > 0 && (
                        <div className="mt-0.5 text-[10px] font-medium text-slate-400">
                          Sign-on before tax {formatCurrency(item.preTaxSignOnMonthly)}
                        </div>
                      )}
                    </div>
                  </Tooltip>
                </td>
                <td className="px-4 py-4 text-right text-slate-700">
                  <Tooltip title={rentOverride == null ? 'Using saved/estimated monthly rent for this offer location.' : 'Using your rent override.'}>
                    <span className="cursor-help">{formatCurrency(item.monthlyRent)}</span>
                  </Tooltip>
                </td>
                <td className="px-4 py-4 text-right text-slate-700">
                  <Tooltip title={commuteOverride == null ? 'Using saved commute cost converted to a monthly amount.' : 'Using your commute override.'}>
                    <span className="cursor-help">{formatCurrency(item.monthlyCommute)}</span>
                  </Tooltip>
                </td>
                <td className="px-4 py-4 text-right text-slate-700">
                  <Tooltip title={`Food budget ${formatCurrency(monthlyFoodBudget)} - food perk ${formatCurrency(item.monthlyFoodPerk)}.`}>
                    <div className="cursor-help">{formatCurrency(item.monthlyFoodNet)}</div>
                  </Tooltip>
                  {item.monthlyFoodPerk > 0 && <div className="text-[10px] text-emerald-600">{formatCurrency(item.monthlyFoodPerk)} perk</div>}
                </td>
                <td className="px-4 py-4 text-right text-slate-700">
                  <Tooltip title={item.ptoValue == null ? 'Unlimited PTO is not converted into dollars.' : 'Calculated as daily base+bonus value multiplied by PTO days.'}>
                    <span className="cursor-help">{item.ptoValue == null ? 'Unlimited' : formatCurrency(item.ptoValue)}</span>
                  </Tooltip>
                </td>
                <td className="px-4 py-4 text-right">
                  <Tooltip title={`Take-home/mo ${formatCurrency(item.monthlyTakeHome)} - costs ${formatCurrency(item.monthlyFixedCosts)}.`}>
                    <span
                      className={
                        item.leftoverMonthly >= 0
                          ? 'font-bold text-emerald-700'
                          : 'font-bold text-rose-700'
                      }
                    >
                      {formatCurrency(item.leftoverMonthly)}
                    </span>
                  </Tooltip>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-slate-100 px-6 py-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-950">After-tax equity vesting</h3>
            <p className="text-xs text-slate-500">
              Main values are after tax. Before-tax vesting, market scenario, and equity tax rate are shown per year.
            </p>
          </div>
          <div className="text-xs font-semibold text-slate-500">
            Combined Year 1: {formatCurrency(totalVestingByYear[0])}
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[720px] w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="text-left font-bold py-2 pr-4">Offer</th>
                <th className="text-right font-bold py-2 px-4">Year 1<Explain title="Year 1 vesting value after applying equity tax." /></th>
                <th className="text-right font-bold py-2 px-4">Year 2<Explain title="Year 2 vesting value after market scenario growth/decline and equity tax." /></th>
                <th className="text-right font-bold py-2 px-4">Year 3<Explain title="Year 3 vesting value after market scenario growth/decline and equity tax." /></th>
                <th className="text-right font-bold py-2 pl-4">Year 4<Explain title="Year 4 vesting value after market scenario growth/decline and equity tax." /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((item) => (
                <tr key={`${item.key}-vesting`}>
                  <td className="py-3 pr-4 font-semibold text-slate-900">{item.row.appName}</td>
                  {item.vestingYears.map((value, index) => (
                    <td key={index} className="py-3 px-4 text-right text-slate-700">
                      <Tooltip
                        title={
                          <div>
                            <div>Before tax: {formatCurrency(item.grossVestingYears[index] || 0)}</div>
                            <div>Equity tax rate: {item.row.usedEquityTaxRate}%</div>
                            <div>Market scenario: {equityGrowthPct > 0 ? '+' : ''}{equityGrowthPct}%</div>
                          </div>
                        }
                      >
                        <div className="cursor-help">
                          <div>{value > 0 ? formatCurrency(value) : '-'}</div>
                          {value > 0 && (
                            <div className="mt-0.5 text-[10px] text-slate-400">
                              Before tax {formatCurrency(item.grossVestingYears[index] || 0)}
                            </div>
                          )}
                        </div>
                      </Tooltip>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default CompensationSimulator;

import type React from 'react';
import { Button, Tabs, message } from 'antd';
import { CreditCardOutlined, SlidersOutlined, TableOutlined } from '@ant-design/icons';
import SegmentedToggle from '../../components/SegmentedToggle';
import { PageState } from '../../components/PageState';
import BatchOverrideModal from './BatchOverrideModal';
import IncomeSummary from './IncomeSummary';
import { totalsToDate } from './effectiveRows';
import { toIsoDate } from './paySchedule';
import YearEarningsCard from './YearEarningsCard';
import PaycheckWaterfall from './PaycheckWaterfall';
import ReconciliationCards from './ReconciliationCards';
import YearLedgerTable from './YearLedgerTable';
import {
  applyOverrideToPeriods,
  clearOverridesFor,
  findOverride,
  removeOverride,
  upsertOverride,
} from './periodDeductions';
import { describeFormula } from './matchTiers';

type Props = {
  Notice: any;
  allowanceSchedule: any;
  drift: any;
  effectiveRows: any;
  ledger: any;
  matchFormula: any;
  modelledYears: any;
  paychecksPerYear: any;
  periodDefaults: any;
  reconciliation: any;
  selectSource: any;
  setActual: any;
  setTaxYear: any;
  settings: any;
  source: any;
  sources: any;
  sourcesInYear: any;
  stateAbbr: any;
  taxYear: any;
  nextYearBonus: any;
  targetBonus: any;
  update: any;
  yearHistory: any;
  yearResolution: any;
  yearSummary: any;
  amount: (value: number) => string;
  batchOpen: boolean;
  rates: any;
  roleOptions: any;
  row: any;
  selectedKeys: number[];
  setBatchOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedKeys: React.Dispatch<React.SetStateAction<number[]>>;
  setSelectedPeriod: React.Dispatch<React.SetStateAction<number | null>>;
  setView: React.Dispatch<React.SetStateAction<'paycheck' | 'year'>>;
  settingsTabs: any;
  stateLabel: any;
  view: 'paycheck' | 'year';
};

const IncomeSourceTabs = ({
  amount,
  batchOpen,
  rates,
  roleOptions,
  row,
  selectedKeys,
  setBatchOpen,
  setSelectedKeys,
  setSelectedPeriod,
  setView,
  settingsTabs,
  stateLabel,
  view,
  Notice,
  allowanceSchedule,
  drift,
  effectiveRows,
  ledger,
  matchFormula,
  modelledYears,
  paychecksPerYear,
  periodDefaults,
  reconciliation,
  selectSource,
  setActual,
  setTaxYear,
  settings,
  source,
  sources,
  sourcesInYear,
  stateAbbr,
  taxYear,
  nextYearBonus,
  targetBonus,
  update,
  yearHistory,
  yearResolution,
  yearSummary,
}: Props) => (
  <>
    {sources.length === 0 ? (
      <PageState
        title="No roles to model"
        description="Add a role on the Experience page, or mark an offer as your current role, and this page will model its paychecks."
      />
    ) : (
      <>
        <IncomeSummary
          source={source}
          totals={totalsToDate(effectiveRows, toIsoDate(new Date()))}
          paychecksPerYear={paychecksPerYear}
          stateAbbr={stateAbbr}
          stateLabel={stateLabel}
          taxYear={taxYear}
          rates={rates}
          roleOptions={roleOptions}
          onSelectRole={(key) => {
            selectSource(key);
            setSelectedPeriod(null);
          }}
        />

        <YearEarningsCard
          summary={yearSummary}
          history={yearHistory}
          taxYear={taxYear}
          onSelectRole={(key) => {
            selectSource(key);
            setSelectedPeriod(null);
          }}
          onSelectYear={setTaxYear}
        />

        {sourcesInYear.length === 0 ? (
          <Notice tone="warn">
            You held no role during {taxYear}, so there is nothing to model. Pick another year.
          </Notice>
        ) : ledger.rows.length === 0 ? (
          <Notice tone="warn">
            This role was not paid during {taxYear}, so there are no paychecks to show.
          </Notice>
        ) : null}

        {yearResolution.kind !== 'exact' ? (
          <Notice tone="warn">
            {yearResolution.kind === 'later'
              ? `${taxYear} figures are not published yet, so ${yearResolution.year} brackets and limits are used.`
              : `Tax tables run from ${modelledYears.at(-1)} to ${modelledYears[0]}, so ${taxYear} uses the nearest published year, ${yearResolution.year}.`}{' '}
            Treat the figures as indicative.
          </Notice>
        ) : null}

        {effectiveRows.some((candidate: any) => candidate.residual < -0.005) ? (
          <Notice tone="warn">
            Some paychecks record a take-home larger than their gross pay can support, so no tax is
            left to withhold on them. That usually means the gross is wrong: record the gross from
            your payslip on those paychecks, or check the salary on this role.
          </Notice>
        ) : null}

        {!stateAbbr ? (
          <Notice tone="warn">
            No residence state was detected from this role&rsquo;s location, so state tax is not
            included. Set one under Elections.
          </Notice>
        ) : null}

        {ledger.rows.length > 0 ? (
          <>
            <ReconciliationCards
              reconciliation={reconciliation}
              drift={drift}
              netPerPeriod={row?.net ?? 0}
              taxYear={taxYear}
              nextYearBonus={nextYearBonus}
              targetBonus={targetBonus}
            />

            {/* The page's own switcher idiom: antd's track is the page tint, so the pill floated on nothing. */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <SegmentedToggle
                value={view}
                onChange={setView}
                wrapperClassName="w-full rounded-xl border border-slate-200 bg-white p-1 sm:w-max"
                buttonClassName="min-w-0 flex-1 px-3.5 py-1.5 sm:flex-none"
                options={[
                  {
                    value: 'paycheck',
                    label: 'One paycheck',
                    icon: <CreditCardOutlined />,
                    activeClassName: 'bg-blue-50 text-blue-700',
                  },
                  {
                    value: 'year',
                    label: 'Whole year',
                    icon: <TableOutlined />,
                    activeClassName: 'bg-blue-50 text-blue-700',
                  },
                ]}
              />
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs sm:justify-end">
                {[
                  { label: 'gross', value: ledger.totals.gross },
                  { label: 'tax', value: ledger.totals.taxTotal },
                  { label: 'take-home', value: ledger.totals.net },
                ].map((total, index) => (
                  <span key={total.label} className="flex items-baseline gap-x-3">
                    {index > 0 ? <span className="hidden text-slate-300 sm:inline">·</span> : null}
                    <span className="whitespace-nowrap">
                      <span className="font-semibold tabular-nums text-slate-700">
                        {amount(total.value)}
                      </span>{' '}
                      <span className="text-slate-500">{total.label}</span>
                    </span>
                  </span>
                ))}
              </div>
            </div>

            {view === 'paycheck' ? (
              <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
                {row ? (
                  <PaycheckWaterfall
                    row={row}
                    rows={effectiveRows}
                    periodsPerYear={paychecksPerYear}
                    matchFormulaLabel={describeFormula(matchFormula)}
                    onSelectPeriod={setSelectedPeriod}
                    deductionDefaults={periodDefaults}
                    customDeductions={settings.customDeductions}
                    allowances={settings.allowances}
                    scheduledAllowances={allowanceSchedule[row.periodIndex]?.byAllowance ?? {}}
                    override={findOverride(settings.periodDeductions, row.periodIndex)}
                    onOverrideChange={(periodIndex, patch) =>
                      update({
                        periodDeductions: upsertOverride(
                          settings.periodDeductions,
                          periodDefaults,
                          settings.customDeductions,
                          periodIndex,
                          patch
                        ),
                      })
                    }
                    onOverrideClear={(periodIndex) =>
                      update({
                        periodDeductions: removeOverride(settings.periodDeductions, periodIndex),
                      })
                    }
                  />
                ) : null}

                <div className="enterprise-card px-6 pb-6 pt-2">
                  <Tabs
                    items={settingsTabs}
                    className="[&_.ant-tabs-nav]:!mb-5 [&_.ant-tabs-tab]:!px-0 [&_.ant-tabs-tab+.ant-tabs-tab]:!ml-6"
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="enterprise-card overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                    <span
                      className={
                        selectedKeys.length > 0
                          ? 'text-xs font-semibold text-slate-700'
                          : 'text-xs text-slate-500'
                      }
                    >
                      {selectedKeys.length > 0
                        ? `${selectedKeys.length} paycheck${selectedKeys.length === 1 ? '' : 's'} selected`
                        : 'Select paychecks to edit deductions or 401(k) in bulk'}
                    </span>
                    <div className="flex items-center gap-2">
                      {selectedKeys.length > 0 ? (
                        <Button size="small" type="text" onClick={() => setSelectedKeys([])}>
                          Clear selection
                        </Button>
                      ) : null}
                      {/* antd's disabled primary is grey on grey, so an inactive action drops to default. */}
                      <Button
                        size="small"
                        type={selectedKeys.length > 0 ? 'primary' : 'default'}
                        icon={<SlidersOutlined />}
                        disabled={selectedKeys.length === 0}
                        onClick={() => setBatchOpen(true)}
                      >
                        Batch edit
                      </Button>
                    </div>
                  </div>

                  <YearLedgerTable
                    rows={effectiveRows}
                    actuals={settings.actuals}
                    selectedPeriod={row?.periodIndex ?? 0}
                    selectedKeys={selectedKeys}
                    onSelectionChange={setSelectedKeys}
                    onSelectPeriod={(period) => {
                      setSelectedPeriod(period);
                      setView('paycheck');
                    }}
                    onActualChange={setActual}
                  />
                </div>

                <BatchOverrideModal
                  open={batchOpen}
                  selectedKeys={selectedKeys}
                  defaults={periodDefaults}
                  customDeductions={settings.customDeductions}
                  allowances={settings.allowances}
                  allowanceSchedule={allowanceSchedule}
                  matchByPeriod={Object.fromEntries(
                    effectiveRows.map((candidate: any) => [
                      candidate.periodIndex,
                      candidate.employerMatch401k,
                    ])
                  )}
                  overrides={settings.periodDeductions}
                  onCancel={() => setBatchOpen(false)}
                  onApply={(patch) => {
                    update({
                      periodDeductions: applyOverrideToPeriods(
                        settings.periodDeductions,
                        periodDefaults,
                        settings.customDeductions,
                        selectedKeys,
                        patch
                      ),
                    });
                    setBatchOpen(false);
                    message.success(
                      `Applied to ${selectedKeys.length} paycheck${selectedKeys.length === 1 ? '' : 's'}`
                    );
                  }}
                  onClear={() => {
                    update({
                      periodDeductions: clearOverridesFor(settings.periodDeductions, selectedKeys),
                    });
                    setBatchOpen(false);
                    message.success('Overrides cleared');
                  }}
                />
              </>
            )}
          </>
        ) : null}
      </>
    )}
  </>
);

export default IncomeSourceTabs;

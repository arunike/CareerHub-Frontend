import { useEffect, useMemo, useState } from 'react';
import { Button, Segmented, Tabs, Tooltip, message } from 'antd';
import {
  EyeInvisibleOutlined,
  EyeOutlined,
  SaveOutlined,
  SlidersOutlined,
} from '@ant-design/icons';
import { usePersistedState } from '../../hooks/usePersistedState';
import PageActionToolbar from '../../components/PageActionToolbar';
import { PageState } from '../../components/PageState';
import { SkeletonBlock } from '../../components/SkeletonLoader';
import type { FilingStatus } from '../../types/tax';
import BatchOverrideModal from './BatchOverrideModal';
import BonusForm from './BonusForm';
import ElectionsForm from './ElectionsForm';
import IncomeSummary from './IncomeSummary';
import YearEarningsCard from './YearEarningsCard';
import PaycheckWaterfall from './PaycheckWaterfall';
import OverrideConflictModal, { type OverrideConflict } from './OverrideConflictModal';
import ReconciliationCards from './ReconciliationCards';
import RetirementForm from './RetirementForm';
import VestingForm from './VestingForm';
import YearLedgerTable from './YearLedgerTable';
import {
  applyOverrideToPeriods,
  clearFieldFromOverrides,
  clearOverridesFor,
  periodsOverriding,
  findOverride,
  removeOverride,
  upsertOverride,
} from './periodDeductions';
import { describeFormula } from './matchTiers';
import { compareRates } from './taxRates';
import { useIncomeYear } from './useIncomeYear';
import { money as plainMoney } from './format';
import { AmountPrivacyProvider } from './amountPrivacy';

const Notice = ({ tone, children }: { tone: 'info' | 'warn'; children: React.ReactNode }) => (
  <div
    className={`rounded-xl border px-4 py-3 text-xs leading-relaxed ${
      tone === 'warn'
        ? 'border-amber-200 bg-amber-50/70 text-amber-800'
        : 'border-slate-200 bg-slate-50 text-slate-600'
    }`}
  >
    {children}
  </div>
);

const IncomePage = () => {
  const [amountsHidden, setAmountsHidden] = usePersistedState<boolean>(
    'careerhub.income.hideAmounts',
    false
  );
  const amount = (value: number) => (amountsHidden ? '••••••' : plainMoney(value));
  const [view, setView] = useState<'paycheck' | 'year'>('paycheck');
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<number[]>([]);
  const [batchOpen, setBatchOpen] = useState(false);
  const [conflict, setConflict] = useState<OverrideConflict | null>(null);

  const {
    loading,
    saving,
    isDirty,
    discardChanges,
    taxYear,
    setTaxYear,
    availableYears,
    yearResolution,
    modelledYears,
    sources,
    sourcesInYear,
    yearSummary,
    yearHistory,
    source,
    selectSource,
    settings,
    update,
    updateElections,
    updateW4,
    setActual,
    save,
    stateAbbr,
    paychecksPerYear,
    annualSalary,
    firstPayDate,
    ledger,
    effectiveRows,
    ledgerInput,
    reconciliation,
    drift,
    retirement,
    vestingTerms,
    vestEvents,
    deductionLines,
    matchTiers,
    matchFormula,
    allowanceSchedule,
    periodDefaults,
    bonusEvents,
    targetBonus,
    bonusTotal,
    bonusProration,
    performanceYear,
    periods,
  } = useIncomeYear();

  // A role that starts mid-year has no period 1, so the selection follows the ledger.
  const row = useMemo(() => {
    if (effectiveRows.length === 0) return null;
    return (
      effectiveRows.find((candidate) => candidate.periodIndex === selectedPeriod) ??
      effectiveRows[0]
    );
  }, [effectiveRows, selectedPeriod]);

  useEffect(() => {
    if (row && row.periodIndex !== selectedPeriod) setSelectedPeriod(row.periodIndex);
  }, [row, selectedPeriod]);

  const rowActual = useMemo(
    () => settings.actuals.find((actual) => actual.periodIndex === row?.periodIndex),
    [row, settings.actuals]
  );

  const roleOptions = useMemo(() => {
    const current = sourcesInYear.filter((candidate) => candidate.isCurrent);
    const past = sourcesInYear.filter((candidate) => !candidate.isCurrent);
    const toOption = (candidate: (typeof sourcesInYear)[number]) => ({
      value: candidate.key,
      label: `${candidate.company}${candidate.roleTitle ? ` · ${candidate.roleTitle}` : ''}`,
    });

    return [
      ...(current.length > 0 ? [{ label: 'Current role', options: current.map(toOption) }] : []),
      ...(past.length > 0
        ? [{ label: 'Past roles, from your Experience page', options: past.map(toOption) }]
        : []),
    ];
  }, [sourcesInYear]);

  const rates = useMemo(
    () => compareRates(effectiveRows, settings.actuals),
    [effectiveRows, settings.actuals]
  );

  const stateLabel = useMemo(() => {
    if (!stateAbbr) return '';
    if (ledgerInput.state.tier === 'none') return `${stateAbbr} · no state income tax`;
    if (ledgerInput.state.tier === 'full') return `${stateAbbr} · full brackets`;
    return `${stateAbbr} · estimated at ${ledgerInput.state.flatRatePercent}%`;
  }, [ledgerInput.state, stateAbbr]);

  // A standing change cannot reach a paycheck that pins the same field, so say so rather
  // than letting the edit look like it did nothing.
  const flagConflict = (key: string, label: string) => {
    const periodIndexes = periodsOverriding(settings.periodDeductions, key);
    if (periodIndexes.length > 0) setConflict({ key, label, periodIndexes });
  };

  const handleSave = async () => {
    const ok = await save();
    if (ok) {
      message.success('Saved');
    } else {
      message.warning('Saved on this device only — the income API is not deployed yet.');
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <SkeletonBlock width="220px" height="1.75rem" />
        <SkeletonBlock width="100%" height="210px" />
        <SkeletonBlock width="100%" height="120px" />
        <SkeletonBlock width="100%" height="380px" />
      </div>
    );
  }

  const settingsTabs = [
    {
      key: 'elections',
      label: 'Elections',
      children: (
        <ElectionsForm
          source={source}
          filingStatus={settings.filingStatus}
          stateAbbr={stateAbbr}
          elections={ledgerInput.elections}
          w4={settings.w4}
          paychecksPerYear={paychecksPerYear}
          annualSalary={annualSalary}
          firstPayDate={firstPayDate}
          hsaLimit={ledger.hsaLimit}
          paidPeriodCount={ledger.rows.length}
          deductionLines={deductionLines}
          customDeductions={settings.customDeductions}
          allowances={settings.allowances}
          onFilingStatusChange={(value: FilingStatus) => update({ filingStatus: value })}
          onStateChange={(value) => update({ stateOverride: value })}
          onElectionsChange={(patch) => {
            updateElections(patch);
            if (patch.pretax401kPercent !== undefined) {
              flagConflict('pretax401kPercent', 'traditional 401(k) rate');
            }
            if (patch.roth401kPercent !== undefined) {
              flagConflict('roth401kPercent', 'Roth 401(k) rate');
            }
          }}
          onW4Change={updateW4}
          onFirstPayDateChange={(value) => update({ firstPayDate: value })}
          onPaychecksPerYearChange={(value) => {
            update({ paychecksPerYearOverride: value, firstPayDate: null });
            flagConflict('regularGross', 'gross pay');
          }}
          onDeductionChange={(patch) => {
            update({
              ...(patch.medical !== undefined ? { medicalOverride: patch.medical } : {}),
              ...(patch.dental !== undefined ? { dentalOverride: patch.dental } : {}),
              ...(patch.vision !== undefined ? { visionOverride: patch.vision } : {}),
              ...(patch.dependent !== undefined ? { dependentOverride: patch.dependent } : {}),
            });
            const labels: Record<string, string> = {
              medical: 'medical insurance',
              dental: 'dental insurance',
              vision: 'vision insurance',
              dependent: 'dependent coverage',
            };
            for (const [key, label] of Object.entries(labels)) {
              if (patch[key as keyof typeof patch] !== undefined) flagConflict(key, label);
            }
          }}
          onAllowancesChange={(allowances) => update({ allowances })}
          onCustomDeductionsChange={(deductions) => {
            const changed = deductions.filter((deduction) => {
              const previous = settings.customDeductions.find(
                (candidate) => candidate.id === deduction.id
              );
              return previous !== undefined && previous.amount !== deduction.amount;
            });
            update({ customDeductions: deductions });
            const first = changed[0];
            if (first) flagConflict(first.id, first.label || 'this deduction');
          }}
        />
      ),
    },
    {
      key: 'bonus',
      label: 'Bonus',
      children: (
        <BonusForm
          includeBonus={settings.includeBonus}
          targetBonus={targetBonus}
          bonusTotal={bonusTotal}
          offerBonus={source?.bonus ?? 0}
          annualSalary={annualSalary}
          multiplierPercent={settings.bonusMultiplierPercent}
          prorated={settings.bonusProrated}
          prorationFactor={bonusProration}
          performanceYear={performanceYear}
          extras={settings.bonusExtras}
          payouts={settings.bonusPayouts}
          bonusEvents={bonusEvents}
          periods={periods}
          taxYear={taxYear}
          onIncludeChange={(value) => update({ includeBonus: value })}
          onBonusChange={(value) => update({ bonusOverride: value })}
          onMultiplierChange={(value) => update({ bonusMultiplierPercent: value })}
          onProratedChange={(value) => update({ bonusProrated: value })}
          onPerformanceYearChange={(value) => update({ bonusPerformanceYear: value })}
          onExtrasChange={(extras) => update({ bonusExtras: extras })}
          onPayoutsChange={(payouts) => update({ bonusPayouts: payouts })}
        />
      ),
    },
    {
      key: 'retirement',
      label: '401(k)',
      children: (
        <RetirementForm
          summary={retirement}
          perPeriodMatch={row?.employerMatch401k ?? 0}
          paidPeriodCount={ledger.rows.length}
          taxYear={taxYear}
          matchTiers={matchTiers}
          formula={matchFormula}
          pretaxPercent={settings.elections.pretax401kPercent}
          rothPercent={settings.elections.roth401kPercent}
          elective401kLimit={ledger.elective401kLimit}
          excludeAllowances={settings.elections.excludeAllowancesFromDeferralBase}
          onExcludeAllowancesChange={(value) =>
            updateElections({ excludeAllowancesFromDeferralBase: value })
          }
          onDeferralChange={(patch) => {
            updateElections(patch);
            if (patch.pretax401kPercent !== undefined) {
              flagConflict('pretax401kPercent', 'traditional 401(k) rate');
            }
            if (patch.roth401kPercent !== undefined) {
              flagConflict('roth401kPercent', 'Roth 401(k) rate');
            }
          }}
          onStartingBalanceChange={(value) => update({ retirementStartingBalance: value })}
          onCurrentValueChange={(value) => update({ retirementCurrentValue: value })}
          onMatchTiersChange={(tiers) => update({ matchTiers: tiers })}
          onNonElectiveChange={(value) => update({ matchNonElectivePercent: value })}
          onAnnualCapChange={(value) => update({ matchAnnualCap: value ?? 0 })}
        />
      ),
    },
    {
      key: 'vesting',
      label: 'Vesting',
      children: (
        <VestingForm
          terms={vestingTerms}
          includeVestEvents={settings.includeVestEvents}
          generatedVests={vestEvents}
          manualEvents={settings.extraEvents}
          periods={periods}
          onTermsChange={(patch) =>
            update({
              ...(patch.totalGrant !== undefined ? { totalGrantOverride: patch.totalGrant } : {}),
              ...(patch.vestsPerYear !== undefined
                ? { vestsPerYearOverride: patch.vestsPerYear }
                : {}),
              ...(patch.cliffMonths !== undefined
                ? { cliffMonthsOverride: patch.cliffMonths }
                : {}),
              ...(patch.vestingYears !== undefined
                ? { vestingYearsOverride: patch.vestingYears }
                : {}),
              ...(patch.grantDate !== undefined ? { firstVestDate: patch.grantDate } : {}),
            })
          }
          onIncludeChange={(value) => update({ includeVestEvents: value })}
          onManualEventsChange={(events) => update({ extraEvents: events })}
        />
      ),
    },
  ];

  return (
    <AmountPrivacyProvider hidden={amountsHidden}>
      <div className="space-y-5">
        <PageActionToolbar
          title="Income"
          subtitle="What actually lands in your account, and what you will owe in April"
          selectedYear={taxYear}
          onYearChange={(year) => {
            if (year !== 'all') setTaxYear(year);
          }}
          availableYears={availableYears}
          allowAllYears={false}
          singleRowDesktop
          viewSwitch={
            <Tooltip title={amountsHidden ? 'Show amounts' : 'Hide every amount on this page'}>
              <Button
                className="toolbar-btn"
                size="large"
                icon={amountsHidden ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                onClick={() => setAmountsHidden((previous) => !previous)}
              >
                {amountsHidden ? 'Show amounts' : 'Hide amounts'}
              </Button>
            </Tooltip>
          }
          extraActions={
            <div className="flex items-center gap-2">
              {isDirty ? (
                <>
                  <span className="hidden text-xs text-amber-600 sm:inline">Unsaved changes</span>
                  <Button size="small" type="text" onClick={discardChanges}>
                    Discard
                  </Button>
                </>
              ) : null}
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={saving}
                disabled={!isDirty}
                onClick={handleSave}
              >
                Save
              </Button>
            </div>
          }
        />

        <OverrideConflictModal
          conflict={conflict}
          rows={effectiveRows}
          onKeep={() => setConflict(null)}
          onReplace={() => {
            if (conflict) {
              update({
                periodDeductions: clearFieldFromOverrides(settings.periodDeductions, conflict.key),
              });
              message.success(
                `Replaced on ${conflict.periodIndexes.length} paycheck${conflict.periodIndexes.length === 1 ? '' : 's'}`
              );
            }
            setConflict(null);
          }}
        />

        {sources.length === 0 ? (
          <PageState
            title="No roles to model"
            description="Add a role on the Experience page, or mark an offer as your current role, and this page will model its paychecks."
          />
        ) : (
          <>
            <IncomeSummary
              source={source}
              totals={ledger.totals}
              paidPeriodCount={ledger.rows.length}
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

            {effectiveRows.some((candidate) => candidate.residual < -0.005) ? (
              <Notice tone="warn">
                Some paychecks record a take-home larger than their gross pay can support, so no tax
                is left to withhold on them. That usually means the gross is wrong: record the gross
                from your payslip on those paychecks, or check the salary on this role.
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
                />

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Segmented
                    value={view}
                    onChange={(value) => setView(value as 'paycheck' | 'year')}
                    options={[
                      { label: 'One paycheck', value: 'paycheck' },
                      { label: 'Whole year', value: 'year' },
                    ]}
                  />
                  <div className="text-xs text-slate-500">
                    {amount(ledger.totals.gross)} gross · {amount(ledger.totals.taxTotal)} tax ·{' '}
                    {amount(ledger.totals.net)} take-home
                  </div>
                </div>

                {view === 'paycheck' ? (
                  <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
                    {row ? (
                      <PaycheckWaterfall
                        row={row}
                        rows={effectiveRows}
                        periodsPerYear={paychecksPerYear}
                        actual={rowActual}
                        onActualChange={setActual}
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
                            periodDeductions: removeOverride(
                              settings.periodDeductions,
                              periodIndex
                            ),
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
                    <div className="enterprise-card p-2 sm:p-3">
                      <div className="flex flex-wrap items-center justify-between gap-3 px-2 pb-2 pt-1">
                        <span className="text-xs text-slate-500">
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
                          <Button
                            size="small"
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
                        effectiveRows.map((candidate) => [
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
                          periodDeductions: clearOverridesFor(
                            settings.periodDeductions,
                            selectedKeys
                          ),
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
      </div>
    </AmountPrivacyProvider>
  );
};

export default IncomePage;

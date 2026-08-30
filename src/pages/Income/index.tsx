import { useEffect, useMemo, useState } from 'react';
import { Button, Tooltip, message } from 'antd';
import { EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';
import { usePersistedState } from '../../hooks/usePersistedState';
import PageActionToolbar from '../../components/PageActionToolbar';
import { SkeletonBlock } from '../../components/SkeletonLoader';
import type { FilingStatus } from '../../types/tax';
import BonusForm from './BonusForm';
import ElectionsForm from './ElectionsForm';
import OverrideConflictModal, { type OverrideConflict } from './OverrideConflictModal';
import RetirementForm from './RetirementForm';
import VestingForm from './VestingForm';
import { mostRecentPaidRow } from './effectiveRows';
import { toIsoDate } from './paySchedule';
import UnsavedChangesActions from '../../components/UnsavedChangesActions';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import { clearFieldFromOverrides, periodsOverriding } from './periodDeductions';
import { compareRates } from './taxRates';
import { useIncomeYear } from './useIncomeYear';
import { money as plainMoney } from './format';
import { AmountPrivacyProvider } from './amountPrivacy';
import IncomeSourceTabs from './IncomeSourceTabs';

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
    nextYearBonus,
    performanceYear,
    periods,
  } = useIncomeYear();

  // A role that starts mid-year has no period 1, so the selection follows the ledger, and the
  // default lands on the paycheck you were most recently paid rather than the first of the year.
  const row = useMemo(() => {
    if (effectiveRows.length === 0) return null;
    return (
      effectiveRows.find((candidate) => candidate.periodIndex === selectedPeriod) ??
      mostRecentPaidRow(effectiveRows, toIsoDate(new Date()))
    );
  }, [effectiveRows, selectedPeriod]);

  useEffect(() => {
    if (row && row.periodIndex !== selectedPeriod) setSelectedPeriod(row.periodIndex);
  }, [row, selectedPeriod]);

  useUnsavedChanges(isDirty, 'income changes');

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
          periods={periods}
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
            <UnsavedChangesActions
              isDirty={isDirty}
              saving={saving}
              onDiscard={discardChanges}
              onSave={handleSave}
            />
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

        <IncomeSourceTabs
          Notice={Notice}
          nextYearBonus={nextYearBonus}
          targetBonus={targetBonus}
          allowanceSchedule={allowanceSchedule}
          drift={drift}
          effectiveRows={effectiveRows}
          ledger={ledger}
          matchFormula={matchFormula}
          modelledYears={modelledYears}
          paychecksPerYear={paychecksPerYear}
          periodDefaults={periodDefaults}
          reconciliation={reconciliation}
          selectSource={selectSource}
          setActual={setActual}
          setTaxYear={setTaxYear}
          settings={settings}
          source={source}
          sources={sources}
          sourcesInYear={sourcesInYear}
          stateAbbr={stateAbbr}
          taxYear={taxYear}
          update={update}
          yearHistory={yearHistory}
          yearResolution={yearResolution}
          yearSummary={yearSummary}
          amount={amount}
          batchOpen={batchOpen}
          rates={rates}
          roleOptions={roleOptions}
          row={row}
          selectedKeys={selectedKeys}
          setBatchOpen={setBatchOpen}
          setSelectedKeys={setSelectedKeys}
          setSelectedPeriod={setSelectedPeriod}
          setView={setView}
          settingsTabs={settingsTabs}
          stateLabel={stateLabel}
          view={view}
        />
      </div>
    </AmountPrivacyProvider>
  );
};

export default IncomePage;

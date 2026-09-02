import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  createIncomeYear,
  getCareerReferenceData,
  getExperiences,
  getIncomeYears,
  getOffers,
  updateIncomeYear,
  type IncomeYearPayload,
} from '../../api';
import {
  DEFAULT_STATE_NAME_TO_ABBR,
  DEFAULT_STATE_TAX_RATE,
} from '../OfferComparison/calculations';
import {
  activeInYear,
  buildIncomeSources,
  visibleSources,
  visibleYears,
  yearsForSources,
  type IncomeSource,
} from './incomeSources';
import {
  LATEST_TAX_YEAR,
  modelledYears,
  normalizeApiTables,
  resolveTaxYear,
  type TaxTableOverrides,
} from './tax/data';
import { getUserSettings } from '../../api/availability';
import { type Elections } from './tax/ledger';
import type { PeriodActual } from './effectiveRows';
import { DEFAULT_SETTINGS, type IncomeSettings } from './incomeSettings';
import { createSettingsResolver, fromPayload, readLocal, writeLocal } from './incomeSettingsStore';
import { buildIncomeModel } from './incomeModel';
import { parseYearParam, YEAR_PARAM } from './yearParam';
import { summarizeYear, summarizeYears, type SettingsResolver } from './yearSummary';
import type { W4Inputs } from './tax/withholding';

// The API keys years as strings; the lookups are numeric.
const numericKeys = <T>(source: unknown): Record<number, T> | undefined => {
  if (!source || typeof source !== 'object') return undefined;
  const entries = Object.entries(source as Record<string, T>).map(
    ([year, value]) => [Number(year), value] as const
  );
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
};

const SELECTED_SOURCE_KEY = 'careerhub.income.selectedSource';

const toPayload = (taxYear: number, sourceKey: string, settings: IncomeSettings) => ({
  tax_year: taxYear,
  source_key: sourceKey,
  first_pay_date: settings.firstPayDate,
  salary_override: settings.salaryOverride,
  paychecks_per_year_override: settings.paychecksPerYearOverride,
  pretax_401k_percent: settings.elections.pretax401kPercent,
  roth_401k_percent: settings.elections.roth401kPercent,
  hsa_per_period: settings.elections.hsaPerPeriod,
  fsa_per_period: settings.elections.fsaPerPeriod,
  post_tax_deductions_per_period: settings.elections.postTaxPerPeriod,
  hsa_family_coverage: settings.elections.hsaFamilyCoverage,
  age_50_plus: settings.elections.age50Plus,
  deferral_base: settings.elections.deferralBase,
  include_bonus: settings.includeBonus,
  bonus_override: settings.bonusOverride,
  bonus_payouts: settings.bonusPayouts as unknown as Array<Record<string, unknown>>,
  bonus_multiplier_percent: settings.bonusMultiplierPercent,
  bonus_extras: settings.bonusExtras as unknown as Array<Record<string, unknown>>,
  bonus_prorated: settings.bonusProrated,
  bonus_performance_year: settings.bonusPerformanceYear,
  include_vest_events: settings.includeVestEvents,
  total_grant_override: settings.totalGrantOverride,
  vests_per_year_override: settings.vestsPerYearOverride,
  cliff_months_override: settings.cliffMonthsOverride,
  vesting_years_override: settings.vestingYearsOverride,
  first_vest_date: settings.firstVestDate,
  medical_premium_override: settings.medicalOverride,
  dental_premium_override: settings.dentalOverride,
  vision_premium_override: settings.visionOverride,
  dependent_premium_override: settings.dependentOverride,
  custom_deductions: settings.customDeductions as unknown as Array<Record<string, unknown>>,
  allowances: settings.allowances as unknown as Array<Record<string, unknown>>,
  match_tiers: (settings.matchTiers ?? []) as unknown as Array<Record<string, unknown>>,
  match_non_elective_percent: settings.matchNonElectivePercent,
  match_annual_cap: settings.matchAnnualCap,
  period_deductions: settings.periodDeductions as unknown as Array<Record<string, unknown>>,
  retirement_starting_balance: settings.retirementStartingBalance,
  retirement_current_value: settings.retirementCurrentValue,
  income_events: settings.extraEvents as unknown as Array<Record<string, unknown>>,
  // Recorded paychecks and any pay-date override, so a phone sees what a laptop typed.
  actuals: settings.actuals.map((actual) => ({
    period_index: actual.periodIndex,
    pay_date: actual.payDate ?? null,
    actual_gross: actual.gross ?? null,
    actual_net: actual.net ?? null,
    note: actual.note ?? '',
  })),
});

export const useIncomeYear = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  // URL-driven, so a refresh or a shared link lands on the same year.
  const taxYear = parseYearParam(searchParams.get(YEAR_PARAM));

  const setTaxYear = useCallback(
    (next: number) => {
      const params = new URLSearchParams(searchParams);
      params.set(YEAR_PARAM, String(next));
      // replace, so stepping through years does not stack history entries to click back through.
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams]
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sources, setSources] = useState<IncomeSource[]>([]);
  const [sourceKey, setSourceKey] = useState<string>(() => {
    try {
      return window.localStorage.getItem(SELECTED_SOURCE_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [incomeRecords, setIncomeRecords] = useState<IncomeYearPayload[] | null>(null);
  const draftsRef = useRef<Map<string, IncomeSettings>>(new Map());
  const [dirtyKeys, setDirtyKeys] = useState<string[]>([]);
  const [settings, setSettings] = useState<IncomeSettings>(DEFAULT_SETTINGS);
  const [stateTaxRates, setStateTaxRates] =
    useState<Record<string, number>>(DEFAULT_STATE_TAX_RATE);
  const [stateNames, setStateNames] = useState<Record<string, string>>(DEFAULT_STATE_NAME_TO_ABBR);
  const [taxOverrides, setTaxOverrides] = useState<TaxTableOverrides>({});
  const [recordId, setRecordId] = useState<number | null>(null);
  const [persistence, setPersistence] = useState<'api' | 'local'>('api');
  const [hiddenRoles, setHiddenRoles] = useState<string[]>([]);
  const [hiddenYears, setHiddenYears] = useState<number[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const [offersResult, experiencesResult, referenceResult, incomeResult, settingsResult] =
        await Promise.allSettled([
          getOffers(),
          getExperiences(),
          getCareerReferenceData(),
          getIncomeYears(),
          getUserSettings(),
        ]);
      if (cancelled) return;

      const offerRows =
        offersResult.status === 'fulfilled'
          ? ((offersResult.value.data ?? []) as Array<Record<string, any>>)
          : [];
      const experienceRows =
        experiencesResult.status === 'fulfilled'
          ? ((experiencesResult.value.data ?? []) as unknown as Array<Record<string, any>>)
          : [];
      setSources(buildIncomeSources(offerRows, experienceRows));

      // A failed fetch hides nothing, which is the safe direction.
      if (settingsResult.status === 'fulfilled') {
        const userSettings = (settingsResult.value.data ?? {}) as Record<string, unknown>;
        setHiddenRoles((userSettings.hidden_income_roles as string[]) ?? []);
        setHiddenYears(((userSettings.hidden_income_years as number[]) ?? []).map(Number));
      }

      if (referenceResult.status === 'fulfilled') {
        const reference = (referenceResult.value.data ?? {}) as Record<string, any>;
        if (reference.state_tax_rate) setStateTaxRates(reference.state_tax_rate);
        if (reference.state_name_to_abbr) setStateNames(reference.state_name_to_abbr);
        // A year published after this build shipped arrives here rather than in the bundle.
        setTaxOverrides({
          federal: normalizeApiTables(numericKeys(reference.federal_tax_tables)),
          limits: numericKeys(reference.federal_annual_limits),
        });
      }

      // These endpoints ship with this feature, so an older backend falls back to local state.
      if (incomeResult.status === 'fulfilled') {
        setPersistence('api');
        setIncomeRecords(incomeResult.value.data ?? []);
      } else {
        setPersistence('local');
        setIncomeRecords([]);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Applied after the year narrows the list, so hiding one role cannot empty a year.
  const sourcesInYear = useMemo(
    () =>
      visibleSources(
        sources.filter((candidate) => activeInYear(candidate, taxYear)),
        hiddenRoles
      ),
    [sources, taxYear, hiddenRoles]
  );

  const resolvedSourceKey = useMemo(() => {
    if (sourceKey && sourcesInYear.some((candidate) => candidate.key === sourceKey)) {
      return sourceKey;
    }
    return sourcesInYear[0]?.key ?? '';
  }, [sourceKey, sourcesInYear]);

  useEffect(() => {
    if (incomeRecords === null) return;
    if (!resolvedSourceKey) {
      setLoading(false);
      return;
    }

    const draftKey = `${taxYear}|${resolvedSourceKey}`;
    const match = incomeRecords.find(
      (row) => row.tax_year === taxYear && (row.source_key ?? '') === resolvedSourceKey
    );
    setRecordId(match?.id ?? null);

    const draft = draftsRef.current.get(draftKey);
    if (draft) {
      setSettings(draft);
      setLoading(false);
      return;
    }

    const local = readLocal(taxYear, resolvedSourceKey);
    setSettings({ ...DEFAULT_SETTINGS, ...(local ?? {}), ...(match ? fromPayload(match) : {}) });
    setLoading(false);
  }, [incomeRecords, resolvedSourceKey, taxYear]);

  const selectSource = useCallback((key: string) => {
    setSourceKey(key);
    try {
      window.localStorage.setItem(SELECTED_SOURCE_KEY, key);
    } catch {
      // Selection simply will not survive a reload.
    }
  }, []);

  const patch = useCallback(
    (updater: (previous: IncomeSettings) => IncomeSettings) => {
      setSettings((previous) => {
        const next = updater(previous);
        const draftKey = `${taxYear}|${resolvedSourceKey}`;
        draftsRef.current.set(draftKey, next);
        setDirtyKeys((keys) => (keys.includes(draftKey) ? keys : [...keys, draftKey]));
        return next;
      });
    },
    [resolvedSourceKey, taxYear]
  );

  const update = useCallback(
    (changes: Partial<IncomeSettings>) => patch((previous) => ({ ...previous, ...changes })),
    [patch]
  );

  const updateElections = useCallback(
    (changes: Partial<Elections>) =>
      patch((previous) => ({ ...previous, elections: { ...previous.elections, ...changes } })),
    [patch]
  );

  const updateW4 = useCallback(
    (changes: Partial<W4Inputs>) =>
      patch((previous) => ({ ...previous, w4: { ...previous.w4, ...changes } })),
    [patch]
  );

  const setActual = useCallback(
    (periodIndex: number, changes: Partial<Omit<PeriodActual, 'periodIndex'>>) =>
      patch((previous) => {
        const existing = previous.actuals.find((actual) => actual.periodIndex === periodIndex);
        const merged: PeriodActual = { ...(existing ?? { periodIndex }), ...changes };
        const others = previous.actuals.filter((actual) => actual.periodIndex !== periodIndex);
        const keeps = Object.entries(merged).some(
          ([key, value]) =>
            key !== 'periodIndex' && value !== null && value !== undefined && value !== ''
        );
        const actuals = keeps ? [...others, merged] : others;
        return { ...previous, actuals: actuals.sort((a, b) => a.periodIndex - b.periodIndex) };
      }),
    [patch]
  );

  const source = useMemo(
    () => sourcesInYear.find((candidate) => candidate.key === resolvedSourceKey) ?? null,
    [resolvedSourceKey, sourcesInYear]
  );

  // Every year any role covers, so the year re-filters the roles.
  const availableYears = useMemo(
    () => visibleYears(yearsForSources(sources, LATEST_TAX_YEAR), hiddenYears),
    [sources, hiddenYears]
  );

  const taxContext = useMemo(
    () => ({ stateNames, stateTaxRates, taxOverrides }),
    [stateNames, stateTaxRates, taxOverrides]
  );

  const model = useMemo(
    () => buildIncomeModel({ ...taxContext, settings, source, taxYear }),
    [taxContext, settings, source, taxYear]
  );

  // The live draft stands in for the selected role, so the summary tracks unsaved edits.
  const settingsFor = useCallback<SettingsResolver>(
    (year, key) => {
      if (year === taxYear && key === resolvedSourceKey) return settings;
      const draft = draftsRef.current.get(`${year}|${key}`);
      if (draft) return draft;
      return createSettingsResolver(incomeRecords)(year, key);
    },
    [incomeRecords, resolvedSourceKey, settings, taxYear]
  );

  const yearSummary = useMemo(
    () => summarizeYear(taxYear, sources, settingsFor, taxContext),
    [settingsFor, sources, taxContext, taxYear]
  );

  const yearHistory = useMemo(
    () => summarizeYears(availableYears, sources, settingsFor, taxContext),
    [availableYears, settingsFor, sources, taxContext]
  );

  const {
    paychecksPerYear,
    annualSalary,
    firstPayDate,
    periods,
    vestingTerms,
    stateAbbr,
    targetBonus,
    bonusTotal,
    bonusEvents,
    vestEvents,
    bonusProration,
    performanceYear,
    performanceYearOptions,
    bonusProrationDetail,
    nextYearBonus,
    ledgerPeriods,
    deductionLines,
    allowanceSchedule,
    allowanceSplit,
    matchTiers,
    periodDefaults,
    customSplit,
    periodOverrides,
    ledgerInput,
    ledger,
    effectiveRows,
    reconciliation,
    retirement,
    drift,
  } = model;

  const save = useCallback(async () => {
    const draftKey = `${taxYear}|${resolvedSourceKey}`;
    const settle = () => {
      draftsRef.current.delete(draftKey);
      setDirtyKeys((keys) => keys.filter((key) => key !== draftKey));
    };

    if (resolvedSourceKey) writeLocal(taxYear, resolvedSourceKey, settings);
    if (persistence === 'local') {
      settle();
      return true;
    }

    setSaving(true);
    try {
      const payload = toPayload(taxYear, resolvedSourceKey, settings);
      if (recordId) {
        await updateIncomeYear(recordId, payload);
      } else {
        const created = await createIncomeYear(payload);
        setRecordId(created.data?.id ?? null);
        if (created.data) setIncomeRecords((rows) => [...(rows ?? []), created.data]);
      }
      settle();
      return true;
    } catch {
      setPersistence('local');
      return false;
    } finally {
      setSaving(false);
    }
  }, [persistence, recordId, resolvedSourceKey, settings, taxYear]);

  const isDirty = dirtyKeys.includes(`${taxYear}|${resolvedSourceKey}`);

  const discardChanges = useCallback(() => {
    const draftKey = `${taxYear}|${resolvedSourceKey}`;
    draftsRef.current.delete(draftKey);
    setDirtyKeys((keys) => keys.filter((key) => key !== draftKey));
    const match = incomeRecords?.find(
      (row) => row.tax_year === taxYear && (row.source_key ?? '') === resolvedSourceKey
    );
    const local = readLocal(taxYear, resolvedSourceKey);
    setSettings({ ...DEFAULT_SETTINGS, ...(local ?? {}), ...(match ? fromPayload(match) : {}) });
  }, [incomeRecords, resolvedSourceKey, taxYear]);

  return {
    loading,
    saving,
    isDirty,
    discardChanges,
    persistence,
    taxYear,
    setTaxYear,
    availableYears,
    yearSummary,
    yearHistory,
    yearResolution: resolveTaxYear(taxYear, taxOverrides),
    modelledYears: modelledYears(taxOverrides),
    sources,
    sourcesInYear,
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
    periods,
    vestingTerms,
    ledger,
    effectiveRows,
    ledgerInput,
    reconciliation,
    drift,
    retirement,
    vestEvents,
    bonusEvents,
    targetBonus,
    bonusTotal,
    bonusProration,
    performanceYear,
    performanceYearOptions,
    bonusProrationDetail,
    nextYearBonus,
    ledgerPeriods,
    deductionLines,
    allowanceSchedule,
    allowanceSplit,
    matchTiers,
    matchFormula: {
      tiers: matchTiers,
      nonElectivePercent: settings.matchNonElectivePercent,
      annualCap: settings.matchAnnualCap,
    },
    periodDefaults,
    customSplit,
    periodOverrides,
  };
};

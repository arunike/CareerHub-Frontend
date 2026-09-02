import { useEffect, useMemo, useState } from 'react';
import { getCareerReferenceData, getIncomeYears, type IncomeYearPayload } from '../../api';
import {
  DEFAULT_STATE_NAME_TO_ABBR,
  DEFAULT_STATE_TAX_RATE,
} from '../OfferComparison/calculations';
import { normalizeApiTables, type TaxTableOverrides } from './tax/data';
import { buildIncomeSources, yearsForSources } from './incomeSources';
import { createSettingsResolver } from './incomeSettingsStore';
import { summarizeYears } from './yearSummary';

export interface LedgerYear {
  year: number;
  total: number;
  byComponent: { base: number; bonus: number; equity: number };
  paychecks: number;
  // Every modelled paycheck in the year, which is the figure the Income tab's year card shows.
  projected: number;
  paychecksToDate: number;
}

const numericKeys = <T>(source: unknown): Record<number, T> | undefined => {
  if (!source || typeof source !== 'object') return undefined;
  const entries = Object.entries(source as Record<string, T>).map(
    ([year, value]) => [Number(year), value] as const
  );
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
};

const round = (value: number) => Math.round(value);

// What the Income tab's ledger says each role was actually paid, keyed by income source.
export const useLedgerEarnings = (
  offers: Array<Record<string, unknown>>,
  experiences: Array<Record<string, unknown>>
) => {
  const [records, setRecords] = useState<IncomeYearPayload[] | null>(null);
  const [stateTaxRates, setStateTaxRates] =
    useState<Record<string, number>>(DEFAULT_STATE_TAX_RATE);
  const [stateNames, setStateNames] = useState<Record<string, string>>(DEFAULT_STATE_NAME_TO_ABBR);
  const [taxOverrides, setTaxOverrides] = useState<TaxTableOverrides>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const [referenceResult, incomeResult] = await Promise.allSettled([
        getCareerReferenceData(),
        getIncomeYears(),
      ]);
      if (cancelled) return;

      if (referenceResult.status === 'fulfilled') {
        const reference = (referenceResult.value.data ?? {}) as Record<string, unknown>;
        if (reference.state_tax_rate)
          setStateTaxRates(reference.state_tax_rate as Record<string, number>);
        if (reference.state_name_to_abbr)
          setStateNames(reference.state_name_to_abbr as Record<string, string>);
        setTaxOverrides({
          federal: normalizeApiTables(numericKeys(reference.federal_tax_tables)),
          limits: numericKeys(reference.federal_annual_limits),
        });
      }
      if (incomeResult.status === 'fulfilled') {
        setRecords((incomeResult.value.data ?? []) as IncomeYearPayload[]);
      }
      setLoaded(true);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const sources = useMemo(
    () => buildIncomeSources(offers as never, experiences as never),
    [offers, experiences]
  );

  const byRole = useMemo(() => {
    if (!loaded) return new Map<string, LedgerYear[]>();
    const years = yearsForSources(sources, new Date().getFullYear());
    const history = summarizeYears(years, sources, createSettingsResolver(records), {
      stateNames,
      stateTaxRates,
      taxOverrides,
    });

    const map = new Map<string, LedgerYear[]>();
    for (const year of history) {
      for (const role of year.roles) {
        // Base carries the rounding, so the parts add to the same gross the Income tab prints.
        const total = round(role.toDate.gross);
        const bonus = round(role.toDate.bonus);
        const equity = round(role.toDate.equity);
        const byComponent = { base: total - bonus - equity, bonus, equity };
        if (total <= 0) continue;
        const existing = map.get(role.sourceKey) ?? [];
        existing.push({
          year: year.taxYear,
          total,
          byComponent,
          paychecks: role.paychecks,
          paychecksToDate: role.paychecksToDate,
          projected: round(role.gross),
        });
        map.set(role.sourceKey, existing);
      }
    }
    for (const list of map.values()) list.sort((a, b) => b.year - a.year);
    return map;
  }, [loaded, records, sources, stateNames, stateTaxRates, taxOverrides]);

  return { ledgerByRole: byRole, ledgerLoaded: loaded };
};

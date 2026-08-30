import { useEffect, useMemo, useState } from 'react';
import { Switch, Tooltip } from 'antd';
import { getOffers } from '../../api/career/offers';
import { getExperiences } from '../../api/career/experiences';
import { buildIncomeSources, yearsForSources } from '../Income/incomeSources';
import type { IncomeSource } from '../Income/incomeSources';
import { LATEST_TAX_YEAR } from '../Income/tax/data';
import { SECTION_ICONS, SettingsSection } from './settingsChrome';

interface Props {
  hiddenRoles: string[];
  hiddenYears: number[];
  onHiddenRolesChange: (keys: string[]) => void;
  onHiddenYearsChange: (years: number[]) => void;
}

const toggle = <T,>(list: T[], value: T, hide: boolean) =>
  hide ? [...new Set([...list, value])] : list.filter((entry) => entry !== value);

const Row = ({
  label,
  meta,
  visible,
  disabledReason,
  onChange,
}: {
  label: string;
  meta?: string;
  visible: boolean;
  disabledReason?: string;
  onChange: (visible: boolean) => void;
}) => (
  <div className="flex items-center justify-between gap-3 py-2.5">
    <span className="min-w-0">
      <span className={`block truncate text-sm ${visible ? 'text-slate-700' : 'text-slate-400'}`}>
        {label}
      </span>
      {meta ? <span className="mt-0.5 block text-xs text-slate-400">{meta}</span> : null}
    </span>
    <Tooltip title={disabledReason}>
      <span>
        <Switch
          size="small"
          checked={visible}
          disabled={Boolean(disabledReason)}
          onChange={onChange}
        />
      </span>
    </Tooltip>
  </div>
);

export const IncomeVisibilitySection = ({
  hiddenRoles,
  hiddenYears,
  onHiddenRolesChange,
  onHiddenYearsChange,
}: Props) => {
  const [sources, setSources] = useState<IncomeSource[] | null>(null);

  // Settings does not otherwise load career data, so this section fetches its own list.
  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([getOffers(), getExperiences()]).then(([offers, experiences]) => {
      if (cancelled) return;
      setSources(
        buildIncomeSources(
          offers.status === 'fulfilled' ? ((offers.value.data ?? []) as never[]) : [],
          experiences.status === 'fulfilled' ? ((experiences.value.data ?? []) as never[]) : []
        )
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const years = useMemo(
    () => (sources ? yearsForSources(sources, LATEST_TAX_YEAR) : []),
    [sources]
  );

  const visibleRoleCount = (sources ?? []).filter(
    (source) => !hiddenRoles.includes(source.key)
  ).length;
  const visibleYearCount = years.filter((year) => !hiddenYears.includes(year)).length;

  const body = () => {
    if (sources === null) {
      return <p className="text-sm text-slate-400">Loading roles…</p>;
    }

    if (sources.length === 0) {
      return (
        <p className="text-sm text-slate-400">
          No roles yet. Add one on the Experience page, or mark an offer as your current role, and
          it will appear here.
        </p>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-2">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Roles
          </span>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            A hidden role is left out of the Income page&rsquo;s role picker. Nothing is deleted,
            and its paychecks still count toward the year totals.
          </p>
          <div className="mt-2 divide-y divide-slate-100">
            {sources.map((source) => {
              const visible = !hiddenRoles.includes(source.key);
              return (
                <Row
                  key={source.key}
                  label={`${source.company} · ${source.roleTitle}`}
                  meta={source.startDate ? `From ${source.startDate}` : undefined}
                  visible={visible}
                  // The picker needs something in it, so the last one standing cannot be hidden.
                  disabledReason={
                    visible && visibleRoleCount <= 1
                      ? 'The Income page needs at least one role to show.'
                      : undefined
                  }
                  onChange={(next) => onHiddenRolesChange(toggle(hiddenRoles, source.key, !next))}
                />
              );
            })}
          </div>
        </div>

        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Tax years
          </span>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            A hidden year is left out of the year picker. Useful for years before you started
            tracking, which model a full year off a partial record.
          </p>
          <div className="mt-2 divide-y divide-slate-100">
            {years.map((year) => {
              const visible = !hiddenYears.includes(year);
              return (
                <Row
                  key={year}
                  label={String(year)}
                  meta={year === LATEST_TAX_YEAR ? 'Current' : undefined}
                  visible={visible}
                  disabledReason={
                    visible && visibleYearCount <= 1
                      ? 'The Income page needs at least one year to show.'
                      : undefined
                  }
                  onChange={(next) => onHiddenYearsChange(toggle(hiddenYears, year, !next))}
                />
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <SettingsSection
      id="income-visibility"
      icon={SECTION_ICONS.income}
      title="Income roles and years"
      description="Choose which roles and tax years the Income page offers. Hiding one only removes it from the pickers; no pay data is deleted."
    >
      {body()}
    </SettingsSection>
  );
};

export default IncomeVisibilitySection;

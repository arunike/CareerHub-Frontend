import type { DriftSummary, Reconciliation } from './tax/reconcile';
import type { NextYearBonusEstimate } from './bonusSchedule';
import { percent } from './format';
import { useMoney } from './amountPrivacy';
import FigureMath from './FigureMath';
import { nextYearBonusBreakdown, refundBreakdown, type MathBreakdown } from './mathBreakdown';

interface Props {
  reconciliation: Reconciliation;
  drift: DriftSummary;
  netPerPeriod: number;
  taxYear: number;
  // Null when there is nothing to project; see nextYearBonusEstimate.
  nextYearBonus: NextYearBonusEstimate | null;
  targetBonus: number;
}

type Cell = {
  label: string;
  value: string;
  tone: 'neutral' | 'good' | 'bad';
  detail: string;
  hint?: string;
  breakdown?: MathBreakdown;
};

const Stat = ({
  label,
  value,
  tone,
  detail,
  hint,
  breakdown,
  className = '',
}: Cell & { className?: string }) => {
  const valueTone =
    tone === 'good'
      ? 'text-emerald-600 dark:text-emerald-300'
      : tone === 'bad'
        ? 'text-rose-600 dark:text-rose-300'
        : 'text-slate-900 dark:text-ink-50';

  return (
    <div className={`bg-white dark:bg-ink-900 px-6 py-5 ${className}`}>
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-ink-500">
          {label}
        </span>
        <FigureMath label={label} hint={hint} breakdown={breakdown} />
      </div>
      <div
        className={`mt-2.5 text-2xl font-semibold leading-none tracking-tight tabular-nums ${valueTone}`}
      >
        {value}
      </div>
      <div className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-ink-400">{detail}</div>
    </div>
  );
};

export const ReconciliationCards = ({
  reconciliation,
  drift,
  netPerPeriod,
  taxYear,
  nextYearBonus,
  targetBonus,
}: Props) => {
  const { money, signedMoney } = useMoney();
  const owes = reconciliation.difference < 0;
  // A finished year's next-year bonus is already history: it was paid, or it was not.
  const showNextYearBonus = nextYearBonus !== null && taxYear >= new Date().getFullYear();

  const cells: Cell[] = [
    {
      label: 'Per paycheck',
      value: money(netPerPeriod),
      tone: 'neutral',
      detail: 'Take-home on the selected paycheck',
    },
    {
      label: owes ? 'Balance due' : 'Estimated refund',
      value: money(Math.abs(reconciliation.difference)),
      tone: owes ? 'bad' : 'good',
      detail: `${money(reconciliation.incomeTaxWithheld)} withheld vs ${money(reconciliation.incomeTaxLiability)} owed`,
      breakdown: refundBreakdown(reconciliation),
    },
    {
      label: 'Bonus and vest share',
      value: percent(reconciliation.supplementalShare, 0),
      tone: reconciliation.supplementalUnderWithheld ? 'bad' : 'neutral',
      detail: reconciliation.supplementalUnderWithheld
        ? 'Withheld at the flat rate, below your marginal rate'
        : 'Share of taxable income withheld at the flat rate',
      hint: 'Bonuses and vests are withheld at a flat 22%. Above that rate, the shortfall lands in April.',
    },
    {
      label: 'Model vs actual',
      value: drift.comparedCount > 0 ? signedMoney(drift.meanNetVariance) : '—',
      tone: drift.comparedCount === 0 ? 'neutral' : drift.meanNetVariance < 0 ? 'bad' : 'good',
      detail:
        drift.comparedCount > 0
          ? `Average across ${drift.comparedCount} recorded paycheck${drift.comparedCount === 1 ? '' : 's'}`
          : 'Enter a real paycheck under Whole year',
      hint: 'Consistent drift in one direction usually means an election or a W-4 field is wrong.',
    },
  ];

  if (showNextYearBonus && nextYearBonus) {
    cells.push({
      label: `Est. ${nextYearBonus.paidInYear} bonus`,
      value: money(nextYearBonus.amount),
      tone: 'neutral',
      detail:
        nextYearBonus.proration < 0.999
          ? `At target, for the ${percent(nextYearBonus.proration, 0)} of ${nextYearBonus.earnedInYear} this role covers`
          : `At target, for a full year of ${nextYearBonus.earnedInYear}`,
      breakdown: nextYearBonusBreakdown(nextYearBonus, targetBonus),
      hint: `Shown for information only: it is not income in ${nextYearBonus.earnedInYear}, so nothing here is taxed or counted. Hidden if the role ends before the year does, since an annual bonus usually needs you there on the payout date.`,
    });
  }

  // Five 210px cards need 1050px, so they wrap; `gap-px` draws hairlines `divide-x` cannot.
  const wideColumns = cells.length === 5 ? 'xl:grid-cols-5' : 'xl:grid-cols-4';
  const oddLast = cells.length % 2 === 1 ? 'sm:col-span-2 xl:col-span-1' : '';

  return (
    <div className="enterprise-card overflow-hidden !p-0">
      <div
        className={`grid grid-cols-1 gap-px bg-slate-100 dark:bg-ink-800 sm:grid-cols-2 ${wideColumns}`}
      >
        {cells.map((cell, index) => (
          <Stat key={cell.label} {...cell} className={index === cells.length - 1 ? oddLast : ''} />
        ))}
      </div>
    </div>
  );
};

export default ReconciliationCards;

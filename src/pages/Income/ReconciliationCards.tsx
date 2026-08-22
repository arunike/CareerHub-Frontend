import { Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import type { DriftSummary, Reconciliation } from './tax/reconcile';
import { percent } from './format';
import { useMoney } from './amountPrivacy';

interface Props {
  reconciliation: Reconciliation;
  drift: DriftSummary;
  netPerPeriod: number;
}

const Stat = ({
  label,
  value,
  tone,
  detail,
  hint,
}: {
  label: string;
  value: string;
  tone: 'neutral' | 'good' | 'bad';
  detail: string;
  hint?: string;
}) => {
  const valueTone =
    tone === 'good' ? 'text-emerald-600' : tone === 'bad' ? 'text-rose-600' : 'text-slate-900';

  return (
    <div className="flex-1 px-6 py-5 first:pl-6 sm:min-w-[210px]">
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </span>
        {hint ? (
          <Tooltip title={hint}>
            <InfoCircleOutlined className="text-slate-300" />
          </Tooltip>
        ) : null}
      </div>
      <div
        className={`mt-2.5 text-2xl font-semibold leading-none tracking-tight tabular-nums ${valueTone}`}
      >
        {value}
      </div>
      <div className="mt-2 text-xs leading-relaxed text-slate-500">{detail}</div>
    </div>
  );
};

export const ReconciliationCards = ({ reconciliation, drift, netPerPeriod }: Props) => {
  const { money, signedMoney } = useMoney();
  const owes = reconciliation.difference < 0;

  return (
    <div className="enterprise-card flex flex-col divide-y divide-slate-100 sm:flex-row sm:divide-x sm:divide-y-0">
      <Stat
        label="Per paycheck"
        value={money(netPerPeriod)}
        tone="neutral"
        detail="Take-home on the selected paycheck"
      />
      <Stat
        label={owes ? 'Balance due' : 'Estimated refund'}
        value={money(Math.abs(reconciliation.difference))}
        tone={owes ? 'bad' : 'good'}
        detail={`${money(reconciliation.incomeTaxWithheld)} withheld vs ${money(reconciliation.incomeTaxLiability)} owed`}
        hint="Income tax only. FICA is exact by construction, so it cannot be over- or under-withheld."
      />
      <Stat
        label="Bonus and vest share"
        value={percent(reconciliation.supplementalShare, 0)}
        tone={reconciliation.supplementalUnderWithheld ? 'bad' : 'neutral'}
        detail={
          reconciliation.supplementalUnderWithheld
            ? 'Withheld at the flat rate, below your marginal rate'
            : 'Share of taxable income withheld at the flat rate'
        }
        hint="Bonuses and vests are withheld at a flat 22%. Above that rate, the shortfall lands in April."
      />
      <Stat
        label="Model vs actual"
        value={drift.comparedCount > 0 ? signedMoney(drift.meanNetVariance) : '—'}
        tone={drift.comparedCount === 0 ? 'neutral' : drift.meanNetVariance < 0 ? 'bad' : 'good'}
        detail={
          drift.comparedCount > 0
            ? `Average across ${drift.comparedCount} recorded paycheck${drift.comparedCount === 1 ? '' : 's'}`
            : 'Enter a real paycheck under Whole year'
        }
        hint="Consistent drift in one direction usually means an election or a W-4 field is wrong."
      />
    </div>
  );
};

export default ReconciliationCards;

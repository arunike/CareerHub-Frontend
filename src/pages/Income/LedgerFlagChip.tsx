import { Tooltip } from 'antd';
import type { LedgerFlag } from './ledgerRowView';

const TONE_CLASS: Record<LedgerFlag['tone'], string> = {
  quiet: 'bg-slate-100 text-slate-500',
  warn: 'bg-amber-50 text-amber-700',
};

export const LedgerFlagChip = ({ flag }: { flag: LedgerFlag }) => (
  <Tooltip title={flag.title}>
    <span
      className={`inline-flex shrink-0 items-center rounded px-1.5 py-px text-[10px] font-semibold uppercase tracking-[0.06em] ${TONE_CLASS[flag.tone]}`}
    >
      {flag.label}
    </span>
  </Tooltip>
);

export default LedgerFlagChip;

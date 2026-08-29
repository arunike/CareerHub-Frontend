import { Button, DatePicker, Input } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { EffectiveRow, PeriodActual } from './effectiveRows';
import LedgerFlagChip from './LedgerFlagChip';
import { useMoney } from './amountPrivacy';
import { ledgerRowView } from './ledgerRowView';

interface Props {
  row: EffectiveRow;
  onActualChange: (
    periodIndex: number,
    changes: Partial<Omit<PeriodActual, 'periodIndex'>>
  ) => void;
  onOpenPaycheck: (periodIndex: number) => void;
}

const FIELD_LABEL = 'text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400';

const Figure = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-baseline justify-between gap-3">
    <span className="text-xs text-slate-500">{label}</span>
    <span className="whitespace-nowrap text-sm tabular-nums text-slate-700">{value}</span>
  </div>
);

export const PaycheckDetailPanel = ({ row, onActualChange, onOpenPaycheck }: Props) => {
  const format = useMoney();
  const view = ledgerRowView(row, format);

  return (
    <div className="ledger-edit-row flex flex-col gap-4 px-1 py-1">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <Figure label="Gross" value={view.gross} />
        <Figure label="Pre-tax" value={view.preTax} />
        <Figure label="Tax" value={view.tax} />
        <Figure label="Tax rate" value={view.taxRate} />
        <Figure label="Match" value={view.match ?? '—'} />
      </div>

      {view.preTaxFlags.length > 0 || view.autoNotes.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {view.preTaxFlags.map((entry) => (
            <LedgerFlagChip key={entry.key} flag={entry} />
          ))}
          {view.autoNotes.map((note) => (
            <span
              key={note}
              className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600"
            >
              {note}
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className={FIELD_LABEL}>Pay date</span>
          <DatePicker
            allowClear={false}
            format="MMM D, YYYY"
            className="w-full"
            value={row.payDate ? dayjs(row.payDate) : null}
            onChange={(next) =>
              onActualChange(row.periodIndex, {
                payDate: next ? next.format('YYYY-MM-DD') : null,
              })
            }
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={FIELD_LABEL}>Note</span>
          <Input
            variant="filled"
            placeholder="Add a note"
            value={row.note}
            onChange={(event) => onActualChange(row.periodIndex, { note: event.target.value })}
          />
        </label>
      </div>

      <Button
        block
        icon={<ArrowRightOutlined />}
        iconPosition="end"
        onClick={() => onOpenPaycheck(row.periodIndex)}
      >
        Open this paycheck
      </Button>
    </div>
  );
};

export default PaycheckDetailPanel;

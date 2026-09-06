import { Tag } from 'antd';
import Modal from '../../components/MobileModal';
import { formatPayDateShort } from './paySchedule';
import type { EffectiveRow } from './effectiveRows';

export interface OverrideConflict {
  key: string;
  label: string;
  periodIndexes: number[];
}

interface Props {
  conflict: OverrideConflict | null;
  rows: EffectiveRow[];
  onKeep: () => void;
  onReplace: () => void;
}

export const OverrideConflictModal = ({ conflict, rows, onKeep, onReplace }: Props) => {
  const count = conflict?.periodIndexes.length ?? 0;
  const dates = (conflict?.periodIndexes ?? []).map((periodIndex) => {
    const row = rows.find((candidate) => candidate.periodIndex === periodIndex);
    return {
      periodIndex,
      label: row?.payDate ? formatPayDateShort(row.payDate) : `#${periodIndex}`,
    };
  });

  return (
    <Modal
      open={conflict !== null}
      onCancel={onKeep}
      title={`${count} paycheck${count === 1 ? '' : 's'} already override this`}
      okText={`Replace on ${count === 1 ? 'it' : `all ${count}`}`}
      cancelText="Keep their values"
      onOk={onReplace}
    >
      <p className="text-sm leading-relaxed text-slate-600 dark:text-ink-200">
        These paychecks pin their own{' '}
        <span className="font-medium text-slate-900 dark:text-ink-50">{conflict?.label}</span>, so
        your new standing amount will not reach them.
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {dates.map((date) => (
          <Tag key={date.periodIndex} color="purple" className="!mr-0">
            {date.label}
          </Tag>
        ))}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-slate-500 dark:text-ink-400">
        Replacing drops the per-paycheck value for this one field only, so any other adjustments on
        those paychecks stay as they are.
      </p>
    </Modal>
  );
};

export default OverrideConflictModal;

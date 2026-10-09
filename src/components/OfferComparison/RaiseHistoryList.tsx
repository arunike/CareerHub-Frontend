import { Button, Popconfirm, Tag, Tooltip } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';

import RaiseBreakdown from './RaiseBreakdown';
import { reasonColor, reasonLabel } from './raiseHistoryFields';
import type { RaiseEntry } from '../../types';

const ENTRY_TAG = '!mr-0 !px-1.5 !text-[11px] !leading-[18px]';

type Props = {
  entries: RaiseEntry[];
  // Kept mounted but hidden while the form is open, so a cancel restores the list unchanged.
  hidden: boolean;
  onEdit: (entry: RaiseEntry) => void;
  onDelete: (id: string) => void;
};

const RaiseHistoryList = ({ entries, hidden, onEdit, onDelete }: Props) => (
  <div className={`space-y-4 ${hidden ? 'hidden' : ''}`}>
    {entries.map((entry) => {
      const reason = reasonLabel(entry);
      const tcBefore = entry.base_before + entry.bonus_before + entry.equity_before;
      const tcAfter = entry.base_after + entry.bonus_after + entry.equity_after;

      const rows: { label: string; before: number; after: number; extra?: string }[] = [
        { label: 'Base', before: entry.base_before, after: entry.base_after },
        {
          label: 'Annual Bonus',
          before: entry.bonus_before,
          after: entry.bonus_after,
          extra:
            entry.base_after > 0
              ? `${((entry.bonus_after / entry.base_after) * 100).toFixed(1)}% of base`
              : undefined,
        },
        { label: 'Annual RSU', before: entry.equity_before, after: entry.equity_after },
      ];

      return (
        <div
          key={entry.id}
          className="border border-gray-200 dark:border-white/[0.08] rounded-xl overflow-hidden"
        >
          {/* Entry header */}
          <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-white/[0.07] bg-gray-50 dark:bg-ink-900 px-3 py-2 sm:px-4">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <span className="whitespace-nowrap text-xs text-gray-500 dark:text-ink-400">
                {entry.date}
              </span>
              <span className="truncate text-sm font-semibold text-gray-800 dark:text-ink-50">
                {entry.label || reason}
              </span>
              {entry.label && (
                <Tag color={reasonColor(entry.type)} className={ENTRY_TAG}>
                  {reason}
                </Tag>
              )}
              {entry.effective_date && entry.effective_date < entry.date && (
                <Tooltip
                  title={`Took effect ${entry.effective_date}; the difference is owed as back pay`}
                >
                  <Tag color="volcano" className={ENTRY_TAG}>
                    Backdated
                  </Tag>
                </Tooltip>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Tooltip title="Edit">
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => onEdit(entry)}
                />
              </Tooltip>
              <Popconfirm
                title="Delete this raise entry?"
                okText="Delete"
                okType="danger"
                onConfirm={() => onDelete(entry.id)}
              >
                <Tooltip title="Delete">
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                </Tooltip>
              </Popconfirm>
            </div>
          </div>

          <RaiseBreakdown rows={rows} tcBefore={tcBefore} tcAfter={tcAfter} />

          {entry.notes && (
            <div className="border-t border-gray-100 dark:border-white/[0.07] bg-gray-50 dark:bg-ink-900 px-3 py-2 text-xs italic text-gray-500 dark:text-ink-400 sm:px-4">
              {entry.notes}
            </div>
          )}
        </div>
      );
    })}
  </div>
);

export default RaiseHistoryList;

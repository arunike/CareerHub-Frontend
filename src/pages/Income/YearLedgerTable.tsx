import { useState } from 'react';
import { DatePicker, Grid, Input, Table, Tooltip } from 'antd';
import { RightOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import type { EffectiveRow, PeriodActual } from './effectiveRows';
import LedgerCell, { RECORDED_CLASS } from './LedgerCell';
import LedgerFlagChip from './LedgerFlagChip';
import PaycheckDetailPanel from './PaycheckDetailPanel';
import { useMoney } from './amountPrivacy';
import { ledgerRowView, type LedgerRowView } from './ledgerRowView';

interface Props {
  rows: EffectiveRow[];
  selectedKeys: number[];
  onSelectionChange: (keys: number[]) => void;
  actuals: PeriodActual[];
  selectedPeriod: number;
  onSelectPeriod: (periodIndex: number) => void;
  onActualChange: (
    periodIndex: number,
    changes: Partial<Omit<PeriodActual, 'periodIndex'>>
  ) => void;
}

const Figure = ({
  value,
  recorded = false,
  className = 'text-slate-700',
}: {
  value: string;
  recorded?: boolean;
  className?: string;
}) => (
  <span
    className={`whitespace-nowrap tabular-nums ${recorded ? RECORDED_CLASS : className}`}
    title={recorded ? 'Recorded from your payslip' : undefined}
  >
    {value}
  </span>
);

const stopRowClick = (event: React.MouseEvent) => event.stopPropagation();

export const YearLedgerTable = ({
  rows,
  selectedKeys,
  onSelectionChange,
  actuals,
  selectedPeriod,
  onSelectPeriod,
  onActualChange,
}: Props) => {
  const format = useMoney();
  const screens = Grid.useBreakpoint();
  const [expandedKeys, setExpandedKeys] = useState<number[]>([]);
  // The whole cell is the hit target, so which cell is open lives here rather than inside it.
  const [editing, setEditing] = useState<{ periodIndex: number; field: 'gross' | 'net' } | null>(
    null
  );
  const actualByPeriod = new Map(actuals.map((actual) => [actual.periodIndex, actual.net ?? null]));
  const grossByPeriod = new Map(
    actuals.map((actual) => [actual.periodIndex, actual.gross ?? null])
  );

  // Below md the date picker, the actual and the note have no column, so the row opens instead.
  const compact = !screens.md;

  const views = new Map(rows.map((row) => [row.periodIndex, ledgerRowView(row, format)]));
  const viewOf = (row: EffectiveRow): LedgerRowView =>
    views.get(row.periodIndex) ?? ledgerRowView(row, format);

  const isEditing = (row: EffectiveRow, field: 'gross' | 'net') =>
    editing?.periodIndex === row.periodIndex && editing.field === field;

  const editableCell = (field: 'gross' | 'net') => (row: EffectiveRow) => ({
    className: 'ledger-editable-cell',
    onClick: (event: React.MouseEvent) => {
      event.stopPropagation();
      setEditing({ periodIndex: row.periodIndex, field });
    },
  });

  const closeEditor =
    (row: EffectiveRow, field: 'gross' | 'net') => (value: number | null | undefined) => {
      setEditing(null);
      if (value !== undefined) onActualChange(row.periodIndex, { [field]: value });
    };

  const columns: ColumnsType<EffectiveRow> = [
    {
      title: '#',
      dataIndex: 'periodIndex',
      width: 44,
      responsive: ['xxl'],
      render: (_: number, row) => (
        <span className="tabular-nums text-slate-300">{viewOf(row).ordinal}</span>
      ),
    },
    {
      title: (
        <Tooltip title="When the money lands. Adjust it when payday shifts, e.g. a federal holiday moving it earlier.">
          <span>{compact ? 'Date' : 'Pay date'}</span>
        </Tooltip>
      ),
      dataIndex: 'payDate',
      width: compact ? 74 : 134,
      render: (value: string | null, row) => {
        const { dateFlags, grossFlags } = viewOf(row);
        // Gross has no column on a phone, so its warning would vanish with it.
        const flags = compact ? [...dateFlags, ...grossFlags] : dateFlags;
        return (
          <div className="flex flex-col gap-1">
            {compact ? (
              <span className="whitespace-nowrap font-medium text-slate-700">
                {value ? dayjs(value).format('MMM D') : '—'}
              </span>
            ) : (
              <span onClick={stopRowClick}>
                <DatePicker
                  size="small"
                  variant="filled"
                  allowClear={false}
                  format="MMM D"
                  className="w-[104px]"
                  value={value ? dayjs(value) : null}
                  onChange={(next) =>
                    onActualChange(row.periodIndex, {
                      payDate: next ? next.format('YYYY-MM-DD') : null,
                    })
                  }
                />
              </span>
            )}
            {flags.length > 0 ? (
              <span className="flex flex-wrap gap-1">
                {flags.map((entry) => (
                  <LedgerFlagChip key={entry.key} flag={entry} />
                ))}
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      title: 'Gross',
      dataIndex: 'gross',
      align: 'right',
      width: compact ? 96 : 116,
      onCell: editableCell('gross'),
      render: (_: number, row) => {
        const { gross, grossFlags, grossRecorded, supplemental } = viewOf(row);
        return (
          <div className="flex flex-col items-stretch gap-0.5">
            {/* A chip beside the figure needs 24px the phone column does not have. */}
            <span
              className={
                compact
                  ? 'flex flex-col items-stretch gap-0.5'
                  : 'flex items-center justify-end gap-1.5'
              }
            >
              {compact
                ? null
                : grossFlags.map((entry) => <LedgerFlagChip key={entry.key} flag={entry} />)}
              <LedgerCell
                display={gross}
                recorded={grossRecorded ? (grossByPeriod.get(row.periodIndex) ?? null) : null}
                modelledPlaceholder={format.money(row.modelledGross)}
                className="text-slate-700"
                editorWidth={100}
                editing={isEditing(row, 'gross')}
                onDone={closeEditor(row, 'gross')}
              />
            </span>
            {supplemental ? (
              <Tooltip title={`Includes ${supplemental} of bonus or vest`}>
                {/* Shrinkable, so a longer figure cannot push the row past the card. */}
                <span className="min-w-0 truncate text-[11px] tabular-nums text-slate-400">
                  {supplemental}
                </span>
              </Tooltip>
            ) : null}
          </div>
        );
      },
    },
    {
      title: 'Pre-tax',
      align: 'right',
      width: 118,
      responsive: ['xl'],
      render: (_, row) => {
        const { preTax, preTaxFlags } = viewOf(row);
        return (
          <span className="inline-flex items-center justify-end gap-1.5">
            {preTaxFlags.map((entry) => (
              <LedgerFlagChip key={entry.key} flag={entry} />
            ))}
            <Figure value={preTax} className="text-slate-500" />
          </span>
        );
      },
    },
    {
      title: 'Tax',
      dataIndex: 'taxTotal',
      align: 'right',
      width: 106,
      responsive: ['sm'],
      render: (_: number, row) => <Figure value={viewOf(row).tax} className="text-slate-500" />,
    },
    {
      title: (
        <Tooltip title="Tax as a share of gross pay.">
          <span>Rate</span>
        </Tooltip>
      ),
      align: 'right',
      width: 62,
      responsive: ['xxl'],
      render: (_, row) => <Figure value={viewOf(row).taxRate} className="text-slate-400" />,
    },
    {
      title: (
        <Tooltip title="What landed. Click a figure to record what your payslip actually says; clear it to go back to the modelled number.">
          <span>Take-home</span>
        </Tooltip>
      ),
      dataIndex: 'net',
      align: 'right',
      width: compact ? 118 : 138,
      onCell: editableCell('net'),
      render: (_: number, row) => {
        const { takeHome, takeHomeRecorded } = viewOf(row);
        return (
          <LedgerCell
            display={takeHome}
            recorded={takeHomeRecorded ? (actualByPeriod.get(row.periodIndex) ?? null) : null}
            modelledPlaceholder={format.moneyCents(row.modelledNet)}
            editorWidth={compact ? 108 : 112}
            editing={isEditing(row, 'net')}
            onDone={closeEditor(row, 'net')}
          />
        );
      },
    },
    {
      title: (
        <Tooltip title="Employer 401(k) match. Paid on your behalf, so it is not part of take-home.">
          <span>Match</span>
        </Tooltip>
      ),
      dataIndex: 'employerMatch401k',
      align: 'right',
      width: 92,
      responsive: ['xl'],
      render: (_: number, row) => {
        const { match } = viewOf(row);
        return match ? (
          <Figure value={match} className="text-slate-500" />
        ) : (
          <span className="text-slate-200">·</span>
        );
      },
    },
    {
      title: (
        <Tooltip title="Automatic flags for why a paycheck differs, plus any note you add.">
          <span>Notes</span>
        </Tooltip>
      ),
      responsive: ['xl'],
      render: (_, row) => {
        const { autoNotes } = viewOf(row);
        return (
          <div className="flex min-w-0 flex-col gap-1">
            {autoNotes.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {autoNotes.map((note) => (
                  <span
                    key={note}
                    className="min-w-0 truncate rounded-md bg-slate-100 px-1.5 py-px text-[11px] text-slate-600"
                  >
                    {note}
                  </span>
                ))}
              </div>
            ) : null}
            <span onClick={stopRowClick}>
              <Input
                size="small"
                variant="filled"
                placeholder="Add a note"
                value={row.note}
                onChange={(event) => onActualChange(row.periodIndex, { note: event.target.value })}
              />
            </span>
          </div>
        );
      },
    },
  ];

  return (
    <Table<EffectiveRow>
      className="ledger-table"
      rowKey="periodIndex"
      size="small"
      columns={columns}
      dataSource={rows}
      pagination={false}
      // No inner scroll region; the sticky header keeps the columns readable as the page scrolls.
      sticky
      tableLayout="fixed"
      rowSelection={{
        selectedRowKeys: selectedKeys,
        onChange: (keys) => onSelectionChange(keys as number[]),
        columnWidth: compact ? 36 : 50,
      }}
      expandable={
        compact
          ? {
              expandedRowKeys: expandedKeys,
              onExpandedRowsChange: (keys) => setExpandedKeys(keys as number[]),
              expandRowByClick: true,
              columnWidth: 22,
              expandIcon: ({ expanded }) => (
                <span
                  className={`inline-flex text-[10px] text-slate-300 transition-transform ${expanded ? 'rotate-90' : ''}`}
                >
                  <RightOutlined />
                </span>
              ),
              expandedRowClassName: () => 'ledger-detail-row',
              expandedRowRender: (row) => (
                <PaycheckDetailPanel
                  row={row}
                  onActualChange={onActualChange}
                  onOpenPaycheck={onSelectPeriod}
                />
              ),
            }
          : undefined
      }
      onRow={(row) => ({
        // On a phone the tap opens the row's own panel; navigating away would unmount it.
        onClick: compact ? undefined : () => onSelectPeriod(row.periodIndex),
        className: [
          'ledger-row cursor-pointer',
          row.periodIndex === selectedPeriod && !compact ? 'ledger-row-selected' : '',
        ]
          .filter(Boolean)
          .join(' '),
      })}
    />
  );
};

export default YearLedgerTable;

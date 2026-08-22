import { DatePicker, Input, Table, Tag, Tooltip } from 'antd';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import type { EffectiveRow } from './effectiveRows';
import type { PeriodActual } from './effectiveRows';
import MoneyInput from './MoneyInput';
import { useMoney } from './amountPrivacy';
import { calculatedRate } from './taxRates';

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

export const YearLedgerTable = ({
  rows,
  selectedKeys,
  onSelectionChange,
  actuals,
  selectedPeriod,
  onSelectPeriod,
  onActualChange,
}: Props) => {
  const { money, moneyCents } = useMoney();
  const actualByPeriod = new Map(actuals.map((actual) => [actual.periodIndex, actual.net ?? null]));

  const columns: ColumnsType<EffectiveRow> = [
    {
      title: '#',
      dataIndex: 'periodIndex',
      width: 52,
      fixed: 'left',
      render: (value: number, row) => (
        <span className="tabular-nums text-slate-400">{row.isOffCycle ? '·' : value}</span>
      ),
    },
    {
      title: (
        <Tooltip title="When the money lands. Adjust it when payday shifts, e.g. a federal holiday moving it earlier.">
          <span>Pay date</span>
        </Tooltip>
      ),
      dataIndex: 'payDate',
      width: 168,
      fixed: 'left',
      render: (value: string | null, row) => (
        <span
          className="flex items-center gap-1.5 whitespace-nowrap"
          onClick={(event) => event.stopPropagation()}
        >
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
          {row.isOffCycle ? (
            <Tooltip title="Paid on its own date, separate from payroll">
              <Tag color="purple" className="!mr-0 !px-1 !text-[10px]">
                off
              </Tag>
            </Tooltip>
          ) : null}
          {row.isAdjustedDate ? (
            <Tooltip title="Pay date moved from the regular schedule">
              <Tag color="blue" className="!mr-0 !px-1 !text-[10px]">
                moved
              </Tag>
            </Tooltip>
          ) : null}
        </span>
      ),
    },
    {
      title: 'Gross',
      dataIndex: 'gross',
      align: 'right',
      render: (value: number, row) => (
        <span className="tabular-nums">
          {row.residual < -0.005 ? (
            <Tooltip title="The recorded take-home is more than this gross can pay. Record the gross too, or check the role's salary.">
              <Tag color="red" className="!mr-1 !px-1 !text-[10px]">
                low
              </Tag>
            </Tooltip>
          ) : null}
          {money(value)}
          {row.supplementalGross > 0 ? (
            <Tooltip title={`Includes ${money(row.supplementalGross)} of bonus or vest`}>
              <Tag color="purple" className="!ml-2 !mr-0">
                +{money(row.supplementalGross)}
              </Tag>
            </Tooltip>
          ) : null}
        </span>
      ),
    },
    {
      title: 'Pre-tax',
      align: 'right',
      render: (_, row) => (
        <span className="inline-flex items-baseline gap-1.5">
          <span className="tabular-nums text-sky-600">
            {money(row.section125 + row.hsa + row.pretax401k + row.pretaxIncomeOnly)}
          </span>
          {row.isAdjusted ? (
            <Tooltip title="This paycheck uses adjusted deduction amounts">
              <Tag color="purple" className="!mr-0 !px-1 !text-[10px]">
                adj
              </Tag>
            </Tooltip>
          ) : null}
        </span>
      ),
    },
    {
      title: 'Tax',
      dataIndex: 'taxTotal',
      align: 'right',
      render: (value: number) => <span className="tabular-nums text-rose-600">{money(value)}</span>,
    },
    {
      title: (
        <Tooltip title="Tax as a share of gross pay.">
          <span>Tax rate</span>
        </Tooltip>
      ),
      align: 'right',
      width: 88,
      render: (_, row) => (
        <span className="tabular-nums text-slate-700">
          {(calculatedRate(row) * 100).toFixed(1)}%
        </span>
      ),
    },
    {
      title: 'Take-home',
      dataIndex: 'net',
      align: 'right',
      render: (value: number) => (
        <span className="font-semibold tabular-nums text-slate-900">{moneyCents(value)}</span>
      ),
    },
    {
      title: (
        <Tooltip title="Employer 401(k) match. Paid on your behalf, so it is not part of take-home.">
          <span>Match</span>
        </Tooltip>
      ),
      dataIndex: 'employerMatch401k',
      align: 'right',
      width: 104,
      render: (value: number) =>
        value > 0 ? (
          <span className="tabular-nums text-violet-600">{money(value)}</span>
        ) : (
          <span className="text-slate-200">·</span>
        ),
    },
    {
      title: 'Actual',
      align: 'right',
      width: 176,
      render: (_, row) => (
        <span onClick={(event) => event.stopPropagation()}>
          <MoneyInput
            size="small"
            minChars={9}
            placeholder="Enter"
            value={actualByPeriod.get(row.periodIndex) ?? null}
            onChange={(value) => onActualChange(row.periodIndex, { net: value })}
          />
        </span>
      ),
    },
    {
      title: (
        <Tooltip title="Automatic flags for why a paycheck differs, plus any note you add.">
          <span>Notes</span>
        </Tooltip>
      ),
      width: 260,
      render: (_, row) => (
        <div className="flex flex-col gap-1">
          {row.notes.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {row.notes.map((note) => (
                <Tag
                  key={note}
                  className="!mr-0"
                  color={note.includes('reached') ? 'gold' : 'blue'}
                >
                  {note}
                </Tag>
              ))}
            </div>
          ) : null}
          <span onClick={(event) => event.stopPropagation()}>
            <Input
              size="small"
              variant="filled"
              placeholder="Add a note"
              value={row.note}
              onChange={(event) => onActualChange(row.periodIndex, { note: event.target.value })}
            />
          </span>
        </div>
      ),
    },
  ];

  return (
    <Table<EffectiveRow>
      rowKey="periodIndex"
      size="small"
      columns={columns}
      dataSource={rows}
      pagination={false}
      scroll={{ x: 1500, y: 460 }}
      rowSelection={{
        selectedRowKeys: selectedKeys,
        onChange: (keys) => onSelectionChange(keys as number[]),
        columnWidth: 44,
        fixed: true,
      }}
      onRow={(row) => ({
        onClick: () => onSelectPeriod(row.periodIndex),
        className:
          row.periodIndex === selectedPeriod ? 'cursor-pointer bg-blue-50/70' : 'cursor-pointer',
      })}
    />
  );
};

export default YearLedgerTable;

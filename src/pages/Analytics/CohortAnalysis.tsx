import { useMemo, useState } from 'react';
import { Table, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DownOutlined, RightOutlined } from '@ant-design/icons';
import type { CareerApplication } from '../../types/application';
import { parseDateOnlyLocal } from '../../utils/dateOnly';

type Dimension = 'month' | 'company' | 'location';

interface CohortRow {
  key: string;
  label: string;
  total: number;
  responded: number;
  offered: number;
  responseRate: number;
  offerRate: number;
  avgDays: number | null;
}

interface Props {
  applications: CareerApplication[];
}

const RESPONDED_STATUSES = new Set([
  'OA',
  'SCREEN',
  'ROUND_1',
  'ROUND_2',
  'ROUND_3',
  'ROUND_4',
  'ONSITE',
  'OFFER',
  'ACCEPTED',
]);

const OFFER_STATUSES = new Set(['OFFER', 'ACCEPTED']);

const DIMENSIONS: { key: Dimension; label: string }[] = [
  { key: 'month', label: 'Month Applied' },
  { key: 'company', label: 'Company' },
  { key: 'location', label: 'Location' },
];

const MIN_COHORT_SIZE = 3;

function cohortKey(app: CareerApplication, dim: Dimension): string {
  if (dim === 'month') {
    const d = app.date_applied || app.created_at;
    return d ? d.slice(0, 7) : 'Unknown';
  }
  if (dim === 'company') {
    return app.company_details?.name || 'Unknown';
  }
  if (dim === 'location') {
    const loc = (app.office_location || app.location || '').trim();
    if (!loc) return 'Unknown';
    const parts = loc.split(',').map((s) => s.trim());
    return parts.length >= 2 ? `${parts[0]}, ${parts[1]}` : parts[0];
  }
  return 'Unknown';
}

function daysBetween(from: string | undefined, to: string): number | null {
  if (!from) return null;
  const a = parseDateOnlyLocal(from)?.getTime() ?? new Date(from).getTime();
  const b = new Date(to).getTime();
  const days = Math.round((b - a) / 86_400_000);
  return days >= 0 ? days : null;
}

function buildCohorts(apps: CareerApplication[], dim: Dimension): CohortRow[] {
  const groups = new Map<string, CareerApplication[]>();

  for (const app of apps) {
    const key = cohortKey(app, dim);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(app);
  }

  const rows: CohortRow[] = [];

  for (const [label, group] of groups) {
    const total = group.length;
    if (total < MIN_COHORT_SIZE) continue;

    const responded = group.filter((a) => RESPONDED_STATUSES.has(a.status)).length;
    const offered = group.filter((a) => OFFER_STATUSES.has(a.status)).length;

    const daysList = group
      .filter((a) => RESPONDED_STATUSES.has(a.status) && a.date_applied)
      .map((a) => daysBetween(a.date_applied, a.updated_at))
      .filter((d): d is number => d !== null && d <= 365);

    const avgDays =
      daysList.length > 0
        ? Math.round(daysList.reduce((s, d) => s + d, 0) / daysList.length)
        : null;

    rows.push({
      key: label,
      label,
      total,
      responded,
      offered,
      responseRate: Math.round((responded / total) * 100),
      offerRate: Math.round((offered / total) * 100),
      avgDays,
    });
  }

  if (dim === 'month') {
    rows.sort((a, b) => a.label.localeCompare(b.label));
  } else {
    rows.sort((a, b) => b.total - a.total);
  }

  return rows;
}

const RateBar = ({
  value,
  color,
  suffix = '%',
}: {
  value: number;
  color: string;
  suffix?: string;
}) => (
  <div className="flex items-center gap-2">
    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(value, 100)}%`, background: color }}
      />
    </div>
    <span className="min-w-[32px] text-right text-xs font-semibold text-slate-700">
      {value}
      {suffix}
    </span>
  </div>
);

const CohortAnalysis = ({ applications }: Props) => {
  const [dimension, setDimension] = useState<Dimension>('month');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const cohorts = useMemo(() => buildCohorts(applications, dimension), [applications, dimension]);

  const columns: ColumnsType<CohortRow> = [
    {
      title: DIMENSIONS.find((d) => d.key === dimension)?.label ?? 'Group',
      dataIndex: 'label',
      key: 'label',
      render: (label: string) => <span className="font-semibold text-slate-800">{label}</span>,
      sorter: (a, b) => a.label.localeCompare(b.label),
    },
    {
      title: 'Apps',
      dataIndex: 'total',
      key: 'total',
      align: 'right',
      width: 72,
      sorter: (a, b) => a.total - b.total,
      render: (v: number) => (
        <span className="font-mono text-xs font-semibold text-slate-500">{v}</span>
      ),
    },
    {
      title: 'Response Rate',
      dataIndex: 'responseRate',
      key: 'responseRate',
      width: 180,
      sorter: (a, b) => a.responseRate - b.responseRate,
      render: (v: number) => <RateBar value={v} color="#3b82f6" />,
    },
    {
      title: 'Offer Rate',
      dataIndex: 'offerRate',
      key: 'offerRate',
      width: 120,
      sorter: (a, b) => a.offerRate - b.offerRate,
      render: (v: number) =>
        v > 0 ? (
          <Tag
            className="!rounded-full !border-0 !px-2.5 !text-xs !font-semibold"
            style={{
              background: v >= 10 ? '#ecfdf5' : '#f0fdf4',
              color: v >= 10 ? '#047857' : '#16a34a',
            }}
          >
            {v}%
          </Tag>
        ) : (
          <span className="text-xs text-slate-300">—</span>
        ),
    },
    {
      title: (
        <Tooltip title="Average days from Date Applied to first progress update (for responded apps)">
          Avg Days to Response ⓘ
        </Tooltip>
      ),
      dataIndex: 'avgDays',
      key: 'avgDays',
      width: 160,
      align: 'right',
      sorter: (a, b) => (a.avgDays ?? 999) - (b.avgDays ?? 999),
      render: (v: number | null) =>
        v !== null ? (
          <span
            className="font-mono text-xs font-semibold"
            style={{ color: v <= 7 ? '#059669' : v <= 21 ? '#d97706' : '#ef4444' }}
          >
            {v}d
          </span>
        ) : (
          <span className="text-xs text-slate-300">—</span>
        ),
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <button
            type="button"
            onClick={() => setIsCollapsed((value) => !value)}
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-slate-500 transition-colors hover:border-sky-100 hover:bg-sky-50 hover:text-sky-600"
            aria-label={isCollapsed ? 'Expand cohort analysis' : 'Collapse cohort analysis'}
          >
            {isCollapsed ? (
              <RightOutlined className="text-xs" />
            ) : (
              <DownOutlined className="text-xs" />
            )}
          </button>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Cohort Analysis
            </p>
            <h3 className="mt-0.5 text-base font-bold text-slate-900">
              Where Are You Getting Results?
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              {isCollapsed
                ? `${cohorts.length} visible group${cohorts.length === 1 ? '' : 's'} hidden from view.`
                : `Groups with fewer than ${MIN_COHORT_SIZE} applications are hidden.`}
            </p>
          </div>
        </div>

        {/* Dimension pills */}
        <div className="flex shrink-0 items-center gap-1 rounded-xl border border-slate-100 bg-slate-50 p-1">
          {DIMENSIONS.map((d) => (
            <button
              key={d.key}
              onClick={() => setDimension(d.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                dimension === d.key
                  ? 'bg-white text-sky-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {isCollapsed ? (
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="flex w-full items-center justify-between rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-3 text-left transition-colors hover:border-sky-100 hover:bg-sky-50/60"
        >
          <span className="text-sm font-semibold text-slate-600">Cohort table collapsed</span>
          <span className="text-xs font-semibold text-sky-600">Show analysis</span>
        </button>
      ) : cohorts.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-slate-400">
          <p className="text-sm font-medium">Not enough data yet</p>
          <p className="mt-0.5 text-xs">
            Each group needs at least {MIN_COHORT_SIZE} applications to appear.
          </p>
        </div>
      ) : (
        <Table<CohortRow>
          dataSource={cohorts}
          columns={columns}
          pagination={false}
          size="small"
          rowClassName="hover:bg-slate-50/60 transition-colors"
          className="[&_.ant-table-thead_th]:!bg-slate-50 [&_.ant-table-thead_th]:!text-xs [&_.ant-table-thead_th]:!font-semibold [&_.ant-table-thead_th]:!text-slate-500"
        />
      )}
    </div>
  );
};

export default CohortAnalysis;

import {
  ApartmentOutlined,
  AimOutlined,
  BankOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  LineChartOutlined,
  NodeIndexOutlined,
  NumberOutlined,
  QuestionCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from 'recharts';
import CustomWidgetCard from '../CustomWidgetCard';
import type { CustomWidget } from '../../hooks/useCustomWidgets';
import type { ApplicationTimelineAnalytics } from '../../types';

export type JobHuntStats = {
  total: number;
  rejections: number;
  offers: number;
  ghosted: number;
  activeInterviews: number;
  totalInterviews: number;
  interviewRate: string;
  responseRate: string;
  respondedCount: number;
  offerRate: string;
  recentApplications30d: number;
  locations: { name: string; count: number }[];
  topCompanies: { name: string; count: number }[];
  workModes: { name: string; count: number; color: string }[];
  rounds: { name: string; count: number }[];
  funnel: { label: string; value: number; color: string }[];
  avgDaysToOffer: number | null;
  avgDaysToOfferSampleSize: number;
  timelineAnalytics?: ApplicationTimelineAnalytics | null;
  timelineAnalyticsLoading?: boolean;
};

export const renderJobHuntWidget = (
  id: string,
  stats: JobHuntStats,
  customWidgets: CustomWidget[],
  deleteCustomWidget: (id: string) => void
) => {
  switch (id) {
    case 'total':
      return (
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-full">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total Applications</p>
            <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-500">
            <FileTextOutlined className="mr-1.5 text-base" />
            <span>Tracked</span>
          </div>
        </div>
      );
    case 'active':
      return (
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-full">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Active Pipeline</p>
            <p className="text-3xl font-bold text-gray-900">{stats.activeInterviews}</p>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-500">
            <ClockCircleOutlined className="mr-1.5 text-blue-500 text-base" />
            <span>{stats.totalInterviews} reached interview stages</span>
          </div>
        </div>
      );
    case 'outcomes':
      return (
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-full">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Outcomes</p>
            <div className="flex gap-4">
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.offers}</p>
                <p className="text-xs text-gray-500">Offers</p>
              </div>
              <div className="w-px bg-gray-200 h-10"></div>
              <div>
                <p className="text-2xl font-bold text-red-500">{stats.rejections}</p>
                <p className="text-xs text-gray-500">Rejections</p>
              </div>
            </div>
          </div>
          <div className="mt-2 flex items-center text-sm text-gray-400">
            <CheckCircleOutlined className="mr-1.5 text-green-500 text-base" />
            <span>vs</span>
            <CloseCircleOutlined className="ml-1.5 text-red-500 text-base" />
          </div>
        </div>
      );
    case 'ghosted':
      return (
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-full">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">No Response</p>
            <p className="text-3xl font-bold text-gray-700">{stats.ghosted}</p>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-500">
            <QuestionCircleOutlined className="mr-1.5 text-gray-400 text-base" />
            <span>Ghosted</span>
          </div>
        </div>
      );
    case 'response_rate':
      return (
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-full">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Response Rate</p>
            <p className="text-3xl font-bold text-sky-600">{stats.responseRate}%</p>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-500">
            <LineChartOutlined className="mr-1.5 text-sky-500 text-base" />
            <span>{stats.respondedCount} responded</span>
          </div>
        </div>
      );
    case 'offer_rate':
      return (
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-full">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Offer Rate</p>
            <p className="text-3xl font-bold text-emerald-600">{stats.offerRate}%</p>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-500">
            <CheckCircleOutlined className="mr-1.5 text-emerald-500 text-base" />
            <span>{stats.offers} offer{stats.offers !== 1 ? 's' : ''}</span>
          </div>
        </div>
      );
    case 'recent_applications':
      return (
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-full">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Last 30 Days</p>
            <p className="text-3xl font-bold text-sky-600">{stats.recentApplications30d}</p>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-500">
            <ClockCircleOutlined className="mr-1.5 text-sky-500 text-base" />
            <span>Recent applications</span>
          </div>
        </div>
      );
    case 'locations':
      return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-full">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <EnvironmentOutlined className="text-xl text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Top Locations</h3>
            </div>
          </div>
          <div className="space-y-4">
            {stats.locations.slice(0, 8).map((loc, idx) => (
              <div key={loc.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                      idx === 0
                        ? 'bg-blue-100 text-blue-700'
                        : idx === 1
                          ? 'bg-blue-50 text-blue-600'
                          : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className="text-gray-700 font-medium">{loc.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${(loc.count / stats.total) * 100}%` }}
                    ></div>
                  </div>
                  <span className="font-mono text-gray-900 font-bold">{loc.count}</span>
                </div>
              </div>
            ))}
            {stats.locations.length === 0 && (
              <div className="text-center py-8 text-gray-400">No location data found</div>
            )}
          </div>
        </div>
      );
    case 'top_companies':
      return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-full">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <BankOutlined className="text-xl text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Top Companies</h3>
            </div>
          </div>
          <div className="space-y-4">
            {stats.topCompanies.slice(0, 8).map((company, idx) => (
              <div key={company.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium shrink-0 ${
                      idx === 0
                        ? 'bg-sky-100 text-sky-700'
                        : idx === 1
                          ? 'bg-sky-50 text-sky-600'
                          : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className="text-gray-700 font-medium truncate">{company.name}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-500 rounded-full"
                      style={{ width: `${stats.total > 0 ? (company.count / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="font-mono text-gray-900 font-bold">{company.count}</span>
                </div>
              </div>
            ))}
            {stats.topCompanies.length === 0 && (
              <div className="text-center py-8 text-gray-400">No company data found</div>
            )}
          </div>
        </div>
      );
    case 'work_modes':
      return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-full">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <ApartmentOutlined className="text-xl text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Work Modes</h3>
            </div>
          </div>
          <div className="space-y-4">
            {stats.workModes.map((mode) => (
              <div key={mode.name} className="flex items-center justify-between gap-4">
                <div className="min-w-[88px] text-sm font-medium text-gray-700">{mode.name}</div>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${mode.color}`}
                    style={{ width: `${stats.total > 0 ? (mode.count / stats.total) * 100 : 0}%` }}
                  />
                </div>
                <div className="w-10 text-right font-mono text-gray-900 font-bold">{mode.count}</div>
              </div>
            ))}
            {stats.workModes.every((mode) => mode.count === 0) && (
              <div className="text-center py-8 text-gray-400">No work-mode data found</div>
            )}
          </div>
        </div>
      );
    case 'rounds':
      return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-full">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <AimOutlined className="text-xl text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Interview Rounds</h3>
            </div>
          </div>
          <div className="h-75 w-full">
            {stats.rounds.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.rounds}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <Bar dataKey="count" name="Applications" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                    {stats.rounds.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={['#1890ff', '#3b82f6', '#ec4899', '#f43f5e'][index % 4]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <NumberOutlined className="text-3xl mb-2 opacity-50" />
                <p>No interview rounds logged yet</p>
                <p className="text-xs mt-1">Add "Current Round" to applications to see stats</p>
              </div>
            )}
          </div>
        </div>
      );
    case 'funnel': {
      const funnelMax = Math.max(...stats.funnel.map(s => s.value), 1);
      return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-full flex flex-col justify-between">
          <p className="text-sm font-medium text-gray-500 mb-4">Application Funnel</p>
          <div className="flex flex-col md:flex-row gap-4 items-stretch justify-between w-full overflow-x-auto pb-2 flex-grow">
            {stats.funnel.map((step, idx) => {
              const heightPercent = Math.max((step.value / funnelMax) * 100, 5); // min 5% height
              return (
                <div key={idx} className="flex-1 flex flex-col justify-end min-w-[60px]">
                  <div className="text-center mb-2">
                    <span className="font-bold text-gray-900 block">{step.value}</span>
                    <span className="text-[10px] text-gray-500 uppercase tracking-tighter truncate block" title={step.label}>{step.label}</span>
                  </div>
                  <div className={`w-full rounded-t-lg border-t-2 opacity-80 ${step.color}`} style={{ height: `${heightPercent}px`, minHeight: '4px' }} />
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    case 'timeline_analytics': {
      const analytics = stats.timelineAnalytics;
      const topStages = analytics?.stage_conversion.slice(0, 6) || [];
      const topSource = analytics?.offer_rate_by_source[0];
      const staleCount = analytics?.stale_in_stage.length || 0;

      return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-full">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <NodeIndexOutlined className="text-lg text-sky-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Timeline Analytics</h3>
                </div>
                <p className="mt-1 text-sm text-gray-500">Synced status history, stage movement, and sheet outcomes</p>
              </div>
              <div className="rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-right">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-500">Avg to Interview</p>
                <p className="text-2xl font-bold text-sky-700">
                  {stats.timelineAnalyticsLoading
                    ? '...'
                    : analytics?.average_time_to_interview_days != null
                      ? `${analytics.average_time_to_interview_days}d`
                      : '-'}
                </p>
                <p className="text-xs text-sky-500">
                  {analytics?.time_to_interview_sample_size || 0} sample{analytics?.time_to_interview_sample_size === 1 ? '' : 's'}
                </p>
              </div>
            </div>

            {!analytics && !stats.timelineAnalyticsLoading && (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                Timeline analytics will appear after applications have timeline or sync history.
              </div>
            )}

            {analytics && (
              <>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Stale In Stage</p>
                    <div className="mt-2 flex items-end gap-2">
                      <span className={`text-2xl font-bold ${staleCount > 0 ? 'text-amber-600' : 'text-gray-900'}`}>{staleCount}</span>
                      <span className="pb-1 text-xs text-gray-500">over {analytics.stale_threshold_days}d</span>
                    </div>
                  </div>
                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Best Sheet Source</p>
                    <p className="mt-2 truncate text-sm font-semibold text-gray-900" title={topSource?.name || 'No sheet source'}>
                      {topSource?.name || 'No sheet source'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {topSource ? `${Math.round(topSource.offer_rate * 100)}% offer rate` : 'Connect a sheet to compare'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Top Company Rate</p>
                    <p className="mt-2 truncate text-sm font-semibold text-gray-900" title={analytics.offer_rate_by_company[0]?.name || 'No company data'}>
                      {analytics.offer_rate_by_company[0]?.name || 'No company data'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {analytics.offer_rate_by_company[0]
                        ? `${Math.round(analytics.offer_rate_by_company[0].offer_rate * 100)}% offer rate`
                        : 'Needs applications'}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Stage Conversion</p>
                    <div className="space-y-3">
                      {topStages.map((stage) => (
                        <div key={stage.key} className="grid grid-cols-[92px_1fr_48px] items-center gap-3">
                          <span className="truncate text-sm font-medium text-gray-700" title={stage.label}>{stage.label}</span>
                          <div className="h-2 rounded-full bg-gray-100">
                            <div
                              className="h-full rounded-full bg-sky-500"
                              style={{ width: `${Math.max(stage.conversion_rate * 100, stage.reached_count > 0 ? 5 : 0)}%` }}
                            />
                          </div>
                          <span className="text-right text-xs font-semibold text-gray-600">{Math.round(stage.conversion_rate * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Watch List</p>
                    <div className="space-y-2">
                      {analytics.stale_in_stage.slice(0, 3).map((item) => (
                        <div key={item.application_id} className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
                          <div className="flex items-start gap-2">
                            <WarningOutlined className="mt-0.5 text-amber-600" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-gray-900" title={`${item.company} ${item.role_title}`}>
                                {item.company} · {item.role_title}
                              </p>
                              <p className="text-xs text-amber-700">
                                {item.days_in_stage}d in {item.status_label}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                      {analytics.stale_in_stage.length === 0 && (
                        <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-5 text-center text-sm text-gray-500">
                          No stale active stages
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      );
    }
    case 'avg_days_to_offer':
      return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-full">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Avg Days to Offer</p>
              <p className="text-4xl font-bold text-purple-600 leading-none">
                {stats.avgDaysToOffer !== null ? stats.avgDaysToOffer : '-'}
              </p>
            </div>
            <div className="shrink-0 rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
              {stats.avgDaysToOfferSampleSize} offer{stats.avgDaysToOfferSampleSize !== 1 ? 's' : ''}
            </div>
          </div>
          <div className="mt-5 flex items-center text-sm text-gray-500">
            <ClockCircleOutlined className="mr-1.5 text-base" />
            <span>
              {stats.avgDaysToOfferSampleSize > 0
                ? 'Average days from application date to offer creation'
                : 'Needs at least one application with both apply date and offer data'}
            </span>
          </div>
        </div>
      );
    default: {
      const customWidget = customWidgets.find((w) => w.id === id);
      if (customWidget) {
        return <CustomWidgetCard widget={customWidget} onDelete={deleteCustomWidget} />;
      }
      return null;
    }
  }
};

export const getJobHuntWidgetColSpan = (id: string, customWidgets: CustomWidget[]) => {
  const customWidget = customWidgets.find((w) => w.id === id);
  if (customWidget) {
    return customWidget.widgetType === 'chart'
      ? 'col-span-1 md:col-span-2 lg:col-span-2'
      : 'col-span-1';
  }

  if (['locations', 'rounds', 'funnel', 'top_companies', 'work_modes', 'avg_days_to_offer', 'timeline_analytics'].includes(id)) {
    return 'col-span-1 md:col-span-2 lg:col-span-2';
  }
  return 'col-span-1';
};

import {
  ApartmentOutlined,
  BankOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  LineChartOutlined,
  NodeIndexOutlined,
  QuestionCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
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
  timelineAnalytics?: ApplicationTimelineAnalytics | null;
  timelineAnalyticsLoading?: boolean;
};

const getStageGradient = (key: string) => {
  switch (key) {
    case 'APPLIED':
      return 'bg-gradient-to-r from-blue-400 to-blue-500';
    case 'OA':
      return 'bg-gradient-to-r from-indigo-400 to-indigo-500';
    case 'SCREEN':
      return 'bg-gradient-to-r from-sky-400 to-sky-500';
    case 'ROUND_1':
      return 'bg-gradient-to-r from-amber-400 to-amber-500';
    case 'ROUND_2':
      return 'bg-gradient-to-r from-amber-500 to-orange-400';
    case 'ROUND_3':
      return 'bg-gradient-to-r from-orange-400 to-orange-500';
    case 'ROUND_4':
      return 'bg-gradient-to-r from-orange-500 to-red-500';
    case 'ONSITE':
      return 'bg-gradient-to-r from-rose-500 to-red-500';
    case 'OFFER':
      return 'bg-gradient-to-r from-emerald-400 to-emerald-500';
    default:
      return 'bg-gradient-to-r from-slate-400 to-slate-500';
  }
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
        <div className="enterprise-card p-5 flex flex-col justify-between h-full">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total Applications</p>
            <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-400">
            <FileTextOutlined className="mr-1.5 text-base text-gray-400" />
            <span>Tracked</span>
          </div>
        </div>
      );
    case 'active':
      return (
        <div className="enterprise-card p-5 flex flex-col justify-between h-full">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Active Pipeline</p>
            <p className="text-3xl font-bold text-gray-900">{stats.activeInterviews}</p>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-400">
            <ClockCircleOutlined className="mr-1.5 text-blue-600 text-base" />
            <span>{stats.totalInterviews} reached interview stages</span>
          </div>
        </div>
      );
    case 'outcomes':
      return (
        <div className="enterprise-card p-5 flex flex-col justify-between h-full">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Outcomes</p>
            <div className="flex gap-4">
              <div>
                <p className="text-2xl font-bold text-emerald-600">{stats.offers}</p>
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
            <CheckCircleOutlined className="mr-1.5 text-emerald-500 text-base" />
            <span>vs</span>
            <CloseCircleOutlined className="ml-1.5 text-red-500 text-base" />
          </div>
        </div>
      );
    case 'ghosted':
      return (
        <div className="enterprise-card p-5 flex flex-col justify-between h-full">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">No Response</p>
            <p className="text-3xl font-bold text-gray-700">{stats.ghosted}</p>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-400">
            <QuestionCircleOutlined className="mr-1.5 text-gray-400 text-base" />
            <span>Ghosted</span>
          </div>
        </div>
      );
    case 'response_rate':
      return (
        <div className="enterprise-card p-5 flex flex-col justify-between h-full">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Response Rate</p>
            <p className="text-3xl font-bold text-blue-600">{stats.responseRate}%</p>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-400">
            <LineChartOutlined className="mr-1.5 text-blue-600 text-base" />
            <span>{stats.respondedCount} responded</span>
          </div>
        </div>
      );
    case 'offer_rate':
      return (
        <div className="enterprise-card p-5 flex flex-col justify-between h-full">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Offer Rate</p>
            <p className="text-3xl font-bold text-emerald-600">{stats.offerRate}%</p>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-400">
            <CheckCircleOutlined className="mr-1.5 text-emerald-500 text-base" />
            <span>
              {stats.offers} offer{stats.offers !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      );
    case 'recent_applications':
      return (
        <div className="enterprise-card p-5 flex flex-col justify-between h-full">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Last 30 Days</p>
            <p className="text-3xl font-bold text-blue-600">{stats.recentApplications30d}</p>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-400">
            <ClockCircleOutlined className="mr-1.5 text-blue-600 text-base" />
            <span>Recent applications</span>
          </div>
        </div>
      );
    case 'locations':
      return (
        <div className="enterprise-card p-6 h-full">
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
                      className="h-full bg-blue-600 rounded-full"
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
        <div className="enterprise-card p-6 h-full">
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
                        ? 'bg-blue-100 text-blue-700'
                        : idx === 1
                          ? 'bg-blue-50 text-blue-600'
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
                      className="h-full bg-blue-600 rounded-full"
                      style={{
                        width: `${stats.total > 0 ? (company.count / stats.total) * 100 : 0}%`,
                      }}
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
        <div className="enterprise-card p-6 h-full">
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
                <div className="w-10 text-right font-mono text-gray-900 font-bold">
                  {mode.count}
                </div>
              </div>
            ))}
            {stats.workModes.every((mode) => mode.count === 0) && (
              <div className="text-center py-8 text-gray-400">No work-mode data found</div>
            )}
          </div>
        </div>
      );
    case 'timeline_analytics': {
      const analytics = stats.timelineAnalytics;
      const topStages = analytics?.stage_conversion.slice(0, 6) || [];
      const topSource = analytics?.offer_rate_by_source[0];
      const staleCount = analytics?.stale_in_stage.length || 0;

      return (
        <div className="enterprise-card p-6 h-full">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <NodeIndexOutlined className="text-lg text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Timeline Analytics</h3>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Synced status history, stage movement, and sheet outcomes
                </p>
              </div>
              <div className="flex gap-2">
                <div className="rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2 text-right min-w-[100px]">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-600">
                    Avg to Interview
                  </p>
                  <p className="text-2xl font-bold text-blue-700">
                    {stats.timelineAnalyticsLoading
                      ? '...'
                      : analytics?.average_time_to_interview_days != null
                        ? `${analytics.average_time_to_interview_days}d`
                        : '-'}
                  </p>
                  <p className="text-xs text-blue-600">
                    {analytics?.time_to_interview_sample_size || 0} sample
                    {analytics?.time_to_interview_sample_size === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="rounded-lg border border-purple-100 bg-purple-50/50 px-3 py-2 text-right min-w-[100px]">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-purple-500">
                    Avg to Offer
                  </p>
                  <p className="text-2xl font-bold text-purple-700">
                    {stats.timelineAnalyticsLoading
                      ? '...'
                      : analytics?.average_days_to_offer != null
                        ? `${analytics.average_days_to_offer}d`
                        : '-'}
                  </p>
                  <p className="text-xs text-purple-500">
                    {analytics?.days_to_offer_sample_size || 0} offer
                    {analytics?.days_to_offer_sample_size === 1 ? '' : 's'}
                  </p>
                </div>
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
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Stale In Stage
                    </p>
                    <div className="mt-2 flex items-end gap-2">
                      <span
                        className={`text-2xl font-bold ${staleCount > 0 ? 'text-amber-600' : 'text-gray-900'}`}
                      >
                        {staleCount}
                      </span>
                      <span className="pb-1 text-xs text-gray-500">
                        over {analytics.stale_threshold_days}d
                      </span>
                    </div>
                  </div>
                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Best Sheet Source
                    </p>
                    <p
                      className="mt-2 truncate text-sm font-semibold text-gray-900"
                      title={topSource?.name || 'No sheet source'}
                    >
                      {topSource?.name || 'No sheet source'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {topSource
                        ? `${Math.round(topSource.offer_rate * 100)}% offer rate`
                        : 'Connect a sheet to compare'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Top Company Rate
                    </p>
                    <p
                      className="mt-2 truncate text-sm font-semibold text-gray-900"
                      title={analytics.offer_rate_by_company[0]?.name || 'No company data'}
                    >
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
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Stage Conversion
                    </p>
                    <div className="space-y-3">
                      {topStages.map((stage) => (
                        <div
                          key={stage.key}
                          className="grid grid-cols-[92px_1fr_48px] items-center gap-3 group/row relative py-1.5 hover:bg-slate-50/80 -mx-2 px-2 rounded-lg transition-all duration-150"
                        >
                          <span className="truncate text-sm font-medium text-gray-700">
                            {stage.label}
                          </span>
                          <div className="relative flex items-center h-4">
                            <div className="w-full h-2 rounded-full bg-gray-100">
                              <div
                                className={`h-full rounded-full ${getStageGradient(stage.key)} transition-all duration-300`}
                                style={{
                                  width: `${Math.max(stage.conversion_rate * 100, stage.reached_count > 0 ? 5 : 0)}%`,
                                }}
                              />
                            </div>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-900/95 backdrop-blur-sm border border-slate-800 text-white rounded-lg shadow-xl whitespace-nowrap pointer-events-none opacity-0 group-hover/row:opacity-100 transition-all duration-150 z-20 flex flex-col items-center scale-95 group-hover/row:scale-100 origin-bottom">
                              <span className="text-xs font-bold text-slate-100">
                                {stage.label}
                              </span>
                              <span className="text-[11px] text-slate-300 mt-0.5">
                                {stage.reached_count} application
                                {stage.reached_count !== 1 ? 's' : ''} (
                                {Math.round(stage.conversion_rate * 100)}%)
                              </span>
                              <div className="w-2 h-2 bg-slate-900 border-r border-b border-slate-800 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2 z-10" />
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <span className="text-right text-xs font-semibold text-gray-600 group-hover/row:text-sky-600 transition-colors duration-150">
                              {Math.round(stage.conversion_rate * 100)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Watch List
                    </p>
                    <div className="space-y-2">
                      {analytics.stale_in_stage.slice(0, 3).map((item) => (
                        <div
                          key={item.application_id}
                          className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2"
                        >
                          <div className="flex items-start gap-2">
                            <WarningOutlined className="mt-0.5 text-amber-600" />
                            <div className="min-w-0">
                              <p
                                className="truncate text-sm font-semibold text-gray-900"
                                title={`${item.company} ${item.role_title}`}
                              >
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

  if (['locations', 'top_companies', 'work_modes', 'timeline_analytics'].includes(id)) {
    return 'col-span-1 md:col-span-2 lg:col-span-2';
  }
  return 'col-span-1';
};

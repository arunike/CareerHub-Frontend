import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  NodeIndexOutlined,
  QuestionCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Tooltip } from 'antd';
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
  statusBreakdown: { name: string; count: number }[];
  applicationAgeBreakdown: { name: string; count: number }[];
  timelineAnalytics?: ApplicationTimelineAnalytics | null;
  timelineAnalyticsLoading?: boolean;
  timelineAnalyticsError?: boolean;
};

const getStageColor = (key: string) => {
  switch (key) {
    case 'APPLIED':
      return 'bg-blue-500';
    case 'OA':
      return 'bg-indigo-500';
    case 'SCREEN':
      return 'bg-sky-500';
    case 'ROUND_1':
      return 'bg-amber-500';
    case 'ROUND_2':
      return 'bg-orange-400';
    case 'ROUND_3':
      return 'bg-orange-500';
    case 'ROUND_4':
      return 'bg-red-500';
    case 'ONSITE':
      return 'bg-rose-500';
    case 'OFFER':
      return 'bg-emerald-500';
    default:
      return 'bg-slate-500';
  }
};

const percentageColor = (index: number) => {
  const colors = [
    'bg-blue-500',
    'bg-sky-500',
    'bg-amber-500',
    'bg-orange-500',
    'bg-rose-500',
    'bg-emerald-500',
  ];
  return colors[index % colors.length];
};

const TooltipLabel = ({
  children,
  title,
  className = '',
}: {
  children: React.ReactNode;
  title: string;
  className?: string;
}) => (
  <Tooltip title={title} placement="top" overlayClassName="analytics-help-tooltip">
    <span className={`inline-flex cursor-help items-center gap-1 ${className}`}>
      <span>{children}</span>
      <QuestionCircleOutlined className="text-[11px] opacity-60" />
    </span>
  </Tooltip>
);

const renderPercentageList = (
  items: { name: string; count: number }[],
  total: number,
  emptyText: string,
  maxItems = 6
) => (
  <div className="space-y-3">
    {items.slice(0, maxItems).map((item, index) => {
      const percent = total > 0 ? (item.count / total) * 100 : 0;
      const roundedPercent = Math.round(percent);
      return (
        <div
          key={item.name}
          className="group/metric relative grid grid-cols-[96px_1fr_44px] items-center gap-3 rounded-lg px-1 py-1.5 transition-colors hover:bg-slate-50"
        >
          <span className="truncate text-sm font-medium text-gray-700" title={item.name}>
            {item.name}
          </span>
          <div className="relative h-2 overflow-visible rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full ${percentageColor(index)} transition-all duration-300`}
              style={{ width: `${Math.max(percent, item.count > 0 ? 4 : 0)}%` }}
            />
            <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 scale-95 whitespace-nowrap rounded-lg border border-slate-800 bg-slate-900/95 px-3 py-1.5 text-center text-xs text-white opacity-0 shadow-xl transition-all duration-150 group-hover/metric:scale-100 group-hover/metric:opacity-100">
              <span className="block font-bold text-slate-100">{item.name}</span>
              <span className="mt-0.5 block text-[11px] text-slate-300">
                {item.count} application{item.count === 1 ? '' : 's'} ({roundedPercent}%)
              </span>
              <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-slate-800 bg-slate-900" />
            </div>
          </div>
          <span className="text-right text-xs font-semibold text-blue-600">{roundedPercent}%</span>
        </div>
      );
    })}
    {items.length === 0 && (
      <div className="py-6 text-center text-sm text-gray-400">{emptyText}</div>
    )}
  </div>
);

const MetricTile = ({
  label,
  value,
  detail,
  tooltip,
  tone = 'blue',
}: {
  label: string;
  value: string | number;
  detail: string;
  tooltip: string;
  tone?: 'blue' | 'purple' | 'emerald' | 'amber' | 'slate';
}) => {
  const tones = {
    blue: 'border-blue-100 bg-blue-50/60 text-blue-700',
    purple: 'border-purple-100 bg-purple-50/60 text-purple-700',
    emerald: 'border-emerald-100 bg-emerald-50/60 text-emerald-700',
    amber: 'border-amber-100 bg-amber-50/70 text-amber-700',
    slate: 'border-slate-100 bg-slate-50 text-slate-700',
  };

  return (
    <div className={`rounded-lg border px-3 py-3 ${tones[tone]}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
        <TooltipLabel title={tooltip}>{label}</TooltipLabel>
      </p>
      <p className="mt-1 text-2xl font-bold leading-none">{value}</p>
      <p className="mt-1.5 text-xs opacity-75">{detail}</p>
    </div>
  );
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
            <p className="text-sm font-medium text-gray-500 mb-1">
              <TooltipLabel title="All applications currently saved in your tracker.">
                Total Applications
              </TooltipLabel>
            </p>
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
            <p className="text-sm font-medium text-gray-500 mb-1">
              <TooltipLabel title="Applications that are not applied-only, rejected, ghosted, accepted, or removed from a synced sheet.">
                Active Pipeline
              </TooltipLabel>
            </p>
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
            <p className="text-sm font-medium text-gray-500 mb-1">
              <TooltipLabel title="Final results currently marked as offers or rejections.">
                Outcomes
              </TooltipLabel>
            </p>
            <div className="flex gap-4">
              <div>
                <p className="text-2xl font-bold text-emerald-600">{stats.offers}</p>
                <p className="text-xs text-gray-500">
                  <TooltipLabel title="Applications whose current status is Offer.">
                    Offers
                  </TooltipLabel>
                </p>
              </div>
              <div className="w-px bg-gray-200 h-10"></div>
              <div>
                <p className="text-2xl font-bold text-red-500">{stats.rejections}</p>
                <p className="text-xs text-gray-500">
                  <TooltipLabel title="Applications whose current status is Rejected.">
                    Rejections
                  </TooltipLabel>
                </p>
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
            <p className="text-sm font-medium text-gray-500 mb-1">
              <TooltipLabel title="Applications currently marked as Ghosted.">
                No Response
              </TooltipLabel>
            </p>
            <p className="text-3xl font-bold text-gray-700">{stats.ghosted}</p>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-400">
            <QuestionCircleOutlined className="mr-1.5 text-gray-400 text-base" />
            <span>Ghosted</span>
          </div>
        </div>
      );
    case 'pipeline_breakdown':
      return (
        <div className="enterprise-card p-6 h-full">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <NodeIndexOutlined className="text-lg text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  <TooltipLabel title="A percentage view of where applications are concentrated across stage, location, and age.">
                    Pipeline Breakdown
                  </TooltipLabel>
                </h3>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Current stage mix, location concentration, and application age
              </p>
            </div>
          </div>
          <div className="grid gap-6 xl:grid-cols-3">
            <section>
              <div className="mb-4 flex items-center gap-2">
                <NodeIndexOutlined className="text-gray-500" />
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <TooltipLabel title="Distribution of applications by their current status. Hover each bar for the exact count.">
                    Current Stage Mix
                  </TooltipLabel>
                </p>
              </div>
              {renderPercentageList(stats.statusBreakdown, stats.total, 'No status data')}
            </section>
            <section>
              <div className="mb-4 flex items-center gap-2">
                <EnvironmentOutlined className="text-gray-500" />
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <TooltipLabel title="Most common application locations, grouped by city or Remote. Hover each bar for the exact count.">
                    Top Locations
                  </TooltipLabel>
                </p>
              </div>
              {renderPercentageList(stats.locations, stats.total, 'No location data')}
            </section>
            <section>
              <div className="mb-4 flex items-center gap-2">
                <ClockCircleOutlined className="text-gray-500" />
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <TooltipLabel title="How long ago applications were submitted, using Date Applied when available and Created At as fallback.">
                    Application Age
                  </TooltipLabel>
                </p>
              </div>
              {renderPercentageList(
                stats.applicationAgeBreakdown,
                stats.total,
                'No application age data',
                5
              )}
            </section>
          </div>
        </div>
      );
    case 'timeline_analytics': {
      const analytics = stats.timelineAnalytics;
      const isLoading = Boolean(stats.timelineAnalyticsLoading);
      const hasError = Boolean(stats.timelineAnalyticsError);
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
                  <h3 className="text-lg font-semibold text-gray-900">
                    <TooltipLabel title="Timeline-based metrics from application status history, synced sheet provenance, and saved timeline entries.">
                      Timeline Analytics
                    </TooltipLabel>
                  </h3>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Synced status history, stage movement, and sheet outcomes
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <MetricTile
                label="Avg to Interview"
                tooltip="Average days from applying to the first interview-stage timeline entry. Applied, offer, rejected, and ghosted are not counted as interview stages."
                value={
                  isLoading
                    ? '...'
                    : analytics?.average_time_to_interview_days != null
                      ? `${analytics.average_time_to_interview_days}d`
                      : '-'
                }
                detail={
                  isLoading
                    ? 'Loading'
                    : `${analytics?.time_to_interview_sample_size || 0} sample${
                        analytics?.time_to_interview_sample_size === 1 ? '' : 's'
                      }`
                }
              />
              <MetricTile
                label="Avg to Offer"
                tooltip="Average days from Date Applied to the offer creation date for applications with offers."
                value={
                  isLoading
                    ? '...'
                    : analytics?.average_days_to_offer != null
                      ? `${analytics.average_days_to_offer}d`
                      : '-'
                }
                detail={
                  isLoading
                    ? 'Loading'
                    : `${analytics?.days_to_offer_sample_size || 0} offer${
                        analytics?.days_to_offer_sample_size === 1 ? '' : 's'
                      }`
                }
                tone="purple"
              />
              <MetricTile
                label="Response Rate"
                tooltip="Applications that moved beyond applied/ghosted/removed, divided by total applications."
                value={`${stats.responseRate}%`}
                detail={`${stats.respondedCount} responded`}
              />
              <MetricTile
                label="Offer Rate"
                tooltip="Applications currently marked as Offer, divided by total applications."
                value={`${stats.offerRate}%`}
                detail={`${stats.offers} offer${stats.offers === 1 ? '' : 's'}`}
                tone="emerald"
              />
              <MetricTile
                label="Last 30 Days"
                tooltip="Applications submitted in the last 30 days, using Date Applied when available and Created At as fallback."
                value={stats.recentApplications30d}
                detail="Recent applications"
                tone="slate"
              />
              <MetricTile
                label="Stale In Stage"
                tooltip="Active applications sitting in their current stage for at least your ghosting threshold."
                value={analytics ? staleCount : isLoading ? '...' : '-'}
                detail={analytics ? `Over ${analytics.stale_threshold_days}d` : 'Timeline signal'}
                tone={staleCount > 0 ? 'amber' : 'slate'}
              />
            </div>

            {isLoading && !analytics && (
              <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-6">
                <div className="flex items-center gap-3 text-sm font-medium text-blue-700">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-blue-500" />
                  Loading timeline analytics...
                </div>
                <div className="mt-4 space-y-2">
                  <div className="h-2.5 w-2/3 animate-pulse rounded-full bg-blue-100" />
                  <div className="h-2.5 w-1/2 animate-pulse rounded-full bg-blue-100" />
                </div>
              </div>
            )}

            {hasError && !isLoading && (
              <div className="rounded-lg border border-rose-100 bg-rose-50 px-4 py-6 text-center text-sm text-rose-600">
                Timeline analytics could not load. Try refreshing the dashboard.
              </div>
            )}

            {!analytics && !isLoading && !hasError && (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                Timeline analytics will appear after applications have timeline or sync history.
              </div>
            )}

            {analytics && (
              <>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <TooltipLabel title="The synced Google Sheet source with the highest offer rate among tracked applications.">
                        Best Sheet Source
                      </TooltipLabel>
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
                      <TooltipLabel title="The company with the highest offer rate among companies represented in your applications.">
                        Top Company Rate
                      </TooltipLabel>
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
                      <TooltipLabel title="Share of total applications that reached each stage. Hover a bar for the exact count.">
                        Stage Conversion
                      </TooltipLabel>
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
                                className={`h-full rounded-full ${getStageColor(stage.key)} transition-all duration-300`}
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
                      <TooltipLabel title="Active applications that have stayed in the same stage longer than your ghosting threshold.">
                        Watch List
                      </TooltipLabel>
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

  if (id === 'timeline_analytics' || id === 'pipeline_breakdown') {
    return 'col-span-1 md:col-span-2 lg:col-span-4';
  }
  return 'col-span-1';
};

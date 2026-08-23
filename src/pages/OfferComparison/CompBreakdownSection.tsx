import { lazy, Suspense } from 'react';
import type React from 'react';
import { BarChartOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { Segmented, Spin } from 'antd';
import type { ScenarioRow } from './offerAdjustmentsTypes';
import type { buildChartData } from './offerChartData';

const OfferComparisonChart = lazy(() => import('./OfferComparisonChart'));
const YearByYearSection = lazy(() => import('./YearByYearSection'));
const Year1BreakdownList = lazy(() => import('./Year1BreakdownList'));

const LazySectionFallback = () => (
  <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
    <Spin size="large" />
  </div>
);

type Props = {
  chartData: ReturnType<typeof buildChartData>;
  compBreakdownDisplay: 'list' | 'chart';
  compBreakdownView: 'year1' | 'fourYear';
  displayScenarioRows: ScenarioRow[];
  isChartExpanded: boolean;
  setCompBreakdownDisplay: React.Dispatch<React.SetStateAction<'list' | 'chart'>>;
  setCompBreakdownView: React.Dispatch<React.SetStateAction<'year1' | 'fourYear'>>;
  setIsChartExpanded: React.Dispatch<React.SetStateAction<boolean>>;
};

const CompBreakdownSection = ({
  chartData,
  compBreakdownDisplay,
  compBreakdownView,
  displayScenarioRows,
  isChartExpanded,
  setCompBreakdownDisplay,
  setCompBreakdownView,
  setIsChartExpanded,
}: Props) => (
  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_48px_-42px_rgba(15,23,42,0.5)]">
    <button
      type="button"
      onClick={() => setIsChartExpanded((current) => !current)}
      aria-expanded={isChartExpanded}
      className="flex min-h-16 w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 sm:px-6"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700">
          <BarChartOutlined />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-slate-950">Compensation breakdown</span>
          <span className="mt-0.5 block text-xs leading-5 text-slate-500">
            Year 1 by component, or the four-year outlook across the grant.
          </span>
        </span>
      </span>
      <span className="shrink-0 text-xs font-semibold text-blue-700">
        {isChartExpanded ? 'Hide chart' : 'View chart'}
      </span>
    </button>

    {isChartExpanded && (
      <div className="space-y-5 border-t border-slate-200 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmented
            value={compBreakdownView}
            onChange={(value) => setCompBreakdownView(value as 'year1' | 'fourYear')}
            options={[
              { label: 'Year 1', value: 'year1' },
              { label: '4-year outlook', value: 'fourYear' },
            ]}
          />
          <Segmented
            value={compBreakdownDisplay}
            onChange={(value) => setCompBreakdownDisplay(value as 'list' | 'chart')}
            options={[
              { label: 'List', value: 'list', icon: <UnorderedListOutlined /> },
              { label: 'Chart', value: 'chart', icon: <BarChartOutlined /> },
            ]}
          />
        </div>
        <Suspense fallback={<LazySectionFallback />}>
          {compBreakdownView === 'year1' ? (
            compBreakdownDisplay === 'chart' ? (
              <OfferComparisonChart data={chartData} />
            ) : (
              <Year1BreakdownList data={chartData} />
            )
          ) : (
            <YearByYearSection scenarioRows={displayScenarioRows} display={compBreakdownDisplay} />
          )}
        </Suspense>
      </div>
    )}
  </section>
);

export default CompBreakdownSection;

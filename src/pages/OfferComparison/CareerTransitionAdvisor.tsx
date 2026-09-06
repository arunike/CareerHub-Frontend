import { Select, Spin } from 'antd';
import { CompassOutlined, LoadingOutlined, RobotOutlined } from '@ant-design/icons';
import { parseInlineMarkdown } from '../../utils/simpleMarkdown';

type Props = {
  isAdvisorExpanded: boolean;
  setIsAdvisorExpanded: (value: boolean) => void;
  selectedPainPoints: string[];
  setSelectedPainPoints: React.Dispatch<React.SetStateAction<string[]>>;
  customPainPoints: string;
  setCustomPainPoints: (value: string) => void;
  promotionTimeline: string;
  setPromotionTimeline: (value: string) => void;
  includeJobHunting: boolean;
  setIncludeJobHunting: (value: boolean) => void;
  isAdvisorLoading: boolean;
  advisorResult: any | null;
  advisorError: string | null;
  handleGetTransitionAdvice: () => void;
  currentJobName: string | null;
};

const getVerdictStyles = (verdict: string) => {
  switch (verdict) {
    case 'hop':
      return {
        bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/25',
        text: 'text-emerald-800 dark:text-emerald-200',
        badge: 'bg-emerald-600 text-white',
        iconColor: 'text-emerald-500 dark:text-emerald-400',
        label: 'RECOMMENDED TO HOP',
      };
    case 'stay':
      return {
        bg: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/25',
        text: 'text-blue-800 dark:text-blue-200',
        badge: 'bg-blue-600 text-white',
        iconColor: 'text-blue-500 dark:text-blue-400',
        label: 'RECOMMENDED TO STAY',
      };
    case 'hunt':
      return {
        bg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/25',
        text: 'text-amber-800 dark:text-amber-200',
        badge: 'bg-amber-600 text-white',
        iconColor: 'text-amber-500 dark:text-amber-400',
        label: 'RECOMMENDED TO JOB HUNT',
      };
    default:
      return {
        bg: 'bg-slate-50 dark:bg-ink-900 border-slate-200 dark:border-white/[0.08]',
        text: 'text-slate-800 dark:text-ink-50',
        badge: 'bg-slate-600 dark:bg-ink-700 text-white',
        iconColor: 'text-slate-500 dark:text-ink-400',
        label: 'EVALUATION COMPLETE',
      };
  }
};

const CareerTransitionAdvisor = ({
  isAdvisorExpanded,
  setIsAdvisorExpanded,
  selectedPainPoints,
  setSelectedPainPoints,
  customPainPoints,
  setCustomPainPoints,
  promotionTimeline,
  setPromotionTimeline,
  includeJobHunting,
  setIncludeJobHunting,
  isAdvisorLoading,
  advisorResult,
  advisorError,
  handleGetTransitionAdvice,
  currentJobName,
}: Props) => (
  <section className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 shadow-[0_18px_48px_-42px_rgba(15,23,42,0.5)]">
    <button
      type="button"
      onClick={() => setIsAdvisorExpanded(!isAdvisorExpanded)}
      aria-expanded={isAdvisorExpanded}
      className="flex min-h-16 w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 sm:px-6"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-indigo-100 dark:border-indigo-500/20 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
          <CompassOutlined />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-950 dark:text-ink-50">
            Career Transition Advisor
          </h2>
          <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-ink-400">
            AI evaluation comparing your current role{' '}
            {currentJobName ? (
              <span className="font-semibold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded px-1.5 py-0.5 inline-block">
                {currentJobName}
              </span>
            ) : (
              <span className="font-semibold text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded px-1.5 py-0.5 inline-block">
                (None Selected)
              </span>
            )}{' '}
            vs. active offers and job market opportunities.
          </p>
        </div>
      </div>
      <span className="shrink-0 text-xs font-semibold text-blue-700 dark:text-blue-300">
        {isAdvisorExpanded ? 'Collapse' : 'Expand'}
      </span>
    </button>

    {isAdvisorExpanded && (
      <div className="px-6 pb-6 border-t border-slate-100 dark:border-white/[0.07] pt-6 space-y-6">
        {!currentJobName && (
          <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/25 text-amber-800 dark:text-amber-200 rounded-lg p-3.5 text-xs flex items-start gap-2.5 shadow-sm">
            <span className="text-base leading-none">⚠️</span>
            <div>
              <strong className="block text-amber-900 dark:text-amber-200 mb-0.5 font-bold">
                No Current Job Selected
              </strong>
              Please mark one of your offers/jobs as "Current" in the comparison scorecard/table
              above. The AI needs a current job to analyze your pain points and determine if you
              should stay or hop.
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-ink-400 mb-2">
                Current Job Pain Points & Satisfaction {currentJobName ? `(${currentJobName})` : ''}
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'stress', label: '🔥 High Stress / Burnout' },
                  { key: 'wlb', label: '⚖️ Bad Work-Life Balance' },
                  { key: 'growth', label: '📈 Lack of Career Growth' },
                  { key: 'tech', label: '💻 Outdated Tech Stack' },
                  { key: 'pay', label: '💵 Underpaid / Below Market' },
                  { key: 'culture', label: '👥 Toxic Culture / Bad Leadership' },
                  { key: 'commute', label: '🚗 Commute Exhaustion' },
                  { key: 'appreciation', label: '🎗️ Lack of Recognition' },
                ].map((item) => {
                  const isSelected = selectedPainPoints.includes(item.key);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        setSelectedPainPoints((prev) =>
                          isSelected ? prev.filter((p) => p !== item.key) : [...prev, item.key]
                        );
                      }}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/25 text-indigo-700 dark:text-indigo-300'
                          : 'bg-white dark:bg-ink-900 border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-ink-200 hover:border-slate-300'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3">
                <label className="block text-xs font-semibold text-slate-500 dark:text-ink-400 mb-1.5">
                  Or describe your own pain points / situation:
                </label>
                <textarea
                  value={customPainPoints}
                  onChange={(e) => setCustomPainPoints(e.target.value)}
                  rows={3}
                  placeholder="E.g., Micromanaging boss, commute is actually 1.5 hours each way on bad days, lack of remote work flexibility..."
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-white/[0.08] p-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-ink-400 mb-2">
                  Promotion Outlook
                </label>
                <Select
                  value={promotionTimeline}
                  onChange={setPromotionTimeline}
                  className="w-full"
                  options={[
                    { value: 'unknown', label: 'Unknown / Unsure' },
                    { value: 'within_6m', label: 'Within 6 months (Likely)' },
                    { value: 'within_1y', label: '6 - 12 months (Medium probability)' },
                    { value: 'slow', label: '1 - 2 years (Slow progression)' },
                    { value: 'unlikely', label: 'Unlikely / Dead-end role' },
                  ]}
                />
              </div>

              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-2 cursor-pointer py-2 text-xs font-medium text-slate-700 dark:text-ink-100 select-none">
                  <input
                    type="checkbox"
                    checked={includeJobHunting}
                    onChange={(e) => setIncludeJobHunting(e.target.checked)}
                    className="rounded border-slate-300 dark:border-white/[0.12] text-indigo-600 dark:text-indigo-300 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span>Evaluate active job hunting as an option</span>
                </label>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleGetTransitionAdvice}
                disabled={isAdvisorLoading || !currentJobName}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-500 sm:w-auto"
              >
                {isAdvisorLoading ? (
                  <>
                    <LoadingOutlined className="animate-spin" />
                    Analyzing Career Data...
                  </>
                ) : (
                  <>
                    <RobotOutlined />
                    Evaluate Career Transition
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-ink-900 border border-slate-200 dark:border-white/[0.08] rounded-xl p-5 flex flex-col justify-center text-center space-y-3 min-h-[220px]">
            {advisorError && (
              <div className="text-left bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/25 text-rose-800 dark:text-rose-200 rounded-lg p-3 text-xs">
                <strong>Error:</strong> {advisorError}
              </div>
            )}

            {!advisorResult && !isAdvisorLoading && !advisorError && (
              <div className="space-y-2">
                <CompassOutlined className="text-slate-300 dark:text-ink-600 text-3xl" />
                <p className="text-sm font-bold text-slate-800 dark:text-ink-50">
                  Ready for AI Evaluation
                </p>
                <p className="text-xs text-slate-500 dark:text-ink-400 max-w-sm mx-auto">
                  Select your current job sentiments and click evaluate. The AI will look at your
                  current compensation baseline and prospective offers to compute the optimal career
                  decision.
                </p>
              </div>
            )}

            {isAdvisorLoading && (
              <div className="space-y-3 py-6">
                <Spin size="large" />
                <p className="text-sm font-bold text-slate-700 dark:text-ink-100">
                  Synthesizing Offer Analytics...
                </p>
                <p className="text-xs text-slate-500 dark:text-ink-400 max-w-sm mx-auto">
                  Comparing total compensation, tax implications, RTO requirements, WLB metrics, and
                  skill growth.
                </p>
              </div>
            )}

            {advisorResult && !isAdvisorLoading && (
              <div className="text-left space-y-4 w-full">
                {/* Verdict Banner */}
                {(() => {
                  const styles = getVerdictStyles(advisorResult.verdict);
                  return (
                    <div
                      className={`border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${styles.bg}`}
                    >
                      <div>
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider ${styles.badge}`}
                        >
                          {styles.label}
                        </span>
                        <h4 className="mt-1.5 text-lg font-extrabold text-slate-900 dark:text-ink-50">
                          {advisorResult.verdict_label}
                        </h4>
                      </div>
                      <div className="text-left sm:text-right">
                        <span className="block text-[10px] font-bold text-slate-500 dark:text-ink-400 uppercase tracking-wider">
                          AI Confidence
                        </span>
                        <span className="text-base font-extrabold text-slate-900 dark:text-ink-50">
                          {advisorResult.confidence}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Comparative Sections */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-ink-900 border border-slate-100 dark:border-white/[0.07] rounded-xl p-4 shadow-sm space-y-2.5">
                    <h5 className="text-xs font-bold text-slate-800 dark:text-ink-50 uppercase tracking-wider border-b pb-1.5 flex items-center gap-1.5">
                      💰 Financial Evaluation
                    </h5>
                    <div className="text-xs text-slate-600 dark:text-ink-200 leading-relaxed whitespace-pre-wrap">
                      {parseInlineMarkdown(advisorResult.financial_analysis)}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-ink-900 border border-slate-100 dark:border-white/[0.07] rounded-xl p-4 shadow-sm space-y-2.5">
                    <h5 className="text-xs font-bold text-slate-800 dark:text-ink-50 uppercase tracking-wider border-b pb-1.5 flex items-center gap-1.5">
                      ⚖️ WLB & Career Growth
                    </h5>
                    <div className="text-xs text-slate-600 dark:text-ink-200 leading-relaxed whitespace-pre-wrap">
                      {parseInlineMarkdown(advisorResult.qualitative_analysis)}
                    </div>
                  </div>
                </div>

                {/* Reasoning Bullets */}
                <div className="bg-white dark:bg-ink-900 border border-slate-100 dark:border-white/[0.07] rounded-xl p-4 shadow-sm">
                  <h5 className="text-xs font-bold text-slate-800 dark:text-ink-50 uppercase tracking-wider mb-2 border-b pb-1.5">
                    Key Recommendations & Strategy
                  </h5>
                  <ul className="list-disc pl-4 space-y-1.5 text-xs text-slate-600 dark:text-ink-200">
                    {Array.isArray(advisorResult.reasoning_summary) &&
                      advisorResult.reasoning_summary.map((point: string, idx: number) => (
                        <li key={idx}>{parseInlineMarkdown(point)}</li>
                      ))}
                  </ul>
                </div>

                {/* Pros and Cons Column */}
                {advisorResult.pros_cons && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {advisorResult.pros_cons.current_job && (
                      <div className="bg-white dark:bg-ink-900 border border-slate-100 dark:border-white/[0.07] rounded-xl p-4 shadow-sm space-y-3">
                        <h5 className="text-xs font-bold text-slate-800 dark:text-ink-50 uppercase tracking-wider border-b pb-1.5">
                          {currentJobName || 'Current Job'} Pro/Con
                        </h5>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="font-bold text-emerald-700 dark:text-emerald-300 block mb-1">
                              Pros
                            </span>
                            <ul className="list-disc pl-3.5 space-y-1 text-[11px] text-slate-600 dark:text-ink-200">
                              {advisorResult.pros_cons.current_job.pros.map(
                                (p: string, i: number) => (
                                  <li key={i}>{parseInlineMarkdown(p)}</li>
                                )
                              )}
                            </ul>
                          </div>
                          <div>
                            <span className="font-bold text-rose-700 dark:text-rose-300 block mb-1">
                              Cons
                            </span>
                            <ul className="list-disc pl-3.5 space-y-1 text-[11px] text-slate-600 dark:text-ink-200">
                              {advisorResult.pros_cons.current_job.cons.map(
                                (p: string, i: number) => (
                                  <li key={i}>{parseInlineMarkdown(p)}</li>
                                )
                              )}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {advisorResult.pros_cons.recommendation && (
                      <div className="bg-white dark:bg-ink-900 border border-slate-100 dark:border-white/[0.07] rounded-xl p-4 shadow-sm space-y-3">
                        <h5 className="text-xs font-bold text-slate-800 dark:text-ink-50 uppercase tracking-wider border-b pb-1.5">
                          {advisorResult.pros_cons.recommendation.name} Pro/Con
                        </h5>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="font-bold text-emerald-700 dark:text-emerald-300 block mb-1">
                              Pros
                            </span>
                            <ul className="list-disc pl-3.5 space-y-1 text-[11px] text-slate-600 dark:text-ink-200">
                              {advisorResult.pros_cons.recommendation.pros.map(
                                (p: string, i: number) => (
                                  <li key={i}>{parseInlineMarkdown(p)}</li>
                                )
                              )}
                            </ul>
                          </div>
                          <div>
                            <span className="font-bold text-rose-700 dark:text-rose-300 block mb-1">
                              Cons
                            </span>
                            <ul className="list-disc pl-3.5 space-y-1 text-[11px] text-slate-600 dark:text-ink-200">
                              {advisorResult.pros_cons.recommendation.cons.map(
                                (p: string, i: number) => (
                                  <li key={i}>{parseInlineMarkdown(p)}</li>
                                )
                              )}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {advisorResult.next_steps_criteria && (
                  <div className="bg-gradient-to-r from-slate-50 dark:from-ink-900 to-indigo-50/30 border border-indigo-100 dark:border-indigo-500/20 rounded-xl p-4 shadow-sm">
                    <h5 className="text-xs font-bold text-indigo-800 dark:text-indigo-200 uppercase tracking-wider mb-2 border-b border-indigo-100/60 dark:border-indigo-500/25 pb-1.5 flex items-center gap-1.5">
                      🎯{' '}
                      {advisorResult.next_steps_criteria.title || 'Recommended Job Search Criteria'}
                    </h5>
                    <ul className="list-disc pl-4 space-y-1.5 text-xs text-slate-700 dark:text-ink-100 font-medium">
                      {Array.isArray(advisorResult.next_steps_criteria.items) &&
                        advisorResult.next_steps_criteria.items.map(
                          (point: string, idx: number) => (
                            <li key={idx} className="hover:text-indigo-900 transition-colors">
                              {parseInlineMarkdown(point)}
                            </li>
                          )
                        )}
                    </ul>
                  </div>
                )}

                {advisorResult.path_comparison && (
                  <div className="bg-white dark:bg-ink-900 border border-slate-100 dark:border-white/[0.07] rounded-xl p-4 shadow-sm space-y-3">
                    <h5 className="text-xs font-bold text-slate-800 dark:text-ink-50 uppercase tracking-wider border-b pb-1.5 flex items-center gap-1.5">
                      🛤️ Strategic Path Comparison
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-50/70 dark:bg-ink-900/70 border border-slate-100 dark:border-white/[0.07] rounded-xl p-4 space-y-2">
                        <h6 className="text-xs font-bold text-slate-700 dark:text-ink-100 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-ink-700"></span>
                          {advisorResult.path_comparison.scenario_a_label ||
                            'Current Path / Current Offer'}
                        </h6>
                        <div className="text-[11px] text-slate-600 dark:text-ink-200 leading-relaxed whitespace-pre-wrap">
                          {parseInlineMarkdown(advisorResult.path_comparison.scenario_a_outcome)}
                        </div>
                      </div>

                      <div className="bg-indigo-50/40 dark:bg-indigo-500/10 border border-indigo-100/50 dark:border-indigo-500/25 rounded-xl p-4 space-y-2">
                        <h6 className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                          {advisorResult.path_comparison.scenario_b_label || 'Alternative Path'}
                        </h6>
                        <div className="text-[11px] text-indigo-950/80 dark:text-indigo-300 leading-relaxed font-medium whitespace-pre-wrap">
                          {parseInlineMarkdown(advisorResult.path_comparison.scenario_b_outcome)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )}
  </section>
);

export default CareerTransitionAdvisor;

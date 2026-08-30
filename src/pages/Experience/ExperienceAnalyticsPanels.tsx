import type React from 'react';
import type { PayComponentDelta, PayGrowthSummary } from './payGrowth';

// Mirrors the page's useMemo results, so the panel is typed without exporting page internals.
type FullTimeCompSummary = {
  roleCount: number;
  trackedRoleCount: number;
  base: number;
  bonus: number;
  equity: number;
  total: number;
};
type InternshipCompSummary = {
  estimatedHours: number;
  regularPay: number;
  overtimePay: number;
  roleCount: number;
  trackedRoleCount: number;
  total: number;
  manualHoursRoleCount: number;
  customTotalRoleCount: number;
};
import { Tag, Row, Col } from 'antd';
import { BankOutlined, ClockCircleOutlined, CodeOutlined, DollarOutlined } from '@ant-design/icons';
import { PayGrowthArrow } from './PayGrowthModal';
import { formatDeltaAmount, formatDeltaPercent } from './payGrowth';

type Props = {
  calculateTotalCareerDuration: () => string;
  companiesByType: Record<string, number>;
  durationByType: Record<string, number>;
  fmtMonths: (totalDays: number, showDaysCount?: boolean) => string;
  fullTimeCompSummary: FullTimeCompSummary;
  getTypeDisplay: (value: string) => { label: string; dot: string; badge: string };
  internshipCompSummary: InternshipCompSummary;
  payGrowth: PayGrowthSummary;
  payGrowthHeadline: PayComponentDelta | null;
  selectedSkill: string | null;
  setOverallCompBreakdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setOverallInternshipBreakdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setPayGrowthOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedSkill: React.Dispatch<React.SetStateAction<string | null>>;
  skillCounts: Record<string, number>;
  topSkills: string[];
  totalCompanies: number;
};

const ExperienceAnalyticsPanels = ({
  calculateTotalCareerDuration,
  companiesByType,
  durationByType,
  fmtMonths,
  fullTimeCompSummary,
  getTypeDisplay,
  internshipCompSummary,
  payGrowth,
  payGrowthHeadline,
  selectedSkill,
  setOverallCompBreakdownOpen,
  setOverallInternshipBreakdownOpen,
  setPayGrowthOpen,
  setSelectedSkill,
  skillCounts,
  topSkills,
  totalCompanies,
}: Props) => (
  <div className="mb-7 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-xs">
    <Row gutter={[0, 20]} align="stretch">
      {/* 1. Total Experience */}
      <Col xs={24} md={12} xl={6}>
        <div className="flex h-full flex-col justify-between xl:border-r xl:border-slate-100 xl:pr-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-500">
                <ClockCircleOutlined className="text-sm" />
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Total Experience
              </div>
            </div>
            <div className="mt-3.5 min-w-0">
              <div className="text-[24px] font-bold leading-none tracking-tight text-slate-900">
                {calculateTotalCareerDuration()}
              </div>
              <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1">
                {Object.entries(durationByType)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, months]) => (
                    <span
                      key={type}
                      className="flex items-center gap-1.5 whitespace-nowrap text-[11px] text-slate-500"
                    >
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${getTypeDisplay(type).dot}`}
                      />
                      <span className="font-semibold text-slate-700">
                        {fmtMonths(months, true)}
                      </span>
                      <span>{getTypeDisplay(type).label}</span>
                    </span>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </Col>

      {/* 2. Companies */}
      <Col xs={24} md={12} xl={5}>
        <div className="flex h-full flex-col justify-between xl:border-r xl:border-slate-100 xl:px-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500">
                <BankOutlined className="text-sm" />
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Companies
              </div>
            </div>
            <div className="mt-3.5 min-w-0">
              <div className="text-[24px] font-bold leading-none tracking-tight text-slate-900">
                {totalCompanies}
              </div>
              <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1">
                {Object.entries(companiesByType)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => (
                    <span
                      key={type}
                      className="flex items-center gap-1.5 whitespace-nowrap text-[11px] text-slate-500"
                    >
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${getTypeDisplay(type).dot}`}
                      />
                      <span className="font-semibold text-slate-700">{count}</span>
                      <span>{getTypeDisplay(type).label}</span>
                    </span>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </Col>

      {/* 3. Earnings */}
      <Col xs={24} md={12} xl={7}>
        <div className="flex h-full flex-col justify-between xl:border-r xl:border-slate-100 xl:px-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
                <DollarOutlined className="text-sm" />
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Earnings
              </div>
            </div>
            <div className="mt-3.5 min-w-0">
              <div className="space-y-3">
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                          Full-Time
                        </span>
                        <span className="text-[16px] font-bold leading-none text-slate-900">
                          {fullTimeCompSummary.trackedRoleCount > 0
                            ? `$${fullTimeCompSummary.total.toLocaleString()}`
                            : 'No pay data'}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] leading-tight text-slate-500">
                        {fullTimeCompSummary.trackedRoleCount > 0 ? (
                          <>
                            {fullTimeCompSummary.trackedRoleCount} tracked
                            {fullTimeCompSummary.base > 0 &&
                              ` • Base $${fullTimeCompSummary.base.toLocaleString()}`}
                            {fullTimeCompSummary.roleCount > fullTimeCompSummary.trackedRoleCount &&
                              ` • ${fullTimeCompSummary.roleCount - fullTimeCompSummary.trackedRoleCount} missing`}
                          </>
                        ) : (
                          'Add pay to calculate earnings.'
                        )}
                      </div>
                    </div>
                    {fullTimeCompSummary.trackedRoleCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setOverallCompBreakdownOpen(true)}
                        title="View overall pay structure breakdown"
                        aria-label="View full-time earnings breakdown"
                        className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50/80 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                      >
                        Breakdown
                      </button>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-2.5 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                          Internship
                        </span>
                        <span className="text-[16px] font-bold leading-none text-slate-900">
                          {internshipCompSummary.trackedRoleCount > 0
                            ? `$${internshipCompSummary.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                            : 'No estimate yet'}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] leading-tight text-slate-500">
                        {internshipCompSummary.trackedRoleCount > 0 ? (
                          <>
                            {internshipCompSummary.trackedRoleCount} tracked
                            {internshipCompSummary.estimatedHours > 0 &&
                              ` • ${internshipCompSummary.estimatedHours.toLocaleString(undefined, { maximumFractionDigits: 2 })} hrs`}
                            {internshipCompSummary.roleCount >
                            internshipCompSummary.trackedRoleCount
                              ? ` • ${internshipCompSummary.roleCount - internshipCompSummary.trackedRoleCount} missing`
                              : internshipCompSummary.customTotalRoleCount > 0
                                ? ` • ${internshipCompSummary.customTotalRoleCount} custom total`
                                : internshipCompSummary.manualHoursRoleCount > 0
                                  ? ` • ${internshipCompSummary.manualHoursRoleCount} manual hrs`
                                  : ' • Auto estimated'}
                          </>
                        ) : (
                          'Add hourly rate to calculate earnings.'
                        )}
                      </div>
                    </div>
                    {internshipCompSummary.trackedRoleCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setOverallInternshipBreakdownOpen(true)}
                        title="View internship earnings breakdown"
                        aria-label="View internship earnings breakdown"
                        className="shrink-0 rounded-full border border-amber-200 bg-amber-50/80 px-2.5 py-1 text-[10px] font-semibold text-amber-700 transition-colors hover:bg-amber-100"
                      >
                        Breakdown
                      </button>
                    )}
                  </div>
                </div>

                {payGrowthHeadline && (
                  <div className="border-t border-slate-100 pt-2.5 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                            Growth
                          </span>
                          <span
                            className={`flex items-center gap-1 text-[16px] font-bold leading-none ${
                              payGrowthHeadline.amount > 0
                                ? 'text-emerald-600'
                                : payGrowthHeadline.amount < 0
                                  ? 'text-rose-600'
                                  : 'text-slate-500'
                            }`}
                          >
                            <PayGrowthArrow delta={payGrowthHeadline} />
                            {formatDeltaPercent(payGrowthHeadline)}
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] leading-tight text-slate-500">
                          {formatDeltaAmount(payGrowthHeadline)} vs{' '}
                          {payGrowth.defaultComparison?.previousExp.company ?? 'previous role'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPayGrowthOpen(true)}
                        title="View pay growth breakdown"
                        aria-label="View pay growth breakdown"
                        className="shrink-0 rounded-full border border-sky-200 bg-sky-50/80 px-2.5 py-1 text-[10px] font-semibold text-sky-700 transition-colors hover:bg-sky-100"
                      >
                        Growth
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Col>

      {/* 4. Top Skills */}
      <Col xs={24} md={12} xl={6}>
        <div className="flex h-full flex-col justify-between xl:pl-6">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                  <CodeOutlined className="text-sm" />
                </div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Top Skills
                </div>
              </div>
              {selectedSkill && (
                <button
                  type="button"
                  onClick={() => setSelectedSkill(null)}
                  className="text-[11px] font-medium text-blue-600 transition-colors hover:text-blue-700"
                >
                  Clear filter
                </button>
              )}
            </div>
            <div className="mt-3.5 min-w-0">
              <div className="flex flex-wrap gap-1.5">
                {topSkills.map((skill) => {
                  const isSelected = selectedSkill === skill;
                  return (
                    <Tag.CheckableTag
                      key={skill}
                      checked={isSelected}
                      onChange={(checked) => setSelectedSkill(checked ? skill : null)}
                      className={`m-0 rounded-md border px-2 py-0.5 text-[11px] font-medium leading-4 transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-200/80 bg-slate-50/60 text-slate-600 hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-600'
                      }`}
                    >
                      {skill} <span className="ml-1 opacity-50">{skillCounts[skill]}</span>
                    </Tag.CheckableTag>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </Col>
    </Row>
  </div>
);

export default ExperienceAnalyticsPanels;

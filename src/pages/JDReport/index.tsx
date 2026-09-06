import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Progress } from 'antd';
import {
  WarningOutlined,
  BulbOutlined,
  DownloadOutlined,
  EditOutlined,
  ProfileOutlined,
  RobotOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import { getReportById } from '../../utils/reportStorage';
import type { StoredReport } from '../../utils/reportStorage';
import { isRecord, keywordName, requirementName, supportLabel } from './jdReportFields';
import JDStrengthsGapsGrid from './JDStrengthsGapsGrid';
import { getReportArtifactByClientId } from '../../utils/aiArtifactStorage';
import ArtifactHeaderCard from '../../components/ArtifactHeaderCard';
import ArtifactPageToolbar from '../../components/ArtifactPageToolbar';
import { PageState, PanelSkeleton } from '../../components/PageState';

const getScoreMeta = (score: number) => {
  if (score >= 90)
    return {
      label: 'Strong match',
      stroke: '#10b981',
      ringBg: '#f0fdf4',
      barColor: '#10b981',
      badgeBg: '#d1fae5',
      badgeText: '#065f46',
    };
  if (score >= 70)
    return {
      label: 'Good fit with minor gaps',
      stroke: '#3b82f6',
      ringBg: '#eff6ff',
      barColor: '#3b82f6',
      badgeBg: '#dbeafe',
      badgeText: '#1e40af',
    };
  if (score >= 50)
    return {
      label: 'Partial match',
      stroke: '#f59e0b',
      ringBg: '#fffbeb',
      barColor: '#f59e0b',
      badgeBg: '#fef3c7',
      badgeText: '#92400e',
    };
  return {
    label: 'Poor match',
    stroke: '#ef4444',
    ringBg: '#fef2f2',
    barColor: '#ef4444',
    badgeBg: '#fee2e2',
    badgeText: '#7f1d1d',
  };
};

const JDReportPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<StoredReport | null>(() => (id ? getReportById(id) : null));
  const [loading, setLoading] = useState(() => !report);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    getReportArtifactByClientId(id)
      .then((backendReport) => {
        setReport(backendReport || getReportById(id));
      })
      .catch(() => setReport(getReportById(id)))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto min-h-screen max-w-6xl px-4 py-12 sm:px-6">
        <PanelSkeleton rows={6} />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-ink-900 px-4 py-16 sm:px-6">
        <PageState
          title="Job match report not found"
          description="This report may have been deleted or is no longer available in this account."
          icon={<RobotOutlined />}
          actionLabel="View all reports"
          onAction={() => navigate('/jd-reports')}
        />
      </div>
    );
  }

  const meta = getScoreMeta(report.score);
  const date = new Date(report.savedAt).toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const resumeGaps = report.resume_gaps ?? [];
  const keywordSuggestions = report.keyword_suggestions ?? [];
  const tailoredBullets = report.tailored_bullets ?? [];
  const bestExperiences = report.best_experiences ?? [];

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <ArtifactPageToolbar
        backLabel="All Reports"
        contextLabel="AI Resume Evaluator"
        contextIcon={<RobotOutlined />}
        onBack={() => navigate('/jd-reports')}
        maxWidthClassName="max-w-4xl"
        actions={
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => window.print()}
            className="rounded-lg"
            style={{ background: '#0284c7', borderColor: '#0284c7' }}
          >
            Print / Save PDF
          </Button>
        }
      />

      {/* Page */}
      <div className="min-h-screen bg-slate-50/50 dark:bg-ink-900/50 px-4 py-6 shadow-inner sm:py-12">
        <div className="mx-auto flex max-w-4xl flex-col gap-5 sm:gap-8">
          {/* Header */}
          <ArtifactHeaderCard
            typeLabel="AI Resume Evaluation Report"
            typeIcon={<RobotOutlined />}
            title={report.title || 'Job Match Analysis'}
            date={date}
            subtitle={
              report.roleTitle && report.companyName
                ? `${report.roleTitle} @ ${report.companyName}`
                : 'Job Matching System'
            }
            themeColor="sky"
          />

          {/* Score Hero */}
          <div className="bg-white dark:bg-ink-900 rounded-3xl shadow-sm border border-gray-100 dark:border-white/[0.07] overflow-hidden">
            <div className="flex flex-col items-center gap-6 px-5 py-6 sm:flex-row sm:items-start sm:gap-10 sm:px-8 sm:py-10">
              <div className="shrink-0 flex flex-col items-center gap-4">
                <Progress
                  type="circle"
                  percent={report.score}
                  size={125}
                  strokeColor={meta.stroke}
                  trailColor="#f8fafc"
                  strokeWidth={8}
                  format={(pct) => (
                    <div className="flex flex-col items-center">
                      <span className="text-3xl font-black text-gray-900 dark:text-ink-50 leading-none tracking-tighter">
                        {pct}
                      </span>
                      <span className="text-[8px] font-bold text-gray-400 dark:text-ink-500 uppercase tracking-widest mt-1.5">
                        Overall Match
                      </span>
                    </div>
                  )}
                />
                <span
                  className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-sm bg-white dark:bg-ink-900"
                  style={{ color: meta.badgeText, border: `1px solid ${meta.stroke}44` }}
                >
                  {report.score_label || meta.label}
                </span>
              </div>
              <div className="flex flex-col gap-3.5 pt-1">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-5 bg-sky-600 rounded-full" />
                  <h2 className="text-lg font-bold text-gray-900 dark:text-ink-50 m-0 tracking-tight">
                    Executive Summary
                  </h2>
                </div>
                <p className="text-gray-600 dark:text-ink-200 leading-relaxed text-sm m-0 font-medium opacity-90 max-w-2xl">
                  {report.summary}
                </p>
              </div>
            </div>
            {/* Progress bar strip */}
            <div className="relative h-2.5 bg-gray-100/50 dark:bg-ink-800/50">
              <div
                className="absolute top-0 left-0 h-full rounded-r-full transition-all duration-1000 ease-out"
                style={{
                  width: `${report.score}%`,
                  background: `linear-gradient(to right, ${meta.stroke}44, ${meta.stroke})`,
                }}
              />
            </div>
          </div>

          {/* Two-col Strengths + Gaps */}
          <JDStrengthsGapsGrid report={report} />

          {(resumeGaps.length > 0 || keywordSuggestions.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {resumeGaps.length > 0 && (
                <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 dark:border-white/[0.07] bg-white dark:bg-ink-900 p-4 shadow-sm sm:p-6">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-500/15 flex items-center justify-center">
                      <WarningOutlined className="text-orange-600 dark:text-orange-300 text-sm" />
                    </div>
                    <span className="font-semibold text-gray-800 dark:text-ink-50 text-sm">
                      Resume Evidence Gaps
                    </span>
                  </div>
                  <div className="flex flex-col gap-3">
                    {resumeGaps.map((gap, index) => (
                      <div
                        key={index}
                        className="rounded-xl border border-orange-100 dark:border-orange-500/20 bg-orange-50/60 dark:bg-orange-500/10 p-4"
                      >
                        <p className="text-sm font-semibold text-orange-950 leading-relaxed m-0">
                          {isRecord(gap) ? String(gap.gap || '') : String(gap)}
                        </p>
                        {isRecord(gap) && gap.why_it_matters && (
                          <p className="mt-2 text-xs text-orange-900/75 dark:text-orange-300 leading-relaxed m-0">
                            Why it matters: {String(gap.why_it_matters)}
                          </p>
                        )}
                        {isRecord(gap) && gap.fix && (
                          <p className="mt-2 text-xs text-orange-900/75 dark:text-orange-300 leading-relaxed m-0">
                            Fix: {String(gap.fix)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {keywordSuggestions.length > 0 && (
                <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 dark:border-white/[0.07] bg-white dark:bg-ink-900 p-4 shadow-sm sm:p-6">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-500/15 flex items-center justify-center">
                      <TagsOutlined className="text-sky-600 dark:text-sky-300 text-sm" />
                    </div>
                    <span className="font-semibold text-gray-800 dark:text-ink-50 text-sm">
                      Supported JD Keywords
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-ink-400 leading-relaxed m-0">
                    Keywords below should only be woven into bullets where your saved experience
                    already supports them.
                  </p>
                  <div className="flex flex-col gap-2">
                    {keywordSuggestions.map((keyword, index) => (
                      <div
                        key={index}
                        className="rounded-xl border border-sky-100 dark:border-sky-500/20 bg-sky-50/70 dark:bg-sky-500/10 px-3 py-2"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-sky-700 dark:text-sky-300">
                            {keywordName(keyword)}
                          </span>
                          {isRecord(keyword) && keyword.support_level && (
                            <span className="rounded-full bg-white dark:bg-ink-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-600 dark:text-sky-300 border border-sky-100 dark:border-sky-500/20">
                              {supportLabel(keyword.support_level)}
                            </span>
                          )}
                        </div>
                        {isRecord(keyword) && keyword.where_to_use && (
                          <p className="mt-1 text-[11px] leading-relaxed text-sky-900/70 dark:text-sky-300 m-0">
                            Use in: {String(keyword.where_to_use)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tailoredBullets.length > 0 && (
            <div className="flex flex-col gap-5 rounded-2xl border border-gray-100 dark:border-white/[0.07] bg-white dark:bg-ink-900 p-4 shadow-sm sm:p-6">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-500/15 flex items-center justify-center">
                  <EditOutlined className="text-blue-600 dark:text-blue-300 text-sm" />
                </div>
                <span className="font-semibold text-gray-800 dark:text-ink-50 text-sm">
                  Resume Bullet Rewrite Suggestions
                </span>
              </div>
              <div className="flex flex-col gap-4">
                {tailoredBullets.map((bullet, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-blue-100 dark:border-blue-500/20 bg-gradient-to-br from-blue-50/70 to-white dark:to-ink-900 p-5 flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-300 bg-blue-100 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/25 px-2.5 py-1 rounded-full">
                        Suggestion {index + 1}
                      </span>
                      {bullet.experience && (
                        <span className="text-[11px] font-semibold text-gray-400 dark:text-ink-500 truncate">
                          {bullet.experience}
                        </span>
                      )}
                      {bullet.support_level && (
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-300 bg-white dark:bg-ink-900 border border-blue-100 dark:border-blue-500/20 px-2 py-1 rounded-full">
                          {supportLabel(bullet.support_level)}
                        </span>
                      )}
                    </div>

                    {bullet.original && (
                      <div className="rounded-xl bg-white/70 dark:bg-ink-900/70 border border-gray-100 dark:border-white/[0.07] p-4">
                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-ink-500 mb-2">
                          Original
                        </div>
                        <p className="text-sm text-gray-500 dark:text-ink-400 leading-relaxed m-0">
                          {bullet.original}
                        </p>
                      </div>
                    )}

                    <div className="rounded-xl bg-white dark:bg-ink-900 border border-blue-100 dark:border-blue-500/20 p-4 shadow-sm">
                      <div className="text-[10px] font-black uppercase tracking-widest text-blue-500 dark:text-blue-400 mb-2">
                        Tailored Rewrite
                      </div>
                      <p className="text-sm text-gray-800 dark:text-ink-50 leading-relaxed m-0 font-medium">
                        {bullet.revised}
                      </p>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-ink-400 leading-relaxed m-0">
                      <span className="font-bold text-gray-600 dark:text-ink-200">
                        Why it helps:
                      </span>{' '}
                      {bullet.reason}
                    </p>
                    {bullet.risk_note && (
                      <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-xl px-3 py-2 leading-relaxed m-0">
                        <span className="font-bold">Verify before use:</span> {bullet.risk_note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {bestExperiences.length > 0 && (
            <div className="flex flex-col gap-5 rounded-2xl border border-gray-100 dark:border-white/[0.07] bg-white dark:bg-ink-900 p-4 shadow-sm sm:p-6">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-ink-800 flex items-center justify-center">
                  <ProfileOutlined className="text-slate-600 dark:text-ink-200 text-sm" />
                </div>
                <span className="font-semibold text-gray-800 dark:text-ink-50 text-sm">
                  Best Experience Evidence
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bestExperiences.map((experience, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-gray-100 dark:border-white/[0.07] bg-slate-50/70 dark:bg-ink-900/70 p-5 flex flex-col gap-3"
                  >
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-ink-50 m-0">
                        {experience.title}
                      </h3>
                      <p className="text-xs font-semibold text-gray-400 dark:text-ink-500 m-0 mt-1">
                        {experience.company}
                      </p>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-ink-200 leading-relaxed m-0">
                      {experience.relevance}
                    </p>
                    {(experience.matched_requirements?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {experience.matched_requirements?.map((requirement, requirementIndex) => (
                          <span
                            key={requirementIndex}
                            className="text-[11px] font-medium px-2 py-1 rounded-lg bg-white dark:bg-ink-900 text-slate-600 dark:text-ink-200 border border-slate-200 dark:border-white/[0.08]"
                          >
                            {requirementName(requirement)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.overall_risk_assessment && (
            <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 dark:border-white/[0.07] bg-white dark:bg-ink-900 p-4 shadow-sm sm:p-6">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-500/15 flex items-center justify-center">
                  <WarningOutlined className="text-blue-600 dark:text-blue-300 text-sm" />
                </div>
                <span className="font-semibold text-gray-800 dark:text-ink-50 text-sm">
                  Risk Assessment
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  ['Seniority', report.overall_risk_assessment.seniority_risk],
                  ['Domain', report.overall_risk_assessment.domain_risk],
                  ['Tech Stack', report.overall_risk_assessment.technical_stack_risk],
                  ['Positioning', report.overall_risk_assessment.resume_positioning_risk],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-blue-100 dark:border-blue-500/20 bg-blue-50/60 dark:bg-blue-500/10 p-3"
                  >
                    <div className="text-[10px] font-black uppercase tracking-widest text-blue-400">
                      {label}
                    </div>
                    <div className="mt-1 text-sm font-bold capitalize text-blue-900 dark:text-blue-200">
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {report.recommendations?.length > 0 && (
            <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 dark:border-white/[0.07] bg-white dark:bg-ink-900 p-4 shadow-sm sm:p-6">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center">
                  <BulbOutlined className="text-amber-600 dark:text-amber-300 text-sm" />
                </div>
                <span className="font-semibold text-gray-800 dark:text-ink-50 text-sm">
                  Actionable Recommendations
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {report.recommendations.map((rec, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-white dark:to-ink-900 border border-amber-100 dark:border-amber-500/20"
                  >
                    <div className="w-6 h-6 rounded-full bg-amber-200 dark:bg-amber-500/20 text-amber-800 dark:text-amber-200 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <p className="text-gray-700 dark:text-ink-100 text-sm leading-relaxed m-0">
                      {rec}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-center text-xs text-gray-400 dark:text-ink-500 pb-4 no-print">
            CareerHub AI · {date}
          </p>
        </div>
      </div>
    </>
  );
};

export default JDReportPage;

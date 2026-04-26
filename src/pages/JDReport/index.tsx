import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Progress } from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  BulbOutlined,
  DownloadOutlined,
  EditOutlined,
  ProfileOutlined,
  RobotOutlined,
  TagsOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { getReportById } from '../../utils/reportStorage';
import BulkActionHeader from '../../components/BulkActionHeader';

const getScoreMeta = (score: number) => {
  if (score >= 90) return { label: 'Strong match', stroke: '#10b981', ringBg: '#f0fdf4', barColor: '#10b981', badgeBg: '#d1fae5', badgeText: '#065f46' };
  if (score >= 70) return { label: 'Good fit with minor gaps', stroke: '#3b82f6', ringBg: '#eff6ff', barColor: '#3b82f6', badgeBg: '#dbeafe', badgeText: '#1e40af' };
  if (score >= 50) return { label: 'Partial match', stroke: '#f59e0b', ringBg: '#fffbeb', barColor: '#f59e0b', badgeBg: '#fef3c7', badgeText: '#92400e' };
  return              { label: 'Poor match', stroke: '#ef4444', ringBg: '#fef2f2', barColor: '#ef4444', badgeBg: '#fee2e2', badgeText: '#7f1d1d' };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

const supportLabel = (value: unknown) =>
  String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const skillName = (value: unknown) => (isRecord(value) ? String(value.skill || '') : String(value || ''));
const missingSkillName = (value: unknown) => (isRecord(value) ? String(value.skill || '') : String(value || ''));
const keywordName = (value: unknown) => (isRecord(value) ? String(value.keyword || '') : String(value || ''));
const requirementName = (value: unknown) => (isRecord(value) ? String(value.requirement || '') : String(value || ''));

const JDReportPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const report = id ? getReportById(id) : null;

  if (!report) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-gray-400">
        <RobotOutlined style={{ fontSize: 48 }} />
        <p className="text-lg text-gray-500">Report not found.</p>
        <Button type="primary" icon={<ArrowLeftOutlined />} onClick={() => navigate('/jd-reports')}
          style={{ background: '#4f46e5', borderColor: '#4f46e5' }}>
          View All Reports
        </Button>
      </div>
    );
  }

  const meta = getScoreMeta(report.score);
  const date = new Date(report.savedAt).toLocaleString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
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

      {/* Top Bar */}
      <div className="no-print sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm px-6 py-3">
        <BulkActionHeader
          selectedCount={0}
          totalCount={0}
          title={
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/jd-reports')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 text-sm font-medium transition-all"
              >
                <ArrowLeftOutlined /> All Reports
              </button>
              <span className="text-gray-200 select-none">|</span>
              <div className="flex items-center gap-2">
                <RobotOutlined style={{ color: '#6366f1', fontSize: 15 }} />
                <span className="text-sm font-semibold text-gray-700">AI Resume Evaluator</span>
              </div>
            </div>
          }
          defaultActions={
            <>
              <Button
                icon={<UnorderedListOutlined />}
                onClick={() => navigate('/jd-reports')}
                className="rounded-lg"
              >
                Reports
              </Button>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={() => window.print()}
                className="rounded-lg"
                style={{ background: '#4f46e5', borderColor: '#4f46e5' }}
              >
                Download PDF
              </Button>
            </>
          }
        />
      </div>

      {/* Page */}
      <div className="min-h-screen bg-slate-50/50 py-12 px-4 shadow-inner">
        <div className="max-w-4xl mx-auto flex flex-col gap-8">

          {/* Header */}
          <div className="flex flex-col gap-4">
            <div>
              <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-4 shadow-sm">
                <RobotOutlined className="text-indigo-500 text-xs" />
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">AI Resume Evaluation Report</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2 leading-tight tracking-tight">
                {report.title || 'Job Match Analysis'}
              </h1>
              <div className="flex items-center gap-3 text-gray-400 text-xs font-medium">
                <span>{date}</span>
                <span className="w-1 h-1 rounded-full bg-gray-300" />
                <span>Job Matching System</span>
              </div>
            </div>
          </div>

          {/* Score Hero */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-8 py-10 flex flex-col sm:flex-row items-start gap-10">
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
                      <span className="text-3xl font-black text-gray-900 leading-none tracking-tighter">{pct}</span>
                      <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1.5">Overall Match</span>
                    </div>
                  )}
                />
                <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-sm bg-white"
                  style={{ color: meta.badgeText, border: `1px solid ${meta.stroke}44` }}>
                  {report.score_label || meta.label}
                </span>
              </div>
              <div className="flex flex-col gap-3.5 pt-1">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-5 bg-indigo-600 rounded-full" />
                  <h2 className="text-lg font-bold text-gray-900 m-0 tracking-tight">Executive Summary</h2>
                </div>
                <p className="text-gray-600 leading-relaxed text-sm m-0 font-medium opacity-90 max-w-2xl">
                  {report.summary}
                </p>
              </div>
            </div>
            {/* Progress bar strip */}
            <div className="relative h-2.5 bg-gray-100/50">
              <div className="absolute top-0 left-0 h-full rounded-r-full transition-all duration-1000 ease-out"
                style={{ width: `${report.score}%`, background: `linear-gradient(to right, ${meta.stroke}44, ${meta.stroke})` }} />
            </div>
          </div>

          {/* Two-col Strengths + Gaps */}
          <div className={`grid gap-6 ${report.matched_skills?.length > 0 && report.missing_skills?.length > 0 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
            {report.matched_skills?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <CheckCircleOutlined className="text-emerald-600 text-sm" />
                    </div>
                    <span className="font-semibold text-gray-800 text-sm">Strengths & Matches</span>
                  </div>
                  <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold border border-emerald-100">
                    {report.matched_skills.length}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {report.matched_skills.map((s, i) => (
                    <div key={i} className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-emerald-800">{skillName(s)}</span>
                        {isRecord(s) && s.support_level && (
                          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 border border-emerald-100">
                            {supportLabel(s.support_level)}
                          </span>
                        )}
                      </div>
                      {isRecord(s) && s.evidence && (
                        <p className="mt-1 text-[11px] leading-relaxed text-emerald-900/75 m-0">
                          Evidence: “{String(s.evidence)}”
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {report.missing_skills?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
                      <WarningOutlined className="text-red-400 text-sm" />
                    </div>
                    <span className="font-semibold text-gray-800 text-sm">Identified Gaps</span>
                  </div>
                  <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full font-semibold border border-red-100">
                    {report.missing_skills.length}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {report.missing_skills.map((s, i) => (
                    <div key={i} className="rounded-xl border border-red-100 bg-red-50/60 px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-red-700">{missingSkillName(s)}</span>
                        {isRecord(s) && s.severity && (
                          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-500 border border-red-100">
                            {String(s.severity)}
                          </span>
                        )}
                      </div>
                      {isRecord(s) && s.reason && (
                        <p className="mt-1 text-[11px] leading-relaxed text-red-900/70 m-0">{String(s.reason)}</p>
                      )}
                      {isRecord(s) && s.resume_evidence_status && (
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-red-400 m-0">
                          Evidence status: {String(s.resume_evidence_status)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {(resumeGaps.length > 0 || keywordSuggestions.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {resumeGaps.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center">
                      <WarningOutlined className="text-orange-600 text-sm" />
                    </div>
                    <span className="font-semibold text-gray-800 text-sm">Resume Evidence Gaps</span>
                  </div>
                  <div className="flex flex-col gap-3">
                    {resumeGaps.map((gap, index) => (
                      <div key={index} className="rounded-xl border border-orange-100 bg-orange-50/60 p-4">
                        <p className="text-sm font-semibold text-orange-950 leading-relaxed m-0">
                          {isRecord(gap) ? String(gap.gap || '') : String(gap)}
                        </p>
                        {isRecord(gap) && gap.why_it_matters && (
                          <p className="mt-2 text-xs text-orange-900/75 leading-relaxed m-0">
                            Why it matters: {String(gap.why_it_matters)}
                          </p>
                        )}
                        {isRecord(gap) && gap.fix && (
                          <p className="mt-2 text-xs text-orange-900/75 leading-relaxed m-0">
                            Fix: {String(gap.fix)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {keywordSuggestions.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <TagsOutlined className="text-indigo-600 text-sm" />
                    </div>
                    <span className="font-semibold text-gray-800 text-sm">Supported JD Keywords</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed m-0">
                    Keywords below should only be woven into bullets where your saved experience already supports them.
                  </p>
                  <div className="flex flex-col gap-2">
                    {keywordSuggestions.map((keyword, index) => (
                      <div key={index} className="rounded-xl border border-indigo-100 bg-indigo-50/70 px-3 py-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-indigo-700">{keywordName(keyword)}</span>
                          {isRecord(keyword) && keyword.support_level && (
                            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-600 border border-indigo-100">
                              {supportLabel(keyword.support_level)}
                            </span>
                          )}
                        </div>
                        {isRecord(keyword) && keyword.where_to_use && (
                          <p className="mt-1 text-[11px] leading-relaxed text-indigo-900/70 m-0">
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
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                  <EditOutlined className="text-blue-600 text-sm" />
                </div>
                <span className="font-semibold text-gray-800 text-sm">Resume Bullet Rewrite Suggestions</span>
              </div>
              <div className="flex flex-col gap-4">
                {tailoredBullets.map((bullet, index) => (
                  <div key={index} className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/70 to-white p-5 flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-full">
                        Suggestion {index + 1}
                      </span>
                      {bullet.experience && (
                        <span className="text-[11px] font-semibold text-gray-400 truncate">
                          {bullet.experience}
                        </span>
                      )}
                      {bullet.support_level && (
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-white border border-blue-100 px-2 py-1 rounded-full">
                          {supportLabel(bullet.support_level)}
                        </span>
                      )}
                    </div>

                    {bullet.original && (
                      <div className="rounded-xl bg-white/70 border border-gray-100 p-4">
                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Original</div>
                        <p className="text-sm text-gray-500 leading-relaxed m-0">{bullet.original}</p>
                      </div>
                    )}

                    <div className="rounded-xl bg-white border border-blue-100 p-4 shadow-sm">
                      <div className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-2">Tailored Rewrite</div>
                      <p className="text-sm text-gray-800 leading-relaxed m-0 font-medium">{bullet.revised}</p>
                    </div>

                    <p className="text-xs text-gray-500 leading-relaxed m-0">
                      <span className="font-bold text-gray-600">Why it helps:</span> {bullet.reason}
                    </p>
                    {bullet.risk_note && (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 leading-relaxed m-0">
                        <span className="font-bold">Verify before use:</span> {bullet.risk_note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {bestExperiences.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                  <ProfileOutlined className="text-slate-600 text-sm" />
                </div>
                <span className="font-semibold text-gray-800 text-sm">Best Experience Evidence</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bestExperiences.map((experience, index) => (
                  <div key={index} className="rounded-2xl border border-gray-100 bg-slate-50/70 p-5 flex flex-col gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 m-0">{experience.title}</h3>
                      <p className="text-xs font-semibold text-gray-400 m-0 mt-1">{experience.company}</p>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed m-0">{experience.relevance}</p>
                    {(experience.matched_requirements?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {experience.matched_requirements?.map((requirement, requirementIndex) => (
                          <span key={requirementIndex} className="text-[11px] font-medium px-2 py-1 rounded-lg bg-white text-slate-600 border border-slate-200">
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
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
                  <WarningOutlined className="text-violet-600 text-sm" />
                </div>
                <span className="font-semibold text-gray-800 text-sm">Risk Assessment</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  ['Seniority', report.overall_risk_assessment.seniority_risk],
                  ['Domain', report.overall_risk_assessment.domain_risk],
                  ['Tech Stack', report.overall_risk_assessment.technical_stack_risk],
                  ['Positioning', report.overall_risk_assessment.resume_positioning_risk],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-violet-100 bg-violet-50/60 p-3">
                    <div className="text-[10px] font-black uppercase tracking-widest text-violet-400">{label}</div>
                    <div className="mt-1 text-sm font-bold capitalize text-violet-900">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {report.recommendations?.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                  <BulbOutlined className="text-amber-600 text-sm" />
                </div>
                <span className="font-semibold text-gray-800 text-sm">Actionable Recommendations</span>
              </div>
              <div className="flex flex-col gap-3">
                {report.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-white border border-amber-100">
                    <div className="w-6 h-6 rounded-full bg-amber-200 text-amber-800 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed m-0">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-center text-xs text-gray-400 pb-4 no-print">
            CareerHub AI · {date}
          </p>
        </div>
      </div>
    </>
  );
};

export default JDReportPage;

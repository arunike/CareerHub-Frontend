import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Progress } from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  BulbOutlined,
  DownloadOutlined,
  RobotOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { getReportById } from '../../utils/reportStorage';
import type { StoredReport } from '../../utils/reportStorage';
import BulkActionHeader from '../../components/BulkActionHeader';

const getScoreMeta = (score: number) => {
  if (score >= 85) return { label: 'Excellent Match', stroke: '#10b981', ringBg: '#f0fdf4', barColor: '#10b981', badgeBg: '#d1fae5', badgeText: '#065f46' };
  if (score >= 70) return { label: 'Strong Match',   stroke: '#3b82f6', ringBg: '#eff6ff', barColor: '#3b82f6', badgeBg: '#dbeafe', badgeText: '#1e40af' };
  if (score >= 55) return { label: 'Moderate Match', stroke: '#f59e0b', ringBg: '#fffbeb', barColor: '#f59e0b', badgeBg: '#fef3c7', badgeText: '#92400e' };
  if (score >= 40) return { label: 'Partial Match',  stroke: '#f97316', ringBg: '#fff7ed', barColor: '#f97316', badgeBg: '#ffedd5', badgeText: '#7c2d12' };
  return              { label: 'Low Match',          stroke: '#ef4444', ringBg: '#fef2f2', barColor: '#ef4444', badgeBg: '#fee2e2', badgeText: '#7f1d1d' };
};

const JDReportPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<StoredReport | null>(null);

  useEffect(() => {
    if (id) setReport(getReportById(id));
  }, [id]);

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
                  {meta.label}
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
                <div className="flex flex-wrap gap-1.5">
                  {report.matched_skills.map((s, i) => (
                    <span key={i} className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                      {s}
                    </span>
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
                <div className="flex flex-wrap gap-1.5">
                  {report.missing_skills.map((s, i) => (
                    <span key={i} className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-50 text-red-500 border border-red-100">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

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

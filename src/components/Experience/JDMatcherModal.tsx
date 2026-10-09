import React, { useState } from 'react';
import { Input, Button, Space, Alert, Progress } from 'antd';
import Modal from '../modals/MobileModal';
import {
  RobotOutlined,
  ExpandOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getExperiences } from '../../api/career';
import { matchJobDescriptionWithBrowserAI } from '../../lib/browserAi';
import { saveReport } from '../../utils/reportStorage';
import type { StoredReport } from '../../utils/reportStorage';
import type { CareerApplication } from '../../types/application';

const { TextArea } = Input;

interface Props {
  open: boolean;
  onCancel: () => void;
  application?: CareerApplication;
  onSaved?: (report: StoredReport) => void;
}

const getScoreMeta = (score: number) => {
  if (score >= 90)
    return {
      label: 'Strong match',
      stroke: '#10b981',
      bg: 'linear-gradient(135deg, #ecfdf5, #f0fdf4)',
      badgeBg: '#d1fae5',
      badgeText: '#065f46',
    };
  if (score >= 70)
    return {
      label: 'Good fit with minor gaps',
      stroke: '#3b82f6',
      bg: 'linear-gradient(135deg, #eff6ff, #f6f9ff)',
      badgeBg: '#dbeafe',
      badgeText: '#1e40af',
    };
  if (score >= 50)
    return {
      label: 'Partial match',
      stroke: '#f59e0b',
      bg: 'linear-gradient(135deg, #fffbeb, #fefce8)',
      badgeBg: '#fef3c7',
      badgeText: '#92400e',
    };
  return {
    label: 'Poor match',
    stroke: '#ef4444',
    bg: 'linear-gradient(135deg, #fef2f2, #fdf2f2)',
    badgeBg: '#fee2e2',
    badgeText: '#7f1d1d',
  };
};

const JDMatcherModal: React.FC<Props> = ({ open, onCancel, application, onSaved }) => {
  const navigate = useNavigate();
  const [jdText, setJdText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [savedReport, setSavedReport] = useState<StoredReport | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!jdText.trim()) return;
    setAnalyzing(true);
    setErrorMsg(null);
    try {
      const experiencesResponse = await getExperiences();
      const data = await matchJobDescriptionWithBrowserAI({
        jdText,
        experiences: experiencesResponse.data,
      });
      const report = saveReport(
        data,
        jdText,
        application
          ? {
              applicationId: application.id,
              companyName: application.company_details?.name,
              roleTitle: application.role_title,
            }
          : undefined,
        { syncBackend: false }
      );
      await import('../../utils/aiArtifactStorage')
        .then(({ syncReportArtifact }) => syncReportArtifact(report))
        .catch(() => {});
      setSavedReport(report);
      onSaved?.(report);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReset = () => {
    setJdText('');
    setSavedReport(null);
    setErrorMsg(null);
  };

  const openReport = () => savedReport && window.open(`/jd-report/${savedReport.id}`, '_blank');

  const viewAllReports = () => {
    onCancel();
    navigate('/jd-reports');
  };

  const meta = savedReport ? getScoreMeta(savedReport.score) : null;

  return (
    <Modal
      title={
        <Space size={8}>
          <RobotOutlined className="text-sky-500 dark:text-sky-300" />
          <span className="font-semibold text-slate-800 dark:text-ink-50">AI Resume Evaluator</span>
        </Space>
      }
      open={open}
      onCancel={onCancel}
      footer={null}
      width={520}
      zIndex={1500}
      destroyOnClose
      afterClose={handleReset}
      styles={{ body: { padding: '16px 24px 24px' } }}
    >
      {!savedReport ? (
        // ── Input State ──
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {errorMsg && (
            <Alert
              type="error"
              message={errorMsg}
              showIcon
              closable
              onClose={() => setErrorMsg(null)}
            />
          )}
          <p className="m-0 text-[13px] leading-relaxed text-slate-500 dark:text-ink-400">
            {application
              ? `Paste the Job Description for ${application.role_title}. This report will be linked to this application.`
              : 'Paste a full Job Description below. Our AI will cross-reference it against your entire Career History and generate a full evaluation report.'}
          </p>
          <TextArea
            rows={9}
            placeholder="Paste job description here..."
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            style={{ borderRadius: 10, fontSize: 13, resize: 'none' }}
          />
          <Button
            type="primary"
            size="large"
            icon={<RobotOutlined />}
            onClick={handleAnalyze}
            loading={analyzing}
            disabled={!jdText.trim()}
            block
            className={jdText.trim() ? 'border-sky-600 bg-sky-600 hover:bg-sky-700' : undefined}
            style={{ height: 46, borderRadius: 10, fontSize: 14 }}
          >
            {analyzing ? 'Analyzing...' : 'Analyze Resume against JD'}
          </Button>
        </div>
      ) : (
        // ── Result State ──
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Score hero */}
          <div
            style={{
              background: meta!.bg,
              borderRadius: 16,
              padding: '24px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              border: '1px solid rgba(0,0,0,0.05)',
            }}
          >
            <Progress
              type="circle"
              percent={savedReport.score}
              size={96}
              strokeColor={meta!.stroke}
              trailColor="rgba(255,255,255,0.6)"
              strokeWidth={7}
              format={(pct) => (
                <span className="text-[22px] font-black text-slate-900 dark:text-ink-50">
                  {pct}%
                </span>
              )}
            />
            <div style={{ flex: 1 }}>
              <span
                style={{
                  display: 'inline-block',
                  marginBottom: 8,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  padding: '3px 10px',
                  borderRadius: 999,
                  background: meta!.badgeBg,
                  color: meta!.badgeText,
                }}
              >
                {savedReport.score_label || meta!.label}
              </span>
              <p className="m-0 text-[13px] leading-relaxed text-slate-700 dark:text-ink-200">
                {savedReport.summary}
              </p>
            </div>
          </div>

          {/* Quick stats row */}
          <div style={{ display: 'flex', gap: 10 }}>
            <div className="flex-1 rounded-[10px] border border-emerald-100 bg-emerald-50 px-3.5 py-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <div className="flex items-center gap-1.5 text-[13px] font-semibold text-emerald-600 dark:text-emerald-300">
                <CheckCircleOutlined /> Strengths
              </div>
              <div className="mt-1 text-[22px] font-extrabold text-emerald-800 dark:text-emerald-200">
                {savedReport.matched_skills?.length ?? 0}
              </div>
            </div>
            <div className="flex-1 rounded-[10px] border border-rose-200 bg-rose-50 px-3.5 py-3 dark:border-rose-500/20 dark:bg-rose-500/10">
              <div className="flex items-center gap-1.5 text-[13px] font-semibold text-rose-600 dark:text-rose-300">
                <WarningOutlined /> Gaps
              </div>
              <div className="mt-1 text-[22px] font-extrabold text-rose-900 dark:text-rose-200">
                {savedReport.missing_skills?.length ?? 0}
              </div>
            </div>
            <div className="flex-1 rounded-[10px] border border-amber-200 bg-amber-50 px-3.5 py-3 dark:border-amber-500/20 dark:bg-amber-500/10">
              <div className="text-[13px] font-semibold text-amber-600 dark:text-amber-300">
                Tailor
              </div>
              <div className="mt-1 text-[22px] font-extrabold text-amber-900 dark:text-amber-200">
                {(savedReport.tailored_bullets?.length ?? 0) ||
                  (savedReport.recommendations?.length ?? 0)}
              </div>
            </div>
          </div>

          {((savedReport.tailored_bullets?.length ?? 0) > 0 ||
            (savedReport.keyword_suggestions?.length ?? 0) > 0) && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 dark:border-white/[0.08] dark:bg-white/[0.04]">
              <div className="mb-2 flex items-center gap-2 text-[13px] font-bold text-slate-600 dark:text-ink-200">
                <EditOutlined /> Resume Tailoring Added
              </div>
              <p className="m-0 text-xs leading-relaxed text-slate-500 dark:text-ink-400">
                Full report includes {savedReport.tailored_bullets?.length ?? 0} bullet rewrite
                suggestion{(savedReport.tailored_bullets?.length ?? 0) === 1 ? '' : 's'}
                {(savedReport.keyword_suggestions?.length ?? 0) > 0
                  ? ` and ${savedReport.keyword_suggestions?.length ?? 0} supported JD keyword${(savedReport.keyword_suggestions?.length ?? 0) === 1 ? '' : 's'} to weave into your resume.`
                  : '.'}
              </p>
            </div>
          )}

          {/* CTAs */}
          <Button
            type="primary"
            size="large"
            icon={<ExpandOutlined />}
            block
            onClick={openReport}
            className="border-sky-600 bg-sky-600 hover:bg-sky-700"
            style={{ height: 46, borderRadius: 10, fontSize: 14, fontWeight: 600 }}
          >
            View Full Report
          </Button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={handleReset}
              className="flex cursor-pointer items-center gap-1 border-none bg-transparent text-[13px] text-slate-400 hover:text-slate-600 dark:text-ink-500 dark:hover:text-ink-300"
            >
              <ArrowLeftOutlined /> Analyze another
            </button>
            <button
              onClick={viewAllReports}
              className="flex cursor-pointer items-center gap-1 border-none bg-transparent text-[13px] text-slate-400 hover:text-slate-600 dark:text-ink-500 dark:hover:text-ink-300"
            >
              View all reports →
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default JDMatcherModal;

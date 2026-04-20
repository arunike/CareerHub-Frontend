import React, { useState } from 'react';
import { Modal, Input, Button, Space, Alert, Progress } from 'antd';
import { RobotOutlined, ExpandOutlined, ArrowLeftOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getExperiences } from '../../api/career';
import { matchJobDescriptionWithBrowserAI } from '../../lib/browserAi';
import { saveReport } from '../../utils/reportStorage';
import type { StoredReport } from '../../utils/reportStorage';

const { TextArea } = Input;

interface Props {
  open: boolean;
  onCancel: () => void;
}

const getScoreMeta = (score: number) => {
  if (score >= 85) return { label: 'Excellent Match', stroke: '#10b981', bg: 'linear-gradient(135deg, #ecfdf5, #f0fdf4)', badgeBg: '#d1fae5', badgeText: '#065f46' };
  if (score >= 70) return { label: 'Strong Match',   stroke: '#3b82f6', bg: 'linear-gradient(135deg, #eff6ff, #f0f7ff)', badgeBg: '#dbeafe', badgeText: '#1e40af' };
  if (score >= 55) return { label: 'Moderate Match', stroke: '#f59e0b', bg: 'linear-gradient(135deg, #fffbeb, #fefce8)', badgeBg: '#fef3c7', badgeText: '#92400e' };
  if (score >= 40) return { label: 'Partial Match',  stroke: '#f97316', bg: 'linear-gradient(135deg, #fff7ed, #fff1e6)', badgeBg: '#ffedd5', badgeText: '#7c2d12' };
  return              { label: 'Low Match',          stroke: '#ef4444', bg: 'linear-gradient(135deg, #fef2f2, #fdf2f2)', badgeBg: '#fee2e2', badgeText: '#7f1d1d' };
};

const JDMatcherModal: React.FC<Props> = ({ open, onCancel }) => {
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
      setSavedReport(saveReport(data, jdText));
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

  const viewAllReports = () => { onCancel(); navigate('/jd-reports'); };

  const meta = savedReport ? getScoreMeta(savedReport.score) : null;

  return (
    <Modal
      title={
        <Space size={8}>
          <RobotOutlined style={{ color: '#6366f1' }} />
          <span style={{ fontWeight: 600, color: '#1f2937' }}>AI Resume Evaluator</span>
        </Space>
      }
      open={open}
      onCancel={onCancel}
      footer={null}
      width={520}
      destroyOnClose
      afterClose={handleReset}
      styles={{ body: { padding: '16px 24px 24px' } }}
    >
      {!savedReport ? (
        /* ── Input State ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {errorMsg && (
            <Alert type="error" message={errorMsg} showIcon closable onClose={() => setErrorMsg(null)} />
          )}
          <p style={{ margin: 0, color: '#6b7280', fontSize: 13, lineHeight: 1.6 }}>
            Paste a full Job Description below. Our AI will cross-reference it against your entire Career History and generate a full evaluation report.
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
            style={jdText.trim()
              ? { height: 46, borderRadius: 10, background: '#4f46e5', borderColor: '#4f46e5', fontSize: 14 }
              : { height: 46, borderRadius: 10, fontSize: 14 }}
          >
            {analyzing ? 'Analyzing...' : 'Analyze Resume against JD'}
          </Button>
        </div>
      ) : (
        /* ── Result State ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Score hero */}
          <div style={{
            background: meta!.bg,
            borderRadius: 16,
            padding: '24px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            border: '1px solid rgba(0,0,0,0.05)',
          }}>
            <Progress
              type="circle"
              percent={savedReport.score}
              size={96}
              strokeColor={meta!.stroke}
              trailColor="rgba(255,255,255,0.6)"
              strokeWidth={7}
              format={(pct) => (
                <span style={{ fontSize: 22, fontWeight: 900, color: '#111827' }}>{pct}%</span>
              )}
            />
            <div style={{ flex: 1 }}>
              <span style={{
                display: 'inline-block', marginBottom: 8,
                fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                padding: '3px 10px', borderRadius: 999,
                background: meta!.badgeBg, color: meta!.badgeText,
              }}>
                {meta!.label}
              </span>
              <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.65 }}>
                {savedReport.summary}
              </p>
            </div>
          </div>

          {/* Quick stats row */}
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1, background: '#f0fdf4', borderRadius: 10, padding: '12px 14px', border: '1px solid #d1fae5' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#059669', fontWeight: 600, fontSize: 13 }}>
                <CheckCircleOutlined /> Strengths
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#065f46', marginTop: 4 }}>
                {savedReport.matched_skills?.length ?? 0}
              </div>
            </div>
            <div style={{ flex: 1, background: '#fef2f2', borderRadius: 10, padding: '12px 14px', border: '1px solid #fecaca' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#dc2626', fontWeight: 600, fontSize: 13 }}>
                <WarningOutlined /> Gaps
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#7f1d1d', marginTop: 4 }}>
                {savedReport.missing_skills?.length ?? 0}
              </div>
            </div>
            <div style={{ flex: 1, background: '#fffbeb', borderRadius: 10, padding: '12px 14px', border: '1px solid #fde68a' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#d97706' }}>💡 Tips</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#78350f', marginTop: 4 }}>
                {savedReport.recommendations?.length ?? 0}
              </div>
            </div>
          </div>

          {/* CTAs */}
          <Button
            type="primary"
            size="large"
            icon={<ExpandOutlined />}
            block
            onClick={openReport}
            style={{ height: 46, borderRadius: 10, background: '#4f46e5', borderColor: '#4f46e5', fontSize: 14, fontWeight: 600 }}
          >
            View Full Report
          </Button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={handleReset}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
              <ArrowLeftOutlined /> Analyze another
            </button>
            <button onClick={viewAllReports}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
              View all reports →
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default JDMatcherModal;

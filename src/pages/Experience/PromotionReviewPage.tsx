import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Tag, Typography } from 'antd';
import { ArrowLeftOutlined, BulbOutlined, RiseOutlined, WarningOutlined } from '@ant-design/icons';
import { getPromotionReviewArtifactByClientId } from '../../utils/aiArtifactStorage';
import type { StoredPromotionReview } from '../../utils/aiArtifactStorage';
import BulkActionHeader from '../../components/BulkActionHeader';

const { Text, Title } = Typography;

const asList = (items?: string[]) => (Array.isArray(items) ? items.filter(Boolean) : []);

const ListBlock: React.FC<{ title?: string; items?: string[] }> = ({ title, items }) => {
  const rows = asList(items);
  if (!rows.length)
    return (
      <Text type="secondary" className="text-sm block italic">
        No clear evidence yet.
      </Text>
    );
  return (
    <div>
      {title && (
        <Text className="block mb-1 text-xs uppercase tracking-wide text-gray-500">{title}</Text>
      )}
      <ul className="m-0 pl-5 space-y-1.5 list-disc">
        {rows.map((item, index) => (
          <li key={`${item}-${index}`} className="text-sm text-gray-700 leading-relaxed">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
};

const verdictColor = (label?: string) => {
  const normalized = (label || '').toLowerCase();
  if (normalized.includes('strong')) return 'green';
  if (normalized.includes('ready')) return 'blue';
  if (normalized.includes('building')) return 'gold';
  return 'default';
};

const ratingClass = (rating: string) => {
  const normalized = rating.toLowerCase();
  if (normalized.includes('strong')) return 'green';
  if (normalized.includes('solid')) return 'blue';
  if (normalized.includes('develop')) return 'gold';
  return 'default';
};

const PromotionReviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<StoredPromotionReview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getPromotionReviewArtifactByClientId(id)
      .then((backendResult) => {
        setResult(backendResult);
      })
      .catch((err) => {
        console.error('Failed to load promotion review', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50/50">
        <Text type="secondary">Loading promotion review...</Text>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-gray-400 bg-slate-50/50">
        <WarningOutlined style={{ fontSize: 48 }} className="text-amber-500" />
        <p className="text-lg text-gray-500">Promotion Review not found.</p>
        <Button
          type="primary"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/ai-tools?tab=promotion-reviews')}
        >
          View All Reviews
        </Button>
      </div>
    );
  }

  const review = result.review;
  const date = new Date(result.savedAt).toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <>
      {/* Top sticky action bar */}
      <div className="no-print sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm px-6 py-3">
        <BulkActionHeader
          selectedCount={0}
          totalCount={0}
          title={
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/ai-tools?tab=promotion-reviews')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 text-sm font-medium transition-all"
              >
                <ArrowLeftOutlined /> All Reviews
              </button>
              <span className="text-gray-200 select-none">|</span>
              <div className="flex items-center gap-2">
                <RiseOutlined style={{ color: '#2563eb', fontSize: 15 }} />
                <span className="text-sm font-semibold text-gray-700">
                  Promotion Review Dashboard
                </span>
              </div>
            </div>
          }
          defaultActions={
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/ai-tools?tab=promotion-reviews')}
              className="rounded-lg"
            >
              All Reviews
            </Button>
          }
        />
      </div>

      {/* Main content body */}
      <div className="min-h-screen bg-slate-50/50 py-12 px-6 shadow-inner">
        <div className="max-w-5xl mx-auto flex flex-col gap-8">
          {/* Page Title & Meta Header */}
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-3 py-1 mb-4 shadow-sm">
              <RiseOutlined className="text-blue-500 text-xs" />
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                AI Promotion Readiness Review
              </span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 leading-tight tracking-tight">
              {result.title}
            </h1>
            <div className="flex items-center gap-3 text-gray-500 text-xs font-medium">
              <span>{date}</span>
              <span className="w-1 h-1 rounded-full bg-gray-300" />
              <span>
                {result.roleTitle} @ {result.companyName}
              </span>
            </div>
          </div>

          {/* Verdict summary block */}
          <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Tag
                color={verdictColor(review.readiness_verdict?.label)}
                className="m-0 font-semibold px-2.5 py-0.5 rounded-md text-sm border-blue-200"
              >
                {review.readiness_verdict?.label}
              </Tag>
              <Tag className="m-0 px-2.5 py-0.5 rounded-md text-xs border-gray-200">
                Confidence: {review.readiness_verdict?.confidence || 'unknown'}
              </Tag>
            </div>
            <Text className="block text-gray-800 text-[15px] leading-relaxed font-medium">
              {review.readiness_verdict?.summary}
            </Text>
          </div>

          {/* Highlights Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-gray-100 p-6 bg-white shadow-sm">
              <Title
                level={5}
                className="!mt-0 !mb-3 text-xs font-bold text-gray-900 uppercase tracking-wider"
              >
                Saved Evidence
              </Title>
              <ListBlock items={review.evidence_summary?.role_snapshot} />
            </div>
            <div className="rounded-2xl border border-gray-100 p-6 bg-white shadow-sm">
              <Title
                level={5}
                className="!mt-0 !mb-3 text-xs font-bold text-gray-900 uppercase tracking-wider"
              >
                Strongest Evidence
              </Title>
              <ListBlock items={review.evidence_summary?.strongest_evidence} />
            </div>
            <div className="rounded-2xl border border-gray-100 p-6 bg-white shadow-sm">
              <Title
                level={5}
                className="!mt-0 !mb-3 text-xs font-bold text-gray-900 uppercase tracking-wider"
              >
                Missing Context
              </Title>
              <ListBlock items={review.evidence_summary?.missing_context} />
            </div>
          </div>

          {/* Quality Assessment alert */}
          {review.evidence_summary?.data_quality_note && (
            <Alert
              type="info"
              showIcon
              message="Evidence Quality Note"
              description={review.evidence_summary.data_quality_note}
              className="!rounded-2xl !border-slate-100 !bg-white !p-4 shadow-sm"
            />
          )}

          {/* 10-Dimension Scores */}
          <div className="rounded-2xl border border-gray-100 overflow-hidden bg-white shadow-sm">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 font-bold text-gray-900 text-sm uppercase tracking-wider">
              Promotion Dimensions Evaluation
            </div>
            <div className="divide-y divide-gray-100">
              {(review.dimension_scores || []).map((score) => (
                <div key={score.dimension} className="p-6">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <Text strong className="text-[16px] text-gray-900">
                      {score.dimension}
                    </Text>
                    <Tag
                      color={ratingClass(score.rating)}
                      className="m-0 px-2 py-0.5 rounded-md border-0"
                    >
                      {score.rating}
                    </Tag>
                    <Tag className="m-0 px-2 py-0.5 rounded-md text-xs border-gray-100">
                      Confidence: {score.confidence}
                    </Tag>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Text className="block mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        Supporting evidence
                      </Text>
                      <ListBlock items={score.supporting_evidence} />
                    </div>
                    <div>
                      <Text className="block mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        Missing evidence
                      </Text>
                      <ListBlock items={score.missing_evidence} />
                    </div>
                  </div>
                  {score.how_to_strengthen && (
                    <div className="mt-4 text-[13px] text-amber-800 bg-amber-50/50 border border-amber-100/50 rounded-xl px-4 py-2.5 leading-relaxed">
                      <BulbOutlined className="mr-1.5 text-amber-500 text-sm align-middle inline-block" />
                      <span className="align-middle inline-block">
                        <strong>Next action:</strong> {score.how_to_strengthen}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Shiyong/Manager Conversation Strategy */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-gray-100 p-6 bg-white shadow-sm">
              <Title
                level={5}
                className="!mt-0 !mb-3 text-xs font-bold text-gray-900 uppercase tracking-wider"
              >
                Manager Conversation Strategy
              </Title>
              <Text className="block mb-4 text-gray-700 leading-relaxed text-sm">
                {review.manager_conversation?.recommendation}
              </Text>
              <ListBlock
                title="Talking points"
                items={review.manager_conversation?.talking_points}
              />
            </div>
            <div className="rounded-2xl border border-gray-100 p-6 bg-white shadow-sm">
              <Title
                level={5}
                className="!mt-0 !mb-3 text-xs font-bold text-gray-900 uppercase tracking-wider"
              >
                Questions To Ask Manager
              </Title>
              <ListBlock title="Questions" items={review.manager_conversation?.questions_to_ask} />
            </div>
          </div>

          {/* Email/Slack Draft Template */}
          {review.manager_conversation?.draft_message && (
            <div className="rounded-2xl border border-gray-100 p-6 bg-white shadow-sm">
              <Title
                level={5}
                className="!mt-0 !mb-3 text-xs font-bold text-gray-900 uppercase tracking-wider"
              >
                Draft Email/Slack Message
              </Title>
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">
                {review.manager_conversation.draft_message}
              </div>
            </div>
          )}

          {/* Growth Plan 30/60/90 Days */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-gray-100 p-6 bg-white shadow-sm border-t-4 border-t-blue-500">
              <Title
                level={5}
                className="!mt-0 !mb-3 text-sm font-bold text-blue-900 uppercase tracking-wider"
              >
                Next 30 Days
              </Title>
              <ListBlock items={review.growth_plan?.next_30_days} />
            </div>
            <div className="rounded-2xl border border-gray-100 p-6 bg-white shadow-sm border-t-4 border-t-indigo-500">
              <Title
                level={5}
                className="!mt-0 !mb-3 text-sm font-bold text-indigo-900 uppercase tracking-wider"
              >
                Next 60 Days
              </Title>
              <ListBlock items={review.growth_plan?.next_60_days} />
            </div>
            <div className="rounded-2xl border border-gray-100 p-6 bg-white shadow-sm border-t-4 border-t-purple-500">
              <Title
                level={5}
                className="!mt-0 !mb-3 text-sm font-bold text-purple-900 uppercase tracking-wider"
              >
                Next 90 Days
              </Title>
              <ListBlock items={review.growth_plan?.next_90_days} />
            </div>
          </div>

          {/* Promo Packet Outline */}
          {review.promo_packet_outline && review.promo_packet_outline.length > 0 && (
            <div className="rounded-2xl border border-gray-100 p-6 bg-white shadow-sm">
              <Title
                level={5}
                className="!mt-0 !mb-4 text-xs font-bold text-gray-900 uppercase tracking-wider"
              >
                Promo Packet Preparation Outline
              </Title>
              <div className="space-y-4">
                {review.promo_packet_outline.map((section) => (
                  <div
                    key={section.section}
                    className="rounded-xl bg-gray-50 border border-gray-100 p-5"
                  >
                    <Text strong className="text-[15px] text-gray-950 block">
                      {section.section}
                    </Text>
                    <Text className="block text-sm text-gray-600 mt-2 leading-relaxed">
                      {section.content_guidance}
                    </Text>
                    <div className="mt-4 border-t border-gray-200/60 pt-4">
                      <ListBlock title="Evidence needed" items={section.evidence_needed} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-center text-xs text-gray-400 pb-6">CareerHub AI · {date}</p>
        </div>
      </div>
    </>
  );
};

export default PromotionReviewPage;

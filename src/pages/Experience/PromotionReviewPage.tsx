import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Tag, Typography } from 'antd';
import { ArrowLeftOutlined, BulbOutlined, RiseOutlined, WarningOutlined } from '@ant-design/icons';
import { getPromotionReviewArtifactByClientId } from '../../utils/aiArtifactStorage';
import type { StoredPromotionReview } from '../../utils/aiArtifactStorage';
import { parseInlineMarkdown } from '../../utils/simpleMarkdown';
import BulkActionHeader from '../../components/BulkActionHeader';
import PromotionReviewChatPanel from './PromotionReviewChatPanel';
import ArtifactHeaderCard from '../../components/ArtifactHeaderCard';

const { Text } = Typography;

const asList = (items?: string[]) =>
  Array.isArray(items) ? items.map((item) => item.trim()).filter(Boolean) : [];

const hasItems = (items?: string[]) => asList(items).length > 0;

const splitSubpoints = (item: string) => {
  const normalized = item.replace(/\s+-\s+/g, '\n- ');
  const [lead, ...subpoints] = normalized
    .split('\n- ')
    .map((part) => part.trim())
    .filter(Boolean);

  return { lead, subpoints };
};

const SmartListItem: React.FC<{ item: string }> = ({ item }) => {
  const { lead, subpoints } = splitSubpoints(item);

  return (
    <li className="text-sm leading-6 text-slate-700">
      <span>{parseInlineMarkdown(lead)}</span>
      {subpoints.length > 0 && (
        <ul className="mt-2 space-y-1.5 border-l border-slate-200 pl-4">
          {subpoints.map((subpoint, index) => (
            <li
              key={`${subpoint}-${index}`}
              className="list-none text-[13px] leading-6 text-slate-600"
            >
              {parseInlineMarkdown(subpoint)}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
};

const ListBlock: React.FC<{ title?: string; items?: string[]; compact?: boolean }> = ({
  title,
  items,
  compact = false,
}) => {
  const rows = asList(items);
  if (!rows.length) return null;
  return (
    <div>
      {title && (
        <Text className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          {title}
        </Text>
      )}
      <ul className={`m-0 list-disc pl-5 ${compact ? 'space-y-1.5' : 'space-y-3'}`}>
        {rows.map((item, index) => (
          <SmartListItem key={`${item}-${index}`} item={item} />
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

const scoreToneClass = (rating: string) => {
  const normalized = rating.toLowerCase();
  if (normalized.includes('strong')) return 'border-l-emerald-500 bg-emerald-50/30';
  if (normalized.includes('solid')) return 'border-l-blue-500 bg-blue-50/30';
  if (normalized.includes('develop')) return 'border-l-amber-500 bg-amber-50/30';
  if (normalized.includes('weak')) return 'border-l-rose-500 bg-rose-50/30';
  return 'border-l-slate-300 bg-white';
};

const checklistToneClass = (status?: string) => {
  const normalized = (status || '').toLowerCase();
  if (normalized.includes('strong')) return 'border-emerald-100 bg-emerald-50/60 text-emerald-950';
  if (normalized.includes('partial')) return 'border-amber-100 bg-amber-50/60 text-amber-950';
  return 'border-slate-200 bg-slate-50 text-slate-700';
};

const SectionHeading: React.FC<{ eyebrow?: string; title: string; description?: string }> = ({
  eyebrow,
  title,
  description,
}) => (
  <div className="mb-5">
    {eyebrow && (
      <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
        {eyebrow}
      </div>
    )}
    <h2 className="m-0 text-xl font-bold tracking-tight text-slate-950">{title}</h2>
    {description && (
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
    )}
  </div>
);

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
        />
      </div>

      {/* Main content body */}
      <div className="min-h-screen bg-slate-50 px-6 py-10 shadow-inner">
        <div className="mx-auto flex max-w-6xl flex-col gap-8">
          {/* Page Title & Meta Header */}
          <ArtifactHeaderCard
            typeLabel="AI Promotion Readiness Review"
            typeIcon={<RiseOutlined />}
            title={result.title}
            date={date}
            subtitle={`${result.roleTitle} @ ${result.companyName}`}
            themeColor="blue"
          />

          {/* Verdict summary block */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="rounded-[1.25rem] border border-slate-200 bg-white p-6 shadow-[0_20px_55px_-46px_rgba(15,23,42,0.7)]">
              <SectionHeading
                eyebrow="Readiness"
                title="Executive Summary"
                description="A cleaned-up narrative view of what is strong, what is missing, and what needs to happen next."
              />
              <p className="m-0 text-[15px] font-medium leading-7 text-slate-800">
                {parseInlineMarkdown(review.readiness_verdict?.summary)}
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-[0_20px_55px_-46px_rgba(15,23,42,0.7)]">
              <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                Current Signal
              </div>
              <div className="mt-5 space-y-4">
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Verdict
                  </div>
                  <Tag
                    color={verdictColor(review.readiness_verdict?.label)}
                    className="m-0 rounded-md px-3 py-1 text-sm font-semibold"
                  >
                    {review.readiness_verdict?.label || 'Promotion review'}
                  </Tag>
                </div>
                <div className="border-t border-slate-100 pt-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Confidence
                  </div>
                  <div className="text-lg font-bold capitalize text-slate-950">
                    {review.readiness_verdict?.confidence || 'unknown'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {review.promotion_prediction && (
            <div className="rounded-[1.25rem] border border-slate-200 bg-white p-6 shadow-[0_20px_55px_-46px_rgba(15,23,42,0.7)]">
              <SectionHeading
                eyebrow="Prediction"
                title="Promotion chances and timing"
                description="A probability estimate grounded in saved evidence, target level, timeline, manager signal, and missing context."
              />
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-center">
                  <div className="text-5xl font-black leading-none text-blue-700">
                    {review.promotion_prediction.probability_percent}%
                  </div>
                  <div className="mt-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
                    {review.promotion_prediction.chance_label} chance
                  </div>
                  <div className="mt-4 border-t border-blue-100 pt-4 text-xs font-semibold capitalize text-blue-900">
                    Confidence: {review.promotion_prediction.confidence}
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        Likely timing
                      </div>
                      <div className="mt-1 text-sm font-bold text-slate-950">
                        {review.promotion_prediction.likely_timeline}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
                      <div className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                        Best case
                      </div>
                      <div className="mt-1 text-sm font-bold text-emerald-950">
                        {review.promotion_prediction.earliest_reasonable_timeline}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
                      <div className="text-[11px] font-bold uppercase tracking-wide text-amber-700">
                        If gaps remain
                      </div>
                      <div className="mt-1 text-sm font-bold text-amber-950">
                        {review.promotion_prediction.latest_likely_timeline}
                      </div>
                    </div>
                  </div>
                  <p className="m-0 text-sm leading-7 text-slate-700">
                    {parseInlineMarkdown(review.promotion_prediction.rationale)}
                  </p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                  <h3 className="m-0 mb-4 text-sm font-bold uppercase tracking-[0.16em] text-slate-700">
                    Assumptions
                  </h3>
                  <ListBlock compact items={review.promotion_prediction.assumptions} />
                </div>
                <div className="rounded-2xl border border-rose-100 bg-rose-50/30 p-5">
                  <h3 className="m-0 mb-4 text-sm font-bold uppercase tracking-[0.16em] text-rose-800">
                    Blockers
                  </h3>
                  <ListBlock compact items={review.promotion_prediction.chance_blockers} />
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/30 p-5">
                  <h3 className="m-0 mb-4 text-sm font-bold uppercase tracking-[0.16em] text-emerald-800">
                    Improvers
                  </h3>
                  <ListBlock compact items={review.promotion_prediction.chance_improvers} />
                </div>
              </div>
            </div>
          )}

          {review.general_calibration &&
            (hasItems(review.general_calibration.heuristics) ||
              hasItems(review.general_calibration.questions_to_validate)) && (
              <div className="rounded-[1.25rem] border border-indigo-100 bg-indigo-50/45 p-6 shadow-[0_20px_55px_-46px_rgba(15,23,42,0.7)]">
                <SectionHeading
                  eyebrow="Calibration"
                  title="General context to validate"
                  description={review.general_calibration.disclaimer}
                />
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  {hasItems(review.general_calibration.heuristics) && (
                    <div className="rounded-2xl border border-indigo-100 bg-white/75 p-5">
                      <h3 className="m-0 mb-4 text-sm font-bold uppercase tracking-[0.16em] text-indigo-800">
                        General heuristics
                      </h3>
                      <ListBlock items={review.general_calibration.heuristics} />
                    </div>
                  )}
                  {hasItems(review.general_calibration.questions_to_validate) && (
                    <div className="rounded-2xl border border-slate-200 bg-white/80 p-5">
                      <h3 className="m-0 mb-4 text-sm font-bold uppercase tracking-[0.16em] text-slate-700">
                        Validate with manager
                      </h3>
                      <ListBlock items={review.general_calibration.questions_to_validate} />
                    </div>
                  )}
                </div>
              </div>
            )}

          {review.readiness_dashboard && (
            <div className="rounded-[1.25rem] border border-slate-200 bg-white p-6 shadow-[0_20px_55px_-46px_rgba(15,23,42,0.7)]">
              <SectionHeading
                eyebrow="Readiness"
                title="Packet and conversation dashboard"
                description="A compact view of whether your evidence is ready to become a promotion packet and whether the manager conversation is calibrated."
              />
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-[190px_240px_minmax(0,1fr)]">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Packet readiness
                  </div>
                  <div className="mt-2 text-4xl font-black leading-none text-slate-950">
                    {review.readiness_dashboard.packet_readiness_score}
                  </div>
                  <div className="mt-2 text-sm font-bold capitalize text-slate-500">
                    {review.readiness_dashboard.packet_readiness_label}
                  </div>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-blue-700">
                    Manager conversation
                  </div>
                  <div className="mt-2 text-base font-black capitalize leading-6 text-blue-950">
                    {review.readiness_dashboard.manager_conversation_readiness}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Confidence explanation
                  </div>
                  <p className="mb-0 mt-2 text-sm leading-7 text-slate-700">
                    {parseInlineMarkdown(review.readiness_dashboard.confidence_explanation)}
                  </p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_0.8fr]">
                <div>
                  <h3 className="m-0 mb-3 text-sm font-bold uppercase tracking-[0.16em] text-slate-700">
                    Evidence checklist
                  </h3>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {review.readiness_dashboard.evidence_checklist.map((item) => (
                      <div
                        key={item.item}
                        className={`rounded-2xl border p-4 ${checklistToneClass(item.status)}`}
                      >
                        <div className="text-[11px] font-bold uppercase tracking-wide">
                          {item.status}
                        </div>
                        <div className="mt-1 text-sm font-bold">{item.item}</div>
                        <p className="mb-0 mt-1 text-xs leading-5 opacity-80">
                          {parseInlineMarkdown(item.note)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/35 p-5">
                  <h3 className="m-0 mb-3 text-sm font-bold uppercase tracking-[0.16em] text-emerald-800">
                    Top odds improvers
                  </h3>
                  <ListBlock items={review.readiness_dashboard.top_odds_improvers.slice(0, 3)} />
                </div>
              </div>
            </div>
          )}

          {/* Evidence overview */}
          <div className="rounded-[1.25rem] border border-slate-200 bg-white p-6 shadow-[0_20px_55px_-46px_rgba(15,23,42,0.7)]">
            <SectionHeading
              eyebrow="Evidence"
              title="What the saved data says"
              description="The report now separates role facts, proof points, and missing promotion signals so the story is easier to scan."
            />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.75fr_1fr_1fr]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                <h3 className="m-0 mb-4 text-sm font-bold uppercase tracking-[0.16em] text-slate-700">
                  Saved Evidence
                </h3>
                <ListBlock compact items={review.evidence_summary?.role_snapshot} />
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/30 p-5">
                <h3 className="m-0 mb-4 text-sm font-bold uppercase tracking-[0.16em] text-emerald-800">
                  Strongest Evidence
                </h3>
                <ListBlock items={review.evidence_summary?.strongest_evidence} />
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50/30 p-5">
                <h3 className="m-0 mb-4 text-sm font-bold uppercase tracking-[0.16em] text-amber-800">
                  Missing Context
                </h3>
                <ListBlock items={review.evidence_summary?.missing_context} />
              </div>
            </div>
          </div>

          {/* Quality Assessment note */}
          {review.evidence_summary?.data_quality_note && (
            <div className="rounded-[1.25rem] border border-blue-100 bg-blue-50/60 p-5 text-sm leading-7 text-blue-950">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
                <BulbOutlined />
                Evidence Quality Note
              </div>
              {parseInlineMarkdown(review.evidence_summary.data_quality_note)}
            </div>
          )}

          <PromotionReviewChatPanel
            review={result}
            onReviewUpdated={setResult}
            variant="floating"
          />

          {/* 10-Dimension Scores */}
          {review.dimension_scores && review.dimension_scores.length > 0 && (
            <div className="rounded-[1.25rem] border border-slate-200 bg-white p-6 shadow-[0_20px_55px_-46px_rgba(15,23,42,0.7)]">
              <SectionHeading
                eyebrow="Evaluation"
                title="Promotion dimensions"
                description="Each dimension keeps the rating compact, then separates proof, gaps, and the next useful move."
              />
              <div className="grid grid-cols-1 gap-4">
                {review.dimension_scores.map((score) => (
                  <div
                    key={score.dimension}
                    className={`rounded-2xl border border-slate-200 border-l-4 p-5 ${scoreToneClass(
                      score.rating
                    )}`}
                  >
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="m-0 text-base font-bold text-slate-950">
                          {score.dimension}
                        </h3>
                        <div className="mt-1 text-xs font-medium capitalize text-slate-500">
                          Confidence: {score.confidence}
                        </div>
                      </div>
                      <Tag
                        color={ratingClass(score.rating)}
                        className="m-0 rounded-md px-3 py-1 text-sm font-semibold capitalize"
                      >
                        {score.rating}
                      </Tag>
                    </div>
                    {(hasItems(score.supporting_evidence) || hasItems(score.missing_evidence)) && (
                      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                        {hasItems(score.supporting_evidence) && (
                          <div>
                            <ListBlock items={score.supporting_evidence} />
                          </div>
                        )}
                        {hasItems(score.missing_evidence) && (
                          <div>
                            <ListBlock title="Missing evidence" items={score.missing_evidence} />
                          </div>
                        )}
                      </div>
                    )}
                    {score.how_to_strengthen && (
                      <div className="mt-4 rounded-xl border border-slate-200 bg-white/75 px-4 py-3 text-[13px] leading-6 text-slate-700">
                        <BulbOutlined className="mr-1.5 inline-block align-middle text-sm text-amber-500" />
                        <span className="inline align-middle">
                          <strong className="text-slate-950">Next action:</strong>{' '}
                          {parseInlineMarkdown(score.how_to_strengthen)}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Manager Conversation Strategy */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_0.85fr]">
            <div className="rounded-[1.25rem] border border-slate-200 bg-white p-6 shadow-[0_20px_55px_-46px_rgba(15,23,42,0.7)]">
              <SectionHeading eyebrow="Manager" title="Conversation strategy" />
              <p className="mb-5 mt-0 text-sm leading-7 text-slate-700">
                {parseInlineMarkdown(review.manager_conversation?.recommendation)}
              </p>
              <ListBlock
                title="Talking points"
                items={review.manager_conversation?.talking_points}
              />
            </div>
            <div className="rounded-[1.25rem] border border-slate-200 bg-white p-6 shadow-[0_20px_55px_-46px_rgba(15,23,42,0.7)]">
              <SectionHeading eyebrow="1:1" title="Questions to ask" />
              <ListBlock title="Questions" items={review.manager_conversation?.questions_to_ask} />
            </div>
          </div>

          {/* Email/Slack Draft Template */}
          {review.manager_conversation?.draft_message && (
            <div className="rounded-[1.25rem] border border-slate-200 bg-white p-6 shadow-[0_20px_55px_-46px_rgba(15,23,42,0.7)]">
              <SectionHeading eyebrow="Draft" title="Email or Slack message" />
              <div className="whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm leading-7 text-slate-800">
                {parseInlineMarkdown(review.manager_conversation.draft_message)}
              </div>
            </div>
          )}

          {/* Growth Plan 30/60/90 Days */}
          {review.growth_plan &&
            (hasItems(review.growth_plan.next_30_days) ||
              hasItems(review.growth_plan.next_60_days) ||
              hasItems(review.growth_plan.next_90_days)) && (
              <div className="rounded-[1.25rem] border border-slate-200 bg-white p-6 shadow-[0_20px_55px_-46px_rgba(15,23,42,0.7)]">
                <SectionHeading
                  eyebrow="Plan"
                  title="30 / 60 / 90 day moves"
                  description="Turn the review into concrete promotion evidence instead of letting it stay as advice."
                />
                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                  {hasItems(review.growth_plan.next_30_days) && (
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/35 p-5">
                      <h3 className="m-0 mb-4 text-sm font-bold uppercase tracking-[0.16em] text-blue-800">
                        Next 30 Days
                      </h3>
                      <ListBlock items={review.growth_plan.next_30_days} />
                    </div>
                  )}
                  {hasItems(review.growth_plan.next_60_days) && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                      <h3 className="m-0 mb-4 text-sm font-bold uppercase tracking-[0.16em] text-slate-700">
                        Next 60 Days
                      </h3>
                      <ListBlock items={review.growth_plan.next_60_days} />
                    </div>
                  )}
                  {hasItems(review.growth_plan.next_90_days) && (
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/35 p-5">
                      <h3 className="m-0 mb-4 text-sm font-bold uppercase tracking-[0.16em] text-emerald-800">
                        Next 90 Days
                      </h3>
                      <ListBlock items={review.growth_plan.next_90_days} />
                    </div>
                  )}
                </div>
              </div>
            )}

          {/* Promo Packet Outline */}
          {review.promo_packet_outline && review.promo_packet_outline.length > 0 && (
            <div className="rounded-[1.25rem] border border-slate-200 bg-white p-6 shadow-[0_20px_55px_-46px_rgba(15,23,42,0.7)]">
              <SectionHeading eyebrow="Packet" title="Promotion packet outline" />
              <div className="space-y-4">
                {review.promo_packet_outline.map((section) => (
                  <div
                    key={section.section}
                    className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5"
                  >
                    <h3 className="m-0 text-[15px] font-bold text-slate-950">
                      {parseInlineMarkdown(section.section)}
                    </h3>
                    <p className="mb-0 mt-2 text-sm leading-7 text-slate-600">
                      {parseInlineMarkdown(section.content_guidance)}
                    </p>
                    <div className="mt-4 border-t border-slate-200 pt-4">
                      <ListBlock title="Evidence needed" items={section.evidence_needed} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="pb-6 text-center text-xs text-slate-400">CareerHub AI · {date}</p>
        </div>
      </div>
    </>
  );
};

export default PromotionReviewPage;

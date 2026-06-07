import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Input, Modal, Spin, Tag, Typography, message } from 'antd';
import {
  BulbOutlined,
  CheckCircleOutlined,
  MessageOutlined,
  RiseOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { Experience } from '../../types';
import { Link } from 'react-router-dom';
import {
  generatePromotionReviewWithBrowserAI,
  type PromotionReviewContext,
  type PromotionReviewResult,
} from '../../lib/browserAi';
import { isLLMConfigurationError } from '../../lib/llmClient';
import {
  syncPromotionReviewArtifact,
  loadPromotionReviewsFromArtifacts,
  type StoredPromotionReview,
} from '../../utils/aiArtifactStorage';

const { Text, Title } = Typography;
const { TextArea } = Input;

const optionalFieldGroups: Array<{
  title: string;
  fields: Array<{
    key: keyof PromotionReviewContext;
    label: string;
    placeholder: string;
    rows?: number;
  }>;
}> = [
  {
    title: 'Target',
    fields: [
      {
        key: 'targetLevel',
        label: 'Target level',
        placeholder: 'Senior Software Engineer, L5, Staff',
      },
      {
        key: 'targetTitle',
        label: 'Target title',
        placeholder: 'Senior Backend Engineer',
      },
      {
        key: 'promotionTimeline',
        label: 'Timeline',
        placeholder: 'Promo cycle, target conversation date',
      },
    ],
  },
  {
    title: 'Evidence',
    fields: [
      {
        key: 'recentWork',
        label: 'Recent work',
        placeholder: 'Projects, launches, incidents, process improvements, or wins',
        rows: 3,
      },
      {
        key: 'measurableImpact',
        label: 'Measurable impact',
        placeholder: 'Metrics, revenue, latency, adoption, cost savings, quality improvements',
        rows: 3,
      },
      {
        key: 'leadershipExamples',
        label: 'Leadership',
        placeholder: 'Mentoring, project leadership, technical direction, unblocking others',
        rows: 3,
      },
      {
        key: 'crossFunctionalWork',
        label: 'Cross-functional work',
        placeholder: 'Product, design, data, infra, leadership, partner teams, customers',
        rows: 3,
      },
    ],
  },
  {
    title: 'Manager context',
    fields: [
      {
        key: 'managerFeedback',
        label: 'Manager feedback',
        placeholder: 'Direct feedback, performance review notes, expectations',
        rows: 3,
      },
      {
        key: 'concerns',
        label: 'Concerns',
        placeholder: 'Gaps, politics, timing, manager concerns',
        rows: 3,
      },
      {
        key: 'companyRubric',
        label: 'Company rubric or promo notes',
        placeholder: 'Paste leveling expectations or promo packet notes',
        rows: 4,
      },
    ],
  },
];

const asList = (items?: string[]) => (Array.isArray(items) ? items.filter(Boolean) : []);

const ListBlock: React.FC<{ items?: string[]; empty?: string }> = ({ items, empty }) => {
  const rows = asList(items);
  if (!rows.length) return <Text type="secondary">{empty || 'No items provided.'}</Text>;
  return (
    <ul className="m-0 pl-5 space-y-1.5">
      {rows.map((item, index) => (
        <li key={`${item}-${index}`} className="text-sm leading-relaxed text-gray-700">
          {item}
        </li>
      ))}
    </ul>
  );
};

const ContextField: React.FC<{
  field: (typeof optionalFieldGroups)[number]['fields'][number];
  value: string;
  onChange: (value: string) => void;
}> = ({ field, value, onChange }) => (
  <label className={field.rows && field.rows >= 4 ? 'md:col-span-2 block' : 'block'}>
    <span className="mb-2 block text-[12px] font-semibold uppercase tracking-wide text-slate-500">
      {field.label}
    </span>
    {field.rows ? (
      <TextArea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.placeholder}
        rows={field.rows}
        className="!rounded-xl !border-slate-200 !bg-white !px-3.5 !py-3 !text-[14px] !leading-relaxed shadow-[0_1px_0_rgba(15,23,42,0.03)] placeholder:!text-slate-400 hover:!border-slate-300 focus:!border-slate-400 focus:!shadow-none"
      />
    ) : (
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.placeholder}
        className="!h-11 !rounded-xl !border-slate-200 !bg-white !px-3.5 !text-[14px] shadow-[0_1px_0_rgba(15,23,42,0.03)] placeholder:!text-slate-400 hover:!border-slate-300 focus:!border-slate-400 focus:!shadow-none"
      />
    )}
  </label>
);

const EvidenceRow: React.FC<{ label: string; tone?: 'good' | 'muted' }> = ({
  label,
  tone = 'muted',
}) => (
  <div className="flex items-start gap-3 rounded-xl border border-slate-200/70 bg-white px-3.5 py-3">
    <div
      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
        tone === 'good' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
      }`}
    >
      <CheckCircleOutlined className="text-[12px]" />
    </div>
    <span className="text-sm font-medium leading-6 text-slate-700">{label}</span>
  </div>
);

const PromotionReviewResultView: React.FC<{
  result: PromotionReviewResult;
  activeReviewId: string | null;
}> = ({ result, activeReviewId }) => (
  <div className="space-y-6">
    {/* Question 1: Am I qualified for promotion? */}
    <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-6 shadow-sm">
      <Title
        level={4}
        className="!mt-0 !mb-4 !text-base !font-bold text-blue-900 flex items-center gap-2"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
          1
        </span>
        Am I qualified for promotion?
      </Title>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Tag
          color="blue"
          className="m-0 font-semibold px-2.5 py-0.5 rounded-md text-sm border-blue-200"
        >
          {result.readiness_verdict?.label || 'Promotion review'}
        </Tag>
        <Tag className="m-0 px-2.5 py-0.5 rounded-md text-xs border-gray-200">
          Confidence: {result.readiness_verdict?.confidence || 'unknown'}
        </Tag>
      </div>
      <Text className="text-gray-800 text-[15px] leading-relaxed block font-medium">
        {result.readiness_verdict?.summary}
      </Text>
    </div>

    {/* Question 2: How am I standing right now? */}
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
      <Title
        level={4}
        className="!mt-0 !mb-2 !text-base !font-bold text-slate-900 flex items-center gap-2"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
          2
        </span>
        How am I standing right now?
      </Title>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-xl border border-gray-100 bg-slate-50/50 p-5">
          <Title
            level={5}
            className="!mt-0 !mb-3 text-[12px] font-bold text-gray-500 uppercase tracking-wider"
          >
            Strongest Evidence
          </Title>
          <ListBlock items={result.evidence_summary?.strongest_evidence} />
        </div>
        <div className="rounded-xl border border-gray-100 bg-slate-50/50 p-5">
          <Title
            level={5}
            className="!mt-0 !mb-3 text-[12px] font-bold text-gray-500 uppercase tracking-wider"
          >
            Missing Context / Gaps
          </Title>
          <ListBlock items={result.evidence_summary?.missing_context} />
        </div>
      </div>

      {result.evidence_summary?.data_quality_note && (
        <Alert
          type="info"
          showIcon
          message="Evidence Quality Assessment"
          description={result.evidence_summary.data_quality_note}
          className="!rounded-xl !border-slate-100 !bg-slate-50/80"
        />
      )}
    </div>

    {/* Question 3: What do I need to do? */}
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
      <Title
        level={4}
        className="!mt-0 !mb-2 !text-base !font-bold text-slate-900 flex items-center gap-2"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
          3
        </span>
        What do I need to do?
      </Title>

      {result.growth_plan?.next_30_days && result.growth_plan.next_30_days.length > 0 && (
        <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-5">
          <Title
            level={5}
            className="!mt-0 !mb-3 text-[12px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5"
          >
            <RiseOutlined /> Immediate Next 30 Days Action Items
          </Title>
          <ListBlock items={result.growth_plan.next_30_days} />
        </div>
      )}

      <div className="space-y-4">
        <div>
          <Title
            level={5}
            className="!mt-0 !mb-2 text-[12px] font-bold text-gray-500 uppercase tracking-wider"
          >
            Manager Strategy & Guidance
          </Title>
          <Text className="text-gray-700 text-sm leading-relaxed block">
            {result.manager_conversation?.recommendation}
          </Text>
        </div>

        {result.manager_conversation?.draft_message && (
          <div className="space-y-2">
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
              Quick Email/Slack Template
            </Text>
            <div className="relative rounded-xl bg-slate-50 border border-slate-100 p-4 text-[13px] leading-relaxed text-gray-800 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
              {result.manager_conversation.draft_message}
            </div>
          </div>
        )}
      </div>
    </div>

    {/* View Detailed Breakdown Footer Banner */}
    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5 shadow-sm flex items-start gap-3">
      <BulbOutlined className="text-indigo-600 text-lg mt-0.5 shrink-0" />
      <div>
        <Text strong className="text-indigo-950 text-[15px] block">
          Full Detailed Breakdown Available
        </Text>
        <Text className="text-sm text-indigo-800 block mt-1 leading-relaxed">
          The full 10-dimension evaluation (Impact, Leadership, Strategic Judgment, etc.),
          30/60/90-day growth plans, and promotion packet outlines have been automatically saved to
          your account.
        </Text>
        <Link
          to={
            activeReviewId
              ? `/promotion-review/${activeReviewId}`
              : '/ai-tools?tab=promotion-reviews'
          }
          className="text-[13px] font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 mt-3"
        >
          {activeReviewId
            ? 'View Full Detailed Review →'
            : 'View Full Detailed Review in AI Tools →'}
        </Link>
      </div>
    </div>
  </div>
);

interface PromotionReviewModalProps {
  open: boolean;
  experience: Experience | null;
  onClose: () => void;
}

const PromotionReviewModal: React.FC<PromotionReviewModalProps> = ({
  open,
  experience,
  onClose,
}) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [context, setContext] = useState<PromotionReviewContext>({});
  const [result, setResult] = useState<PromotionReviewResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(true);
  const [historyReviews, setHistoryReviews] = useState<StoredPromotionReview[]>([]);
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);

  const loadHistory = async (shouldAutoSelectLatest = false) => {
    if (!experience?.id) return;
    try {
      const allReviews = await loadPromotionReviewsFromArtifacts();
      const filtered = allReviews.filter((r) => r.sourceExperienceId === experience.id);
      filtered.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
      setHistoryReviews(filtered);

      if (shouldAutoSelectLatest && filtered.length > 0) {
        const latest = filtered[0];
        setResult(latest.review);
        setContext(latest.inputContext || {});
        setActiveReviewId(latest.id);
        setIsEditing(false);
      }
    } catch (err) {
      console.error('Failed to load review history', err);
    }
  };

  useEffect(() => {
    if (open && experience) {
      setResult(null);
      setIsEditing(true);
      setContext({});
      setActiveReviewId(null);
      void loadHistory(true);
    }
  }, [open, experience]);

  const evidenceFacts = useMemo(() => {
    if (!experience) return [];
    return [
      `${experience.title} at ${experience.company}`,
      `${experience.start_date || 'Unknown start'} to ${experience.is_current ? 'Present' : experience.end_date || 'Unknown end'}`,
      experience.description?.trim() ? 'Description is saved' : 'No description saved',
      experience.skills?.length ? `${experience.skills.length} skills saved` : 'No skills saved',
      experience.team_history?.length
        ? `${experience.team_history.length} team history entries`
        : 'No team history saved',
      experience.schedule_phases?.length
        ? `${experience.schedule_phases.length} schedule phases`
        : 'No schedule phases saved',
    ];
  }, [experience]);

  const updateContext = (key: keyof PromotionReviewContext, value: string) => {
    setContext((prev) => ({ ...prev, [key]: value }));
  };

  const handleGenerate = async () => {
    if (!experience?.id) return;
    setGenerating(true);
    try {
      const review = await generatePromotionReviewWithBrowserAI({ experience, context });
      const savedAt = new Date().toISOString();
      const stored: StoredPromotionReview = {
        id: `promotion-review-${experience.id}-${Date.now()}`,
        title: `Promotion Review - ${experience.title} @ ${experience.company}`,
        companyName: experience.company,
        roleTitle: experience.title,
        sourceExperienceId: experience.id,
        inputContext: context,
        review,
        savedAt,
      };
      await syncPromotionReviewArtifact(stored);
      setResult(review);
      setActiveReviewId(stored.id);
      setIsEditing(false);
      messageApi.success('Promotion review saved');
      void loadHistory(false);
    } catch (error) {
      messageApi.error(
        isLLMConfigurationError(error)
          ? 'Check Settings > AI Provider before generating a promotion review.'
          : error instanceof Error
            ? error.message
            : 'Failed to generate promotion review'
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Modal
      title={null}
      open={open}
      onCancel={onClose}
      width={1080}
      className="[&_.ant-modal-content]:!overflow-hidden [&_.ant-modal-content]:!p-0"
      styles={{
        body: { padding: 0 },
      }}
      footer={null}
      destroyOnClose={false}
    >
      {contextHolder}
      {!experience ? null : (
        <div className="bg-slate-50">
          <div className="border-b border-slate-200 bg-white px-7 pb-5 pt-6">
            <div className="flex flex-col gap-4 pr-8 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-[0_12px_24px_-16px_rgba(15,23,42,0.7)]">
                  <RiseOutlined />
                </div>
                <Title level={3} className="!m-0 !text-[24px] !font-bold !tracking-tight">
                  Promotion Readiness Review
                </Title>
                <Text className="mt-1 block text-sm text-slate-500">
                  {experience.title} @ {experience.company}
                </Text>
              </div>
              <div className="flex flex-wrap gap-2">
                <Tag className="m-0 rounded-full border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                  Saved evidence first
                </Tag>
                <Tag className="m-0 rounded-full border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                  Rubric optional
                </Tag>
              </div>
            </div>
          </div>

          <div className="max-h-[72vh] overflow-y-auto">
            <div className="grid grid-cols-1 gap-0 lg:grid-cols-[330px_minmax(0,1fr)]">
              <aside className="border-b border-slate-200 bg-slate-100/70 p-6 lg:border-b-0 lg:border-r">
                <div className="sticky top-0 space-y-5">
                  <div>
                    <Text className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Role snapshot
                    </Text>
                    <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_14px_32px_-24px_rgba(15,23,42,0.45)]">
                      <Text className="block text-base font-bold text-slate-900">
                        {experience.title}
                      </Text>
                      <Text className="mt-1 block text-sm text-slate-500">
                        {experience.company}
                      </Text>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Tag className="m-0 rounded-full border-0 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {experience.is_current ? 'Current role' : 'Past role'}
                        </Tag>
                        {experience.location && (
                          <Tag className="m-0 rounded-full border-0 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            {experience.location}
                          </Tag>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <Text className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Baseline evidence
                    </Text>
                    <div className="mt-3 space-y-2.5">
                      {evidenceFacts.map((fact) => (
                        <EvidenceRow
                          key={fact}
                          label={fact}
                          tone={
                            fact.startsWith('No ') || fact.includes('Unknown') ? 'muted' : 'good'
                          }
                        />
                      ))}
                    </div>
                  </div>

                  {historyReviews.length > 0 && (
                    <div>
                      <Text className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        Review History
                      </Text>
                      <div className="mt-3 space-y-2 max-h-48 overflow-y-auto pr-1">
                        {historyReviews.map((r) => {
                          const dateStr = new Date(r.savedAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          });
                          const isActive = r.id === activeReviewId;
                          return (
                            <button
                              key={r.id}
                              onClick={() => {
                                setResult(r.review);
                                setContext(r.inputContext || {});
                                setActiveReviewId(r.id);
                                setIsEditing(false);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex flex-col gap-0.5 border ${
                                isActive
                                  ? 'bg-blue-50 border-blue-200 text-blue-800'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                              }`}
                            >
                              <span className="font-semibold block truncate">
                                {r.review.readiness_verdict?.label || 'Review'} (
                                {r.review.readiness_verdict?.confidence || 'unknown'})
                              </span>
                              <span className="text-[10px] text-slate-400 font-normal">
                                {dateStr}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="rounded-2xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                    <WarningOutlined className="mr-2 text-amber-600" />
                    Thin saved evidence becomes a gap in the review, not an invented strength.
                  </div>
                </div>
              </aside>

              <main className="space-y-6 bg-white p-6 md:p-7">
                {isEditing ? (
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.55)]">
                    <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <Text className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                          Optional context
                        </Text>
                        <Title level={4} className="!mb-0 !mt-1 !text-lg !tracking-tight">
                          Add anything CareerHub has not captured yet
                        </Title>
                      </div>
                      <Text className="text-sm text-slate-500">All fields are optional</Text>
                    </div>

                    <div className="space-y-7">
                      {optionalFieldGroups.map((group) => (
                        <section key={group.title} className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="h-px flex-1 bg-slate-200" />
                            <Text className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                              {group.title}
                            </Text>
                            <div className="h-px flex-1 bg-slate-200" />
                          </div>
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {group.fields.map((field) => (
                              <ContextField
                                key={field.key}
                                field={field}
                                value={context[field.key] || ''}
                                onChange={(value) => updateContext(field.key, value)}
                              />
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>
                  </div>
                ) : (
                  result && (
                    <PromotionReviewResultView result={result} activeReviewId={activeReviewId} />
                  )
                )}

                {generating && (
                  <div className="flex items-center justify-center rounded-3xl border border-slate-200 bg-slate-50 py-14">
                    <Spin tip="Evaluating promotion evidence..." />
                  </div>
                )}

                {!result && !generating && (
                  <Alert
                    type="warning"
                    showIcon
                    icon={<WarningOutlined />}
                    className="!rounded-2xl !border-amber-200 !bg-amber-50"
                    message="Evidence-aware review"
                    description="If saved Experience details are thin, the result will call out missing evidence instead of guessing."
                  />
                )}
              </main>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-white px-7 py-4">
            <Button className="!h-10 !rounded-xl !px-5" onClick={onClose}>
              Close
            </Button>
            {result && !isEditing ? (
              <Button
                type="default"
                onClick={() => setIsEditing(true)}
                className="!h-10 !rounded-xl !px-5 !font-semibold"
              >
                Edit Context & Regenerate
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<MessageOutlined />}
                loading={generating}
                disabled={!experience?.id}
                onClick={handleGenerate}
                className="!h-10 !rounded-xl !px-5 !font-semibold"
              >
                {result ? 'Regenerate Review' : 'Generate Review'}
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};

export default PromotionReviewModal;

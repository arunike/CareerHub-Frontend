import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Input, Progress, Spin, Tag, Typography, message } from 'antd';
import Modal from '../../components/MobileModal';
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
  buildPromotionReviewMessages,
  generatePromotionClarifyingQuestions,
  type PromotionClarifyingQuestion,
  type PromotionReviewContext,
  type PromotionReviewResult,
} from '../../lib/browserAi';
import {
  getPromotionReviewArtifactByClientId,
  loadPromotionReviewsFromArtifacts,
  type StoredPromotionReview,
} from '../../utils/aiArtifactStorage';
import { parseInlineMarkdown } from '../../utils/simpleMarkdown';
import { createAIArtifactGenerationJob, getAIArtifactGenerationJob } from '../../api';

const { Text, Title } = Typography;
const { TextArea } = Input;

const generationStageProgress = {
  starting: 8,
  queued: 18,
  running: 58,
  saving: 88,
} as const;

type GenerationStage = keyof typeof generationStageProgress;

const formatElapsedSeconds = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes <= 0) return `${remainingSeconds}s`;
  return `${minutes}m ${remainingSeconds.toString().padStart(2, '0')}s`;
};

const optionalFieldGroups: Array<{
  title: string;
  fields: Array<{
    key: keyof PromotionReviewContext;
    label: string;
    placeholder: string;
    rows?: number;
    required?: boolean;
  }>;
}> = [
  {
    title: 'Target',
    fields: [
      {
        key: 'currentLevel',
        label: 'Current title / level',
        placeholder: 'Software Engineer I, E4, L4, Senior Software Engineer',
      },
      {
        key: 'targetTitle',
        label: 'Target title / level',
        placeholder: 'Senior Software Engineer / E5',
        required: true,
      },
      {
        key: 'promotionTimeline',
        label: 'Timeline',
        placeholder: 'Next cycle, within 6 months, Q1 2027, not sure',
        required: true,
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

const buildDefaultPromotionContext = (experience: Experience): PromotionReviewContext => ({
  currentLevel: experience.title || '',
  targetTitle: '',
  promotionTimeline: '',
});

const checklistToneClass = (status?: string) => {
  const normalized = (status || '').toLowerCase();
  if (normalized.includes('strong')) return 'border-emerald-100 bg-emerald-50 text-emerald-900';
  if (normalized.includes('partial')) return 'border-amber-100 bg-amber-50 text-amber-950';
  return 'border-slate-200 bg-slate-50 text-slate-700';
};

const ListBlock: React.FC<{ items?: string[]; empty?: string }> = ({ items, empty }) => {
  const rows = asList(items);
  if (!rows.length) return <Text type="secondary">{empty || 'No items provided.'}</Text>;
  return (
    <ul className="m-0 pl-5 space-y-1.5">
      {rows.map((item, index) => (
        <li key={`${item}-${index}`} className="text-sm leading-relaxed text-gray-700">
          {parseInlineMarkdown(item)}
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
      {field.required && <span className="ml-1 text-blue-600">Required</span>}
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
  historyReviews: StoredPromotionReview[];
}> = ({ activeReviewId, result, historyReviews }) => (
  <div className="space-y-6">
    {result.promotion_prediction && (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <Text className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Prediction
            </Text>
            <Title level={4} className="!mb-0 !mt-1 !text-base !font-bold text-slate-950">
              Promotion chances and timing
            </Title>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-3 text-center">
            <div className="text-3xl font-black leading-none text-blue-700">
              {result.promotion_prediction.probability_percent}%
            </div>
            <div className="mt-1 text-xs font-bold uppercase tracking-wide text-blue-700">
              {result.promotion_prediction.chance_label} chance
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <Text className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Likely
            </Text>
            <Text className="mt-1 block text-sm font-bold text-slate-950">
              {result.promotion_prediction.likely_timeline}
            </Text>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
            <Text className="block text-[11px] font-bold uppercase tracking-wide text-emerald-700">
              Best case
            </Text>
            <Text className="mt-1 block text-sm font-bold text-emerald-950">
              {result.promotion_prediction.earliest_reasonable_timeline}
            </Text>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
            <Text className="block text-[11px] font-bold uppercase tracking-wide text-amber-700">
              If gaps remain
            </Text>
            <Text className="mt-1 block text-sm font-bold text-amber-950">
              {result.promotion_prediction.latest_likely_timeline}
            </Text>
          </div>
        </div>
        <p className="mb-0 mt-4 text-sm leading-6 text-slate-700">
          {parseInlineMarkdown(result.promotion_prediction.rationale)}
        </p>
        {historyReviews.filter((review) => review.review?.promotion_prediction).length > 1 && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <Text className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Prediction history
            </Text>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {historyReviews
                .filter((review) => review.review?.promotion_prediction)
                .slice(0, 5)
                .reverse()
                .map((review) => (
                  <Tag
                    key={review.id}
                    className={`m-0 rounded-full px-3 py-1 text-xs font-bold ${
                      review.id === activeReviewId
                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    {review.review.promotion_prediction?.probability_percent}%
                  </Tag>
                ))}
            </div>
          </div>
        )}
      </div>
    )}

    {result.readiness_dashboard && (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <Text className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Readiness dashboard
            </Text>
            <Title level={4} className="!mb-0 !mt-1 !text-base !font-bold text-slate-950">
              Packet and conversation readiness
            </Title>
          </div>
          <Tag className="m-0 rounded-full px-3 py-1 text-xs font-bold capitalize">
            {result.readiness_dashboard.manager_conversation_readiness}
          </Tag>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[150px_minmax(0,1fr)]">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <Text className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Packet score
            </Text>
            <div className="mt-1 text-3xl font-black leading-none text-slate-950">
              {result.readiness_dashboard.packet_readiness_score}
            </div>
            <div className="mt-1 text-xs font-bold capitalize text-slate-500">
              {result.readiness_dashboard.packet_readiness_label}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <Text className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Why confidence is what it is
            </Text>
            <p className="mb-0 mt-1 text-sm leading-6 text-slate-700">
              {parseInlineMarkdown(result.readiness_dashboard.confidence_explanation)}
            </p>
          </div>
        </div>
        {result.readiness_dashboard.top_odds_improvers?.length > 0 && (
          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
            <Text className="block text-[11px] font-bold uppercase tracking-wide text-blue-700">
              Fastest ways to raise odds
            </Text>
            <ListBlock items={result.readiness_dashboard.top_odds_improvers.slice(0, 3)} />
          </div>
        )}
        {result.readiness_dashboard.evidence_checklist?.length > 0 && (
          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
            {result.readiness_dashboard.evidence_checklist.slice(0, 6).map((item) => (
              <div
                key={item.item}
                className={`rounded-xl border px-3 py-2 ${checklistToneClass(item.status)}`}
              >
                <div className="text-xs font-bold capitalize">{item.status}</div>
                <div className="mt-0.5 text-sm font-semibold">{item.item}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    )}

    {/* View Detailed Breakdown Footer Banner */}
    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5 shadow-sm flex items-start gap-3">
      <BulbOutlined className="text-indigo-600 text-lg mt-0.5 shrink-0" />
      <div>
        <Text strong className="text-indigo-950 text-[15px] block">
          Continue on the full review page
        </Text>
        <Text className="text-sm text-indigo-800 block mt-1 leading-relaxed">
          Open the full detailed review for evidence, 30/60/90 actions, manager talking points, and
          the follow-up coach chat.
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
  const [jobStatusText, setJobStatusText] = useState('');
  const [generationStage, setGenerationStage] = useState<GenerationStage>('starting');
  const [generationElapsedSeconds, setGenerationElapsedSeconds] = useState(0);
  const [clarifying, setClarifying] = useState(false);
  const [clarifyingQuestions, setClarifyingQuestions] = useState<PromotionClarifyingQuestion[]>([]);
  const [clarificationAnswers, setClarificationAnswers] = useState<Record<string, string>>({});
  const pollingRunRef = useRef(0);

  const loadHistory = useCallback(
    async (shouldAutoSelectLatest = false) => {
      if (!experience?.id) return;
      try {
        const allReviews = await loadPromotionReviewsFromArtifacts();
        const filtered = allReviews.filter((r) => r.sourceExperienceId === experience.id);
        filtered.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
        setHistoryReviews(filtered);

        if (shouldAutoSelectLatest && filtered.length > 0) {
          const latest = filtered[0];
          setResult(latest.review);
          setContext({
            ...(latest.inputContext || {}),
            currentLevel: buildDefaultPromotionContext(experience).currentLevel,
          });
          setActiveReviewId(latest.id);
          setIsEditing(false);
        }
      } catch (err) {
        console.error('Failed to load review history', err);
      }
    },
    [experience]
  );

  useEffect(() => {
    if (open && experience) {
      pollingRunRef.current += 1;
      setResult(null);
      setIsEditing(true);
      setContext(buildDefaultPromotionContext(experience));
      setActiveReviewId(null);
      setJobStatusText('');
      setGenerationStage('starting');
      setGenerationElapsedSeconds(0);
      setClarifying(false);
      setClarifyingQuestions([]);
      setClarificationAnswers({});
      void loadHistory(true);
    } else if (!open) {
      pollingRunRef.current += 1;
    }
  }, [experience, loadHistory, open]);

  useEffect(() => {
    if (!generating) {
      setGenerationElapsedSeconds(0);
      return;
    }

    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setGenerationElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [generating]);

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

  const updateClarificationAnswer = (id: string, value: string) => {
    setClarificationAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const validateRequiredContext = () => {
    if (!context.targetTitle?.trim()) {
      messageApi.warning('Add the target title / level so the prediction has a real bar.');
      return false;
    }
    if (!context.promotionTimeline?.trim()) {
      messageApi.warning('Add a promotion timeline, even if it is just "not sure".');
      return false;
    }
    return true;
  };

  const buildClarificationSummary = () => {
    const lines = clarifyingQuestions
      .map((question, index) => {
        const answer = clarificationAnswers[question.id]?.trim();
        if (!answer) return '';
        return `${index + 1}. ${question.question}\nAnswer: ${answer}`;
      })
      .filter(Boolean);

    return lines.length ? lines.join('\n\n') : '';
  };

  const buildContextForGeneration = (): PromotionReviewContext => {
    const clarificationSummary = buildClarificationSummary();
    return clarificationSummary
      ? { ...context, clarificationAnswers: clarificationSummary }
      : context;
  };

  const generationProgress = useMemo(() => {
    const stageBase = generationStageProgress[generationStage];
    if (generationStage !== 'running') return stageBase;
    return Math.min(84, stageBase + Math.floor(generationElapsedSeconds / 8));
  }, [generationElapsedSeconds, generationStage]);

  const pollGenerationJob = async (jobId: number, clientId: string, runId: number) => {
    setGenerationStage('queued');
    setJobStatusText('Queued. CareerHub is preparing the detailed review.');

    for (let attempt = 0; attempt < 120; attempt += 1) {
      if (pollingRunRef.current !== runId) return;
      await new Promise((resolve) => window.setTimeout(resolve, attempt === 0 ? 1200 : 3000));
      if (pollingRunRef.current !== runId) return;

      const response = await getAIArtifactGenerationJob(jobId);
      const job = response.data;

      if (job.status === 'QUEUED') {
        setGenerationStage('queued');
        setJobStatusText('Queued. Waiting for the AI worker to pick this up.');
        continue;
      }
      if (job.status === 'RUNNING') {
        setGenerationStage('running');
        setJobStatusText('Generating a detailed promotion prediction and evidence review...');
        continue;
      }
      if (job.status === 'FAILED') {
        throw new Error(
          job.error_message ||
            'Promotion review generation failed. Check the AI provider settings and try again.'
        );
      }

      setGenerationStage('saving');
      setJobStatusText('Saving the completed review to your AI Tools history...');
      const stored = await getPromotionReviewArtifactByClientId(
        job.artifact_client_id || job.result_payload.artifact_client_id || clientId
      );
      if (!stored)
        throw new Error('Promotion review finished, but the saved artifact was not found.');

      setResult(stored.review);
      setActiveReviewId(stored.id);
      setIsEditing(false);
      setJobStatusText('');
      messageApi.success('Promotion review saved');
      void loadHistory(false);
      return;
    }

    throw new Error(
      'Promotion review is still running. You can close this and check Review History later.'
    );
  };

  const handleClarify = async () => {
    if (!experience?.id) return;
    if (!validateRequiredContext()) return;
    setClarifying(true);
    try {
      const questions = await generatePromotionClarifyingQuestions({ experience, context });
      setClarifyingQuestions(questions);
      setClarificationAnswers({});
      if (!questions.length) {
        messageApi.info('No extra questions needed. You can generate the review now.');
      }
    } catch (error) {
      messageApi.error(
        error instanceof Error
          ? error.message
          : 'Failed to prepare clarifying questions. You can still generate the review.'
      );
      setClarifyingQuestions([]);
    } finally {
      setClarifying(false);
    }
  };

  const handleGenerate = async () => {
    if (!experience?.id) return;
    if (!validateRequiredContext()) return;
    setGenerating(true);
    setGenerationStage('starting');
    setGenerationElapsedSeconds(0);
    setJobStatusText('Starting background generation...');
    const runId = pollingRunRef.current + 1;
    pollingRunRef.current = runId;
    try {
      const clientId = `promotion-review-${experience.id}-${Date.now()}`;
      const title = `Promotion Review - ${experience.title} @ ${experience.company}`;
      const generationContext = buildContextForGeneration();
      const response = await createAIArtifactGenerationJob({
        kind: 'PROMOTION_REVIEW',
        input_payload: {
          messages: buildPromotionReviewMessages({ experience, context: generationContext }),
          temperature: 0.25,
          artifact: {
            client_id: clientId,
            title,
            companyName: experience.company,
            roleTitle: experience.title,
            sourceExperienceId: experience.id,
            inputContext: generationContext,
          },
        },
      });
      await pollGenerationJob(response.data.id, clientId, runId);
    } catch (error) {
      messageApi.error(
        error instanceof Error ? error.message : 'Failed to generate promotion review'
      );
    } finally {
      if (pollingRunRef.current === runId) {
        setGenerating(false);
        setJobStatusText('');
      }
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
                  Predicts odds + timing
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
                {generating ? (
                  <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-slate-200 bg-slate-50 px-6 py-20 text-center">
                    <Spin size="large" />
                    <Text className="text-base font-bold text-slate-800">
                      Building your detailed promotion review
                    </Text>
                    <div className="w-full max-w-xl">
                      <Progress
                        percent={generationProgress}
                        showInfo={false}
                        strokeColor="#2563eb"
                        trailColor="#dbe4f0"
                      />
                      <div className="mt-3 flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
                        <span className="capitalize">{generationStage}</span>
                        <span>{formatElapsedSeconds(generationElapsedSeconds)}</span>
                      </div>
                    </div>
                    <div className="max-w-xl space-y-2">
                      <Text className="block text-sm leading-6 text-slate-500">
                        {jobStatusText ||
                          'CareerHub is running this in the background so the AI provider can take the time it needs.'}
                      </Text>
                      <Text className="block text-xs leading-5 text-slate-400">
                        Provider progress is not streamed, so this bar tracks CareerHub job state
                        and elapsed time.
                      </Text>
                    </div>
                  </div>
                ) : isEditing ? (
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.55)]">
                    {clarifyingQuestions.length > 0 ? (
                      <div>
                        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <Text className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">
                              Guided follow-up
                            </Text>
                            <Title level={4} className="!mb-0 !mt-1 !text-lg !tracking-tight">
                              Answer what you can, then generate the review
                            </Title>
                          </div>
                          <Button
                            type="text"
                            onClick={() => setClarifyingQuestions([])}
                            className="!rounded-xl !font-semibold"
                          >
                            Back to context
                          </Button>
                        </div>

                        <Alert
                          type="info"
                          showIcon
                          className="!mb-5 !rounded-2xl !border-blue-100 !bg-blue-50"
                          message="These answers are optional, but they help the AI avoid guessing."
                          description="Short bullets are enough. Leave a question blank if you do not know yet."
                        />

                        <div className="space-y-4">
                          {clarifyingQuestions.map((question, index) => (
                            <div
                              key={question.id}
                              className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                            >
                              <div className="mb-3 flex items-start gap-3">
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-black text-blue-700">
                                  {index + 1}
                                </div>
                                <div>
                                  <Text className="block text-sm font-bold leading-6 text-slate-900">
                                    {parseInlineMarkdown(question.question)}
                                  </Text>
                                  <Text className="mt-1 block text-xs leading-5 text-slate-500">
                                    {parseInlineMarkdown(question.why)}
                                  </Text>
                                </div>
                              </div>
                              <TextArea
                                value={clarificationAnswers[question.id] || ''}
                                onChange={(event) =>
                                  updateClarificationAnswer(question.id, event.target.value)
                                }
                                placeholder="Answer with a few bullets, examples, names of systems, decisions you drove, or manager signals..."
                                rows={3}
                                className="!rounded-xl !border-slate-200 !bg-white !px-3.5 !py-3 !text-[14px] !leading-relaxed shadow-[0_1px_0_rgba(15,23,42,0.03)] placeholder:!text-slate-400 hover:!border-slate-300 focus:!border-slate-400 focus:!shadow-none"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <Text className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                              Prediction context
                            </Text>
                            <Title level={4} className="!mb-0 !mt-1 !text-lg !tracking-tight">
                              Confirm the target, then add anything CareerHub has not captured
                            </Title>
                          </div>
                          <Text className="text-sm text-slate-500">
                            Next step: AI asks a few targeted follow-up questions
                          </Text>
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
                      </>
                    )}
                  </div>
                ) : (
                  result && (
                    <PromotionReviewResultView
                      result={result}
                      activeReviewId={activeReviewId}
                      historyReviews={historyReviews}
                    />
                  )
                )}

                {!result && !generating && !isEditing && (
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
                onClick={() => {
                  setClarifyingQuestions([]);
                  setClarificationAnswers({});
                  setIsEditing(true);
                }}
                className="!h-10 !rounded-xl !px-5 !font-semibold"
              >
                Edit Context & Regenerate
              </Button>
            ) : (
              <>
                {clarifyingQuestions.length === 0 && (
                  <Button
                    className="!h-10 !rounded-xl !px-5 !font-semibold"
                    disabled={!experience?.id || generating || clarifying}
                    onClick={handleGenerate}
                  >
                    Generate without Follow-up
                  </Button>
                )}
                <Button
                  type="primary"
                  icon={<MessageOutlined />}
                  loading={generating || clarifying}
                  disabled={!experience?.id}
                  onClick={clarifyingQuestions.length > 0 ? handleGenerate : handleClarify}
                  className="!h-10 !rounded-xl !px-5 !font-semibold"
                >
                  {clarifyingQuestions.length > 0
                    ? result
                      ? 'Regenerate Review'
                      : 'Generate Review'
                    : 'Ask Follow-up Questions'}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};

export default PromotionReviewModal;

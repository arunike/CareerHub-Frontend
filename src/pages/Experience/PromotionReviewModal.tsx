import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Input, Progress, Spin, Tag, Typography, message } from 'antd';
import Modal from '../../components/MobileModal';
import { MessageOutlined, RiseOutlined, WarningOutlined } from '@ant-design/icons';
import type { Experience } from '../../types';
import {
  type PromotionClarifyingQuestion,
  type PromotionReviewContext,
  type PromotionReviewResult,
} from '../../lib/browserAi';
import {
  loadPromotionReviewsFromArtifacts,
  type StoredPromotionReview,
} from '../../utils/aiArtifactStorage';
import { parseInlineMarkdown } from '../../utils/simpleMarkdown';
import {
  buildDefaultPromotionContext,
  formatElapsedSeconds,
  generationStageProgress,
  optionalFieldGroups,
} from './promotionReviewFields';
import { usePromotionReviewGeneration } from './usePromotionReviewGeneration';
import { ContextField, EvidenceRow, PromotionReviewResultView } from './PromotionReviewResultView';

const { Text, Title } = Typography;
const { TextArea } = Input;

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
  const [isEditing, setIsEditing] = useState(true);
  const [historyReviews, setHistoryReviews] = useState<StoredPromotionReview[]>([]);
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);
  const [clarifyingQuestions, setClarifyingQuestions] = useState<PromotionClarifyingQuestion[]>([]);
  const [clarificationAnswers, setClarificationAnswers] = useState<Record<string, string>>({});

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
      setResult(null);
      setIsEditing(true);
      setContext(buildDefaultPromotionContext(experience));
      setActiveReviewId(null);
      setClarifyingQuestions([]);
      setClarificationAnswers({});
      resetGeneration();
      void loadHistory(true);
    } else if (!open) {
      resetGeneration();
    }
    // resetGeneration only touches its own state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experience, loadHistory, open]);

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

  const {
    generating,
    clarifying,
    jobStatusText,
    generationStage,
    generationElapsedSeconds,
    resetGeneration,
    handleClarify,
    handleGenerate,
  } = usePromotionReviewGeneration({
    experience,
    context,
    clarifyingQuestions,
    clarificationAnswers,
    setClarifyingQuestions,
    setClarificationAnswers,
    setResult,
    setIsEditing,
    setActiveReviewId,
    validateRequiredContext,
    buildContextForGeneration,
    loadHistory,
    messageApi,
  });

  const generationProgress = useMemo(() => {
    const stageBase = generationStageProgress[generationStage];
    if (generationStage !== 'running') return stageBase;
    return Math.min(84, stageBase + Math.floor(generationElapsedSeconds / 8));
  }, [generationElapsedSeconds, generationStage]);

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
                  <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.55)] sm:p-6">
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
                                className="!rounded-xl !border-slate-200 !bg-white !px-3 !py-3 !text-[14px] !leading-relaxed shadow-[0_1px_0_rgba(15,23,42,0.03)] placeholder:!text-slate-400 hover:!border-slate-300 focus:!border-slate-400 focus:!shadow-none"
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

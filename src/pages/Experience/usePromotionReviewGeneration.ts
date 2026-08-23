import { useEffect, useRef, useState } from 'react';
import type { MessageInstance } from 'antd/es/message/interface';
import type { Experience } from '../../types';
import {
  buildPromotionReviewMessages,
  generatePromotionClarifyingQuestions,
  type PromotionClarifyingQuestion,
  type PromotionReviewContext,
  type PromotionReviewResult,
} from '../../lib/browserAi';
import { getPromotionReviewArtifactByClientId } from '../../utils/aiArtifactStorage';
import { createAIArtifactGenerationJob, getAIArtifactGenerationJob } from '../../api';
import type { GenerationStage } from './promotionReviewFields';

export const usePromotionReviewGeneration = ({
  experience,
  context,
  setClarifyingQuestions,
  setClarificationAnswers,
  setResult,
  setIsEditing,
  setActiveReviewId,
  validateRequiredContext,
  buildContextForGeneration,
  loadHistory,
  messageApi,
}: {
  experience: Experience | null;
  context: PromotionReviewContext;
  clarifyingQuestions: PromotionClarifyingQuestion[];
  clarificationAnswers: Record<string, string>;
  setClarifyingQuestions: React.Dispatch<React.SetStateAction<PromotionClarifyingQuestion[]>>;
  setClarificationAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setResult: React.Dispatch<React.SetStateAction<PromotionReviewResult | null>>;
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveReviewId: React.Dispatch<React.SetStateAction<string | null>>;
  validateRequiredContext: () => boolean;
  buildContextForGeneration: () => PromotionReviewContext;
  loadHistory: (shouldAutoSelectLatest?: boolean) => Promise<void>;
  messageApi: MessageInstance;
}) => {
  const [generating, setGenerating] = useState(false);
  const [clarifying, setClarifying] = useState(false);
  const [jobStatusText, setJobStatusText] = useState('');
  const [generationStage, setGenerationStage] = useState<GenerationStage>('starting');
  const [generationElapsedSeconds, setGenerationElapsedSeconds] = useState(0);
  const pollingRunRef = useRef(0);

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
  // The elapsed counter only runs while a job is in flight.
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

  // Abandons any in-flight polling loop, so a reopened modal starts clean.
  const resetGeneration = () => {
    pollingRunRef.current += 1;
    setJobStatusText('');
    setGenerationStage('starting');
    setGenerationElapsedSeconds(0);
    setClarifying(false);
  };

  return {
    generating,
    clarifying,
    jobStatusText,
    generationStage,
    generationElapsedSeconds,
    resetGeneration,
    handleClarify,
    handleGenerate,
  };
};

import {
  createAIArtifact,
  deleteAIArtifact,
  deleteAllAIArtifacts,
  getAIArtifacts,
  updateAIArtifact,
  type AIArtifact,
  type AIArtifactType,
} from '../api';
import type { StoredCoverLetter } from './coverLetterStorage';
import { getAllCoverLetters } from './coverLetterStorage';
import type { StoredNegotiationResult } from './negotiationStorage';
import { getAllNegotiationResults } from './negotiationStorage';
import type { StoredReport } from './reportStorage';
import { getAllReports } from './reportStorage';
import {
  sanitizePromotionReviewResult,
  type PromotionReviewChatMessage,
  type PromotionReviewContext,
  type PromotionReviewResult,
} from '../lib/browserAi';

export interface StoredPromotionReview {
  id: string;
  title: string;
  companyName: string;
  roleTitle: string;
  sourceExperienceId: number;
  inputContext: PromotionReviewContext;
  review: PromotionReviewResult;
  chatMessages?: PromotionReviewChatMessage[];
  savedAt: string;
  isLocked?: boolean;
}

const MIGRATION_KEY = 'careerhub.ai_artifacts.local_migrated.v1';

const savedAt = (artifact: AIArtifact) =>
  artifact.saved_at || artifact.created_at || new Date().toISOString();

const payloadOf = (artifact: AIArtifact) => artifact.payload || {};

export const reportToArtifactPayload = (report: StoredReport) => ({
  artifact_type: 'JD_REPORT' as AIArtifactType,
  client_id: report.id,
  title:
    report.title ||
    (report.roleTitle && report.companyName ? `${report.roleTitle} @ ${report.companyName}` : '') ||
    report.jdSnippet ||
    'Untitled Match',
  summary: report.summary || '',
  payload: report as unknown as Record<string, unknown>,
  source_application: report.applicationId ?? null,
  is_locked: Boolean(report.isLocked),
  saved_at: report.savedAt,
});

export const coverLetterToArtifactPayload = (letter: StoredCoverLetter) => ({
  artifact_type: 'COVER_LETTER' as AIArtifactType,
  client_id: letter.id,
  title: letter.title || `${letter.roleTitle} @ ${letter.companyName}`,
  summary: letter.jdSnippet || '',
  payload: letter as unknown as Record<string, unknown>,
  is_locked: Boolean(letter.isLocked),
  saved_at: letter.savedAt,
});

export const negotiationResultToArtifactPayload = (result: StoredNegotiationResult) => ({
  artifact_type: 'NEGOTIATION_RESULT' as AIArtifactType,
  client_id: result.id,
  title: result.title || `${result.roleTitle} @ ${result.companyName}`,
  summary: result.advice?.suggested_ask?.notes || '',
  payload: result as unknown as Record<string, unknown>,
  is_locked: Boolean(result.isLocked),
  saved_at: result.savedAt,
});

export const promotionReviewToArtifactPayload = (review: StoredPromotionReview) => ({
  artifact_type: 'PROMOTION_REVIEW' as AIArtifactType,
  client_id: review.id,
  title: review.title,
  summary: review.review.readiness_verdict?.summary || '',
  payload: review as unknown as Record<string, unknown>,
  source_experience: review.sourceExperienceId,
  is_locked: Boolean(review.isLocked),
  saved_at: review.savedAt,
});

export const artifactToReport = (artifact: AIArtifact): StoredReport => {
  const payload = payloadOf(artifact) as unknown as StoredReport;
  return {
    ...payload,
    id: artifact.client_id,
    title: artifact.title || payload.title,
    isLocked: artifact.is_locked,
    savedAt: payload.savedAt || savedAt(artifact),
  };
};

export const artifactToCoverLetter = (artifact: AIArtifact): StoredCoverLetter => {
  const payload = payloadOf(artifact) as unknown as StoredCoverLetter;
  return {
    ...payload,
    id: artifact.client_id,
    title: artifact.title || payload.title,
    isLocked: artifact.is_locked,
    savedAt: payload.savedAt || savedAt(artifact),
  };
};

export const artifactToNegotiationResult = (artifact: AIArtifact): StoredNegotiationResult => {
  const payload = payloadOf(artifact) as unknown as StoredNegotiationResult;
  return {
    ...payload,
    id: artifact.client_id,
    title: artifact.title || payload.title,
    isLocked: artifact.is_locked,
    savedAt: payload.savedAt || savedAt(artifact),
  };
};

export const artifactToPromotionReview = (artifact: AIArtifact): StoredPromotionReview => {
  const payload = payloadOf(artifact) as unknown as StoredPromotionReview;
  return {
    ...payload,
    id: artifact.client_id,
    title: artifact.title || payload.title,
    sourceExperienceId: artifact.source_experience || payload.sourceExperienceId,
    review: sanitizePromotionReviewResult(payload.review),
    isLocked: artifact.is_locked,
    savedAt: payload.savedAt || savedAt(artifact),
  };
};

export const migrateLocalAIArtifacts = async () => {
  if (typeof window === 'undefined' || window.localStorage.getItem(MIGRATION_KEY)) return;
  const localItems = [
    ...getAllReports().map(reportToArtifactPayload),
    ...getAllCoverLetters().map(coverLetterToArtifactPayload),
    ...getAllNegotiationResults().map(negotiationResultToArtifactPayload),
  ];
  if (localItems.length > 0) {
    await Promise.allSettled(localItems.map((item) => createAIArtifact(item)));
  }
  window.localStorage.setItem(MIGRATION_KEY, new Date().toISOString());
};

export const syncReportArtifact = async (report: StoredReport) =>
  createAIArtifact(reportToArtifactPayload(report));

export const syncCoverLetterArtifact = async (letter: StoredCoverLetter) =>
  createAIArtifact(coverLetterToArtifactPayload(letter));

export const syncNegotiationResultArtifact = async (result: StoredNegotiationResult) =>
  createAIArtifact(negotiationResultToArtifactPayload(result));

export const syncPromotionReviewArtifact = async (review: StoredPromotionReview) =>
  createAIArtifact(promotionReviewToArtifactPayload(review));

export const loadReportsFromArtifacts = async () => {
  await migrateLocalAIArtifacts();
  const response = await getAIArtifacts('JD_REPORT');
  return response.data.map(artifactToReport);
};

export const loadCoverLettersFromArtifacts = async () => {
  await migrateLocalAIArtifacts();
  const response = await getAIArtifacts('COVER_LETTER');
  return response.data.map(artifactToCoverLetter);
};

export const loadNegotiationResultsFromArtifacts = async () => {
  await migrateLocalAIArtifacts();
  const response = await getAIArtifacts('NEGOTIATION_RESULT');
  return response.data.map(artifactToNegotiationResult);
};

export const loadPromotionReviewsFromArtifacts = async () => {
  await migrateLocalAIArtifacts();
  const response = await getAIArtifacts('PROMOTION_REVIEW');
  return response.data.map(artifactToPromotionReview);
};

export const getReportArtifactByClientId = async (clientId: string) => {
  await migrateLocalAIArtifacts();
  const response = await getAIArtifacts('JD_REPORT');
  const artifact = response.data.find((item) => item.client_id === clientId);
  return artifact ? artifactToReport(artifact) : null;
};

export const getNegotiationArtifactByClientId = async (clientId: string) => {
  await migrateLocalAIArtifacts();
  const response = await getAIArtifacts('NEGOTIATION_RESULT');
  const artifact = response.data.find((item) => item.client_id === clientId);
  return artifact ? artifactToNegotiationResult(artifact) : null;
};

export const getPromotionReviewArtifactByClientId = async (clientId: string) => {
  await migrateLocalAIArtifacts();
  const response = await getAIArtifacts('PROMOTION_REVIEW');
  const artifact = response.data.find((item) => item.client_id === clientId);
  return artifact ? artifactToPromotionReview(artifact) : null;
};

export const updatePromotionReviewChatMessages = async (
  clientId: string,
  chatMessages: PromotionReviewChatMessage[]
) => {
  const response = await getAIArtifacts('PROMOTION_REVIEW');
  const artifact = response.data.find((item) => item.client_id === clientId);
  if (!artifact) return null;

  const payload = payloadOf(artifact) as unknown as StoredPromotionReview;
  const updatedPayload: StoredPromotionReview = {
    ...payload,
    id: clientId,
    title: artifact.title || payload.title,
    sourceExperienceId: artifact.source_experience || payload.sourceExperienceId,
    savedAt: payload.savedAt || savedAt(artifact),
    isLocked: artifact.is_locked,
    chatMessages,
  };

  const updated = await updateAIArtifact(artifact.id, {
    payload: updatedPayload as unknown as Record<string, unknown>,
  });

  return artifactToPromotionReview(updated.data);
};

export const updateArtifactTitle = async (
  artifactType: AIArtifactType,
  clientId: string,
  title: string
) => {
  const response = await getAIArtifacts(artifactType);
  const artifact = response.data.find((item) => item.client_id === clientId);
  if (!artifact) return;
  await updateAIArtifact(artifact.id, { title });
};

export const setArtifactLock = async (
  artifactType: AIArtifactType,
  clientId: string,
  isLocked: boolean
) => {
  const response = await getAIArtifacts(artifactType);
  const artifact = response.data.find((item) => item.client_id === clientId);
  if (!artifact) return;
  await updateAIArtifact(artifact.id, { is_locked: isLocked });
};

export const deleteArtifactByClientId = async (artifactType: AIArtifactType, clientId: string) => {
  const response = await getAIArtifacts(artifactType);
  const artifact = response.data.find((item) => item.client_id === clientId);
  if (!artifact) return;
  await deleteAIArtifact(artifact.id);
};

export const deleteAllArtifactsByType = async (artifactType: AIArtifactType) => {
  const response = await getAIArtifacts(artifactType);
  await Promise.all(
    response.data.filter((item) => !item.is_locked).map((item) => deleteAIArtifact(item.id))
  );
};

export { deleteAllAIArtifacts };

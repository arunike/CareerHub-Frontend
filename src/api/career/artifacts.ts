import api from '../client';

export interface AIArtifactGenerationJob {
  id: number;
  kind: 'PROMOTION_REVIEW';
  status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  input_payload: Record<string, unknown>;
  result_payload: {
    review?: unknown;
    artifact_client_id?: string;
    artifact_id?: number;
  };
  error_message: string;
  artifact: number | null;
  artifact_client_id?: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export const createAIArtifactGenerationJob = (data: {
  kind: 'PROMOTION_REVIEW';
  input_payload: Record<string, unknown>;
}) => api.post<AIArtifactGenerationJob>('/career/ai-artifact-jobs/', data);

export const getAIArtifactGenerationJob = (id: number) =>
  api.get<AIArtifactGenerationJob>(`/career/ai-artifact-jobs/${id}/`);

export type AIArtifactType =
  | 'JD_REPORT'
  | 'COVER_LETTER'
  | 'NEGOTIATION_RESULT'
  | 'PROMOTION_REVIEW';

export interface AIArtifact {
  id: number;
  artifact_type: AIArtifactType;
  client_id: string;
  title: string;
  summary: string;
  payload: Record<string, unknown>;
  source_application: number | null;
  source_experience: number | null;
  is_locked: boolean;
  saved_at: string | null;
  created_at: string;
  updated_at: string;
}

export type AIArtifactPayload = Omit<AIArtifact, 'id' | 'created_at' | 'updated_at'>;

export const getAIArtifacts = (artifactType?: AIArtifactType, search?: string) =>
  api.get<AIArtifact[]>('/career/ai-artifacts/', {
    params: {
      artifact_type: artifactType,
      search,
    },
  });

export const createAIArtifact = (data: Partial<AIArtifactPayload>) =>
  api.post<AIArtifact>('/career/ai-artifacts/', data);

export const updateAIArtifact = (id: number, data: Partial<AIArtifactPayload>) =>
  api.patch<AIArtifact>(`/career/ai-artifacts/${id}/`, data);

export const deleteAIArtifact = (id: number) => api.delete(`/career/ai-artifacts/${id}/`);

export const deleteAllAIArtifacts = () => api.delete('/career/ai-artifacts/delete_all/');

export interface JDMatchResult {
  score: number;
  score_label?: 'Strong match' | 'Good fit with minor gaps' | 'Partial match' | 'Poor match';
  summary: string;
  matched_skills: Array<
    | string
    | {
        skill: string;
        support_level: 'directly_supported' | 'reasonably_supported';
        evidence: string;
      }
  >;
  missing_skills: Array<
    | string
    | {
        skill: string;
        severity: 'high' | 'medium' | 'low';
        reason: string;
        resume_evidence_status: 'not mentioned' | 'weakly implied' | 'unclear';
      }
  >;
  recommendations: string[];
  resume_gaps?: Array<
    | string
    | {
        gap: string;
        why_it_matters: string;
        fix: string;
      }
  >;
  keyword_suggestions?: Array<
    | string
    | {
        keyword: string;
        support_level: 'directly_supported' | 'reasonably_supported';
        where_to_use: string;
      }
  >;
  tailored_bullets?: Array<{
    original?: string | null;
    revised: string;
    support_level?: 'directly_supported' | 'reasonably_supported';
    reason: string;
    experience?: string | null;
    risk_note?: string | null;
  }>;
  best_experiences?: Array<{
    title: string;
    company: string;
    relevance: string;
    matched_requirements?: Array<
      | string
      | {
          requirement: string;
          support_level: 'directly_supported' | 'reasonably_supported';
          evidence: string;
        }
    >;
  }>;
  overall_risk_assessment?: {
    seniority_risk: 'low' | 'medium' | 'high';
    domain_risk: 'low' | 'medium' | 'high';
    technical_stack_risk: 'low' | 'medium' | 'high';
    resume_positioning_risk: 'low' | 'medium' | 'high';
  };
}

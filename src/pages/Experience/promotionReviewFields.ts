import type { Experience } from '../../types';
import type { PromotionReviewContext } from '../../lib/browserAi';

export const generationStageProgress = {
  starting: 8,
  queued: 18,
  running: 58,
  saving: 88,
} as const;

export type GenerationStage = keyof typeof generationStageProgress;

export const formatElapsedSeconds = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes <= 0) return `${remainingSeconds}s`;
  return `${minutes}m ${remainingSeconds.toString().padStart(2, '0')}s`;
};

export const optionalFieldGroups: Array<{
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

export const asList = (items?: string[]) => (Array.isArray(items) ? items.filter(Boolean) : []);

export const buildDefaultPromotionContext = (experience: Experience): PromotionReviewContext => ({
  currentLevel: experience.title || '',
  targetTitle: '',
  promotionTimeline: '',
});

export const checklistToneClass = (status?: string) => {
  const normalized = (status || '').toLowerCase();
  if (normalized.includes('strong')) return 'border-emerald-100 bg-emerald-50 text-emerald-900';
  if (normalized.includes('partial')) return 'border-amber-100 bg-amber-50 text-amber-950';
  return 'border-slate-200 bg-slate-50 text-slate-700';
};

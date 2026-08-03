export type ApplicationStage = {
  key: string;
  label: string;
  shortLabel: string;
  tone: string;
};

export const DEFAULT_APPLICATION_STAGES: ApplicationStage[] = [
  { key: 'APPLIED', label: 'Applied', shortLabel: 'Apply', tone: '#DCEBFF' },
  { key: 'ROUND_1', label: '1st Round', shortLabel: 'R1', tone: '#A9CCFF' },
  { key: 'ROUND_2', label: '2nd Round', shortLabel: 'R2', tone: '#6EA8FE' },
  { key: 'ROUND_3', label: '3rd Round', shortLabel: 'R3', tone: '#7B8CDE' },
  { key: 'ROUND_4', label: '4th Round', shortLabel: 'R4', tone: '#9B7EDE' },
  { key: 'FINAL_ROUND', label: 'Final Round', shortLabel: 'Final', tone: '#6F42C1' },
  { key: 'ONSITE', label: 'Onsite Interview', shortLabel: 'Onsite', tone: '#20B2AA' },
  { key: 'OFFER', label: 'Offer', shortLabel: 'Offer', tone: '#34A853' },
  { key: 'REJECTED', label: 'Rejected', shortLabel: 'Reject', tone: '#E85D5D' },
  { key: 'GHOSTED', label: 'Ghosted', shortLabel: 'Ghost', tone: '#9AA0A6' },
  {
    key: 'REMOVED_FROM_SHEET',
    label: 'Removed',
    shortLabel: 'Removed',
    tone: '#5F6368',
  },
];

export const FILTER_ONLY_APPLICATION_STATUSES: ApplicationStage[] = [
  {
    key: 'ACCEPTED',
    label: 'Accepted',
    shortLabel: 'Accepted',
    tone: '#18864B',
  },
  {
    key: 'OFFER_REJECTED',
    label: 'Rejected Offer',
    shortLabel: 'Rejected Offer',
    tone: '#E85D5D',
  },
];

const SYSTEM_MANAGED_APPLICATION_STATUS_KEYS = new Set(
  FILTER_ONLY_APPLICATION_STATUSES.map((status) => status.key)
);

export const getApplicationStatusEditOptions = (stages: ApplicationStage[]): ApplicationStage[] =>
  stages.filter((stage) => !SYSTEM_MANAGED_APPLICATION_STATUS_KEYS.has(stage.key));

export const getApplicationStatusFilterOptions = (
  stages: ApplicationStage[]
): ApplicationStage[] => {
  const configuredKeys = new Set(stages.map((stage) => stage.key));
  const acceptedStatus = FILTER_ONLY_APPLICATION_STATUSES.find(
    (status) => status.key === 'ACCEPTED'
  );
  const options = stages.flatMap((stage) => {
    if (stage.key !== 'OFFER' || configuredKeys.has('ACCEPTED') || !acceptedStatus) {
      return [stage];
    }
    return [stage, acceptedStatus];
  });

  return [
    ...options,
    ...FILTER_ONLY_APPLICATION_STATUSES.filter(
      (status) =>
        !configuredKeys.has(status.key) &&
        !(status.key === 'ACCEPTED' && options.some((option) => option.key === 'ACCEPTED'))
    ),
  ];
};

export const findApplicationStatus = (status: string, stages: ApplicationStage[]) =>
  stages.find((stage) => stage.key === status) ||
  FILTER_ONLY_APPLICATION_STATUSES.find((stage) => stage.key === status);

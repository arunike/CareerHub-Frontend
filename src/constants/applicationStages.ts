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

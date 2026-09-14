import type { DayOneGcStatus, VisaSponsorshipStatus } from './calculations';

export type ImmigrationSignalValue =
  | ''
  | 'NO_SUPPORT_NEEDED'
  | 'SPONSORSHIP_AND_GC'
  | 'SPONSORSHIP_ONLY'
  | 'TRANSFER_ONLY'
  | 'NO_SUPPORT';

export const immigrationSignalOptions: Array<{
  value: ImmigrationSignalValue;
  label: string;
  description: string;
}> = [
  {
    value: 'NO_SUPPORT_NEEDED',
    label: 'I do not need immigration support',
    description:
      'Use this for citizens, permanent residents, or anyone not relying on employer support.',
  },
  {
    value: 'SPONSORSHIP_AND_GC',
    label: 'Sponsorship + Day 1 GC',
    description: 'Strong support: work authorization help plus green card process from the start.',
  },
  {
    value: 'SPONSORSHIP_ONLY',
    label: 'Sponsorship only',
    description:
      'Employer can sponsor or extend work authorization, but GC support is not confirmed.',
  },
  {
    value: 'TRANSFER_ONLY',
    label: 'Transfer only',
    description:
      'Employer can handle a transfer, but broader sponsorship or GC support is limited.',
  },
  {
    value: 'NO_SUPPORT',
    label: 'No immigration support',
    description: 'Employer will not provide sponsorship, transfer support, or GC support.',
  },
];

export const getImmigrationSignalValue = (
  visaSponsorship?: VisaSponsorshipStatus,
  dayOneGc?: DayOneGcStatus
): ImmigrationSignalValue => {
  const sponsorship = visaSponsorship && visaSponsorship !== 'UNKNOWN' ? visaSponsorship : '';
  const gc = dayOneGc && dayOneGc !== 'UNKNOWN' ? dayOneGc : '';

  if (sponsorship === 'NOT_NEEDED') return 'NO_SUPPORT_NEEDED';
  if (sponsorship === 'AVAILABLE' && gc === 'YES') return 'SPONSORSHIP_AND_GC';
  if (sponsorship === 'AVAILABLE') return 'SPONSORSHIP_ONLY';
  if (sponsorship === 'TRANSFER_ONLY') return 'TRANSFER_ONLY';
  if (sponsorship === 'NOT_AVAILABLE') return 'NO_SUPPORT';
  if (gc === 'YES') return 'SPONSORSHIP_AND_GC';
  return '';
};

export const getImmigrationSignalPatch = (
  value: ImmigrationSignalValue
): { visa_sponsorship: VisaSponsorshipStatus; day_one_gc: DayOneGcStatus } => {
  switch (value) {
    case 'NO_SUPPORT_NEEDED':
      return { visa_sponsorship: 'NOT_NEEDED', day_one_gc: 'NOT_APPLICABLE' };
    case 'SPONSORSHIP_AND_GC':
      return { visa_sponsorship: 'AVAILABLE', day_one_gc: 'YES' };
    case 'SPONSORSHIP_ONLY':
      return { visa_sponsorship: 'AVAILABLE', day_one_gc: 'NO' };
    case 'TRANSFER_ONLY':
      return { visa_sponsorship: 'TRANSFER_ONLY', day_one_gc: 'NO' };
    case 'NO_SUPPORT':
      return { visa_sponsorship: 'NOT_AVAILABLE', day_one_gc: 'NO' };
    default:
      return { visa_sponsorship: '', day_one_gc: '' };
  }
};

export const getImmigrationSignalLabel = (
  visaSponsorship?: VisaSponsorshipStatus,
  dayOneGc?: DayOneGcStatus
) => {
  const value = getImmigrationSignalValue(visaSponsorship, dayOneGc);
  return immigrationSignalOptions.find((option) => option.value === value)?.label || '';
};

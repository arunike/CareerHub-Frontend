import type { ContactRelationshipKind } from '../../types';

export const CONTACT_RELATIONSHIP_OPTIONS: Array<{
  value: ContactRelationshipKind;
  label: string;
}> = [
  { value: 'CONTACT', label: 'Contact' },
  { value: 'RECRUITER', label: 'Recruiter' },
  { value: 'INTERVIEWER', label: 'Interviewer' },
  { value: 'HIRING_MANAGER', label: 'Hiring manager' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'DIRECT_TEAMMATE', label: 'Direct teammate' },
  { value: 'COWORKER', label: 'Coworker' },
  { value: 'DIRECT_REPORT', label: 'Direct report' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'MENTOR', label: 'Mentor' },
  { value: 'WORKS_WITH', label: 'Works with' },
  { value: 'CUSTOM', label: 'Custom relationship' },
];

export const relationshipLabel = (kind: ContactRelationshipKind, customLabel?: string) =>
  kind === 'CUSTOM'
    ? customLabel || 'Custom'
    : CONTACT_RELATIONSHIP_OPTIONS.find((option) => option.value === kind)?.label || kind;

export const contactInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return `${parts[0][0]}${parts.length > 1 ? parts[parts.length - 1][0] : ''}`.toUpperCase();
};

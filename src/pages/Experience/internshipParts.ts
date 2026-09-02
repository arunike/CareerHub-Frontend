import { shadesFor } from './PayChart';
import type { PayPart } from './PayPartsPanel';

export interface InternshipRoleEarnings {
  key: string;
  company: string;
  roleTitle: string;
  regularPay: number;
  overtimePay: number;
}

const PARTS = [
  { key: 'regular', label: 'Regular Pay', color: '#2563eb', pick: 'regularPay' as const },
  { key: 'overtime', label: 'Overtime Pay', color: '#f59e0b', pick: 'overtimePay' as const },
];

// Internship pay splits the same way full-time pay does: parts first, then who earned each.
export const buildInternshipParts = (roles: InternshipRoleEarnings[]): PayPart[] =>
  PARTS.map((part) => {
    const members = roles
      .map((role) => ({
        key: `${part.key}-${role.key}`,
        label: role.company,
        sublabel: role.roleTitle,
        value: Math.round(role[part.pick]),
      }))
      .filter((member) => member.value > 0)
      .sort((a, b) => b.value - a.value);
    const shades = shadesFor(part.color, members.length);
    const shaded = members.map((member, index) => ({ ...member, color: shades[index] }));
    return {
      key: part.key,
      label: part.label,
      color: part.color,
      total: shaded.reduce((sum, member) => sum + member.value, 0),
      members: shaded,
    };
  });

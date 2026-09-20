export type SalaryOrigin = 'override' | 'offer' | 'role' | 'hourly' | 'none';

export interface SalaryBasis {
  amount: number;
  origin: SalaryOrigin;
}

// Every input that can decide the headline salary, in the order the model applies them.
export const salaryBasisOf = (
  salaryOverride: number | null | undefined,
  sourceSalary: number | undefined,
  payFrom: 'offer' | 'role' | 'hourly' | undefined
): SalaryBasis => {
  if (salaryOverride != null) return { amount: salaryOverride, origin: 'override' };
  if (sourceSalary == null || sourceSalary <= 0)
    return { amount: sourceSalary ?? 0, origin: 'none' };
  return { amount: sourceSalary, origin: payFrom ?? 'role' };
};

export const describeSalaryBasis = ({ amount, origin }: SalaryBasis): string => {
  const money = `$${Math.round(amount).toLocaleString()}`;
  switch (origin) {
    case 'override':
      return `${money} a year, from a saved salary override on this year — it outranks the offer and the role.`;
    case 'offer':
      return `${money} a year, from the linked offer.`;
    case 'role':
      return `${money} a year, from the Experience record.`;
    case 'hourly':
      return `${money} a year, from the role's hourly rate — no base salary is recorded on the offer or the role.`;
    default:
      return 'No annual pay is recorded for this role.';
  }
};

import { describe, expect, it } from 'vitest';
import { describeSalaryBasis, salaryBasisOf } from './salaryBasis';

describe('salaryBasisOf', () => {
  it('puts a saved override above everything, which is the order the model applies', () => {
    expect(salaryBasisOf(150000, 165000, 'offer')).toEqual({ amount: 150000, origin: 'override' });
  });

  it('names the linked offer when that supplied the figure', () => {
    expect(salaryBasisOf(null, 165000, 'offer')).toEqual({ amount: 165000, origin: 'offer' });
  });

  it('names the role record when no offer figure exists', () => {
    expect(salaryBasisOf(null, 165000, 'role')).toEqual({ amount: 165000, origin: 'role' });
  });

  it('names an hourly rate, which matches no annual figure anywhere else', () => {
    expect(salaryBasisOf(null, 104000, 'hourly')).toEqual({ amount: 104000, origin: 'hourly' });
  });

  it('reports nothing recorded rather than a confident zero', () => {
    expect(salaryBasisOf(null, 0, 'offer').origin).toBe('none');
    expect(salaryBasisOf(null, undefined, undefined).origin).toBe('none');
  });

  it('honours a deliberate zero override, which is not the same as no override', () => {
    expect(salaryBasisOf(0, 165000, 'offer')).toEqual({ amount: 0, origin: 'override' });
  });
});

describe('describeSalaryBasis', () => {
  it('says which record each origin came from', () => {
    expect(describeSalaryBasis({ amount: 165000, origin: 'offer' })).toContain('linked offer');
    expect(describeSalaryBasis({ amount: 165000, origin: 'role' })).toContain('Experience record');
    expect(describeSalaryBasis({ amount: 104000, origin: 'hourly' })).toContain('hourly rate');
    expect(describeSalaryBasis({ amount: 150000, origin: 'override' })).toContain('outranks');
  });

  it('formats the figure so it can be checked against the ledger', () => {
    expect(describeSalaryBasis({ amount: 165000, origin: 'offer' })).toContain('$165,000');
  });
});

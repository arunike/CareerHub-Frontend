import { describe, expect, it } from 'vitest';
import {
  describeRaiseFormIssues,
  isRaiseFormComplete,
  raiseFormIssues,
  type RaiseFormDraft,
} from './raiseFormValidation';

const draft = (over: Partial<RaiseFormDraft> = {}): RaiseFormDraft =>
  ({
    date: '2026-10-01',
    effective_date: '2026-07-01',
    type: 'merit',
    base_before: 165000,
    base_after: 181500,
    ...over,
  }) as RaiseFormDraft;

describe('raiseFormIssues', () => {
  it('passes a draft with a type and both dates', () => {
    expect(raiseFormIssues(draft())).toEqual([]);
    expect(isRaiseFormComplete(draft())).toBe(true);
  });

  it('names a missing type, which now starts blank rather than guessing merit', () => {
    expect(raiseFormIssues(draft({ type: '' }))).toEqual(['Type']);
  });

  it('treats whitespace as missing, since the box takes free text', () => {
    expect(raiseFormIssues(draft({ type: '   ' }))).toEqual(['Type']);
  });

  it('names each missing date separately', () => {
    expect(raiseFormIssues(draft({ date: '' }))).toEqual(['Notified on']);
    expect(raiseFormIssues(draft({ effective_date: '' }))).toEqual(['Effective date']);
  });

  it('accepts free text as a type, which the picker allows', () => {
    expect(raiseFormIssues(draft({ type: 'Acquisition adjustment' }))).toEqual([]);
  });

  it('lists every gap at once rather than one at a time', () => {
    const issues = raiseFormIssues(draft({ type: '', date: '', effective_date: '' }));
    expect(issues).toEqual(['Type', 'Notified on', 'Effective date']);
    expect(isRaiseFormComplete(draft({ type: '' }))).toBe(false);
  });

  it('does not block a raise that moves no pay, which a role change legitimately does not', () => {
    expect(raiseFormIssues(draft({ base_after: 165000 }))).toEqual([]);
  });
});

describe('describeRaiseFormIssues', () => {
  it('says nothing when there is nothing to say', () => {
    expect(describeRaiseFormIssues([])).toBe('');
  });

  it('reads as a sentence for one, two and three gaps', () => {
    expect(describeRaiseFormIssues(['Type'])).toBe('Fill in Type to save this raise');
    expect(describeRaiseFormIssues(['Type', 'Effective date'])).toBe(
      'Fill in Type and Effective date to save this raise'
    );
    expect(describeRaiseFormIssues(['Type', 'Notified on', 'Effective date'])).toBe(
      'Fill in Type, Notified on and Effective date to save this raise'
    );
  });
});

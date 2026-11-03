import { describe, expect, it } from 'vitest';
import type { UserSettings } from '../../types';
import { UNTABBED_KEY, bucketOf, chargesAllowance, ptoTabPolicyOf } from './ptoTabs';

const settingsWith = (tabs: UserSettings['holiday_tabs'], untabbedCharges?: boolean) =>
  ({
    holiday_tabs: tabs,
    ...(untabbedCharges === undefined ? {} : { default_holiday_counts_as_pto: untabbedCharges }),
  }) as UserSettings;

describe('ptoTabPolicyOf', () => {
  it('charges the untabbed bucket by default, which is where time off lands', () => {
    const policy = ptoTabPolicyOf(settingsWith([]));
    expect(chargesAllowance({ tab: null }, policy)).toBe(true);
    expect(chargesAllowance({ tab: undefined }, policy)).toBe(true);
  });

  it('spares a tab that has never opted in, so existing tabs keep their behaviour', () => {
    const policy = ptoTabPolicyOf(settingsWith([{ id: 'company', name: 'Company' }]));
    expect(chargesAllowance({ tab: 'company' }, policy)).toBe(false);
  });

  it('charges a tab that opts in', () => {
    const policy = ptoTabPolicyOf(
      settingsWith([{ id: 'company', name: 'Company', counts_as_pto: true }])
    );
    expect(chargesAllowance({ tab: 'company' }, policy)).toBe(true);
  });

  it('spares the untabbed bucket when it is switched off', () => {
    const policy = ptoTabPolicyOf(settingsWith([], false));
    expect(chargesAllowance({ tab: null }, policy)).toBe(false);
  });

  it('leaves the two buckets independent', () => {
    const policy = ptoTabPolicyOf(
      settingsWith([{ id: 'company', name: 'Company', counts_as_pto: true }], false)
    );
    expect(chargesAllowance({ tab: 'company' }, policy)).toBe(true);
    expect(chargesAllowance({ tab: null }, policy)).toBe(false);
  });

  it('has no tabs and charges the bucket when settings have not loaded', () => {
    const policy = ptoTabPolicyOf(null);
    expect(chargesAllowance({ tab: null }, policy)).toBe(true);
    expect(chargesAllowance({ tab: 'company' }, policy)).toBe(false);
  });
});

describe('bucketOf', () => {
  // The list shows a deleted tab's days under My Time Off, so the allowance has to agree.
  it('returns a deleted tab to the untabbed bucket, as the list does', () => {
    const policy = ptoTabPolicyOf(settingsWith([{ id: 'company', name: 'Company' }]));
    expect(bucketOf({ tab: 'deleted_tab' }, policy)).toBe(UNTABBED_KEY);
    expect(chargesAllowance({ tab: 'deleted_tab' }, policy)).toBe(true);
  });

  it('keeps a day on a tab that still exists', () => {
    const policy = ptoTabPolicyOf(settingsWith([{ id: 'company', name: 'Company' }]));
    expect(bucketOf({ tab: 'company' }, policy)).toBe('company');
  });
});

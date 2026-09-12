import { describe, expect, it } from 'vitest';
import {
  ACCOUNT_TOOLTIPS,
  COMPENSATION_TOOLTIPS,
  DECISION_SIGNAL_TOOLTIPS,
  DENTAL_VISION_TOOLTIPS,
  EQUITY_TOOLTIPS,
  EXPERIENCE_TOOLTIPS,
  HEALTH_TOOLTIPS,
  INCOME_TOOLTIPS,
  RETIREMENT_TOOLTIPS,
  SIMULATOR_TOOLTIPS,
} from './index';

const CATEGORIES = {
  account: ACCOUNT_TOOLTIPS,
  compensation: COMPENSATION_TOOLTIPS,
  decisionSignals: DECISION_SIGNAL_TOOLTIPS,
  dentalVision: DENTAL_VISION_TOOLTIPS,
  equity: EQUITY_TOOLTIPS,
  experience: EXPERIENCE_TOOLTIPS,
  health: HEALTH_TOOLTIPS,
  income: INCOME_TOOLTIPS,
  retirement: RETIREMENT_TOOLTIPS,
  simulator: SIMULATOR_TOOLTIPS,
};

const all = Object.entries(CATEGORIES).flatMap(([category, entries]) =>
  Object.entries(entries).map(([key, text]) => ({ id: `${category}.${key}`, text }))
);

describe('every tooltip in the app', () => {
  it('says something', () => {
    expect(all.filter((entry) => entry.text.trim().length === 0)).toEqual([]);
  });

  it('reads as prose, ending in a full stop', () => {
    expect(all.filter((entry) => !entry.text.trim().endsWith('.')).map((e) => e.id)).toEqual([]);
  });

  it('is defined once, so two screens cannot drift apart', () => {
    // Diff vs Current was written twice in one file with two different wordings.
    const seen = new Map<string, string>();
    const duplicates: string[] = [];
    for (const entry of all) {
      const previous = seen.get(entry.text);
      if (previous) duplicates.push(`${previous} and ${entry.id}`);
      else seen.set(entry.text, entry.id);
    }
    expect(duplicates).toEqual([]);
  });

  it('carries no money amount, which is how personal data hides in copy', () => {
    expect(all.filter((entry) => /\$[\d,]/.test(entry.text)).map((e) => e.id)).toEqual([]);
  });

  it('names no insurer or branded plan', () => {
    const brands =
      /\b(Aetna|Anthem|Kaiser|Cigna|Delta Dental|VSP|EyeMed|MetLife|Guardian|Humana|HealthSelect)\b/;
    expect(all.filter((entry) => brands.test(entry.text)).map((e) => e.id)).toEqual([]);
  });

  it('covers every category, so a new file cannot be left unchecked', () => {
    expect(Object.keys(CATEGORIES)).toHaveLength(10);
    expect(all.length).toBeGreaterThan(55);
  });
});

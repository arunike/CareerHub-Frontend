import { describe, expect, it } from 'vitest';
import { suggestEffectiveDate } from './raiseCycles';
import {
  RAISE_TYPES,
  emptyForm,
  reasonColor,
  reasonLabel,
  reasonValue,
} from './raiseHistoryFields';

describe('RAISE_TYPES', () => {
  it('still offers every reason that has not been retired', () => {
    const values = RAISE_TYPES.map((type) => type.value);
    for (const kept of ['merit', 'market', 'retention', 'promotion']) {
      expect(values).toContain(kept);
    }
  });

  it('has retired cost of living and the catch-all Other', () => {
    const values = RAISE_TYPES.map((type) => type.value);
    expect(values).not.toContain('cola');
    expect(values).not.toContain('other');
  });

  it('covers promotion, which is the most common reason pay jumps', () => {
    expect(RAISE_TYPES.map((type) => type.value)).toContain('promotion');
  });

  it('has unique values and labels', () => {
    const values = RAISE_TYPES.map((type) => type.value);
    const labels = RAISE_TYPES.map((type) => type.label);
    expect(new Set(values).size).toBe(values.length);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('explains every option, so none of them is bare jargon', () => {
    for (const type of RAISE_TYPES) {
      expect(type.hint.length).toBeGreaterThan(10);
      expect(type.label).not.toBe(type.label.toUpperCase());
    }
  });
});

describe('reasonLabel', () => {
  // raise_history is a JSON blob with no server-side enum, so retired values are still out there.
  it('reads a retired reason properly rather than as a bare key', () => {
    expect(reasonLabel({ type: 'cola' as never })).toBe('Cost of living');
    expect(reasonColor('cola' as never)).toBe('default');
  });

  it('reads free text back exactly as it was typed', () => {
    expect(reasonLabel({ type: 'Spot award' })).toBe('Spot award');
  });

  it('still reads an entry saved under the old other + custom_type pair', () => {
    expect(reasonLabel({ type: 'other', custom_type: 'Spot award' })).toBe('Spot award');
    expect(reasonLabel({ type: 'other', custom_type: '  ' })).toBe('other');
  });

  it('ignores custom text left behind on a suggested reason', () => {
    expect(reasonLabel({ type: 'merit', custom_type: 'Spot award' })).toBe('Merit increase');
  });

  it('falls back to the raw value for something it has never seen', () => {
    expect(reasonLabel({ type: 'mystery' as never })).toBe('mystery');
  });
});

describe('reasonValue', () => {
  it('stores a suggested reason under its key, so it keeps its colour and cycle', () => {
    expect(reasonValue('Merit increase')).toBe('merit');
    expect(reasonValue('  promotion  ')).toBe('promotion');
  });

  it('stores anything else verbatim', () => {
    expect(reasonValue('Spot award')).toBe('Spot award');
    expect(reasonValue('  Off-cycle bump ')).toBe('Off-cycle bump');
  });

  it('round-trips a retired reason rather than turning it into free text', () => {
    expect(reasonValue('Cost of living')).toBe('cola');
    expect(reasonLabel({ type: reasonValue('Cost of living') })).toBe('Cost of living');
  });

  it('round-trips every suggestion through the box', () => {
    for (const type of RAISE_TYPES) {
      expect(reasonValue(reasonLabel({ type: type.value }))).toBe(type.value);
    }
  });
});

describe('emptyForm', () => {
  it('defaults the effective date to the review cycle', () => {
    const form = emptyForm();
    expect(form.effective_date).toBe(suggestEffectiveDate({ type: 'merit', date: form.date }));
  });

  it('never dates a new raise into the future', () => {
    const form = emptyForm();
    expect(form.effective_date! <= form.date).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { RAISE_TYPES } from './raiseHistoryFields';

describe('RAISE_TYPES', () => {
  // raise_history is a JSON blob with no server-side enum, so a dropped value renders as a blank tag.
  it('still resolves every value that was already saveable', () => {
    const values = RAISE_TYPES.map((type) => type.value);
    for (const legacy of ['merit', 'cola', 'market', 'retention', 'other']) {
      expect(values).toContain(legacy);
    }
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

import { describe, expect, it } from 'vitest';
import { spanSaveDecision } from './useSpanScope';

const base = { hasSpanScope: true, editingId: 7, overrideCount: 0 };

describe('spanSaveDecision', () => {
  it('leaves an ordinary event to the caller', () => {
    expect(spanSaveDecision({ ...base, hasSpanScope: false }).kind).toBe('caller-saves');
    expect(spanSaveDecision({ ...base, editingId: null }).kind).toBe('caller-saves');
  });

  it('writes a day override when one day of a run is chosen', () => {
    expect(spanSaveDecision({ ...base, scope: '2026-07-03' }).kind).toBe('day-override');
  });

  it('asks first when editing the whole run would wipe days edited on their own', () => {
    expect(spanSaveDecision({ ...base, scope: 'all', overrideCount: 2 }).kind).toBe(
      'ask-before-replacing'
    );
  });

  it('does not ask when the run has no separately edited days', () => {
    expect(spanSaveDecision({ ...base, scope: 'all' }).kind).toBe('caller-saves');
  });

  it('treats a missing scope as the whole run', () => {
    expect(spanSaveDecision({ ...base, overrideCount: 1 }).kind).toBe('ask-before-replacing');
  });
});

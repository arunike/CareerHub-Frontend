import { describe, expect, it } from 'vitest';
import { getOverflowOptions } from 'antd/es/_util/placements';
import { SCORE_POPOVER_OVERFLOW } from './OfferDecisionScorecard';

// antd resolves autoAdjustOverflow into flip and slide flags; adjustY must come out false.
const arrow = { arrowOffsetHorizontal: 8, arrowOffsetVertical: 8 };
const resolve = (value: unknown) =>
  getOverflowOptions('bottomRight', arrow, 16, value as never) as Record<string, unknown>;

describe('the score popover always opens downward', () => {
  it('is what our config actually resolves to', () => {
    const resolved = resolve(SCORE_POPOVER_OVERFLOW);
    expect(resolved.adjustY).toBeFalsy();
    expect(resolved.adjustX).toBeTruthy();
  });

  it('would flip upward on the default, which is the bug being prevented', () => {
    expect(resolve(true).adjustY).toBeTruthy();
  });

  it('turning the whole option off also stops it sliding sideways on a phone', () => {
    const off = resolve(false);
    expect(off.adjustY).toBe(false);
    // This is why `false` is wrong: no horizontal help, so the panel ran off a narrow screen.
    expect(off.adjustX).toBe(false);
  });

  it('needs shiftY set, or antd forces the flip back on', () => {
    // `if (!mergedOverflow.shiftY) adjustY = true` silently undoes adjustY: 0 without shiftY.
    expect(resolve({ adjustX: 1, adjustY: 0 }).adjustY).toBe(true);
  });
});

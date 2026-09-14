import { describe, expect, it } from 'vitest';
import { GRID_COLS, buildLayout, rowsFor, toPlacements } from './widgetLayout';

const widths: Record<string, number> = { headline: 12, funnel: 6, watch_list: 6, ages: 3 };
const width = (id: string) => widths[id] ?? 3;

describe('buildLayout', () => {
  it('flows unplaced widgets left to right and wraps at the last column', () => {
    const layout = buildLayout(['headline', 'funnel', 'watch_list', 'ages'], {}, width, {});
    const at = (i: string) => layout.find((item) => item.i === i);
    expect(at('headline')).toMatchObject({ x: 0, y: 0, w: 12 });
    expect(at('funnel')).toMatchObject({ x: 0, w: 6 });
    expect(at('watch_list')).toMatchObject({ x: 6, w: 6 });
    expect(at('funnel')?.y).toBe(at('watch_list')?.y);
    expect(at('funnel')?.y).toBeGreaterThan(0);
    expect(at('ages')).toMatchObject({ x: 0, w: 3 });
    expect(at('ages')?.y).toBeGreaterThan(at('funnel')!.y);
  });

  it('settles a widget against its own column rather than the tallest in the row', () => {
    const heights = { funnel: 900, watch_list: 300 };
    const layout = buildLayout(
      ['funnel', 'watch_list', 'reply_timing', 'outcomes'],
      {},
      () => 6,
      heights
    );
    const at = (i: string) => layout.find((item) => item.i === i)!;
    // reply_timing sits under the tall left card, outcomes under the short right one.
    expect(at('reply_timing').x).toBe(0);
    expect(at('outcomes').x).toBe(6);
    expect(at('reply_timing').y).toBe(at('funnel').y + at('funnel').h);
    expect(at('outcomes').y).toBe(at('watch_list').y + at('watch_list').h);
    // The short column does not wait for the tall one, so no dead space is left behind.
    expect(at('outcomes').y).toBeLessThan(at('reply_timing').y);
  });

  it('drops two narrow widgets side by side under a wide one', () => {
    const widths: Record<string, number> = { top: 12, left: 3, right: 3 };
    const layout = buildLayout(['top', 'left', 'right'], {}, (id) => widths[id], {});
    const at = (i: string) => layout.find((item) => item.i === i)!;
    expect(at('left')).toMatchObject({ x: 0, y: at('top').h });
    expect(at('right')).toMatchObject({ x: 3, y: at('top').h });
  });

  it('settles a newly enabled widget below what the user already placed', () => {
    const placements = { funnel: { x: 0, y: 20, w: 6 } };
    const layout = buildLayout(['funnel', 'fresh'], placements, () => 6, {});
    const at = (i: string) => layout.find((item) => item.i === i)!;
    expect(at('funnel')).toMatchObject({ x: 0, y: 20 });
    // The placed card is untouched and the new one lands clear of it.
    expect(at('fresh').y).toBeGreaterThanOrEqual(at('funnel').y + at('funnel').h);
  });

  it('keeps a hand-placed widget exactly where it was dropped, gaps included', () => {
    const placements = { funnel: { x: 7, y: 40, w: 5 } };
    const layout = buildLayout(['funnel'], placements, width, {});
    expect(layout[0]).toMatchObject({ x: 7, y: 40, w: 5 });
  });

  it('never lets a widget hang off the right edge', () => {
    const layout = buildLayout(['funnel'], { funnel: { x: 11, y: 0, w: 6 } }, width, {});
    expect(layout[0].x + layout[0].w).toBeLessThanOrEqual(GRID_COLS);
  });

  it('clamps a stored width to the grid and to the minimum', () => {
    const wide = buildLayout(['funnel'], { funnel: { x: 0, y: 0, w: 99 } }, width, {});
    expect(wide[0].w).toBe(GRID_COLS);
    const thin = buildLayout(['funnel'], { funnel: { x: 0, y: 0, w: 0 } }, width, {});
    expect(thin[0].w).toBe(2);
  });

  it('stacks into one column when every widget is full width', () => {
    const layout = buildLayout(['a', 'b', 'c'], {}, () => GRID_COLS, {});
    expect(layout.map((item) => item.x)).toEqual([0, 0, 0]);
    expect(layout[1].y).toBeGreaterThan(layout[0].y);
    expect(layout[2].y).toBeGreaterThan(layout[1].y);
  });

  it('grows a widget in rows as its measured content grows', () => {
    const short = buildLayout(['funnel'], {}, width, { funnel: 200 });
    const tall = buildLayout(['funnel'], {}, width, { funnel: 900 });
    expect(tall[0].h).toBeGreaterThan(short[0].h);
  });

  it('gives an unmeasured widget a usable height rather than zero', () => {
    expect(rowsFor(0)).toBeGreaterThanOrEqual(2);
    expect(buildLayout(['funnel'], {}, width, {})[0].h).toBeGreaterThan(2);
  });
});

describe('toPlacements', () => {
  it('stores position and width but not the measured height', () => {
    const stored = toPlacements([{ i: 'funnel', x: 3, y: 9, w: 6, h: 27 }]);
    expect(stored).toEqual({ funnel: { x: 3, y: 9, w: 6 } });
  });
});

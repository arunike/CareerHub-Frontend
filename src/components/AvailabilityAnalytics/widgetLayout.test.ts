import { describe, expect, it } from 'vitest';
import { GRID_COLS, buildLayout } from '../JobHuntAnalytics/widgetLayout';
import { getAvailabilityWidgetGridWidth } from './widgetRenderer';

const DEFAULT_IDS = ['total', 'weekly', 'load', 'category'];
const width = (id: string) => getAvailabilityWidgetGridWidth(id, []);

describe('the availability dashboard default widths', () => {
  it('fills every row, so the first paint leaves no ragged gap on the right', () => {
    const layout = buildLayout(DEFAULT_IDS, {}, width, {});
    const byRow = new Map<number, number>();
    for (const item of layout) byRow.set(item.y, (byRow.get(item.y) ?? 0) + item.w);
    expect([...byRow.values()]).toEqual([GRID_COLS, GRID_COLS, GRID_COLS]);
  });

  it('pairs the two single-figure cards and gives each section the full width', () => {
    const layout = buildLayout(DEFAULT_IDS, {}, width, {});
    const at = (id: string) => layout.find((item) => item.i === id)!;
    expect(at('total')).toMatchObject({ x: 0, y: 0, w: 6 });
    expect(at('weekly')).toMatchObject({ x: 6, y: 0, w: 6 });
    expect(at('load')).toMatchObject({ x: 0, w: GRID_COLS });
    expect(at('category')).toMatchObject({ x: 0, w: GRID_COLS });
    expect(at('category').y).toBeGreaterThan(at('load').y);
  });
});

import type { Layout, LayoutItem } from 'react-grid-layout';

export const GRID_COLS = 12;
export const ROW_HEIGHT = 8;
export const MARGIN: [number, number] = [24, 24];
export const MIN_WIDTH = 2;
const FALLBACK_HEIGHT = 240;

export interface Placement {
  x: number;
  y: number;
  w: number;
}

// Row units for a measured pixel height, since react-grid-layout sizes items in rows only.
export const rowsFor = (height: number) =>
  Math.max(2, Math.ceil((height + MARGIN[1]) / (ROW_HEIGHT + MARGIN[1])));

// Widgets never placed by hand flow left to right and wrap at the last column.
export const buildLayout = (
  ids: string[],
  placements: Record<string, Placement>,
  defaultWidth: (id: string) => number,
  heights: Record<string, number>
): Layout => {
  const items: LayoutItem[] = [];
  let cursorX = 0;
  let cursorY = 0;
  let tallest = 0;
  for (const id of ids) {
    const placement = placements[id];
    const w = Math.min(GRID_COLS, Math.max(MIN_WIDTH, placement?.w ?? defaultWidth(id)));
    const h = rowsFor(heights[id] ?? FALLBACK_HEIGHT);
    if (placement) {
      items.push({
        i: id,
        x: Math.min(placement.x, GRID_COLS - w),
        y: placement.y,
        w,
        h,
        minW: MIN_WIDTH,
      });
      continue;
    }
    if (cursorX + w > GRID_COLS) {
      cursorX = 0;
      cursorY += tallest;
      tallest = 0;
    }
    items.push({ i: id, x: cursorX, y: cursorY, w, h, minW: MIN_WIDTH });
    cursorX += w;
    tallest = Math.max(tallest, h);
  }
  return items;
};

// Only x, y and w survive a reload; h is measured from the rendered card every time.
export const toPlacements = (layout: Layout): Record<string, Placement> => {
  const mapped: Record<string, Placement> = {};
  for (const item of layout) mapped[item.i] = { x: item.x, y: item.y, w: item.w };
  return mapped;
};

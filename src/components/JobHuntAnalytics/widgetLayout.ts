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

const sizeOf = (
  id: string,
  placement: Placement | undefined,
  defaultWidth: (id: string) => number,
  heights: Record<string, number>
) => ({
  w: Math.min(GRID_COLS, Math.max(MIN_WIDTH, placement?.w ?? defaultWidth(id))),
  h: rowsFor(heights[id] ?? FALLBACK_HEIGHT),
});

// The lowest row an item of this width can start on at this column, given what is already down.
const restingRow = (bottoms: number[], x: number, w: number) =>
  Math.max(...bottoms.slice(x, x + w));

export const buildLayout = (
  ids: string[],
  placements: Record<string, Placement>,
  defaultWidth: (id: string) => number,
  heights: Record<string, number>
): Layout => {
  // How far down each column is occupied, so a widget can settle against its own neighbour.
  const bottoms: number[] = new Array(GRID_COLS).fill(0);
  const pinned = new Map<string, LayoutItem>();

  // Hand-placed widgets keep their exact cell and everything else settles around them.
  for (const id of ids) {
    const placement = placements[id];
    if (!placement) continue;
    const { w, h } = sizeOf(id, placement, defaultWidth, heights);
    const x = Math.max(0, Math.min(placement.x, GRID_COLS - w));
    pinned.set(id, { i: id, x, y: placement.y, w, h, minW: MIN_WIDTH });
    for (let column = x; column < x + w; column += 1) {
      bottoms[column] = Math.max(bottoms[column], placement.y + h);
    }
  }

  // The rest flow left to right, wrap at the last column, then float up to the first free row.
  const items: LayoutItem[] = [];
  let cursorX = 0;
  for (const id of ids) {
    const alreadyPlaced = pinned.get(id);
    if (alreadyPlaced) {
      items.push(alreadyPlaced);
      continue;
    }
    const { w, h } = sizeOf(id, undefined, defaultWidth, heights);
    if (cursorX + w > GRID_COLS) cursorX = 0;
    const y = restingRow(bottoms, cursorX, w);
    items.push({ i: id, x: cursorX, y, w, h, minW: MIN_WIDTH });
    for (let column = cursorX; column < cursorX + w; column += 1) bottoms[column] = y + h;
    cursorX = (cursorX + w) % GRID_COLS;
  }
  return items;
};

// Only x, y and w survive a reload; h is measured from the rendered card every time.
export const toPlacements = (layout: Layout): Record<string, Placement> => {
  const mapped: Record<string, Placement> = {};
  for (const item of layout) mapped[item.i] = { x: item.x, y: item.y, w: item.w };
  return mapped;
};

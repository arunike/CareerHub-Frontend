import { useCallback, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { GridLayout } from 'react-grid-layout';
import { getCompactor } from 'react-grid-layout/core';
import type { Layout } from 'react-grid-layout';
import { HolderOutlined } from '@ant-design/icons';
import { GRID_COLS, MARGIN, ROW_HEIGHT, buildLayout, toPlacements } from './widgetLayout';
import type { Placement } from './widgetLayout';
import 'react-grid-layout/css/styles.css';

export { GRID_COLS } from './widgetLayout';
export type { Placement } from './widgetLayout';

// No compaction, and a drop onto occupied cells is refused rather than shoving neighbours aside.
const FREE_PLACEMENT = getCompactor(null, false, true);

export interface WidgetGridProps {
  ids: string[];
  width: number;
  // Persisted x, y and w per widget; h is always measured, never stored.
  placements: Record<string, Placement>;
  defaultWidth: (id: string) => number;
  onPlacementsChange: (next: Record<string, Placement>) => void;
  renderWidget: (id: string) => ReactNode;
  draggable: boolean;
}

export const WidgetGrid = ({
  ids,
  width,
  placements,
  defaultWidth,
  onPlacementsChange,
  renderWidget,
  draggable,
}: WidgetGridProps) => {
  const [heights, setHeights] = useState<Record<string, number>>({});
  const interacting = useRef(false);

  const setHeight = useCallback((id: string, value: number) => {
    // A remeasure mid-drag would remount the grid and drop the gesture.
    if (interacting.current) return;
    setHeights((current) => (current[id] === value ? current : { ...current, [id]: value }));
  }, []);

  // A ref callback per widget; React 19 runs the returned cleanup when the node goes away.
  const measureRef = useCallback(
    (id: string) => (node: HTMLDivElement | null) => {
      if (!node) return;
      setHeight(id, node.scrollHeight);
      const observer = new ResizeObserver(() => setHeight(id, node.scrollHeight));
      observer.observe(node);
      return () => observer.disconnect();
    },
    [setHeight]
  );

  const layout = useMemo<Layout>(
    () => buildLayout(ids, placements, defaultWidth, heights),
    [ids, placements, defaultWidth, heights]
  );

  // Only a finished drag or resize is worth storing; onLayoutChange also fires on every remeasure.
  const commit = useCallback(
    (next: Layout) => {
      onPlacementsChange(toPlacements(next));
    },
    [onPlacementsChange]
  );

  const gridConfig = useMemo(
    () => ({
      cols: GRID_COLS,
      rowHeight: ROW_HEIGHT,
      margin: MARGIN,
      containerPadding: [0, 0] as [number, number],
    }),
    []
  );
  const dragConfig = useMemo(
    () => ({ enabled: draggable, handle: '.widget-drag-handle' }),
    [draggable]
  );
  const resizeConfig = useMemo(
    () => ({ enabled: draggable, handles: ['e'] as const }),
    [draggable]
  );

  // GridLayout only reads its layout prop on mount, so a measured height change remounts it.
  const heightKey = layout.map((item) => `${item.i}:${item.h}`).join('|');

  if (width <= 0) return null;

  return (
    <GridLayout
      key={heightKey}
      className="widget-grid"
      layout={layout}
      width={width}
      gridConfig={gridConfig}
      dragConfig={dragConfig}
      resizeConfig={resizeConfig}
      compactor={FREE_PLACEMENT}
      onDragStart={() => {
        interacting.current = true;
      }}
      onResizeStart={() => {
        interacting.current = true;
      }}
      onDragStop={(next) => {
        interacting.current = false;
        commit(next);
      }}
      onResizeStop={(next) => {
        interacting.current = false;
        commit(next);
      }}
    >
      {ids.map((id) => (
        <div key={id} className="min-w-0 overflow-visible">
          <div ref={measureRef(id)} className="group relative">
            <div
              aria-label={`Move ${id} widget`}
              className="widget-drag-handle absolute right-2 top-2 z-10 inline-flex min-h-11 min-w-11 cursor-grab items-center justify-center rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-white/90 dark:bg-ink-900/90 text-gray-400 dark:text-ink-500 shadow-sm transition-opacity hover:text-gray-600 active:cursor-grabbing md:min-h-0 md:min-w-0 md:border-0 md:bg-white/50 md:p-1 md:opacity-0 md:shadow-none md:group-hover:opacity-100 md:group-focus-within:opacity-100"
            >
              <HolderOutlined className="h-4 w-4" />
            </div>
            {renderWidget(id)}
          </div>
        </div>
      ))}
    </GridLayout>
  );
};

export default WidgetGrid;

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SettingOutlined } from '@ant-design/icons';
import { Grid, Typography, message } from 'antd';
import WidgetGrid, { GRID_COLS } from './jobHuntAnalytics/WidgetGrid';
import type { Placement } from './jobHuntAnalytics/widgetLayout';
import { WidgetCollapseProvider } from './jobHuntAnalytics/widgetCollapse';
import { usePersistedState } from '../hooks/usePersistedState';
import { useCustomWidgets } from '../hooks/useCustomWidgets';
import { useDashboardLayout } from '../hooks/useDashboardLayout';
import DashboardCustomizeModal from './jobHuntAnalytics/DashboardCustomizeModal';
import { AVAILABLE_WIDGETS } from './availabilityAnalytics/constants';
import CreateCustomWidgetModal from './jobHuntAnalytics/CreateCustomWidgetModal';
import type { VisualConfig } from '../lib/visualWidgetQuery';
import {
  getAvailabilityWidgetGridWidth,
  renderAvailabilityWidget,
  type AvailabilityStats,
} from './availabilityAnalytics/widgetRenderer';

const { Text } = Typography;

interface AvailabilityAnalyticsProps {
  stats: AvailabilityStats;
}

// Saved layouts can hold retired widget ids, which would render an empty card.
const RETIRED_WIDGET_IDS = new Set(['duration', 'activity']);
const AVAILABLE_WIDGET_IDS = new Set(AVAILABLE_WIDGETS.map((widget) => widget.id));
const DEFAULT_WIDGET_IDS = AVAILABLE_WIDGETS.filter((widget) => widget.defaultEnabled).map(
  (widget) => widget.id
);

const normalizeEnabledWidgets = (ids: string[]) => {
  const normalized = ids.filter(
    (id) => AVAILABLE_WIDGET_IDS.has(id) && !RETIRED_WIDGET_IDS.has(id)
  );
  // Anyone who had the duration tile keeps a tile in its place rather than silently losing one.
  if (ids.includes('duration') && !normalized.includes('load')) normalized.push('load');
  return normalized.length > 0 ? normalized : DEFAULT_WIDGET_IDS;
};

const EMPTY_PLACEMENTS: Record<string, Placement> = {};

const AvailabilityAnalytics: React.FC<AvailabilityAnalyticsProps> = ({ stats }) => {
  const [messageApi, contextHolder] = message.useMessage();
  const {
    enabled: enabledWidgets,
    order: widgetOrder,
    setEnabled: setEnabledWidgets,
  } = useDashboardLayout('availability', DEFAULT_WIDGET_IDS, normalizeEnabledWidgets);

  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const gridRef = useRef<HTMLDivElement | null>(null);
  const [gridWidth, setGridWidth] = useState(0);

  useEffect(() => {
    const node = gridRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setGridWidth(entry.contentRect.width));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Where each widget sits, chosen by dragging; v1 held the pre-settling layout, so it is dropped.
  const [placements, setPlacements] = usePersistedState<Record<string, Placement>>(
    'careerhub.analytics.availability.placements.v2',
    {}
  );

  const [collapsedWidgets, setCollapsedWidgets] = usePersistedState<string[]>(
    'careerhub.analytics.availability.collapsed',
    []
  );

  const toggleCollapsed = (id: string) =>
    setCollapsedWidgets(
      collapsedWidgets.includes(id)
        ? collapsedWidgets.filter((widgetId) => widgetId !== id)
        : [...collapsedWidgets, id]
    );

  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [isCreateWidgetOpen, setIsCreateWidgetOpen] = useState(false);

  const { customWidgets, addCustomWidget, deleteCustomWidget, testQuery } = useCustomWidgets(
    'availability_analytics_custom',
    'availability',
    messageApi
  );

  // A phone gets one full-width column, so desktop placements are ignored rather than squeezed.
  const gridWidths = useCallback(
    (id: string) => (isMobile ? GRID_COLS : getAvailabilityWidgetGridWidth(id, customWidgets)),
    [isMobile, customWidgets]
  );

  const toggleWidget = (widgetId: string) => {
    if (enabledWidgets.includes(widgetId)) {
      // The dashboard has to keep at least one widget.
      if (enabledWidgets.length === 1) return;
      setEnabledWidgets(enabledWidgets.filter((id) => id !== widgetId));
    } else {
      setEnabledWidgets([...enabledWidgets, widgetId]);
    }
  };

  const handleCreateCustomWidget = (widgetData: {
    name: string;
    queryType: 'ai' | 'visual';
    visualConfig?: VisualConfig;
    query: string;
    icon: string;
    color: string;
    cachedData: any;
  }) => {
    const customWidget: any = {
      id: `custom-${Date.now()}`,
      name: widgetData.name,
      query: widgetData.query,
      widgetType: widgetData.cachedData.type,
      icon: widgetData.icon,
      color: widgetData.color,
      createdAt: new Date().toISOString(),
      queryType: widgetData.queryType,
      visualConfig: widgetData.visualConfig,
      cachedData: widgetData.cachedData,
    };

    addCustomWidget(customWidget);

    setEnabledWidgets([...enabledWidgets, customWidget.id]);

    setIsCreateWidgetOpen(false);
    messageApi.success('Custom widget created!');
  };

  const handleDeleteCustomWidget = (id: string) => {
    deleteCustomWidget(id);
    setEnabledWidgets(enabledWidgets.filter((wId) => wId !== id));
  };

  return (
    <>
      {contextHolder}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <div>
          <Text className="text-gray-500 dark:text-ink-400">
            {enabledWidgets.length} widget{enabledWidgets.length !== 1 ? 's' : ''} enabled
          </Text>
        </div>
        <button
          type="button"
          onClick={() => setIsCustomizeOpen(true)}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-gray-500 dark:text-ink-400 transition-all hover:bg-gray-100 hover:text-gray-700 sm:w-auto"
        >
          <SettingOutlined />
          Customize view
        </button>
      </div>

      <div ref={gridRef}>
        <WidgetGrid
          ids={widgetOrder}
          width={gridWidth}
          placements={isMobile ? EMPTY_PLACEMENTS : placements}
          defaultWidth={gridWidths}
          onPlacementsChange={setPlacements}
          draggable={!isMobile}
          renderWidget={(id) => (
            <WidgetCollapseProvider
              collapsed={collapsedWidgets.includes(id)}
              onToggle={() => toggleCollapsed(id)}
            >
              {renderAvailabilityWidget(id, stats, customWidgets, deleteCustomWidget)}
            </WidgetCollapseProvider>
          )}
        />
      </div>

      <DashboardCustomizeModal
        open={isCustomizeOpen}
        onClose={() => setIsCustomizeOpen(false)}
        onOpenCreateWidget={() => setIsCreateWidgetOpen(true)}
        availableWidgets={AVAILABLE_WIDGETS}
        enabledWidgets={enabledWidgets}
        toggleWidget={toggleWidget}
        customWidgets={customWidgets}
        onDeleteCustomWidget={handleDeleteCustomWidget}
      />

      <CreateCustomWidgetModal
        open={isCreateWidgetOpen}
        onCancel={() => setIsCreateWidgetOpen(false)}
        onCreate={handleCreateCustomWidget}
        testQuery={testQuery}
        initialDataSource="events"
      />
    </>
  );
};

export default AvailabilityAnalytics;

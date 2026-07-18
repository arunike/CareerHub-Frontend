import { useEffect, useRef, useState } from 'react';
import type { MessageInstance } from 'antd/es/message/interface';
import { loadAnalyticsSourceData, runAnalyticsWidgetQuery } from '../lib/browserAi';
import { runVisualWidgetQuery } from '../lib/visualWidgetQuery';
import type { VisualConfig } from '../lib/visualWidgetQuery';

export interface CustomWidget {
  id: string;
  name: string;
  query: string;
  widgetType: 'metric' | 'chart';
  icon: string;
  color: string;
  createdAt: string;
  queryType?: 'ai' | 'visual';
  visualConfig?: VisualConfig;
  cachedData?: {
    type: 'metric' | 'chart';
    value?: number | string;
    unit?: string;
    data?: any[];
    chartType?: string; // 'pie' | 'bar'
  };
}

export const useCustomWidgets = (
  storageKey: string,
  context: 'availability' | 'job-hunt',
  messageApi: MessageInstance
) => {
  const [customWidgets, setCustomWidgets] = useState<CustomWidget[]>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (error) {
        console.error('Failed to parse custom widgets', error);
      }
    }
    return [];
  });
  const initialWidgetsRef = useRef(customWidgets);

  useEffect(() => {
    const refreshWidgets = async () => {
      const widgetsToRefresh = initialWidgetsRef.current;
      if (widgetsToRefresh.length === 0) return;

      let sourceData;
      try {
        sourceData = await loadAnalyticsSourceData();
      } catch (error) {
        messageApi.error('Failed to load analytics data for custom widgets');
        console.error('Failed to load analytics data for custom widgets', error);
        return;
      }

      let hasUpdates = false;
      const updatedWidgets = await Promise.all(
        widgetsToRefresh.map(async (widget) => {
          try {
            let data;
            if (widget.queryType === 'visual' && widget.visualConfig) {
              data = runVisualWidgetQuery(widget.visualConfig, sourceData);
            } else {
              data = await runAnalyticsWidgetQuery(widget.query, context, sourceData);
            }
            if (JSON.stringify(widget.cachedData) !== JSON.stringify(data)) {
              hasUpdates = true;
              return { ...widget, cachedData: data };
            }
          } catch (error) {
            messageApi.error(
              error instanceof Error ? error.message : `Failed to refresh widget ${widget.name}`
            );
            console.error(`Failed to refresh widget ${widget.name}:`, error);
          }
          return widget;
        })
      );

      if (hasUpdates) {
        setCustomWidgets(updatedWidgets);
        localStorage.setItem(storageKey, JSON.stringify(updatedWidgets));
      }
    };

    refreshWidgets();
  }, [context, messageApi, storageKey]);

  const addCustomWidget = (widget: CustomWidget) => {
    const updated = [...customWidgets, widget];
    setCustomWidgets(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const deleteCustomWidget = (id: string) => {
    const updated = customWidgets.filter((w) => w.id !== id);
    setCustomWidgets(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    messageApi.success('Custom widget deleted');
  };

  const testQuery = async (query: string) => {
    try {
      const sourceData = await loadAnalyticsSourceData();
      return await runAnalyticsWidgetQuery(query, context, sourceData);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : 'AI query failed');
      console.error('API Error:', error);
      throw error;
    }
  };

  const testVisualQuery = async (config: VisualConfig) => {
    try {
      const sourceData = await loadAnalyticsSourceData();
      return runVisualWidgetQuery(config, sourceData);
    } catch (error) {
      messageApi.error('Visual query calculation failed');
      console.error('Visual Query Error:', error);
      throw error;
    }
  };

  return {
    customWidgets,
    addCustomWidget,
    deleteCustomWidget,
    testQuery,
    testVisualQuery,
  };
};

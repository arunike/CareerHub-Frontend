import { useEffect, useRef } from 'react';
import type { MessageInstance } from 'antd/es/message/interface';
import { runAnalyticsWidgetQuery } from '../lib/browserAi';
import { loadAnalyticsSourceData } from '../lib/analyticsQuery';
import { runVisualWidgetQuery } from '../lib/visualWidgetQuery';
import type { VisualConfig } from '../lib/visualWidgetQuery';
import { useAccountSetting } from './useAccountSetting';

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
  const {
    value: customWidgets,
    setValue: setCustomWidgets,
    loaded,
  } = useAccountSetting<CustomWidget[]>('custom_analytics_widgets', [], storageKey);
  // Keyed on arrival, not mount: on mount the list is still whatever the cache held.
  const refreshedRef = useRef(false);

  useEffect(() => {
    if (!loaded || refreshedRef.current) return;
    const refreshWidgets = async () => {
      const widgetsToRefresh = customWidgets;
      if (widgetsToRefresh.length === 0) return;
      refreshedRef.current = true;

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

      if (hasUpdates) setCustomWidgets(updatedWidgets);
    };

    refreshWidgets();
  }, [context, customWidgets, loaded, messageApi, setCustomWidgets, storageKey]);

  const addCustomWidget = (widget: CustomWidget) => {
    setCustomWidgets([...customWidgets, widget]);
  };

  const deleteCustomWidget = (id: string) => {
    setCustomWidgets(customWidgets.filter((w) => w.id !== id));
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

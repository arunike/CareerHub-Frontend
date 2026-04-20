import { useState, useEffect } from 'react';
import type { MessageInstance } from 'antd/es/message/interface';
import {
  loadAnalyticsSourceData,
  runAnalyticsWidgetQuery,
} from '../lib/browserAi';

export interface CustomWidget {
  id: string;
  name: string;
  query: string;
  widgetType: 'metric' | 'chart';
  icon: string;
  color: string;
  createdAt: string;
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
        // console.error to avoid side-effects in state initializer
        console.error('Failed to parse custom widgets', error);
      }
    }
    return [];
  });

  // Refresh data on mount
  useEffect(() => {
    const refreshWidgets = async () => {
      if (customWidgets.length === 0) return;

      let sourceData;
      try {
        sourceData = await loadAnalyticsSourceData();
      } catch (error) {
        messageApi.error('Failed to load analytics data for custom widgets');
        console.error('Failed to load analytics data for custom widgets', error);
        return;
      }

      let hasUpdates = false;
      const updatedWidgets = await Promise.all(customWidgets.map(async (widget) => {
        try {
          const data = await runAnalyticsWidgetQuery(widget.query, context, sourceData);
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
      }));
      
      if (hasUpdates) {
        setCustomWidgets(updatedWidgets);
        localStorage.setItem(storageKey, JSON.stringify(updatedWidgets));
      }
    };
    
    refreshWidgets();
  }, []);

  const addCustomWidget = (widget: CustomWidget) => {
    const updated = [...customWidgets, widget];
    setCustomWidgets(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const deleteCustomWidget = (id: string) => {
    const updated = customWidgets.filter(w => w.id !== id);
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

  return {
    customWidgets,
    addCustomWidget,
    deleteCustomWidget,
    testQuery,
  };
};

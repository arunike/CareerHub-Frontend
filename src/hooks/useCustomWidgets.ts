import { useState, useEffect } from 'react';
import { message } from 'antd';

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

export const useCustomWidgets = (storageKey: string, context: 'availability' | 'job-hunt') => {
  const [customWidgets, setCustomWidgets] = useState<CustomWidget[]>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (error) {
        message.error('Failed to parse custom widgets');
        console.error('Failed to parse custom widgets', error);
      }
    }
    return [];
  });

  // Refresh data on mount
  useEffect(() => {
    const refreshWidgets = async () => {
      if (customWidgets.length === 0) return;
      
      let hasUpdates = false;
      const updatedWidgets = await Promise.all(customWidgets.map(async (widget) => {
        try {
          const response = await fetch('http://localhost:8000/api/analytics/query/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: widget.query, context }),
          });
          
          if (response.ok) {
            const data = await response.json();
            if (JSON.stringify(widget.cachedData) !== JSON.stringify(data)) {
              hasUpdates = true;
              return { ...widget, cachedData: data };
            }
          }
        } catch (error) {
          message.error(`Failed to refresh widget ${widget.name}`);
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
    message.success('Custom widget deleted');
  };

  const testQuery = async (query: string) => {
    try {
      const response = await fetch('http://localhost:8000/api/analytics/query/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, context }),
      });
      return await response.json();
    } catch (error) {
      message.error('API Error:');
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

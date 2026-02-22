import type { ReactNode } from 'react';

export interface WidgetDefinition {
  id: string;
  name: string;
  description: string;
  icon: ReactNode;
  defaultEnabled: boolean;
  category: 'statistic' | 'chart';
}

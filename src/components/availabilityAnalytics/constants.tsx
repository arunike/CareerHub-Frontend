import {
  CalendarOutlined,
  PieChartOutlined,
  RiseOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import type { WidgetDefinition } from '../jobHuntAnalytics/types';

export const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#60a5fa', '#ec4899', '#06b6d4'];

export const AVAILABLE_WIDGETS: WidgetDefinition[] = [
  {
    id: 'total',
    name: 'Total Events',
    description: 'Total number of events tracked',
    icon: <CalendarOutlined />,
    defaultEnabled: true,
    category: 'statistic',
  },
  {
    id: 'weekly',
    name: 'Events This Week',
    description: 'Number of events this week',
    icon: <RiseOutlined />,
    defaultEnabled: true,
    category: 'statistic',
  },
  {
    id: 'load',
    name: 'Schedule Load',
    description: 'Events per week, busiest day, doubled-up days, and when they usually land',
    icon: <ThunderboltOutlined />,
    defaultEnabled: true,
    category: 'statistic',
  },
  {
    id: 'category',
    name: 'Events by Category',
    description: 'Breakdown of events by category',
    icon: <PieChartOutlined />,
    defaultEnabled: true,
    category: 'chart',
  },
];

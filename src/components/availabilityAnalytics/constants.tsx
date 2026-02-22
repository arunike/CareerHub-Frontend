import {
  BarChartOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  PieChartOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import type { WidgetDefinition } from '../jobHuntAnalytics/types';

export const COLORS = ['#1890ff', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

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
    id: 'duration',
    name: 'Average Duration',
    description: 'Average event duration in minutes',
    icon: <ClockCircleOutlined />,
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
  {
    id: 'activity',
    name: 'Daily Activity',
    description: 'Daily event count and duration',
    icon: <BarChartOutlined />,
    defaultEnabled: true,
    category: 'chart',
  },
];

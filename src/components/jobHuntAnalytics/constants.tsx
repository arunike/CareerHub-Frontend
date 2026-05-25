import {
  FileTextOutlined,
  ClockCircleOutlined,
  QuestionCircleOutlined,
  TrophyOutlined,
  NodeIndexOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import type { WidgetDefinition } from './types';

export const AVAILABLE_WIDGETS: WidgetDefinition[] = [
  {
    id: 'total',
    name: 'Total Applications',
    description: 'Total number of applications submitted',
    icon: <FileTextOutlined />,
    defaultEnabled: true,
    category: 'statistic',
  },
  {
    id: 'active',
    name: 'Active Pipeline',
    description: 'Applications currently in interview stages',
    icon: <ClockCircleOutlined />,
    defaultEnabled: true,
    category: 'statistic',
  },
  {
    id: 'outcomes',
    name: 'Outcomes Summary',
    description: 'Breakdown of application outcomes',
    icon: <TrophyOutlined />,
    defaultEnabled: true,
    category: 'statistic',
  },
  {
    id: 'ghosted',
    name: 'No Response',
    description: 'Applications that were ghosted or never responded to',
    icon: <QuestionCircleOutlined />,
    defaultEnabled: true,
    category: 'statistic',
  },
  {
    id: 'pipeline_breakdown',
    name: 'Pipeline Breakdown',
    description: 'Current stage, location, and application age distribution',
    icon: <AppstoreOutlined />,
    defaultEnabled: true,
    category: 'chart',
  },
  {
    id: 'timeline_analytics',
    name: 'Timeline Analytics',
    description: 'Time-to-interview, stage conversion, stale stages, and sheet offer rates',
    icon: <NodeIndexOutlined />,
    defaultEnabled: true,
    category: 'chart',
  },
];

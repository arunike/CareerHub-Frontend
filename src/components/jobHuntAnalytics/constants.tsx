import {
  EnvironmentOutlined,
  AimOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  QuestionCircleOutlined,
  TrophyOutlined,
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
    name: 'Active Applications',
    description: 'Applications currently in progress',
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
    name: 'Ghosted Rate',
    description: 'Percentage of applications ghosted',
    icon: <QuestionCircleOutlined />,
    defaultEnabled: true,
    category: 'statistic',
  },
  {
    id: 'locations',
    name: 'Top Locations',
    description: 'Most common application locations',
    icon: <EnvironmentOutlined />,
    defaultEnabled: true,
    category: 'chart',
  },
  {
    id: 'rounds',
    name: 'Interview Rounds',
    description: 'Distribution of interview rounds',
    icon: <AimOutlined />,
    defaultEnabled: true,
    category: 'chart',
  },
];

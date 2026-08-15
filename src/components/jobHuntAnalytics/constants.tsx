import { NodeIndexOutlined } from '@ant-design/icons';
import type { WidgetDefinition } from './types';

export const AVAILABLE_WIDGETS: WidgetDefinition[] = [
  {
    id: 'job_search',
    name: 'Job Search',
    description:
      'Headline totals, the application funnel, stage timings, stale stages, and where offers come from',
    icon: <NodeIndexOutlined />,
    defaultEnabled: true,
    category: 'chart',
  },
];

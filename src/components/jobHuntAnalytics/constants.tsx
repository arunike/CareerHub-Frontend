import {
  ClockCircleOutlined,
  EnvironmentOutlined,
  FilterOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { WidgetDefinition } from './types';

// One widget per section, so each can be toggled, reordered and sized on its own. These were
// briefly a single "Job Search" card, which fixed the real problem — the same numbers being
// reported three times — but grew into one tall block you could not rearrange. Splitting it
// keeps that fix: every figure still appears in exactly one of these.
export const AVAILABLE_WIDGETS: WidgetDefinition[] = [
  {
    id: 'headline',
    name: 'Headline Numbers',
    description: 'Total, active, offers, no response, response rate, stage timings, stale count',
    icon: <ThunderboltOutlined />,
    defaultEnabled: true,
    category: 'statistic',
  },
  {
    id: 'funnel',
    name: 'Application Funnel',
    description: 'Stages reached, how many sit at each now, typical duration, biggest drop-off',
    icon: <FilterOutlined />,
    defaultEnabled: true,
    category: 'chart',
  },
  {
    id: 'watch_list',
    name: 'Watch List',
    description: 'Applications stuck in a stage, and how far past normal for that stage they are',
    icon: <WarningOutlined />,
    defaultEnabled: true,
    category: 'chart',
  },
  {
    id: 'reply_timing',
    name: 'Reply Timing',
    description: 'How long replies take, and when silence is more likely dead than slow',
    icon: <ClockCircleOutlined />,
    defaultEnabled: true,
    category: 'chart',
  },
  {
    id: 'outcomes',
    name: 'Outcomes',
    description: 'Final results: accepted, offers, rejections, ghosted',
    icon: <TrophyOutlined />,
    defaultEnabled: true,
    category: 'statistic',
  },
  {
    id: 'response_segments',
    name: 'Best Response Rate',
    description: 'Which locations actually reply, ranked, with small samples left out',
    icon: <TrophyOutlined />,
    defaultEnabled: true,
    category: 'chart',
  },
  {
    id: 'top_locations',
    name: 'Top Locations',
    description: 'Where your applications are concentrated',
    icon: <EnvironmentOutlined />,
    defaultEnabled: true,
    category: 'chart',
  },
  {
    id: 'application_age',
    name: 'Application Age',
    description: 'How old your applications are',
    icon: <ClockCircleOutlined />,
    defaultEnabled: true,
    category: 'chart',
  },
];

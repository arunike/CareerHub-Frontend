import React from 'react';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  RiseOutlined,
  PieChartOutlined,
  BarChartOutlined,
  FileTextOutlined,
  TrophyOutlined,
  EnvironmentOutlined,
  NumberOutlined,
  DollarOutlined,
  HomeOutlined,
  SendOutlined,
  CheckCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Bar,
} from 'recharts';
import type { CustomWidget } from '../hooks/useCustomWidgets';
import { ANALYTICS_CHART_INITIAL_DIMENSION } from '../constants/chartDimensions';

interface CustomWidgetCardProps {
  widget: CustomWidget;
  onDelete?: (id: string) => void;
}

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#60a5fa', '#ec4899'];

const CustomWidgetCard: React.FC<CustomWidgetCardProps> = ({ widget }) => {
  const { cachedData, color, icon, name } = widget;

  const colorMap: Record<string, { bg: string; text: string; fill: string }> = {
    blue: {
      bg: 'bg-blue-100 dark:bg-blue-500/15',
      text: 'text-blue-600 dark:text-blue-300',
      fill: '#2563eb',
    },
    green: {
      bg: 'bg-green-100 dark:bg-green-500/15',
      text: 'text-green-600 dark:text-green-300',
      fill: '#10b981',
    },
    amber: {
      bg: 'bg-amber-100 dark:bg-amber-500/15',
      text: 'text-amber-600 dark:text-amber-300',
      fill: '#f59e0b',
    },
    red: {
      bg: 'bg-red-100 dark:bg-red-500/15',
      text: 'text-red-600 dark:text-red-300',
      fill: '#ef4444',
    },
    purple: {
      bg: 'bg-purple-100 dark:bg-purple-500/15',
      text: 'text-purple-600 dark:text-purple-300',
      fill: '#60a5fa',
    },
    pink: {
      bg: 'bg-pink-100 dark:bg-pink-500/15',
      text: 'text-pink-600 dark:text-pink-300',
      fill: '#ec4899',
    },
  };

  const colors = colorMap[color] || colorMap.blue;

  const IconComponent =
    icon === 'CalendarOutlined'
      ? CalendarOutlined
      : icon === 'ClockCircleOutlined'
        ? ClockCircleOutlined
        : icon === 'RiseOutlined'
          ? RiseOutlined
          : icon === 'PieChartOutlined'
            ? PieChartOutlined
            : icon === 'BarChartOutlined'
              ? BarChartOutlined
              : icon === 'FileTextOutlined'
                ? FileTextOutlined
                : icon === 'TrophyOutlined'
                  ? TrophyOutlined
                  : icon === 'EnvironmentOutlined'
                    ? EnvironmentOutlined
                    : icon === 'NumberOutlined'
                      ? NumberOutlined
                      : icon === 'DollarOutlined'
                        ? DollarOutlined
                        : icon === 'HomeOutlined'
                          ? HomeOutlined
                          : icon === 'SendOutlined'
                            ? SendOutlined
                            : icon === 'CheckCircleOutlined'
                              ? CheckCircleOutlined
                              : icon === 'WarningOutlined'
                                ? WarningOutlined
                                : CalendarOutlined;

  if (widget.widgetType === 'metric') {
    const value = cachedData?.value ?? '...';
    const unit = cachedData?.unit || '';

    return (
      <div className="enterprise-card group relative h-full p-4 sm:p-6">
        <div className="flex items-center gap-4">
          <div className={`flex items-center justify-center w-12 h-12 ${colors.bg} rounded-lg`}>
            <IconComponent className={`text-2xl ${colors.text}`} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-ink-400">{name}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-ink-50">
              {value}{' '}
              <span className="text-sm font-normal text-gray-500 dark:text-ink-400">{unit}</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (widget.widgetType === 'chart' && cachedData?.data) {
    const chartType = cachedData.chartType || 'bar';

    return (
      <div className="enterprise-card group relative h-full p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-6">
          <IconComponent className={`w-5 h-5 ${colors.text}`} />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-ink-50">{name}</h3>
        </div>
        <div className={`h-75 w-full ${chartType === 'pie' ? 'careerhub-responsive-pie' : ''}`}>
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            minHeight={1}
            initialDimension={ANALYTICS_CHART_INITIAL_DIMENSION}
          >
            {chartType === 'pie' ? (
              <PieChart>
                <Pie
                  data={cachedData.data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${(percent ? percent * 100 : 0).toFixed(0)}%`
                  }
                >
                  {cachedData.data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            ) : (
              <BarChart data={cachedData.data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip cursor={{ fill: 'transparent' }} />
                <Bar dataKey="value" fill={colors.fill} radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return null;
};

export default CustomWidgetCard;

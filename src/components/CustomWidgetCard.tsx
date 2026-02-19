import React from 'react';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  RiseOutlined,
  PieChartOutlined,
  BarChartOutlined,
  CloseCircleOutlined,
  FileTextOutlined,
  TrophyOutlined,
  EnvironmentOutlined,
  NumberOutlined,
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

interface CustomWidgetCardProps {
  widget: CustomWidget;
  onDelete: (id: string) => void;
}

const COLORS = ['#1890ff', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const CustomWidgetCard: React.FC<CustomWidgetCardProps> = ({ widget, onDelete }) => {
  const { cachedData, color, icon, name } = widget;

  const colorMap: Record<string, { bg: string; text: string; fill: string }> = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', fill: '#1890ff' },
    green: { bg: 'bg-green-100', text: 'text-green-600', fill: '#10b981' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-600', fill: '#f59e0b' },
    red: { bg: 'bg-red-100', text: 'text-red-600', fill: '#ef4444' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600', fill: '#8b5cf6' },
    pink: { bg: 'bg-pink-100', text: 'text-pink-600', fill: '#ec4899' },
  };

  const colors = colorMap[color] || colorMap.blue;

  const IconComponent =
    icon === 'CalendarOutlined' ? CalendarOutlined :
    icon === 'ClockCircleOutlined' ? ClockCircleOutlined :
    icon === 'RiseOutlined' ? RiseOutlined :
    icon === 'PieChartOutlined' ? PieChartOutlined :
    icon === 'BarChartOutlined' ? BarChartOutlined :
    icon === 'FileTextOutlined' ? FileTextOutlined :
    icon === 'TrophyOutlined' ? TrophyOutlined :
    icon === 'EnvironmentOutlined' ? EnvironmentOutlined :
    icon === 'NumberOutlined' ? NumberOutlined :
    CalendarOutlined;

  // Render Metric Widget
  if (widget.widgetType === 'metric') {
    const value = cachedData?.value ?? '...';
    const unit = cachedData?.unit || '';

    return (
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow h-full relative group">
        <button
          onClick={() => onDelete(widget.id)}
          className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded shadow-sm z-10"
          title="Delete custom widget"
        >
          <CloseCircleOutlined className="text-sm" />
        </button>
        <div className="flex items-center gap-4">
          <div className={`flex items-center justify-center w-12 h-12 ${colors.bg} rounded-lg`}>
            <IconComponent className={`text-2xl ${colors.text}`} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">{name}</p>
            <p className="text-2xl font-bold text-gray-900">
              {value} <span className="text-sm font-normal text-gray-500">{unit}</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render Chart Widget
  if (widget.widgetType === 'chart' && cachedData?.data) {
    const chartType = cachedData.chartType || 'bar';

    return (
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-full relative group">
        <button
          onClick={() => onDelete(widget.id)}
          className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded shadow-sm z-10"
          title="Delete custom widget"
        >
          <CloseCircleOutlined className="text-sm" />
        </button>
        <div className="flex items-center gap-2 mb-6">
          <IconComponent className={`w-5 h-5 ${colors.text}`} />
          <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
        </div>
        <div className="h-75 w-full">
          <ResponsiveContainer width="100%" height="100%">
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
                  label={({ name, percent }) => `${name} ${(percent ? percent * 100 : 0).toFixed(0)}%`}
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

import type React from 'react';
import { Spin } from 'antd';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  XAxis,
  YAxis,
  Bar,
} from 'recharts';
import type { VisualConfig, FilterRule } from '../../lib/visualWidgetQuery';
import { COLORS, COLOR_THEMES, type ValidationResult } from './widgetFieldOptions';

type Props = {
  IconComponent: React.ComponentType<{ className?: string }>;
  activeColorTheme: (typeof COLOR_THEMES)[number];
  currentWidgetType: string;
  currentPreviewData: ValidationResult | null;
  filters: FilterRule[];
  loadingData: boolean;
  visualConfig: VisualConfig;
  widgetName: string;
};

const WidgetPreviewPanel = ({
  IconComponent,
  activeColorTheme,
  currentWidgetType,
  currentPreviewData,
  loadingData,
  visualConfig,
  widgetName,
}: Props) => (
  <div className="flex max-h-none flex-[2] flex-col justify-between border-t border-slate-100 bg-slate-50 p-4 sm:p-6 lg:max-h-[650px] lg:border-l lg:border-t-0">
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Live Preview
        </span>
        {loadingData && <Spin size="small" />}
      </div>

      {/* Live widget renderer */}
      <div className="flex min-h-[200px] w-full items-center justify-center rounded-2xl border border-slate-200/80 bg-slate-200/50 p-3 shadow-inner sm:min-h-[250px] sm:p-4">
        {loadingData ? (
          <div className="text-center space-y-2">
            <Spin size="default" />
            <p className="text-xs text-slate-400 font-medium">Syncing live dashboard data...</p>
          </div>
        ) : currentPreviewData ? (
          <div className="w-full">
            {currentWidgetType === 'metric' ? (
              <div className="bg-white border border-slate-200/60 rounded-xl shadow-sm p-4 sm:p-6 relative">
                <div className="flex items-center gap-4">
                  <div
                    className={`flex items-center justify-center w-12 h-12 ${activeColorTheme.bg} rounded-lg`}
                  >
                    <IconComponent className={`text-2xl ${activeColorTheme.text}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 leading-none">
                      {widgetName || 'Untitled Widget'}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-2 leading-none">
                      {currentPreviewData.value ?? 0}{' '}
                      <span className="text-sm font-normal text-gray-500">
                        {currentPreviewData.unit || ''}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200/60 rounded-xl shadow-sm p-4 sm:p-6 w-full">
                <div className="flex items-center gap-2 mb-4">
                  <IconComponent className={`w-5 h-5 ${activeColorTheme.text}`} />
                  <h3 className="text-sm font-semibold text-gray-900 truncate leading-none">
                    {widgetName || 'Untitled Chart'}
                  </h3>
                </div>
                <div className="h-44 w-full flex items-center justify-center">
                  {currentPreviewData.data && currentPreviewData.data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
                      {currentPreviewData.chartType === 'pie' ||
                      (currentWidgetType === 'chart' && visualConfig.chartType === 'pie') ? (
                        <PieChart>
                          <Pie
                            data={currentPreviewData.data}
                            cx="50%"
                            cy="50%"
                            innerRadius={25}
                            outerRadius={45}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {currentPreviewData.data.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      ) : (
                        <BarChart
                          data={currentPreviewData.data}
                          margin={{ top: 5, right: 5, left: -25, bottom: 5 }}
                        >
                          <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                          <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
                          <Tooltip cursor={{ fill: 'transparent' }} />
                          <Bar dataKey="value" fill={activeColorTheme.fill} radius={[2, 2, 0, 0]} />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-xs text-slate-400 font-medium">
                      No records match the current filters.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center p-6 text-slate-400 text-xs font-semibold">
            Configure filters on the left to see the interactive widget preview.
          </div>
        )}
      </div>
    </div>

    <div className="bg-white/80 border border-slate-100 rounded-xl p-4 text-xs text-slate-500 shadow-sm mt-4">
      <span className="font-semibold text-slate-700 block mb-1">💡 Interactive BI customizer</span>
      <p className="leading-relaxed">
        Combine multi-rule AND filters to refine your data stack. Renders live averages, counts, or
        rates instantly with full precision.
      </p>
    </div>
  </div>
);

export default WidgetPreviewPanel;

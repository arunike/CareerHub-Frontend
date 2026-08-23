import type { ReactNode } from 'react';
import type React from 'react';
import {
  CalendarOutlined,
  PieChartOutlined,
  BarChartOutlined,
  NumberOutlined,
  DatabaseOutlined,
  FilterOutlined,
  PlusOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { Button, Input, Segmented, Select, Tag, Typography } from 'antd';

const { Text } = Typography;
import type { VisualConfig, FilterRule } from '../../lib/visualWidgetQuery';
import { AVAILABLE_ICONS, COLOR_THEMES, OPERATORS } from './widgetFieldOptions';
import type { ValidationResult } from './widgetFieldOptions';

type Props = {
  addFilterRule: () => void;
  currentFieldsList: Array<{ value: string; label: string }>;
  filters: FilterRule[];
  handleDataSourceChange: (source: 'applications' | 'events') => void;
  handleTestQuery: () => void;
  isValidating: boolean;
  newWidgetColor: string;
  newWidgetIcon: string;
  newWidgetQuery: string;
  queryType: 'visual' | 'ai';
  removeFilterRule: (idx: number) => void;
  renderFilterValueInput: (rule: FilterRule, idx: number) => ReactNode;
  setNewWidgetColor: React.Dispatch<React.SetStateAction<string>>;
  setNewWidgetIcon: React.Dispatch<React.SetStateAction<string>>;
  setNewWidgetQuery: React.Dispatch<React.SetStateAction<string>>;
  setQueryType: React.Dispatch<React.SetStateAction<'visual' | 'ai'>>;
  setVisualConfig: React.Dispatch<React.SetStateAction<VisualConfig>>;
  setWidgetName: React.Dispatch<React.SetStateAction<string>>;
  updateFilterRule: (idx: number, key: keyof FilterRule, val: string) => void;
  validationResult: ValidationResult | null;
  visualConfig: VisualConfig;
  widgetName: string;
};

const WidgetConfigPanel = ({
  addFilterRule,
  currentFieldsList,
  filters,
  handleDataSourceChange,
  handleTestQuery,
  isValidating,
  newWidgetColor,
  newWidgetIcon,
  newWidgetQuery,
  queryType,
  removeFilterRule,
  renderFilterValueInput,
  setNewWidgetColor,
  setNewWidgetIcon,
  setNewWidgetQuery,
  setQueryType,
  setVisualConfig,
  setWidgetName,
  updateFilterRule,
  validationResult,
  visualConfig,
  widgetName,
}: Props) => (
  <div className="flex-[3] space-y-6 p-4 sm:p-6 lg:max-h-[650px] lg:overflow-y-auto">
    {/* Segmented Creator Tab selector */}
    <div className="flex justify-center">
      <Segmented
        options={[
          {
            label: (
              <span className="px-1 py-1 text-xs font-semibold sm:px-4 sm:text-sm">
                Visual Customizer
              </span>
            ),
            value: 'visual',
          },
          {
            label: (
              <span className="px-1 py-1 text-xs font-semibold sm:px-4 sm:text-sm">
                AI Prompt Builder
              </span>
            ),
            value: 'ai',
          },
        ]}
        value={queryType}
        onChange={(val) => setQueryType(val as 'visual' | 'ai')}
        block
        className="w-full rounded-xl bg-slate-100 p-1 sm:w-auto"
      />
    </div>

    {/* Widget Name */}
    <div>
      <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
        Widget Title
      </Text>
      <Input
        placeholder="e.g., Target Applications, Interview Rate"
        value={widgetName}
        onChange={(e) => setWidgetName(e.target.value)}
        className="rounded-xl px-4 py-2 text-sm border-slate-200 hover:border-blue-400 focus:border-blue-400"
      />
    </div>

    {/* Theme aesthetics */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
          Theme Color
        </Text>
        <div className="flex gap-2 flex-wrap">
          {COLOR_THEMES.map((theme) => (
            <button
              key={theme.name}
              type="button"
              onClick={() => setNewWidgetColor(theme.name)}
              className={`h-11 w-11 rounded-full border border-slate-200 transition-all sm:h-8 sm:w-8 ${
                newWidgetColor === theme.name
                  ? 'ring-2 ring-offset-2 ring-blue-500 scale-110'
                  : 'hover:scale-105'
              }`}
              style={{ backgroundColor: theme.hex }}
              title={theme.name}
              aria-label={`Use ${theme.name} theme`}
            />
          ))}
        </div>
      </div>

      <div>
        <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
          Widget Icon
        </Text>
        <div className="flex gap-2 flex-wrap max-h-[85px] overflow-y-auto p-1 border border-slate-100 rounded-xl bg-slate-50/50">
          {AVAILABLE_ICONS.map((iconData) => {
            const CurrentIcon = iconData.icon;
            return (
              <button
                key={iconData.name}
                type="button"
                onClick={() => setNewWidgetIcon(iconData.name)}
                className={`p-2 rounded-lg border text-sm transition-all ${
                  newWidgetIcon === iconData.name
                    ? 'border-blue-500 bg-blue-50 text-blue-600 scale-105 font-bold shadow-sm'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <CurrentIcon />
              </button>
            );
          })}
        </div>
      </div>
    </div>

    {queryType === 'visual' ? (
      // VISUAL CUSTOM BUILDER
      <div className="space-y-5 pt-3 border-t border-slate-100">
        {/* Display Component & Data Source */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Display Component
            </Text>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVisualConfig((prev) => ({ ...prev, type: 'metric' }))}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  visualConfig.type === 'metric'
                    ? 'border-blue-500 bg-blue-50/50 text-blue-600 font-semibold'
                    : 'border-slate-200 hover:border-slate-300 text-slate-500'
                }`}
              >
                <NumberOutlined className="text-lg mb-1" />
                <span className="text-xs">Stat Metric Card</span>
              </button>
              <button
                type="button"
                onClick={() => setVisualConfig((prev) => ({ ...prev, type: 'chart' }))}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  visualConfig.type === 'chart'
                    ? 'border-blue-500 bg-blue-50/50 text-blue-600 font-semibold'
                    : 'border-slate-200 hover:border-slate-300 text-slate-500'
                }`}
              >
                <BarChartOutlined className="text-lg mb-1" />
                <span className="text-xs">Interactive Chart</span>
              </button>
            </div>
          </div>

          <div>
            <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Data Source
            </Text>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDataSourceChange('applications')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  visualConfig.dataSource === 'applications'
                    ? 'border-blue-500 bg-blue-50/50 text-blue-600 font-semibold'
                    : 'border-slate-200 hover:border-slate-300 text-slate-500'
                }`}
              >
                <DatabaseOutlined className="text-lg mb-1" />
                <span className="text-xs">Job Applications</span>
              </button>
              <button
                type="button"
                onClick={() => handleDataSourceChange('events')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  visualConfig.dataSource === 'events'
                    ? 'border-blue-500 bg-blue-50/50 text-blue-600 font-semibold'
                    : 'border-slate-200 hover:border-slate-300 text-slate-500'
                }`}
              >
                <CalendarOutlined className="text-lg mb-1" />
                <span className="text-xs">Calendar Events</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Filter Section */}
        <div className="border border-slate-100 bg-slate-50/30 rounded-2xl p-4">
          <div className="flex justify-between items-center mb-3">
            <Text className="text-xs font-bold text-slate-600 uppercase tracking-wide">
              <FilterOutlined className="mr-1" />
              Query Filters
            </Text>
            <Button
              type="dashed"
              size="small"
              onClick={addFilterRule}
              icon={<PlusOutlined />}
              className="rounded-lg text-xs"
            >
              Add Filter Rule
            </Button>
          </div>

          {filters.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs font-medium">
              No custom filters set (retrieves all records).
            </div>
          ) : (
            <div className="space-y-2">
              {filters.map((rule, idx) => (
                <div key={idx} className="flex flex-col md:flex-row gap-2 items-center">
                  <Select
                    value={rule.field}
                    onChange={(val) => updateFilterRule(idx, 'field', val)}
                    className="w-full md:flex-[2]"
                    placeholder="Select field"
                  >
                    {currentFieldsList.map((f) => (
                      <Select.Option key={f.value} value={f.value}>
                        {f.label}
                      </Select.Option>
                    ))}
                  </Select>

                  <Select
                    value={rule.operator}
                    onChange={(val) => updateFilterRule(idx, 'operator', val as any)}
                    className="w-full md:flex-[1.5]"
                  >
                    {OPERATORS.map((op) => (
                      <Select.Option key={op.value} value={op.value}>
                        {op.label}
                      </Select.Option>
                    ))}
                  </Select>

                  <div className="w-full md:flex-[3]">{renderFilterValueInput(rule, idx)}</div>

                  <Button
                    type="text"
                    danger
                    onClick={() => removeFilterRule(idx)}
                    icon={<DeleteOutlined />}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Aggregation Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Metric Calculations Configuration */}
          {visualConfig.type === 'metric' && (
            <>
              <div>
                <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                  Metric Calculation
                </Text>
                <Select
                  className="w-full"
                  value={visualConfig.metricCalculation}
                  onChange={(val) =>
                    setVisualConfig((prev) => ({
                      ...prev,
                      metricCalculation: val as any,
                      metricField:
                        val === 'average'
                          ? prev.dataSource === 'events'
                            ? 'duration'
                            : 'growth_score'
                          : undefined,
                    }))
                  }
                >
                  <Select.Option value="count">Record Count</Select.Option>
                  {visualConfig.dataSource === 'applications' ? (
                    <>
                      <Select.Option value="average">Score Average</Select.Option>
                      <Select.Option value="offer_rate">Offer Conversion Rate</Select.Option>
                      <Select.Option value="response_rate">Response Rate</Select.Option>
                    </>
                  ) : (
                    <Select.Option value="average">Average Duration</Select.Option>
                  )}
                </Select>
              </div>

              {visualConfig.metricCalculation === 'average' && (
                <div>
                  <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                    Average Field Target
                  </Text>
                  <Select
                    className="w-full"
                    value={visualConfig.metricField}
                    onChange={(val) => setVisualConfig((prev) => ({ ...prev, metricField: val }))}
                  >
                    {visualConfig.dataSource === 'applications' ? (
                      <>
                        <Select.Option value="growth_score">Growth Score</Select.Option>
                        <Select.Option value="work_life_score">Work Life Score</Select.Option>
                        <Select.Option value="brand_score">Brand Score</Select.Option>
                        <Select.Option value="team_score">Team Score</Select.Option>
                      </>
                    ) : (
                      <Select.Option value="duration">Event Duration (minutes)</Select.Option>
                    )}
                  </Select>
                </div>
              )}

              <div>
                <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                  Custom Unit Label
                </Text>
                <Input
                  placeholder="e.g. applications, minutes, pts, %"
                  value={visualConfig.metricUnit}
                  onChange={(e) =>
                    setVisualConfig((prev) => ({ ...prev, metricUnit: e.target.value }))
                  }
                  className="rounded-lg"
                />
              </div>
            </>
          )}

          {/* Chart Parameters Configuration */}
          {visualConfig.type === 'chart' && (
            <>
              <div>
                <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                  Group By (Dimension)
                </Text>
                <Select
                  className="w-full"
                  value={visualConfig.groupBy}
                  onChange={(val) => setVisualConfig((prev) => ({ ...prev, groupBy: val }))}
                >
                  {currentFieldsList.map((f) => (
                    <Select.Option key={f.value} value={f.value}>
                      {f.label}
                    </Select.Option>
                  ))}
                </Select>
              </div>

              <div>
                <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                  Chart Type
                </Text>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setVisualConfig((prev) => ({ ...prev, chartType: 'bar' }))}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-center transition-all ${
                      visualConfig.chartType === 'bar'
                        ? 'border-blue-500 bg-blue-50 text-blue-600 font-semibold'
                        : 'border-slate-200 text-slate-500'
                    }`}
                  >
                    <BarChartOutlined />
                    <span className="text-xs">Bar Chart</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisualConfig((prev) => ({ ...prev, chartType: 'pie' }))}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-center transition-all ${
                      visualConfig.chartType === 'pie'
                        ? 'border-blue-500 bg-blue-50 text-blue-600 font-semibold'
                        : 'border-slate-200 text-slate-500'
                    }`}
                  >
                    <PieChartOutlined />
                    <span className="text-xs">Pie Chart</span>
                  </button>
                </div>
              </div>

              <div>
                <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                  Sort Order
                </Text>
                <Select
                  className="w-full"
                  value={visualConfig.chartSort}
                  onChange={(val) =>
                    setVisualConfig((prev) => ({ ...prev, chartSort: val as any }))
                  }
                >
                  <Select.Option value="value_desc">Group Count (Descending)</Select.Option>
                  <Select.Option value="value_asc">Group Count (Ascending)</Select.Option>
                  <Select.Option value="alphabetical">Group Name (A-Z)</Select.Option>
                </Select>
              </div>

              <div>
                <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                  Max Groupings Limit
                </Text>
                <Select
                  className="w-full"
                  value={visualConfig.chartLimit || 9999}
                  onChange={(val) =>
                    setVisualConfig((prev) => ({
                      ...prev,
                      chartLimit: val === 9999 ? undefined : val,
                    }))
                  }
                >
                  <Select.Option value={9999}>Display All Groups</Select.Option>
                  <Select.Option value={5}>Top 5 Groups</Select.Option>
                  <Select.Option value={10}>Top 10 Groups</Select.Option>
                  <Select.Option value={20}>Top 20 Groups</Select.Option>
                </Select>
              </div>
            </>
          )}

          {/* Common Date Range */}
          <div>
            <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Date Applied Range
            </Text>
            <Select
              className="w-full"
              value={visualConfig.dateRange}
              onChange={(val) => setVisualConfig((prev) => ({ ...prev, dateRange: val as any }))}
            >
              <Select.Option value="all">All Time</Select.Option>
              <Select.Option value="week">This Week</Select.Option>
              <Select.Option value="month">This Month</Select.Option>
              <Select.Option value="30days">Last 30 Days</Select.Option>
            </Select>
          </div>
        </div>
      </div>
    ) : (
      // AI BUILDER INPUT FIELD
      <div className="space-y-4 pt-2 border-t border-slate-100">
        <div>
          <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
            What would you like to see?
          </Text>
          <Input.TextArea
            placeholder="e.g., Total applications, Active applications in the last 30 days, count of applications by status"
            value={newWidgetQuery}
            onChange={(e) => setNewWidgetQuery(e.target.value)}
            rows={4}
            className="rounded-xl border-slate-200"
          />
        </div>

        <div className="mt-2 flex flex-wrap gap-2 items-center">
          <Text type="secondary" className="text-xs mr-1">
            Try charts:
          </Text>
          <Tag
            className="cursor-pointer hover:border-blue-500 rounded-full px-3 py-0.5 bg-slate-50"
            onClick={() => {
              setNewWidgetQuery('Applications by status');
              setNewWidgetIcon('BarChartOutlined');
            }}
          >
            Applications by status
          </Tag>
        </div>

        <div className="flex justify-between items-center mt-2 border-t border-slate-50 pt-3">
          <Button
            onClick={handleTestQuery}
            loading={isValidating}
            type="default"
            className="rounded-xl px-4 font-semibold"
          >
            Test Query
          </Button>
          {validationResult && (
            <Text type="success" className="text-xs font-semibold">
              {validationResult.type === 'metric'
                ? `Successfully parsed metric: ${validationResult.value} ${validationResult.unit}`
                : `Successfully generated chart: (${validationResult.data?.length || 0} groupings)`}
            </Text>
          )}
        </div>
      </div>
    )}
  </div>
);

export default WidgetConfigPanel;

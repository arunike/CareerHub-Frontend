import { useEffect, useState, useMemo } from 'react';
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
  DatabaseOutlined,
  FilterOutlined,
  PlusOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { Button, Input, Segmented, Select, Tag, Typography, Spin } from 'antd';
import Modal from '../MobileModal';
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
import { loadAnalyticsSourceData } from '../../lib/browserAi';
import { runVisualWidgetQuery } from '../../lib/visualWidgetQuery';
import type { VisualConfig, FilterRule } from '../../lib/visualWidgetQuery';
import type { CareerApplication } from '../../types/application';
import type { Event } from '../../types';

const { Text } = Typography;

interface AnalyticsSourceData {
  applications: CareerApplication[];
  events: Event[];
}

type ValidationResult = {
  type: 'metric' | 'chart';
  value?: string | number;
  unit?: string;
  data?: any[];
  chartType?: string;
};

type Props = {
  open: boolean;
  onCancel: () => void;
  onCreate: (widgetData: {
    name: string;
    queryType: 'ai' | 'visual';
    visualConfig?: VisualConfig;
    query: string;
    icon: string;
    color: string;
    cachedData: ValidationResult;
  }) => void;
  testQuery: (query: string) => Promise<ValidationResult>;
  initialDataSource?: 'applications' | 'events';
};

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#60a5fa', '#ec4899'];

const COLOR_THEMES = [
  { name: 'blue', bg: 'bg-blue-100', text: 'text-blue-600', fill: '#2563eb', hex: '#3b82f6' },
  { name: 'green', bg: 'bg-green-100', text: 'text-green-600', fill: '#10b981', hex: '#22c55e' },
  { name: 'amber', bg: 'bg-amber-100', text: 'text-amber-600', fill: '#f59e0b', hex: '#f59e0b' },
  { name: 'red', bg: 'bg-red-100', text: 'text-red-600', fill: '#ef4444', hex: '#ef4444' },
  { name: 'purple', bg: 'bg-purple-100', text: 'text-purple-600', fill: '#60a5fa', hex: '#a855f7' },
  { name: 'pink', bg: 'bg-pink-100', text: 'text-pink-600', fill: '#ec4899', hex: '#ec4899' },
];

const AVAILABLE_ICONS = [
  { name: 'TrophyOutlined', icon: TrophyOutlined },
  { name: 'CalendarOutlined', icon: CalendarOutlined },
  { name: 'FileTextOutlined', icon: FileTextOutlined },
  { name: 'NumberOutlined', icon: NumberOutlined },
  { name: 'ClockCircleOutlined', icon: ClockCircleOutlined },
  { name: 'EnvironmentOutlined', icon: EnvironmentOutlined },
  { name: 'RiseOutlined', icon: RiseOutlined },
  { name: 'DollarOutlined', icon: DollarOutlined },
  { name: 'HomeOutlined', icon: HomeOutlined },
  { name: 'SendOutlined', icon: SendOutlined },
  { name: 'CheckCircleOutlined', icon: CheckCircleOutlined },
  { name: 'WarningOutlined', icon: WarningOutlined },
];

const APP_FIELDS = [
  { label: 'Status/Stage', value: 'status' },
  { label: 'Location (City)', value: 'location' },
  { label: 'Work Mode (RTO)', value: 'work_mode' },
  { label: 'Employment Type', value: 'employment_type' },
  { label: 'Role Title', value: 'role_title' },
  { label: 'Company', value: 'company' },
  { label: 'Visa Sponsorship', value: 'visa_sponsorship' },
  { label: 'Day 1 Green Card', value: 'day_one_gc' },
  { label: 'Growth Score', value: 'growth_score' },
  { label: 'Work Life Score', value: 'work_life_score' },
  { label: 'Brand Score', value: 'brand_score' },
  { label: 'Team Score', value: 'team_score' },
];

const EVENT_FIELDS = [
  { label: 'Event Name', value: 'name' },
  { label: 'Category', value: 'category' },
  { label: 'Location Type', value: 'location_type' },
  { label: 'Meeting Link', value: 'meeting_link' },
  { label: 'Is Recurring', value: 'is_recurring' },
  { label: 'Reminder (Mins)', value: 'reminder_minutes' },
];

const OPERATORS = [
  { label: 'Equals', value: 'equals' },
  { label: 'Not Equals', value: 'not_equals' },
  { label: 'Contains', value: 'contains' },
  { label: 'Not Contains', value: 'not_contains' },
  { label: 'Is Empty', value: 'is_empty' },
  { label: 'Is Not Empty', value: 'is_not_empty' },
];

const CreateCustomWidgetModal = ({
  open,
  onCancel,
  onCreate,
  testQuery,
  initialDataSource,
}: Props) => {
  const [queryType, setQueryType] = useState<'visual' | 'ai'>('visual');
  const [widgetName, setWidgetName] = useState('');

  // AI Builder States
  const [newWidgetQuery, setNewWidgetQuery] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  // Visual Builder States
  const [visualConfig, setVisualConfig] = useState<VisualConfig>({
    dataSource: 'applications',
    type: 'metric',
    metricCalculation: 'count',
    metricField: 'growth_score',
    metricUnit: '',
    groupBy: 'status',
    chartType: 'bar',
    chartSort: 'value_desc',
    chartLimit: undefined,
    dateRange: 'all',
  });

  const [filters, setFilters] = useState<FilterRule[]>([]);

  const [newWidgetIcon, setNewWidgetIcon] = useState('FileTextOutlined');
  const [newWidgetColor, setNewWidgetColor] = useState('blue');

  const [sourceData, setSourceData] = useState<AnalyticsSourceData | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (open) {
      setLoadingData(true);
      loadAnalyticsSourceData()
        .then((data) => {
          setSourceData(data);
        })
        .catch(console.error)
        .finally(() => setLoadingData(false));

      setWidgetName('');
      setNewWidgetQuery('');
      setValidationResult(null);
      setNewWidgetIcon(initialDataSource === 'events' ? 'CalendarOutlined' : 'FileTextOutlined');
      setNewWidgetColor('blue');
      setFilters([]);
      setVisualConfig({
        dataSource: initialDataSource || 'applications',
        type: 'metric',
        metricCalculation: 'count',
        metricField: initialDataSource === 'events' ? 'duration' : 'growth_score',
        metricUnit: '',
        groupBy: initialDataSource === 'events' ? 'category' : 'status',
        chartType: initialDataSource === 'events' ? 'pie' : 'bar',
        chartSort: 'value_desc',
        chartLimit: undefined,
        dateRange: 'all',
      });
      setQueryType('visual');
    }
  }, [open, initialDataSource]);

  const handleDataSourceChange = (source: 'applications' | 'events') => {
    setFilters([]);
    setVisualConfig((prev) => ({
      ...prev,
      dataSource: source,
      metricCalculation: 'count',
      metricField: source === 'events' ? 'duration' : 'growth_score',
      metricUnit: '',
      groupBy: source === 'events' ? 'category' : 'status',
      chartType: source === 'events' ? 'pie' : 'bar',
    }));
  };

  const addFilterRule = () => {
    const defaultField = visualConfig.dataSource === 'applications' ? 'status' : 'category';
    setFilters((prev) => [...prev, { field: defaultField, operator: 'equals', value: '' }]);
  };

  const removeFilterRule = (idx: number) => {
    setFilters((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateFilterRule = (idx: number, key: keyof FilterRule, val: string) => {
    setFilters((prev) => prev.map((rule, i) => (i === idx ? { ...rule, [key]: val } : rule)));
  };

  const finalVisualConfig = useMemo<VisualConfig>(() => {
    return {
      ...visualConfig,
      filters,
    };
  }, [visualConfig, filters]);

  const visualPreviewResult = useMemo<ValidationResult | null>(() => {
    if (!sourceData) return null;
    try {
      const data = runVisualWidgetQuery(finalVisualConfig, sourceData);
      return data;
    } catch (err) {
      console.error(err);
      return null;
    }
  }, [finalVisualConfig, sourceData]);

  const currentPreviewData = queryType === 'visual' ? visualPreviewResult : validationResult;
  const currentWidgetType =
    queryType === 'visual' ? visualConfig.type : currentPreviewData?.type || 'metric';

  const handleTestQuery = async () => {
    if (!newWidgetQuery.trim()) return;
    setIsValidating(true);
    setValidationResult(null);
    try {
      const result = await testQuery(newWidgetQuery);
      setValidationResult(result);
    } catch (error) {
      console.error('Test query failed', error);
    } finally {
      setIsValidating(false);
    }
  };

  // Submit and create custom widget
  const handleCreate = () => {
    if (!widgetName.trim()) {
      Modal.error({ title: 'Validation Error', content: 'Please enter a widget name' });
      return;
    }

    if (queryType === 'visual') {
      if (!visualPreviewResult) {
        Modal.error({ title: 'Validation Error', content: 'Widget calculation failed.' });
        return;
      }
      onCreate({
        name: widgetName.trim(),
        queryType: 'visual',
        visualConfig: finalVisualConfig,
        query: `Visual: ${visualConfig.dataSource} ${
          visualConfig.type === 'metric'
            ? `${visualConfig.metricCalculation} ${visualConfig.metricField || ''}`
            : `grouped by ${visualConfig.groupBy}`
        }`,
        icon: newWidgetIcon,
        color: newWidgetColor,
        cachedData: visualPreviewResult,
      });
    } else {
      if (!validationResult) {
        Modal.error({ title: 'Validation Error', content: 'Please test your query first' });
        return;
      }
      onCreate({
        name: widgetName.trim(),
        queryType: 'ai',
        query: newWidgetQuery,
        icon: newWidgetIcon,
        color: newWidgetColor,
        cachedData: validationResult,
      });
    }
  };

  const renderFilterValueInput = (rule: FilterRule, idx: number) => {
    if (rule.operator === 'is_empty' || rule.operator === 'is_not_empty') {
      return null;
    }

    if (rule.field === 'status') {
      return (
        <Select
          value={rule.value}
          onChange={(val) => updateFilterRule(idx, 'value', val)}
          placeholder="Select status"
          className="w-full"
        >
          {[
            'APPLIED',
            'OA',
            'SCREEN',
            'ROUND_1',
            'ROUND_2',
            'ROUND_3',
            'ROUND_4',
            'ONSITE',
            'OFFER',
            'ACCEPTED',
            'REJECTED',
            'GHOSTED',
            'REMOVED_FROM_SHEET',
          ].map((st) => (
            <Select.Option key={st} value={st}>
              {st}
            </Select.Option>
          ))}
        </Select>
      );
    }

    if (rule.field === 'rto_policy' || rule.field === 'work_mode') {
      return (
        <Select
          value={rule.value}
          onChange={(val) => updateFilterRule(idx, 'value', val)}
          placeholder="Select mode"
          className="w-full"
        >
          {['Remote', 'Hybrid', 'Onsite'].map((mode) => (
            <Select.Option key={mode} value={mode}>
              {mode}
            </Select.Option>
          ))}
        </Select>
      );
    }

    if (rule.field === 'visa_sponsorship' || rule.field === 'day_one_gc') {
      return (
        <Select
          value={rule.value}
          onChange={(val) => updateFilterRule(idx, 'value', val)}
          placeholder="Select option"
          className="w-full"
        >
          {['YES', 'NO', 'UNKNOWN'].map((opt) => (
            <Select.Option key={opt} value={opt}>
              {opt}
            </Select.Option>
          ))}
        </Select>
      );
    }

    if (rule.field === 'is_recurring') {
      return (
        <Select
          value={rule.value}
          onChange={(val) => updateFilterRule(idx, 'value', val)}
          className="w-full"
        >
          <Select.Option value="true">True</Select.Option>
          <Select.Option value="false">False</Select.Option>
        </Select>
      );
    }

    return (
      <Input
        value={rule.value}
        onChange={(e) => updateFilterRule(idx, 'value', e.target.value)}
        placeholder="Filter value..."
        className="w-full rounded-lg"
      />
    );
  };

  const activeColorTheme = COLOR_THEMES.find((t) => t.name === newWidgetColor) || COLOR_THEMES[0];
  const IconComponent = (
    AVAILABLE_ICONS.find((i) => i.name === newWidgetIcon) || AVAILABLE_ICONS[2]
  ).icon;

  const currentFieldsList = visualConfig.dataSource === 'applications' ? APP_FIELDS : EVENT_FIELDS;

  return (
    <Modal
      title={
        <div className="flex flex-col gap-1 border-b border-slate-100 pb-3 pr-6">
          <span className="text-lg font-bold text-slate-800">Customize Custom Widget</span>
          <span className="text-xs font-normal text-slate-400">
            Design your own custom metrics or charts with ultimate query freedom.
          </span>
        </div>
      }
      open={open}
      onCancel={onCancel}
      onOk={handleCreate}
      okText="Create Widget"
      width={1050}
      centered
      bodyStyle={{ padding: 0 }}
      destroyOnClose
    >
      <div className="flex min-h-0 flex-col lg:min-h-[600px] lg:flex-row">
        {/* Left Side: Configuration Panel */}
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
            /* VISUAL CUSTOM BUILDER */
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

                        <div className="w-full md:flex-[3]">
                          {renderFilterValueInput(rule, idx)}
                        </div>

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
                          onChange={(val) =>
                            setVisualConfig((prev) => ({ ...prev, metricField: val }))
                          }
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
                    onChange={(val) =>
                      setVisualConfig((prev) => ({ ...prev, dateRange: val as any }))
                    }
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
            /* AI BUILDER INPUT FIELD */
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

        {/* Right Side: Live Preview Panel */}
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
                  <p className="text-xs text-slate-400 font-medium">
                    Syncing live dashboard data...
                  </p>
                </div>
              ) : currentPreviewData ? (
                <div className="w-full animate-in fade-in duration-300">
                  {currentWidgetType === 'metric' ? (
                    <div className="bg-white border border-slate-200/60 rounded-xl shadow-sm p-6 relative">
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
                    <div className="bg-white border border-slate-200/60 rounded-xl shadow-sm p-5 w-full">
                      <div className="flex items-center gap-2 mb-4">
                        <IconComponent className={`w-5 h-5 ${activeColorTheme.text}`} />
                        <h3 className="text-sm font-semibold text-gray-900 truncate leading-none">
                          {widgetName || 'Untitled Chart'}
                        </h3>
                      </div>
                      <div className="h-44 w-full flex items-center justify-center">
                        {currentPreviewData.data && currentPreviewData.data.length > 0 ? (
                          <ResponsiveContainer
                            width="100%"
                            height="100%"
                            minWidth={0}
                            minHeight={1}
                          >
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
                                    <Cell
                                      key={`cell-${index}`}
                                      fill={COLORS[index % COLORS.length]}
                                    />
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
                                <Bar
                                  dataKey="value"
                                  fill={activeColorTheme.fill}
                                  radius={[2, 2, 0, 0]}
                                />
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
            <span className="font-semibold text-slate-700 block mb-1">
              💡 Interactive BI customizer
            </span>
            <p className="leading-relaxed">
              Combine multi-rule AND filters to refine your data stack. Renders live averages,
              counts, or rates instantly with full precision.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CreateCustomWidgetModal;

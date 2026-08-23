import { useEffect, useState, useMemo } from 'react';
import { Input, Select } from 'antd';
import Modal from '../MobileModal';
import { loadAnalyticsSourceData } from '../../lib/analyticsQuery';
import { runVisualWidgetQuery } from '../../lib/visualWidgetQuery';
import type { VisualConfig, FilterRule } from '../../lib/visualWidgetQuery';
import { APP_FIELDS, AVAILABLE_ICONS, COLOR_THEMES, EVENT_FIELDS } from './widgetFieldOptions';
import WidgetConfigPanel from './WidgetConfigPanel';
import WidgetPreviewPanel from './WidgetPreviewPanel';
import type { AnalyticsSourceData, ValidationResult } from './widgetFieldOptions';

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
        <WidgetConfigPanel
          addFilterRule={addFilterRule}
          currentFieldsList={currentFieldsList}
          filters={filters}
          handleDataSourceChange={handleDataSourceChange}
          handleTestQuery={handleTestQuery}
          isValidating={isValidating}
          newWidgetColor={newWidgetColor}
          newWidgetIcon={newWidgetIcon}
          newWidgetQuery={newWidgetQuery}
          queryType={queryType}
          removeFilterRule={removeFilterRule}
          renderFilterValueInput={renderFilterValueInput}
          setNewWidgetColor={setNewWidgetColor}
          setNewWidgetIcon={setNewWidgetIcon}
          setNewWidgetQuery={setNewWidgetQuery}
          setQueryType={setQueryType}
          setVisualConfig={setVisualConfig}
          setWidgetName={setWidgetName}
          updateFilterRule={updateFilterRule}
          validationResult={validationResult}
          visualConfig={visualConfig}
          widgetName={widgetName}
        />

        {/* Right Side: Live Preview Panel */}
        <WidgetPreviewPanel
          currentWidgetType={
            queryType === 'visual' ? visualConfig.type : currentPreviewData?.type || 'metric'
          }
          IconComponent={IconComponent}
          activeColorTheme={activeColorTheme}
          currentPreviewData={currentPreviewData}
          filters={filters}
          loadingData={loadingData}
          visualConfig={visualConfig}
          widgetName={widgetName}
        />
      </div>
    </Modal>
  );
};

export default CreateCustomWidgetModal;

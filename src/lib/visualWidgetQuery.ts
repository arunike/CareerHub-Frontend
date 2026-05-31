import type { CareerApplication } from '../types/application';
import type { Event } from '../types';

export interface FilterRule {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'is_empty' | 'is_not_empty';
  value: string;
}

export interface VisualConfig {
  dataSource: 'applications' | 'events';
  type: 'metric' | 'chart';

  // Metric settings:
  metricCalculation?: 'count' | 'average' | 'offer_rate' | 'response_rate';
  metricField?: string; // scores, salary or event duration
  metricUnit?: string;

  // Chart settings:
  groupBy?: string;
  chartType?: 'bar' | 'pie';
  chartSort?: 'value_desc' | 'value_asc' | 'alphabetical';
  chartLimit?: number;

  // Filtering:
  dateRange?: 'all' | 'week' | 'month' | '30days';
  filters?: FilterRule[];
}

const parseRecordDate = (value: string | undefined) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const computeEventDurationMinutes = (event: Event) => {
  if (!event.start_time || !event.end_time) return 0;
  const [startHour, startMinute] = event.start_time.split(':').map((part) => Number(part));
  const [endHour, endMinute] = event.end_time.split(':').map((part) => Number(part));
  if ([startHour, startMinute, endHour, endMinute].some((part) => Number.isNaN(part))) return 0;
  return Math.max(0, endHour * 60 + endMinute - (startHour * 60 + startMinute));
};

const formatStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    APPLIED: 'Applied',
    OA: 'Online Assessment',
    SCREEN: 'Phone Screen',
    ROUND_1: '1st Round',
    ROUND_2: '2nd Round',
    ROUND_3: '3rd Round',
    ROUND_4: '4th Round',
    ONSITE: 'Onsite',
    OFFER: 'Offer',
    ACCEPTED: 'Accepted',
    REJECTED: 'Rejected',
    GHOSTED: 'Ghosted',
    REMOVED_FROM_SHEET: 'Removed',
  };
  return (
    labels[status] ||
    status
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
};

const getFieldValue = (record: any, field: string): string => {
  if (!record) return '';
  switch (field) {
    // Applications
    case 'status':
      return record.status || '';
    case 'location':
      return record.office_location || record.location || '';
    case 'rto_policy':
    case 'work_mode':
      return record.rto_policy || '';
    case 'employment_type':
      return record.employment_type || '';
    case 'role_title':
      return record.role_title || '';
    case 'company':
      return (
        record.company_details?.name ||
        (typeof record.company_name === 'string' ? record.company_name : '') ||
        ''
      );
    case 'visa_sponsorship':
      return record.visa_sponsorship || '';
    case 'day_one_gc':
      return record.day_one_gc || '';
    case 'growth_score':
      return record.growth_score != null ? String(record.growth_score) : '';
    case 'work_life_score':
      return record.work_life_score != null ? String(record.work_life_score) : '';
    case 'brand_score':
      return record.brand_score != null ? String(record.brand_score) : '';
    case 'team_score':
      return record.team_score != null ? String(record.team_score) : '';
    case 'notes':
      return record.notes || '';
    // Events
    case 'name':
      return record.name || '';
    case 'category':
      return record.category_details?.name || '';
    case 'location_type':
      return record.location_type || '';
    case 'meeting_link':
      return record.meeting_link || '';
    case 'is_recurring':
      return record.is_recurring ? 'true' : 'false';
    case 'reminder_minutes':
      return record.reminder_minutes != null ? String(record.reminder_minutes) : '';
    default:
      return record[field] != null ? String(record[field]) : '';
  }
};

const getNumericValue = (record: any, field: string): number | null => {
  if (field === 'duration') {
    return computeEventDurationMinutes(record);
  }
  const val = record[field];
  if (val == null) return null;
  const parsed = Number(val);
  return Number.isFinite(parsed) ? parsed : null;
};

const evaluateFilter = (record: any, rule: FilterRule): boolean => {
  const val = getFieldValue(record, rule.field).toLowerCase().trim();
  const ruleVal = (rule.value || '').toLowerCase().trim();

  switch (rule.operator) {
    case 'equals':
      return val === ruleVal;
    case 'not_equals':
      return val !== ruleVal;
    case 'contains':
      return val.includes(ruleVal);
    case 'not_contains':
      return !val.includes(ruleVal);
    case 'is_empty':
      return val === '';
    case 'is_not_empty':
      return val !== '';
    default:
      return true;
  }
};

export const runVisualWidgetQuery = (
  config: VisualConfig,
  sourceData: { applications: CareerApplication[]; events: Event[] }
) => {
  const now = new Date();
  let start: Date | null = null;

  if (config.dateRange === 'week') {
    start = new Date(now);
    const day = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - day);
    start.setHours(0, 0, 0, 0);
  } else if (config.dateRange === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (config.dateRange === '30days') {
    start = new Date(now);
    start.setDate(start.getDate() - 30);
  }

  const isWithinRange = (dateStr: string | undefined) => {
    if (!start) return true;
    const parsed = parseRecordDate(dateStr);
    return parsed ? parsed >= start : false;
  };

  // 1. Initial collection selection and date filtering
  let filteredRecords: any[] = [];
  if (config.dataSource === 'applications') {
    filteredRecords = sourceData.applications.filter((a) =>
      isWithinRange(a.date_applied || a.created_at)
    );
  } else {
    filteredRecords = sourceData.events.filter((e) => isWithinRange(e.date));
  }

  // 2. Custom Filter Rules evaluation
  if (config.filters && config.filters.length > 0) {
    filteredRecords = filteredRecords.filter((record) => {
      return config.filters!.every((rule) => evaluateFilter(record, rule));
    });
  }

  // 3. Output aggregation
  if (config.type === 'metric') {
    let value: number | string = 0;
    let unit = config.metricUnit || '';
    const calc = config.metricCalculation || 'count';

    if (calc === 'count') {
      value = filteredRecords.length;
      if (!unit) {
        unit = config.dataSource === 'applications' ? 'applications' : 'events';
      }
    } else if (calc === 'average' && config.metricField) {
      let sum = 0;
      let validCount = 0;
      filteredRecords.forEach((r) => {
        const val = getNumericValue(r, config.metricField!);
        if (val !== null) {
          sum += val;
          validCount += 1;
        }
      });
      value = validCount > 0 ? Number((sum / validCount).toFixed(1)) : 0;
      if (!unit) {
        unit = config.metricField === 'duration' ? 'minutes' : 'points';
      }
    } else if (calc === 'offer_rate') {
      const offers = filteredRecords.filter((r) =>
        ['OFFER', 'ACCEPTED'].includes(r.status || '')
      ).length;
      value =
        filteredRecords.length > 0
          ? Number(((offers / filteredRecords.length) * 100).toFixed(1))
          : 0;
      if (!unit) unit = '%';
    } else if (calc === 'response_rate') {
      const responded = filteredRecords.filter(
        (r) => !['APPLIED', 'GHOSTED', 'REMOVED_FROM_SHEET'].includes(r.status || '')
      ).length;
      value =
        filteredRecords.length > 0
          ? Number(((responded / filteredRecords.length) * 100).toFixed(1))
          : 0;
      if (!unit) unit = '%';
    }

    return { type: 'metric' as const, value, unit };
  } else {
    const counts: Record<string, number> = {};
    const groupByField =
      config.groupBy || (config.dataSource === 'applications' ? 'status' : 'category');

    filteredRecords.forEach((r) => {
      let key = getFieldValue(r, groupByField);
      if (groupByField === 'status') {
        key = formatStatusLabel(key);
      } else if (groupByField === 'location') {
        key = key.trim();
        if (!key) key = 'Unknown';
        key = key.split(',')[0].trim();
        if (key.toLowerCase().includes('remote')) key = 'Remote';
        key = key.charAt(0).toUpperCase() + key.slice(1);
      } else if (!key || key.trim() === '') {
        key = 'Not specified';
      }
      counts[key] = (counts[key] || 0) + 1;
    });

    let data = Object.entries(counts).map(([name, value]) => ({ name, value }));

    const sort = config.chartSort || 'value_desc';
    if (sort === 'value_desc') {
      data.sort((a, b) => b.value - a.value);
    } else if (sort === 'value_asc') {
      data.sort((a, b) => a.value - b.value);
    } else if (sort === 'alphabetical') {
      data.sort((a, b) => a.name.localeCompare(b.name));
    }

    if (config.chartLimit && config.chartLimit > 0) {
      data = data.slice(0, config.chartLimit);
    }

    return {
      type: 'chart' as const,
      data,
      chartType: config.chartType || 'bar',
    };
  }
};

import {
  CalendarOutlined,
  ClockCircleOutlined,
  RiseOutlined,
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
import type { CareerApplication } from '../../types/application';
import type { Event } from '../../types';

export interface AnalyticsSourceData {
  applications: CareerApplication[];
  events: Event[];
}

export type ValidationResult = {
  type: 'metric' | 'chart';
  value?: string | number;
  unit?: string;
  data?: any[];
  chartType?: string;
};

export const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#60a5fa', '#ec4899'];

export const COLOR_THEMES = [
  {
    name: 'blue',
    bg: 'bg-blue-100 dark:bg-blue-500/15',
    text: 'text-blue-600 dark:text-blue-300',
    fill: '#2563eb',
    hex: '#3b82f6',
  },
  {
    name: 'green',
    bg: 'bg-green-100 dark:bg-green-500/15',
    text: 'text-green-600 dark:text-green-300',
    fill: '#10b981',
    hex: '#22c55e',
  },
  {
    name: 'amber',
    bg: 'bg-amber-100 dark:bg-amber-500/15',
    text: 'text-amber-600 dark:text-amber-300',
    fill: '#f59e0b',
    hex: '#f59e0b',
  },
  {
    name: 'red',
    bg: 'bg-red-100 dark:bg-red-500/15',
    text: 'text-red-600 dark:text-red-300',
    fill: '#ef4444',
    hex: '#ef4444',
  },
  {
    name: 'purple',
    bg: 'bg-purple-100 dark:bg-purple-500/15',
    text: 'text-purple-600 dark:text-purple-300',
    fill: '#60a5fa',
    hex: '#a855f7',
  },
  {
    name: 'pink',
    bg: 'bg-pink-100 dark:bg-pink-500/15',
    text: 'text-pink-600 dark:text-pink-300',
    fill: '#ec4899',
    hex: '#ec4899',
  },
];

export const AVAILABLE_ICONS = [
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

export const APP_FIELDS = [
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

export const EVENT_FIELDS = [
  { label: 'Event Name', value: 'name' },
  { label: 'Category', value: 'category' },
  { label: 'Location Type', value: 'location_type' },
  { label: 'Meeting Link', value: 'meeting_link' },
  { label: 'Is Recurring', value: 'is_recurring' },
  { label: 'Reminder (Mins)', value: 'reminder_minutes' },
];

export const OPERATORS = [
  { label: 'Equals', value: 'equals' },
  { label: 'Not Equals', value: 'not_equals' },
  { label: 'Contains', value: 'contains' },
  { label: 'Not Contains', value: 'not_contains' },
  { label: 'Is Empty', value: 'is_empty' },
  { label: 'Is Not Empty', value: 'is_not_empty' },
];

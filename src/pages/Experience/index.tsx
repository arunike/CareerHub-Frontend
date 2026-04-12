import React, { useEffect, useState, useMemo } from 'react';
import { Button, Typography, Spin, message, Popconfirm, Avatar, Tooltip, Tag, Card, Row, Col, Modal, Upload } from 'antd';
import { PlusOutlined, DeleteOutlined, EnvironmentOutlined, CalendarOutlined, BankOutlined, ClockCircleOutlined, CodeOutlined, RobotOutlined, RiseOutlined, TrophyOutlined, LinkOutlined, DollarOutlined, TeamOutlined, PushpinOutlined, PushpinFilled, LockOutlined, UnlockOutlined, InboxOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { UploadProps } from 'antd';
import { getExperiences, createExperience, updateExperience, deleteExperience, deleteAllExperiences, importExperiences, exportExperiences, uploadExperienceLogo, removeExperienceLogo, getOffers, updateOffer } from '../../api/career';
import { getUserSettings } from '../../api/availability';
import RowActions from '../../components/RowActions';
import type { Experience, EmploymentType } from '../../types';
import ExperienceModal from './ExperienceModal';
import JDMatcherModal from './JDMatcherModal';
import PageActionToolbar from '../../components/PageActionToolbar';
import RaiseHistoryModal from '../OfferComparison/RaiseHistoryModal';
import TeamHistoryModal from './TeamHistoryModal';
import SchedulePhasesModal from './SchedulePhasesModal';
import CompensationBreakdownModal from './CompensationBreakdownModal';
import type { OfferLike as Offer } from '../OfferComparison/calculations';
import type { RaiseEntry, TeamEntry } from '../../types';
import { buildHourlyCompensationSnapshot, getExperienceCompensationSnapshot } from './compensation';

const { Title, Text } = Typography;
const { Dragger } = Upload;

// DRF returns absolute URLs (http://127.0.0.1:8000/media/...) — strip host so
// the request goes through the Vite /media proxy instead of directly to Django.
const toRelativeMediaUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  try {
    return new URL(url).pathname; // → /media/experience_logos/file.jpg
  } catch {
    return url;
  }
};

const toNullableNumber = (value: number | string | null | undefined): number | null => {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const roundCompNumber = (value: number | null | undefined) => {
  if (value == null) return null;
  return Number(value.toFixed(2));
};

const parseExperienceDate = (value: string | null | undefined) => {
  if (!value) return null;
  const trimmed = value.trim();
  const normalized = /^\d{4}-\d{2}-\d{2}/.test(trimmed) ? trimmed.slice(0, 10) : trimmed;
  const parsed = dayjs(normalized);
  return parsed.isValid() ? parsed : null;
};

const nearlyEqual = (a: number | null | undefined, b: number | null | undefined, epsilon = 0.01) => {
  if (a == null || b == null) return false;
  return Math.abs(a - b) < epsilon;
};

const DEFAULT_EMP_TYPES: EmploymentType[] = [
  { value: 'full_time', label: 'Full-time', color: 'blue' },
  { value: 'part_time', label: 'Part-time', color: 'teal' },
  { value: 'internship', label: 'Internship', color: 'amber' },
  { value: 'contract', label: 'Contract', color: 'purple' },
  { value: 'freelance', label: 'Freelance', color: 'orange' },
];

const BADGE_CLASSES: Record<string, string> = {
  blue:   'bg-blue-50 text-blue-700 border-blue-200',
  teal:   'bg-teal-50 text-teal-700 border-teal-200',
  amber:  'bg-amber-50 text-amber-700 border-amber-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  orange: 'bg-orange-50 text-orange-700 border-orange-200',
  green:  'bg-green-50 text-green-700 border-green-200',
  red:    'bg-red-50 text-red-700 border-red-200',
  pink:   'bg-pink-50 text-pink-700 border-pink-200',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  gray:   'bg-gray-50 text-gray-700 border-gray-200',
};

const DOT_CLASSES: Record<string, string> = {
  blue:   'bg-blue-400',
  teal:   'bg-teal-400',
  amber:  'bg-amber-400',
  purple: 'bg-purple-400',
  orange: 'bg-orange-400',
  green:  'bg-green-400',
  red:    'bg-red-400',
  pink:   'bg-pink-400',
  indigo: 'bg-indigo-400',
  gray:   'bg-gray-400',
};

const EmploymentBadge: React.FC<{ type?: string; empTypes: EmploymentType[] }> = ({ type, empTypes }) => {
  if (!type) return null;
  const meta = empTypes.find(t => t.value === type);
  if (!meta) return null;
  
  if (type === empTypes[0]?.value) return null;
  const cls = BADGE_CLASSES[meta.color] ?? 'bg-gray-50 text-gray-700 border-gray-200';
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cls}`}>
      {meta.label}
    </span>
  );
};

const getAvatarStyle = (name: string) => {
  const gradients = [
    'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',   // Light Blue to Blue
    'linear-gradient(135deg, #34d399 0%, #10b981 100%)',   // Emerald
    'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',   // Purple to Violet
    'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)',   // Sky to Blue
  ];
  let hash = 0;
  const safeName = name || '';
  for (let i = 0; i < safeName.length; i++) {
    hash = safeName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return { backgroundImage: gradients[Math.abs(hash) % gradients.length], color: '#fff', border: 'none' };
};


const ExperiencePage: React.FC = () => {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExp, setEditingExp] = useState<Experience | null>(null);
  const [jdModalOpen, setJdModalOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [empTypes, setEmpTypes] = useState<EmploymentType[]>(DEFAULT_EMP_TYPES);
  const [allOffers, setAllOffers] = useState<Offer[]>([]);
  const [raiseHistoryExp, setRaiseHistoryExp] = useState<Experience | null>(null);
  const [teamHistoryExp, setTeamHistoryExp] = useState<Experience | null>(null);
  const [schedulePhasesExp, setSchedulePhasesExp] = useState<Experience | null>(null);
  const [compBreakdownExp, setCompBreakdownExp] = useState<Experience | null>(null);
  const [overallCompBreakdownOpen, setOverallCompBreakdownOpen] = useState(false);
  const [overallInternshipBreakdownOpen, setOverallInternshipBreakdownOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const fetchOffersData = async () => {
    try {
      const res = await getOffers();
      setAllOffers(res.data as Offer[]);
    } catch {
      /* no offer data */
    }
  };

  useEffect(() => {
    fetchExperiences();
    getUserSettings().then(res => {
      const types = res.data.employment_types;
      if (types && types.length > 0) setEmpTypes(types);
    }).catch(() => {/* use defaults */});
    fetchOffersData();
  }, []);

  const fetchExperiences = async () => {
    try {
      setLoading(true);
      const res = await getExperiences();
      
      const sorted = res.data.sort((a, b) => {
        const dateA = parseExperienceDate(a.start_date)?.valueOf() ?? 0;
        const dateB = parseExperienceDate(b.start_date)?.valueOf() ?? 0;
        if (dateB !== dateA) return dateB - dateA;
        return (b.id || 0) - (a.id || 0);
      });
      setExperiences(sorted);
    } catch (err: any) {
      message.error('Failed to load experiences');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdate = async (data: Partial<Experience>, logoFile?: File | null, removeLogo?: boolean) => {
    try {
      let expId: number | undefined;
      if (editingExp && editingExp.id) {
        await updateExperience(editingExp.id, data);
        expId = editingExp.id;
        message.success('Experience updated successfully');
      } else {
        const res = await createExperience(data);
        expId = res.data.id;
        message.success('Experience added successfully');
      }

      if (expId) {
        if (logoFile) {
          const fd = new FormData();
          fd.append('logo', logoFile);
          await uploadExperienceLogo(expId, fd);
        } else if (removeLogo) {
          await removeExperienceLogo(expId);
        }
      }

      if (data.offer && (data.base_salary != null || data.bonus != null || data.equity != null)) {
        const linkedOffer = allOffers.find(o => o.id === data.offer);
        if (linkedOffer) {
          const patch: Record<string, unknown> = { ...linkedOffer as Record<string, unknown> };
          if (data.base_salary != null) patch.base_salary = data.base_salary;
          if (data.bonus != null) patch.bonus = data.bonus;
          if (data.equity != null) patch.equity = data.equity;
          await updateOffer(linkedOffer.id!, patch);
          setAllOffers(prev => prev.map(o => o.id === linkedOffer.id ? { ...o, ...patch } : o));
        }
      }

      fetchExperiences();
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Failed to save experience');
      throw err;
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteExperience(id);
      message.success('Experience deleted');
      fetchExperiences();
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Failed to delete experience');
    }
  };

  const handleDeleteAll = async () => {
    try {
      await deleteAllExperiences();
      message.success('All experiences deleted');
      fetchExperiences();
    } catch (err) {
      message.error('Failed to delete all experiences');
    }
  };

  const handleExportWrapper = async (format: string) => {
    const response = await exportExperiences(format);
    return {
      data: response.data,
      headers: response.headers as unknown as Record<string, string>,
    };
  };

  const importProps: UploadProps = {
    name: 'file',
    multiple: false,
    accept: '.json,.csv,.xlsx',
    beforeUpload: (file) => {
      const formData = new FormData();
      formData.append('file', file);
      importExperiences(formData)
        .then(async (response) => {
          message.success(response.data?.message || 'Import successful');
          setIsImportModalOpen(false);
          await Promise.all([fetchExperiences(), fetchOffersData()]);
        })
        .catch((err) => {
          message.error(err.response?.data?.error || 'Import failed');
        });
      return false;
    },
  };

  const handleDeleteGroup = async (group: Experience[]) => {
    try {
      await Promise.all(group.filter(e => !e.is_locked && e.id).map(e => deleteExperience(e.id!)));
      message.success(`Deleted ${group.filter(e => !e.is_locked).length} role(s) at ${group[0].company}`);
      fetchExperiences();
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Failed to delete company experiences');
    }
  };

  const handleToggleLock = async (exp: Experience) => {
    if (!exp.id) return;
    try {
      await updateExperience(exp.id, { is_locked: !exp.is_locked });
      setExperiences(prev => prev.map(e => e.id === exp.id ? { ...e, is_locked: !exp.is_locked } : e));
    } catch (err) {
      message.error('Failed to update lock status');
    }
  };

  const handleToggleGroupLock = async (group: Experience[]) => {
    const isAnyUnlocked = group.some(e => !e.is_locked);
    const targetState = isAnyUnlocked;
    try {
      await Promise.all(group.map(e => updateExperience(e.id!, { is_locked: targetState })));
      setExperiences(prev => prev.map(e => group.some(g => g.id === e.id) ? { ...e, is_locked: targetState } : e));
    } catch {
      message.error('Failed to update group lock status');
    }
  };

  const handleTogglePin = async (exp: Experience) => {
    if (!exp.id) return;
    try {
      await updateExperience(exp.id, { is_pinned: !exp.is_pinned });
      setExperiences(prev => prev.map(e => e.id === exp.id ? { ...e, is_pinned: !exp.is_pinned } : e));
    } catch {
      message.error('Failed to update pin status');
    }
  };

  const getLinkedOffer = (exp: Experience): Offer | undefined =>
    exp.offer ? allOffers.find(o => o.id === exp.offer) : undefined;

  const getCompensationSnapshot = (exp: Experience) => {
    return getExperienceCompensationSnapshot(exp, getLinkedOffer(exp));
  };

  const handleSaveRaiseHistory = async (entries: RaiseEntry[]) => {
    if (!raiseHistoryExp) return;
    const offer = getLinkedOffer(raiseHistoryExp);
    if (!offer?.id) return;
    await updateOffer(offer.id, { ...offer as Record<string, unknown>, raise_history: entries });
    setAllOffers(prev => prev.map(o => o.id === offer.id ? { ...o, raise_history: entries } : o));
  };

  const handleRaiseHistoryClick = (exp: Experience) => {
    setRaiseHistoryExp(exp);
  };

  const handleSaveTeamHistory = async (entries: TeamEntry[]) => {
    if (!teamHistoryExp?.id) return;
    await updateExperience(teamHistoryExp.id, { team_history: entries } as Partial<Experience>);
    setExperiences(prev => prev.map(e => e.id === teamHistoryExp.id ? { ...e, team_history: entries } : e));
    setTeamHistoryExp(prev => prev ? { ...prev, team_history: entries } : null);
  };

  const handleSaveSchedulePhases = async (phases: any[]) => {
    if (!schedulePhasesExp?.id) return;
    await updateExperience(schedulePhasesExp.id, { schedule_phases: phases } as Partial<Experience>);
    setExperiences(prev => prev.map(e => e.id === schedulePhasesExp.id ? { ...e, schedule_phases: phases } : e));
    setSchedulePhasesExp(prev => prev ? { ...prev, schedule_phases: phases } : null);
    
    if (compBreakdownExp?.id === schedulePhasesExp.id) {
      setCompBreakdownExp(prev => prev ? { ...prev, schedule_phases: phases } : null);
    }
  };

  const openAddModal = () => {
    setEditingExp(null);
    setModalOpen(true);
  };

  const openEditModal = (exp: Experience) => {
    setEditingExp(exp);
    setModalOpen(true);
  };

  const handleEditFromCompBreakdown = () => {
    if (!compBreakdownExp || compBreakdownExp.is_locked) return;
    const exp = compBreakdownExp;
    setCompBreakdownExp(null);
    openEditModal(exp);
  };

  const handleSaveInternshipCompInputs = async (updates: {
    hourly_rate: number | null;
    hours_per_day: number | null;
    working_days_per_week: number | null;
    total_hours_worked: number | null;
    overtime_hours: number | null;
    overtime_rate: number | null;
    overtime_multiplier: number | null;
    total_earnings_override: number | null;
  }) => {
    if (!compBreakdownExp?.id) return;
    const currentExp = compBreakdownExp;

    const normalizedHourlyRate = roundCompNumber(toNullableNumber(updates.hourly_rate));
    const normalizedHoursPerDay = roundCompNumber(toNullableNumber(updates.hours_per_day));
    const normalizedWorkingDaysPerWeek = roundCompNumber(toNullableNumber(updates.working_days_per_week));
    const rawTotalHoursWorked = roundCompNumber(toNullableNumber(updates.total_hours_worked));
    const normalizedOvertimeHours = roundCompNumber(Math.max(0, toNullableNumber(updates.overtime_hours) ?? 0)) || null;
    const normalizedOvertimeRate = (() => {
      const value = roundCompNumber(toNullableNumber(updates.overtime_rate));
      return value != null && value > 0 ? value : null;
    })();
    const normalizedOvertimeMultiplier = (() => {
      const value = roundCompNumber(toNullableNumber(updates.overtime_multiplier));
      return value != null && value > 0 && !nearlyEqual(value, 1.5) ? value : null;
    })();
    const rawTotalEarningsOverride = roundCompNumber(toNullableNumber(updates.total_earnings_override));

    const autoSnapshot = buildHourlyCompensationSnapshot({
      startDate: currentExp.start_date,
      endDate: currentExp.end_date,
      isCurrent: currentExp.is_current,
      hourlyRate: normalizedHourlyRate,
      hoursPerDay: normalizedHoursPerDay,
      workingDaysPerWeek: normalizedWorkingDaysPerWeek,
      totalHoursWorked: null,
      overtimeHours: null,
      overtimeRate: normalizedOvertimeRate,
      overtimeMultiplier: normalizedOvertimeMultiplier,
      totalEarningsOverride: null,
    });

    const normalizedTotalHoursWorked = rawTotalHoursWorked != null && autoSnapshot && nearlyEqual(rawTotalHoursWorked, autoSnapshot.autoCalculatedHours)
      ? null
      : rawTotalHoursWorked;

    const calculatedTotal = buildHourlyCompensationSnapshot({
      startDate: currentExp.start_date,
      endDate: currentExp.end_date,
      isCurrent: currentExp.is_current,
      hourlyRate: normalizedHourlyRate,
      hoursPerDay: normalizedHoursPerDay,
      workingDaysPerWeek: normalizedWorkingDaysPerWeek,
      totalHoursWorked: normalizedTotalHoursWorked,
      overtimeHours: normalizedOvertimeHours,
      overtimeRate: normalizedOvertimeRate,
      overtimeMultiplier: normalizedOvertimeMultiplier,
      totalEarningsOverride: null,
    })?.total ?? null;

    const normalizedTotalEarningsOverride = rawTotalEarningsOverride != null && calculatedTotal != null && nearlyEqual(rawTotalEarningsOverride, calculatedTotal)
      ? null
      : rawTotalEarningsOverride;

    const patch: Partial<Experience> = {
      hourly_rate: normalizedHourlyRate,
      hours_per_day: normalizedHoursPerDay,
      working_days_per_week: normalizedWorkingDaysPerWeek,
      total_hours_worked: normalizedTotalHoursWorked,
      overtime_hours: normalizedOvertimeHours,
      overtime_rate: normalizedOvertimeRate,
      overtime_multiplier: normalizedOvertimeMultiplier,
      total_earnings_override: normalizedTotalEarningsOverride,
    };

    await updateExperience(currentExp.id, patch);
    setExperiences(prev => prev.map(exp => exp.id === currentExp.id ? { ...exp, ...patch } : exp));
    setCompBreakdownExp(prev => prev && prev.id === currentExp.id ? { ...prev, ...patch } : prev);
    message.success('Internship earnings inputs updated');
  };

  const formatDuration = (exp: Experience) => {
    const start = parseExperienceDate(exp.start_date);
    let end = exp.is_current ? dayjs() : parseExperienceDate(exp.end_date);
    
    const startStr = start ? start.format('MMM D, YYYY') : 'Unknown';
    const endStr = exp.is_current ? 'Present' : (end ? end.format('MMM D, YYYY') : 'Unknown');
    
    let durationStr = '';
    if (start && end) {
      let years = end.diff(start, 'year');
      let dateAfterYears = start.add(years, 'year');
      
      let months = end.diff(dateAfterYears, 'month');
      let dateAfterMonths = dateAfterYears.add(months, 'month');
      
      let days = end.diff(dateAfterMonths, 'day');
      let totalDays = end.diff(start, 'day');
      
      const parts = [];
      if (years > 0) parts.push(`${years} yr${years !== 1 ? 's' : ''}`);
      if (months > 0) parts.push(`${months} mo${months !== 1 ? 's' : ''}`);
      if (days > 0 || (years === 0 && months === 0)) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
      
      if (parts.length > 0) {
        durationStr = ` · ${parts.join(' ')} (${totalDays} day${totalDays !== 1 ? 's' : ''})`;
      }
    }

    return `${startStr} - ${endStr}${durationStr}`;
  };

  const renderDescription = (text: string) => {
    const lines = text.split('\n');
    let inList = false;
    const elements: React.ReactNode[] = [];
    let currentList: React.ReactNode[] = [];

    lines.forEach((line, index) => {
      const isBullet = line.trim().startsWith('-') || line.trim().startsWith('•') || line.trim().startsWith('*');
      if (isBullet) {
        inList = true;
        const pureText = line.replace(/^[-•*]\s*/, '').trim();
        currentList.push(
          <li key={`li-${index}`} className="mb-2.5 pl-1 leading-relaxed text-gray-700 relative">
            {pureText}
          </li>
        );
      } else {
        if (inList) {
          elements.push(
            <ul key={`ul-${index}`} className="list-none pl-1 mb-5 space-y-2">
              {currentList.map((item: any, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0 shadow-sm" />
                  <div>{item}</div>
                </div>
              ))}
            </ul>
          );
          inList = false;
          currentList = [];
        }
        if (line.trim().length > 0) {
          elements.push(<div key={`p-${index}`} className="mb-4 text-gray-700 leading-relaxed font-medium">{line}</div>);
        }
      }
    });

    if (inList && currentList.length > 0) {
      elements.push(
        <ul key={`ul-end`} className="list-none pl-1 mb-2 space-y-2">
          {currentList.map((item: any, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0 shadow-sm" />
              <div>{item}</div>
            </div>
          ))}
        </ul>
      );
    }

    return elements;
  };

  const mergedDays = (intervals: [number, number][]): number => {
    if (intervals.length === 0) return 0;
    const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
    let total = 0;
    let curStart = sorted[0][0];
    let curEnd = sorted[0][1];
    for (let i = 1; i < sorted.length; i++) {
      const [s, e] = sorted[i];
      if (s <= curEnd) {
        curEnd = Math.max(curEnd, e);
      } else {
        total += curEnd - curStart;
        curStart = s;
        curEnd = e;
      }
    }
    total += curEnd - curStart;
    return total;
  };

  const calculateTotalCareerDuration = () => {
    if (experiences.length === 0) return '0 yrs';
    const intervals: [number, number][] = [];
    for (const exp of experiences) {
      const start = parseExperienceDate(exp.start_date);
      const end = exp.is_current ? dayjs() : parseExperienceDate(exp.end_date);
      if (start && end) intervals.push([start.valueOf(), end.valueOf()]);
    }
    const totalDays = Math.round(mergedDays(intervals) / 86400000);
    return fmtDays(totalDays, true);
  };

  const totalCompanies = new Set(experiences.map(e => e.company)).size;

  const durationByType = useMemo(() => {
    const byType: Record<string, [number, number][]> = {};
    for (const exp of experiences) {
      const type = exp.employment_type || 'full_time';
      const start = parseExperienceDate(exp.start_date);
      const end = exp.is_current ? dayjs() : parseExperienceDate(exp.end_date);
      if (!start || !end) continue;
      if (!byType[type]) byType[type] = [];
      byType[type].push([start.valueOf(), end.valueOf()]);
    }
    const result: Record<string, number> = {};
    for (const [type, intervals] of Object.entries(byType)) {
      result[type] = Math.round(mergedDays(intervals) / 86400000);
    }
    return result;
  }, [experiences]);

  const companiesByType = useMemo(() => {
    const seen = new Map<string, string>();
    for (const exp of [...experiences].sort((a, b) =>
      (b.start_date ?? '').localeCompare(a.start_date ?? '')
    )) {
      const key = exp.company.toLowerCase();
      if (!seen.has(key)) seen.set(key, exp.employment_type || 'full_time');
    }
    const result: Record<string, number> = {};
    for (const type of seen.values()) result[type] = (result[type] || 0) + 1;
    return result;
  }, [experiences]);

  const fmtDays = (totalDays: number, showDaysCount = false): string => {
    const yrs = Math.floor(totalDays / 365);
    const mos = Math.floor((totalDays % 365) / 30);
    const parts: string[] = [];
    if (yrs > 0) parts.push(`${yrs} yr${yrs !== 1 ? 's' : ''}`);
    if (mos > 0) parts.push(`${mos} mo${mos !== 1 ? 's' : ''}`);
    if (parts.length === 0) parts.push(`${totalDays} day${totalDays !== 1 ? 's' : ''}`);
    const base = parts.join(' ');
    return showDaysCount ? `${base} (${totalDays} days)` : base;
  };

  const fmtMonths = fmtDays;

  const getTypeDisplay = (value: string) => {
    const t = empTypes.find(t => t.value === value);
    return {
      label: t?.label ?? value,
      dot: DOT_CLASSES[t?.color ?? 'gray'] ?? 'bg-gray-400',
      badge: BADGE_CLASSES[t?.color ?? 'gray'] ?? 'bg-gray-50 text-gray-700 border-gray-200',
    };
  };

  const getLatestTeam = (exp: Experience) => {
    const teams = exp.team_history;
    if (!teams || teams.length === 0) return null;
    const current = teams.find(t => t.is_current);
    if (current) return current;
    return [...teams].sort((a, b) => (b.start_date ?? '').localeCompare(a.start_date ?? ''))[0];
  };

  const formatRoleDateRange = (exp: Experience, overrideEndDate?: string | null): string => {
    const start = parseExperienceDate(exp.start_date);
    const explicitEnd = parseExperienceDate(exp.end_date);
    const fallbackEnd = parseExperienceDate(overrideEndDate ?? null);
    const end = exp.is_current ? dayjs() : (explicitEnd ?? fallbackEnd);
    const startStr = start ? start.format('MMM YYYY') : '—';
    const endStr = exp.is_current ? 'Present' : (end ? end.format('MMM YYYY') : '—');
    const dur = start && end ? ` · ${fmtDays(end.diff(start, 'day'), true)}` : '';
    return `${startStr} – ${endStr}${dur}`;
  };

  const getGroupTenure = (group: Experience[]): string => {
    const oldest = group[group.length - 1];
    const newest = group[0];
    const start = parseExperienceDate(oldest.start_date);
    const end = newest.is_current ? dayjs() : parseExperienceDate(newest.end_date);
    if (!start || !end) return '';
    return fmtDays(end.diff(start, 'day'), true);
  };

  const offerSelectOptions = useMemo(() => {
    return allOffers.map(o => {
      const company = o.application_details?.company;
      const role = o.application_details?.role_title;
      const label = company && role
        ? `${company} — ${role}${o.is_current ? ' (current)' : ''}`
        : `Offer #${o.id} — $${Number(o.base_salary).toLocaleString()} base${o.is_current ? ' (current)' : ''}`;
      return {
        value: o.id as number,
        label,
        base_salary: Number(o.base_salary),
        bonus: Number(o.bonus),
        equity: Number(o.equity),
      };
    });
  }, [allOffers]);

  const allSkills = experiences.flatMap(e => e.skills || []);
  const skillCounts = allSkills.reduce((acc, skill) => {
    acc[skill] = (acc[skill] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topSkills = Object.entries(skillCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(entry => entry[0]);

  const filteredExperiences = selectedSkill
    ? experiences.filter(exp => exp.skills?.includes(selectedSkill))
    : experiences;

  const compBreakdownSnapshot = compBreakdownExp ? getCompensationSnapshot(compBreakdownExp) : null;
  const fullTimeCompSummary = useMemo(() => {
    const fullTimeRoles = experiences.filter(exp => exp.employment_type === 'full_time');
    const trackedComp = fullTimeRoles
      .map(exp => getCompensationSnapshot(exp))
      .filter((comp): comp is Extract<NonNullable<ReturnType<typeof getCompensationSnapshot>>, { kind: 'salary' }> => comp !== null && comp.kind === 'salary');

    return {
      roleCount: fullTimeRoles.length,
      trackedRoleCount: trackedComp.length,
      base: trackedComp.reduce((sum, comp) => sum + comp.base, 0),
      bonus: trackedComp.reduce((sum, comp) => sum + comp.bonus, 0),
      equity: trackedComp.reduce((sum, comp) => sum + comp.equity, 0),
      total: trackedComp.reduce((sum, comp) => sum + comp.total, 0),
    };
  }, [experiences, allOffers]);

  const internshipCompSnapshots = useMemo(() => {
    return experiences
      .filter(exp => exp.employment_type === 'internship')
      .map(exp => getCompensationSnapshot(exp))
      .filter((comp): comp is Extract<NonNullable<ReturnType<typeof getCompensationSnapshot>>, { kind: 'hourly' }> => comp !== null && comp.kind === 'hourly');
  }, [experiences, allOffers]);

  const internshipCompSummary = useMemo(() => {
    const internshipRoles = experiences.filter(exp => exp.employment_type === 'internship');
    const trackedComp = internshipCompSnapshots;

    const estimatedHours = trackedComp.reduce((sum, comp) => sum + (comp.calculationMode === 'manual_total' ? 0 : comp.estimatedHours), 0);
    const regularPay = trackedComp.reduce((sum, comp) => sum + comp.regularPay, 0);
    const overtimePay = trackedComp.reduce((sum, comp) => sum + comp.overtimePay, 0);

    return {
      roleCount: internshipRoles.length,
      trackedRoleCount: trackedComp.length,
      estimatedHours,
      regularPay,
      overtimePay,
      total: trackedComp.reduce((sum, comp) => sum + comp.total, 0),
      manualHoursRoleCount: trackedComp.filter(comp => comp.calculationMode === 'manual_hours').length,
      customTotalRoleCount: trackedComp.filter(comp => comp.calculationMode === 'manual_total').length,
    };
  }, [experiences, internshipCompSnapshots]);

  const groupedExperiences = useMemo((): Experience[][] => {
    const seen = new Set<number>();
    const groups: Experience[][] = [];

    for (let i = 0; i < filteredExperiences.length; i++) {
      const exp = filteredExperiences[i];
      if (seen.has(exp.id!)) continue;

      const company = exp.company.toLowerCase();
      const group: Experience[] = [exp];
      seen.add(exp.id!);

      for (let j = i + 1; j < filteredExperiences.length; j++) {
        const other = filteredExperiences[j];
        if (!seen.has(other.id!) && other.company.toLowerCase() === company) {
          group.push(other);
          seen.add(other.id!);
        }
      }

      groups.push(group);
    }

    return groups.sort((a, b) => {
      const aPinned = a[0].is_pinned ? 1 : 0;
      const bPinned = b[0].is_pinned ? 1 : 0;
      return bPinned - aPinned;
    });
  }, [filteredExperiences]);

  return (
    <div style={{ padding: 0, width: '100%' }} className="animate-in fade-in duration-500">
      <div style={{ marginBottom: 24 }}>
        <PageActionToolbar
          title={<span className="whitespace-nowrap">Career Journey</span>}
          subtitle="Your professional timeline, skills, and historic achievements."
          extraActions={
            <Button 
              size="large"
              icon={<RobotOutlined />} 
              onClick={() => setJdModalOpen(true)}
              className="toolbar-btn text-indigo-600 bg-indigo-50 border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 shadow-sm"
            >
              Match JD
            </Button>
          }
          onDeleteAll={handleDeleteAll}
          deleteAllLabel="Delete All"
          deleteAllDisabled={experiences.length === 0}
          deleteAllConfirmTitle="Delete all experiences?"
          deleteAllConfirmDescription="This will permanently delete all unlocked experiences."
          onExport={handleExportWrapper}
          exportFilename="experiences"
          onImport={() => setIsImportModalOpen(true)}
          onPrimaryAction={openAddModal}
          primaryActionLabel="Add Experience"
          primaryActionIcon={<PlusOutlined />}
        />
      </div>

      {/* Analytics Dashboard */}
      {experiences.length > 0 && (
        <Card style={{ marginBottom: 28 }} className="rounded-2xl border-gray-100 shadow-sm" bodyStyle={{ padding: '14px 18px' }}>
          <Row gutter={[16, 14]} align="top">
            <Col xs={24} md={12} xl={6}>
              <div className="h-full xl:border-r border-gray-100 xl:pr-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                    <ClockCircleOutlined className="text-sm" />
                  </div>
                  <div className="text-[11px] text-gray-400 font-medium uppercase tracking-[0.14em]">Total Experience</div>
                </div>
                <div className="mt-3 min-w-0">
                  <div className="text-[24px] leading-none font-semibold text-gray-900">{calculateTotalCareerDuration()}</div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                    {Object.entries(durationByType)
                      .sort((a, b) => b[1] - a[1])
                      .map(([type, months]) => (
                        <span key={type} className="flex items-center gap-1 text-[11px] text-gray-500 whitespace-nowrap">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getTypeDisplay(type).dot}`} />
                          <span className="font-medium text-gray-700">{fmtMonths(months, true)}</span>
                          <span>{getTypeDisplay(type).label}</span>
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            </Col>

            <Col xs={24} md={12} xl={5}>
              <div className="h-full xl:border-r border-gray-100 xl:pr-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0">
                    <BankOutlined className="text-sm" />
                  </div>
                  <div className="text-[11px] text-gray-400 font-medium uppercase tracking-[0.14em]">Companies</div>
                </div>
                <div className="mt-3 min-w-0">
                  <div className="text-[24px] leading-none font-semibold text-gray-900">{totalCompanies}</div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                    {Object.entries(companiesByType)
                      .sort((a, b) => b[1] - a[1])
                      .map(([type, count]) => (
                        <span key={type} className="flex items-center gap-1 text-[11px] text-gray-500 whitespace-nowrap">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getTypeDisplay(type).dot}`} />
                          <span className="font-medium text-gray-700">{count}</span>
                          <span>{getTypeDisplay(type).label}</span>
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            </Col>

            <Col xs={24} md={12} xl={7}>
              <div className="h-full xl:border-r border-gray-100 xl:pr-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
                    <DollarOutlined className="text-sm" />
                  </div>
                  <div className="text-[11px] text-gray-400 font-medium uppercase tracking-[0.14em]">Earnings</div>
                </div>
                <div className="mt-3 min-w-0">
                  <div className="space-y-2.5">
                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">Full-Time</span>
                            <span className="text-[17px] leading-none font-semibold text-gray-900">
                              {fullTimeCompSummary.trackedRoleCount > 0 ? `$${fullTimeCompSummary.total.toLocaleString()}` : 'No pay data'}
                            </span>
                          </div>
                          <div className="mt-1 text-[11px] leading-relaxed text-gray-500">
                            {fullTimeCompSummary.trackedRoleCount > 0 ? (
                              <>
                                {fullTimeCompSummary.trackedRoleCount} tracked
                                {fullTimeCompSummary.base > 0 && ` • Base $${fullTimeCompSummary.base.toLocaleString()}`}
                                {fullTimeCompSummary.roleCount > fullTimeCompSummary.trackedRoleCount &&
                                  ` • ${fullTimeCompSummary.roleCount - fullTimeCompSummary.trackedRoleCount} missing`}
                              </>
                            ) : (
                              'Add base, bonus, or equity to see the total.'
                            )}
                          </div>
                        </div>
                        {fullTimeCompSummary.trackedRoleCount > 0 && (
                          <button
                            type="button"
                            onClick={() => setOverallCompBreakdownOpen(true)}
                            title="View overall pay structure breakdown"
                            className="shrink-0 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full hover:bg-emerald-100 transition-colors"
                          >
                            Breakdown
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-2.5 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">Internship</span>
                            <span className="text-[17px] leading-none font-semibold text-gray-900">
                              {internshipCompSummary.trackedRoleCount > 0
                                ? `$${internshipCompSummary.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                                : 'No estimate yet'}
                            </span>
                          </div>
                          <div className="mt-1 text-[11px] leading-relaxed text-gray-500">
                            {internshipCompSummary.trackedRoleCount > 0 ? (
                              <>
                                {internshipCompSummary.trackedRoleCount} tracked
                                {internshipCompSummary.estimatedHours > 0 &&
                                  ` • ${internshipCompSummary.estimatedHours.toLocaleString(undefined, { maximumFractionDigits: 2 })} hrs`}
                                {internshipCompSummary.roleCount > internshipCompSummary.trackedRoleCount
                                  ? ` • ${internshipCompSummary.roleCount - internshipCompSummary.trackedRoleCount} missing`
                                  : internshipCompSummary.customTotalRoleCount > 0
                                    ? ` • ${internshipCompSummary.customTotalRoleCount} custom total`
                                    : internshipCompSummary.manualHoursRoleCount > 0
                                      ? ` • ${internshipCompSummary.manualHoursRoleCount} manual hrs`
                                      : ' • Auto estimated'}
                              </>
                            ) : (
                              'Add hourly rate, dates, or a total override to calculate internship earnings.'
                            )}
                          </div>
                        </div>
                        {internshipCompSummary.trackedRoleCount > 0 && (
                          <button
                            type="button"
                            onClick={() => setOverallInternshipBreakdownOpen(true)}
                            title="View internship earnings breakdown"
                            className="shrink-0 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full hover:bg-amber-100 transition-colors"
                          >
                            Breakdown
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Col>

            <Col xs={24} md={12} xl={6}>
              <div className="h-full">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 shrink-0">
                    <CodeOutlined className="text-sm" />
                  </div>
                  <div className="text-[11px] text-gray-400 font-medium uppercase tracking-[0.14em]">Top Skills</div>
                  {selectedSkill && (
                    <button
                      type="button"
                      onClick={() => setSelectedSkill(null)}
                      className="text-[11px] text-blue-500 hover:text-blue-600 transition-colors"
                    >
                      Clear filter
                    </button>
                  )}
                </div>
                <div className="mt-3 min-w-0">
                  <div className="flex flex-wrap gap-1.5">
                    {topSkills.map(skill => {
                      const isSelected = selectedSkill === skill;
                      return (
                        <Tag.CheckableTag
                          key={skill}
                          checked={isSelected}
                          onChange={(checked) => setSelectedSkill(checked ? skill : null)}
                          className={`m-0 px-2 py-0.5 rounded-md border text-[11px] leading-5 transition-all ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-500'
                          }`}
                        >
                          {skill} <span className="opacity-50 ml-1">{skillCounts[skill]}</span>
                        </Tag.CheckableTag>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Spin size="large" />
        </div>
      ) : experiences.length === 0 ? (
        <div className="bg-white p-16 rounded-3xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-5 shadow-inner">
            <PlusOutlined className="text-blue-500 text-3xl" />
          </div>
          <Title level={4} className="!mb-2 text-gray-800">No experiences added yet</Title>
          <Text className="text-gray-500 mb-8 max-w-sm text-base">Click "Add Experience" to start building your professional history or quick-import from your resume.</Text>
          <Button onClick={openAddModal} type="primary" size="large" className="rounded-xl px-8 h-12 bg-blue-600 hover:!bg-blue-500 border-transparent text-white shadow-md shadow-blue-500/20">Get Started</Button>
        </div>
      ) : (
        <div className="relative pl-6 md:pl-8">
          {/* Vertical Timeline Line */}
          <div className="absolute top-10 bottom-0 left-12 w-0.5 bg-gradient-to-b from-blue-100 via-gray-100 to-transparent z-0 hidden md:block" />

          <div className="space-y-10 relative z-10">
            {filteredExperiences.length === 0 && selectedSkill && (
              <div className="text-center py-10 bg-white/50 rounded-2xl border border-dashed border-gray-200">
                <Text className="text-gray-500">No timeline events match the selected skill filter.</Text>
                <div className="mt-2">
                  <Button type="link" onClick={() => setSelectedSkill(null)}>Clear Filter</Button>
                </div>
              </div>
            )}
            {groupedExperiences.map((group, groupIdx) => {
              const primary = group[0];
              const isMulti = group.length > 1;
              const logoSrc = toRelativeMediaUrl(primary.logo);

              const groupAvatar = logoSrc ? (
                <Avatar size={52} src={logoSrc} className="shadow-md border-4 border-white ring-1 ring-gray-100 z-10" />
              ) : (
                <Avatar size={52} style={getAvatarStyle(primary.company)} className="font-bold text-xl shadow-md border-4 border-white ring-1 ring-gray-100 z-10">
                  {primary.company?.charAt(0)?.toUpperCase() || <BankOutlined />}
                </Avatar>
              );

              const renderSingleRole = (exp: Experience) => {
                const skills = exp.skills || [];
                const comp = getCompensationSnapshot(exp);
                const internshipComp = comp?.kind === 'hourly' ? comp : null;
                const salaryComp = comp?.kind === 'salary' ? comp : null;
                return (
                  <div className="p-7">
                    <div className="flex justify-between items-start mb-5">
                      <div>
                        <div className="flex md:hidden items-center gap-3 mb-3">
                          {logoSrc
                            ? <Avatar size={40} src={logoSrc} className="shadow-sm" />
                            : <Avatar size={40} style={getAvatarStyle(exp.company)} className="font-bold shadow-sm">
                                {exp.company?.charAt(0)?.toUpperCase() || <BankOutlined />}
                              </Avatar>
                          }
                          <div className="text-lg font-bold text-gray-800 tracking-tight">{exp.company}</div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Title level={3} className="!mb-0 text-gray-900 group-hover:text-blue-600 transition-colors font-bold tracking-tight">
                            {exp.title}
                          </Title>
                          <EmploymentBadge type={exp.employment_type} empTypes={empTypes} />
                          {exp.is_return_offer && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 whitespace-nowrap">
                              <LinkOutlined style={{ fontSize: 9 }} /> Return Offer
                            </span>
                          )}
                          {exp.is_pinned && (
                            <Tooltip title="Click to unpin">
                              <button
                                onClick={() => handleTogglePin(exp)}
                                className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full cursor-pointer hover:bg-amber-100 transition-colors"
                              >
                                <PushpinFilled style={{ fontSize: 10 }} /> Pinned
                              </button>
                            </Tooltip>
                          )}
                        </div>
                        <div className="hidden md:block text-lg font-semibold text-gray-800 mb-3 tracking-tight">{exp.company}</div>
                        <div className="flex flex-nowrap shrink-0 items-center gap-x-4 text-sm text-gray-500 font-medium bg-gray-50 inline-flex px-3 py-1.5 rounded-lg border border-gray-100 max-w-full overflow-x-auto whitespace-nowrap [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                          <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50/80 border border-indigo-100/50 px-2 py-0.5 rounded-md">
                            <CalendarOutlined />
                            <span className="font-semibold">{formatDuration(exp)}</span>
                          </div>
                          {exp.location && (
                            <div className="flex items-center gap-1.5">
                              <EnvironmentOutlined className="text-gray-400" />
                              <span>{exp.location}</span>
                            </div>
                          )}
                          {exp.employment_type === 'internship' && (() => {
                            const team = getLatestTeam(exp);
                            return team ? (
                              <div className="flex items-center gap-1.5">
                                <TeamOutlined className="text-gray-400" />
                                <span>{team.name}</span>
                              </div>
                            ) : null;
                          })()}
                          {exp.employment_type === 'internship' && internshipComp && (
                            <button
                              type="button"
                              onClick={() => setCompBreakdownExp(exp)}
                              title="View internship earnings breakdown"
                              className="flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md hover:bg-emerald-100 transition-colors"
                            >
                              <DollarOutlined />
                              <span>${internshipComp.total.toLocaleString(undefined, { maximumFractionDigits: 2 })} total earnings</span>
                            </button>
                          )}
                          {exp.employment_type === 'internship' && !internshipComp && exp.hourly_rate != null && (
                            <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                              <DollarOutlined />
                              <span>${Number(exp.hourly_rate).toFixed(2)}/hr</span>
                            </div>
                          )}
                          {exp.employment_type !== 'internship' && (() => {
                            return salaryComp ? (
                              <div className="flex items-center flex-wrap">
                                {exp.employment_type === 'full_time' ? (
                                  <button
                                    type="button"
                                    onClick={() => setCompBreakdownExp(exp)}
                                    title="View pay structure breakdown"
                                    className="flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md hover:bg-emerald-100 transition-colors"
                                  >
                                    <DollarOutlined />
                                    <span>${salaryComp.total.toLocaleString()} total earnings</span>
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                                    <DollarOutlined />
                                    <span>${salaryComp.base.toLocaleString()} base</span>
                                    {salaryComp.bonus > 0 && <span className="text-gray-400 font-normal">+ ${salaryComp.bonus.toLocaleString()} bonus</span>}
                                    {salaryComp.equity > 0 && <span className="text-gray-400 font-normal">+ ${salaryComp.equity.toLocaleString()} RSU/yr</span>}
                                  </div>
                                )}
                              </div>
                            ) : null;
                          })()}
                        </div>
                        {exp.employment_type !== 'internship' && (() => {
                          const team = getLatestTeam(exp);
                          return team ? (
                            <div className="flex items-center gap-1.5 text-sm text-gray-500 font-medium mt-2">
                              <TeamOutlined className="text-gray-400" />
                              <span>{team.name}</span>
                            </div>
                          ) : null;
                        })()}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="opacity-0 group-hover:opacity-100 transition-all duration-200">
                          <Tooltip title="View / edit team norms for this role">
                            <Button
                              size="small"
                              icon={<TeamOutlined />}
                              onClick={() => setTeamHistoryExp(exp)}
                              className="text-blue-600 border-blue-200 bg-blue-50 hover:!bg-blue-100 hover:!border-blue-300 hover:!text-blue-700"
                            >
                              Team Norms
                            </Button>
                          </Tooltip>
                          {/* Schedule Phases entry moved purely to internal Compensation Breakdown Modal */}
                        </div>
                        {getLinkedOffer(exp) && (
                          <div className="opacity-0 group-hover:opacity-100 transition-all duration-200">
                            <Tooltip title="View / edit raise history for this role">
                              <Button
                                size="small"
                                icon={<TrophyOutlined />}
                                onClick={() => handleRaiseHistoryClick(exp)}
                                className="text-amber-600 border-amber-200 bg-amber-50 hover:!bg-amber-100 hover:!border-amber-300 hover:!text-amber-700"
                              >
                                Raise History
                              </Button>
                            </Tooltip>
                          </div>
                        )}
                        <div className={`transition-all duration-200 ${exp.is_locked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                          <RowActions
                            isLocked={exp.is_locked}
                            onToggleLock={() => handleToggleLock(exp)}
                            isPinned={exp.is_pinned}
                            onTogglePin={() => handleTogglePin(exp)}
                            onEdit={exp.is_locked ? undefined : () => openEditModal(exp)}
                            onDelete={exp.is_locked ? undefined : () => exp.id && handleDelete(exp.id)}
                            deleteTitle="Delete Experience"
                            deleteDescription="Are you sure you want to remove this role?"
                            disableEdit={exp.is_locked}
                            disableDelete={exp.is_locked}
                          />
                        </div>
                      </div>
                    </div>
                    {exp.description && <div className="mt-6 text-[15px]">{renderDescription(exp.description)}</div>}
                    {skills.length > 0 && (
                      <div className="mt-6 pt-5 border-t border-gray-100 flex flex-wrap gap-2">
                        {skills.map(skill => (
                          <Tag key={skill} className="m-0 px-3 py-1 rounded-md bg-[rgb(248,250,255)] text-blue-600 border border-blue-100/60 font-medium hover:bg-blue-50 transition-colors">{skill}</Tag>
                        ))}
                      </div>
                    )}
                  </div>
                );
              };

              const renderMultiRoles = () => {
                const tenure = getGroupTenure(group);
                return (
                  <div className="p-7">
                    {/* Company header — LinkedIn style */}
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="flex md:hidden shrink-0">
                          {logoSrc
                            ? <Avatar size={44} src={logoSrc} className="shadow-sm" />
                            : <Avatar size={44} style={getAvatarStyle(primary.company)} className="font-bold shadow-sm">{primary.company?.charAt(0)?.toUpperCase()}</Avatar>
                          }
                        </div>
                        <div>
                          <div className="text-xl font-bold text-gray-900 tracking-tight">{primary.company}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[15px] text-gray-500">{group.length} roles</span>
                            {tenure && (
                              <>
                                <span className="text-gray-300">·</span>
                                <span className="text-[15px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">{tenure} total</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Group-level actions: pin + delete */}
                      <div className="flex items-center gap-1 shrink-0">
                        {primary.is_pinned ? (
                          <Tooltip title="Click to unpin">
                            <button
                              onClick={() => handleTogglePin(primary)}
                              className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full cursor-pointer hover:bg-amber-100 transition-colors"
                            >
                              <PushpinFilled style={{ fontSize: 10 }} /> Pinned
                            </button>
                          </Tooltip>
                        ) : (
                          <div className="opacity-0 group-hover:opacity-100 transition-all duration-200">
                            <Tooltip title="Pin to top">
                              <Button type="text" size="small" icon={<PushpinOutlined />} onClick={() => handleTogglePin(primary)} className="text-gray-400 hover:text-amber-500" />
                            </Tooltip>
                          </div>
                        )}
                        <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center gap-1">
                          <Tooltip title={group.some(e => !e.is_locked) ? "Lock all roles" : "Unlock all roles"}>
                            <Button 
                              type="text" 
                              size="small" 
                              icon={group.some(e => !e.is_locked) ? <UnlockOutlined /> : <LockOutlined />} 
                              onClick={() => handleToggleGroupLock(group)} 
                              className={group.some(e => !e.is_locked) ? "text-gray-400 hover:text-gray-600" : "text-amber-500 hover:text-amber-600"}
                            />
                          </Tooltip>
                          <Tooltip title={`Delete all roles at ${primary.company}`}>
                            <Popconfirm
                              title={`Delete all ${primary.company} roles?`}
                              description={`This will delete ${group.filter(e => !e.is_locked).length} unlocked role(s).`}
                              onConfirm={() => handleDeleteGroup(group)}
                              okText="Delete"
                              okButtonProps={{ danger: true }}
                            >
                              <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                            </Popconfirm>
                          </Tooltip>
                        </div>
                      </div>
                    </div>

                    {/* Roles — left-border timeline with dots */}
                    <div className="relative pl-6" style={{ borderLeft: '2px solid #e5e7eb' }}>
                      {group.map((exp, roleIdx) => {
                        const skills = exp.skills || [];
                        const comp = getCompensationSnapshot(exp);
                        const internshipComp = comp?.kind === 'hourly' ? comp : null;
                        const salaryComp = comp?.kind === 'salary' ? comp : null;
                        return (
                          <div key={exp.id} className={`relative ${roleIdx < group.length - 1 ? 'mb-8' : ''}`}>
                            {/* Timeline dot */}
                            <div className="absolute -left-[29px] top-[5px] w-4 h-4 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-gray-400" />
                            </div>

                            <div className="flex justify-between items-start">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-[17px] text-gray-900 leading-snug">{exp.title}</span>
                                  {exp.is_promotion && (
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 whitespace-nowrap">
                                      <RiseOutlined style={{ fontSize: 9 }} /> Promoted
                                    </span>
                                  )}
                                  <EmploymentBadge type={exp.employment_type} empTypes={empTypes} />
                                  {exp.is_return_offer && (
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 whitespace-nowrap">
                                      <LinkOutlined style={{ fontSize: 9 }} /> Return Offer
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-nowrap shrink-0 items-center gap-x-4 mt-1 text-sm text-gray-500 font-medium bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 w-fit max-w-full overflow-x-auto whitespace-nowrap [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                  <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50/80 border border-indigo-100/50 px-2 py-0.5 rounded-md shrink-0">
                                    <CalendarOutlined style={{ fontSize: 11 }} />
                                    <span className="font-semibold">{formatRoleDateRange(exp, roleIdx > 0 ? group[roleIdx - 1].start_date : null)}</span>
                                  </div>
                                  {exp.location && (
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <EnvironmentOutlined className="text-gray-400" />
                                      <span>{exp.location}</span>
                                    </div>
                                  )}
                                  {exp.employment_type === 'internship' && (() => {
                                    const team = getLatestTeam(exp);
                                    return team ? (
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <TeamOutlined className="text-gray-400" />
                                        {team.name}
                                      </div>
                                    ) : null;
                                  })()}
                                  {exp.employment_type === 'internship' && internshipComp && (
                                    <button
                                      type="button"
                                      onClick={() => setCompBreakdownExp(exp)}
                                      title="View internship earnings breakdown"
                                      className="flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md hover:bg-emerald-100 transition-colors shrink-0"
                                    >
                                      <DollarOutlined />
                                      ${internshipComp.total.toLocaleString(undefined, { maximumFractionDigits: 2 })} total earnings
                                    </button>
                                  )}
                                  {exp.employment_type === 'internship' && !internshipComp && exp.hourly_rate != null && (
                                    <div className="flex items-center gap-1.5 text-emerald-600 font-semibold shrink-0">
                                      <DollarOutlined />
                                      ${Number(exp.hourly_rate).toFixed(2)}/hr
                                    </div>
                                  )}
                                  {exp.employment_type !== 'internship' && (() => {
                                    return salaryComp ? (
                                      <>
                                        {exp.employment_type === 'full_time' ? (
                                          <button
                                            type="button"
                                            onClick={() => setCompBreakdownExp(exp)}
                                            title="View pay structure breakdown"
                                            className="flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md hover:bg-emerald-100 transition-colors shrink-0"
                                          >
                                            <DollarOutlined />
                                            ${salaryComp.total.toLocaleString()} total earnings
                                          </button>
                                        ) : (
                                          <div className="flex items-center gap-1.5 text-emerald-600 font-semibold shrink-0">
                                            <DollarOutlined />
                                            ${salaryComp.base.toLocaleString()} base
                                            {salaryComp.bonus > 0 && <span className="text-gray-400 font-normal">+ ${salaryComp.bonus.toLocaleString()} bonus</span>}
                                            {salaryComp.equity > 0 && <span className="text-gray-400 font-normal">+ ${salaryComp.equity.toLocaleString()} RSU/yr</span>}
                                          </div>
                                        )}
                                      </>
                                    ) : null;
                                  })()}
                                </div>
                                {exp.employment_type !== 'internship' && (() => {
                                  const team = getLatestTeam(exp);
                                  return team ? (
                                    <div className="flex items-center gap-1.5 mt-1 text-[15px] text-gray-500">
                                      <TeamOutlined style={{ fontSize: 12, color: '#9ca3af' }} />
                                      <span>{team.name}</span>
                                    </div>
                                  ) : null;
                                })()}
                              </div>
                              <div className="flex items-center gap-2 shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                <Tooltip title="View / edit team norms for this role">
                                  <Button
                                    size="small"
                                    icon={<TeamOutlined />}
                                    onClick={() => setTeamHistoryExp(exp)}
                                    className="text-blue-600 border-blue-200 bg-blue-50 hover:!bg-blue-100 hover:!border-blue-300 hover:!text-blue-700"
                                  >
                                    Team Norms
                                  </Button>
                                </Tooltip>
                                  {/* Schedule Phases entry moved purely to internal Compensation Breakdown Modal */}
                                {getLinkedOffer(exp) ? (
                                  <Tooltip title="View / edit raise history for this role">
                                    <Button
                                      size="small"
                                      icon={<TrophyOutlined />}
                                      onClick={() => handleRaiseHistoryClick(exp)}
                                      className="text-amber-600 border-amber-200 bg-amber-50 hover:!bg-amber-100 hover:!border-amber-300 hover:!text-amber-700"
                                    >
                                      Raise History
                                    </Button>
                                  </Tooltip>
                                ) : (
                                  <Tooltip title="Open Edit to link an offer and track raises">
                                    <Button
                                      size="small"
                                      icon={<LinkOutlined />}
                                      onClick={() => openEditModal(exp)}
                                      className="text-gray-400 border-gray-200 hover:!text-blue-600 hover:!border-blue-300"
                                    >
                                      Link Offer
                                    </Button>
                                  </Tooltip>
                                )}
                                <div className={`transition-all duration-200 ${exp.is_locked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                  <RowActions
                                    isLocked={exp.is_locked}
                                    onToggleLock={() => handleToggleLock(exp)}
                                    onEdit={exp.is_locked ? undefined : () => openEditModal(exp)}
                                    onDelete={exp.is_locked ? undefined : () => exp.id && handleDelete(exp.id)}
                                    deleteTitle="Delete Role"
                                    deleteDescription="Are you sure you want to remove this role?"
                                    disableEdit={exp.is_locked}
                                    disableDelete={exp.is_locked}
                                  />
                                </div>
                              </div>
                            </div>

                            {exp.description && <div className="mt-4 text-[15px]">{renderDescription(exp.description)}</div>}
                            {skills.length > 0 && (
                              <div className="mt-4 flex flex-wrap gap-1.5">
                                {skills.map(skill => (
                                  <Tag key={skill} className="m-0 px-2.5 py-0.5 rounded-md bg-[rgb(248,250,255)] text-blue-600 border border-blue-100/60 font-medium text-sm hover:bg-blue-50 transition-colors">{skill}</Tag>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              };

              return (
                <div key={`group-${groupIdx}`} className="group flex flex-col md:flex-row gap-6 w-full">
                  <div className="flex-shrink-0 relative z-10 hidden md:flex flex-col items-center">
                    {groupAvatar}
                  </div>
                  <div className={`flex-grow min-w-0 bg-white/80 backdrop-blur-sm rounded-3xl border shadow-sm transition-all duration-300 relative overflow-hidden ${
                    primary.is_pinned
                      ? 'border-amber-200 ring-1 ring-amber-100 hover:border-amber-400 hover:shadow-amber-100/60 hover:shadow-lg'
                      : 'border-gray-100 hover:border-blue-100 hover:shadow-md'
                  }`}>
                    <div className={`absolute top-0 left-0 w-2 h-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                      primary.is_pinned
                        ? 'bg-gradient-to-b from-amber-300 to-orange-400'
                        : 'bg-gradient-to-b from-blue-300 to-indigo-400'
                    }`} />
                    {isMulti ? renderMultiRoles() : renderSingleRole(group[0])}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {raiseHistoryExp && getLinkedOffer(raiseHistoryExp) && (
        <RaiseHistoryModal
          open={!!raiseHistoryExp}
          onClose={() => setRaiseHistoryExp(null)}
          offer={getLinkedOffer(raiseHistoryExp)!}
          companyName={raiseHistoryExp.company}
          roleTitle={raiseHistoryExp.title}
          onSave={handleSaveRaiseHistory}
        />
      )}

      {teamHistoryExp && (
        <TeamHistoryModal
          open={!!teamHistoryExp}
          onClose={() => setTeamHistoryExp(null)}
          experienceName={`${teamHistoryExp.title} @ ${teamHistoryExp.company}`}
          entries={teamHistoryExp.team_history || []}
          onSave={handleSaveTeamHistory}
          isIntern={teamHistoryExp.employment_type === 'internship'}
          expStartDate={teamHistoryExp.start_date}
          expEndDate={teamHistoryExp.end_date}
          expIsCurrent={teamHistoryExp.is_current}
        />
      )}

      {schedulePhasesExp && (
        <SchedulePhasesModal
          open={!!schedulePhasesExp}
          onClose={() => setSchedulePhasesExp(null)}
          experienceName={`${schedulePhasesExp.title} @ ${schedulePhasesExp.company}`}
          phases={schedulePhasesExp.schedule_phases || []}
          onSave={handleSaveSchedulePhases}
          expStartDate={schedulePhasesExp.start_date}
          expEndDate={schedulePhasesExp.end_date}
          expIsCurrent={schedulePhasesExp.is_current}
          expHourlyRate={schedulePhasesExp.hourly_rate}
          expHoursPerDay={schedulePhasesExp.hours_per_day}
          expWorkingDaysPerWeek={schedulePhasesExp.working_days_per_week}
          expOvertimeRate={schedulePhasesExp.overtime_rate}
          expOvertimeMultiplier={schedulePhasesExp.overtime_multiplier}
        />
      )}

      {compBreakdownExp && compBreakdownSnapshot && (
        <CompensationBreakdownModal
          open={!!compBreakdownExp}
          onClose={() => setCompBreakdownExp(null)}
          companyName={compBreakdownExp.company}
          roleTitle={compBreakdownExp.title}
          onEdit={compBreakdownExp.employment_type === 'internship' || compBreakdownExp.is_locked ? undefined : handleEditFromCompBreakdown}
          editLabel="Edit role"
          hourlyStartDate={compBreakdownExp.start_date}
          hourlyEndDate={compBreakdownExp.end_date}
          hourlyIsCurrent={compBreakdownExp.is_current}
          onSaveHourlyInputs={compBreakdownExp.employment_type === 'internship' && !compBreakdownExp.is_locked ? handleSaveInternshipCompInputs : undefined}
          openSchedulePhases={() => { setSchedulePhasesExp(compBreakdownExp); }}
          {...compBreakdownSnapshot}
        />
      )}

      {overallCompBreakdownOpen && fullTimeCompSummary.trackedRoleCount > 0 && (
        <CompensationBreakdownModal
          open={overallCompBreakdownOpen}
          onClose={() => setOverallCompBreakdownOpen(false)}
          titleText="Overall Full-Time Pay Breakdown"
          contextLabel={`Across ${fullTimeCompSummary.trackedRoleCount} full-time role${fullTimeCompSummary.trackedRoleCount !== 1 ? 's' : ''}`}
          totalLabel="Combined Annual Earnings"
          totalHint="Sum of base salary, bonus, and equity across your tracked full-time roles."
          kind="salary"
          total={fullTimeCompSummary.total}
          base={fullTimeCompSummary.base}
          bonus={fullTimeCompSummary.bonus}
          equity={fullTimeCompSummary.equity}
        />
      )}

      {overallInternshipBreakdownOpen && internshipCompSummary.trackedRoleCount > 0 && (() => {
        const aggHours = internshipCompSnapshots.reduce((sum, s) => sum + s.estimatedHours, 0);
        const aggOTHours = internshipCompSnapshots.reduce((sum, s) => sum + s.overtimeHours, 0);
        return (
          <CompensationBreakdownModal
            open={overallInternshipBreakdownOpen}
            onClose={() => setOverallInternshipBreakdownOpen(false)}
            titleText="Overall Internship Earnings Breakdown"
            contextLabel={`Across ${internshipCompSummary.trackedRoleCount} internship role${internshipCompSummary.trackedRoleCount !== 1 ? 's' : ''}`}
            totalLabel="Combined Internship Earnings"
            totalHint="Sum of all tracked internship earnings across roles."
            kind="hourly"
            total={internshipCompSummary.total}
            regularPay={internshipCompSummary.regularPay}
            overtimePay={internshipCompSummary.overtimePay}
            estimatedHours={aggHours}
            hourlyRate={aggHours > 0 ? internshipCompSummary.total / aggHours : 0}
            hoursPerDay={8}
            workingDaysPerWeek={5}
            totalHoursWorked={null}
            overtimeHours={aggOTHours}
            overtimeRate={null}
            overtimeMultiplier={1.5}
            effectiveOvertimeRate={0}
            autoCalculatedHours={aggHours}
            weekdaysWorked={0}
            calculationMode="manual_hours"
            dateRangeLabel={`${internshipCompSnapshots.length} roles combined`}
            totalEarningsOverride={null}
            isMultiPhase={false}
            hourlyDisplayMode="aggregate"
          />
        );
      })()}

      <ExperienceModal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onSave={handleCreateOrUpdate}
        experience={editingExp}
        experiences={experiences}
        employmentTypes={empTypes}
        offers={offerSelectOptions}
      />

      <JDMatcherModal 
        open={jdModalOpen}
        onCancel={() => setJdModalOpen(false)}
      />

      <Modal
        title="Import Experiences"
        open={isImportModalOpen}
        onCancel={() => setIsImportModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Dragger {...importProps}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">Click or drag an export file here to import everything back</p>
          <p className="ant-upload-hint">
            Supports JSON, CSV, and XLSX. JSON is best for the most complete round-trip, including logos, linked offer snapshots, team history, and schedule phases.
          </p>
        </Dragger>
      </Modal>
    </div>
  );
};

export default ExperiencePage;

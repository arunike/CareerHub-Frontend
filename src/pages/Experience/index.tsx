import React, { useEffect, useState, useMemo } from 'react';
import { Button, Typography, Spin, message, Popconfirm, Avatar, Tooltip, Tag, Card, Row, Col } from 'antd';
import { PlusOutlined, DeleteOutlined, EnvironmentOutlined, CalendarOutlined, BankOutlined, ClockCircleOutlined, CodeOutlined, RobotOutlined, RiseOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getExperiences, createExperience, updateExperience, deleteExperience, deleteAllExperiences, uploadExperienceLogo, removeExperienceLogo } from '../../api/career';
import RowActions from '../../components/RowActions';
import type { Experience } from '../../types';
import ExperienceModal from './ExperienceModal';
import JDMatcherModal from './JDMatcherModal';
import PageActionToolbar from '../../components/PageActionToolbar';

const { Title, Text } = Typography;

// DRF returns absolute URLs (http://127.0.0.1:8000/media/...) — strip host so
// the request goes through the Vite /media proxy instead of directly to Django.
const toRelativeMediaUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  try {
    return new URL(url).pathname; // → /media/experience_logos/file.jpg
  } catch {
    return url; // already relative
  }
};

const EMPLOYMENT_LABELS: Record<string, { label: string; color: string }> = {
  full_time:   { label: 'Full-time',   color: 'bg-blue-50 text-blue-700 border-blue-200' },
  internship:  { label: 'Internship',  color: 'bg-amber-50 text-amber-700 border-amber-200' },
  contract:    { label: 'Contract',    color: 'bg-purple-50 text-purple-700 border-purple-200' },
  part_time:   { label: 'Part-time',   color: 'bg-teal-50 text-teal-700 border-teal-200' },
  freelance:   { label: 'Freelance',   color: 'bg-orange-50 text-orange-700 border-orange-200' },
};

const EmploymentBadge: React.FC<{ type?: string }> = ({ type }) => {
  if (!type || type === 'full_time') return null;
  const meta = EMPLOYMENT_LABELS[type];
  if (!meta) return null;
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.color}`}>
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

  useEffect(() => {
    fetchExperiences();
  }, []);

  const fetchExperiences = async () => {
    try {
      setLoading(true);
      const res = await getExperiences();
      
      const sorted = res.data.sort((a, b) => {
        const dateA = a.start_date ? new Date(a.start_date).getTime() : 0;
        const dateB = b.start_date ? new Date(b.start_date).getTime() : 0;
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
      fetchExperiences();
    } catch (err) {
      message.error('Failed to update lock status');
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

  const formatDuration = (exp: Experience) => {
    const start = exp.start_date ? dayjs(exp.start_date) : null;
    let end = exp.is_current ? dayjs() : (exp.end_date ? dayjs(exp.end_date) : null);
    
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

  const calculateTotalCareerDuration = () => {
    if (experiences.length === 0) return '0 yrs';
    let totalDays = 0;
    for (const exp of experiences) {
      const start = exp.start_date ? dayjs(exp.start_date) : null;
      const end = exp.is_current ? dayjs() : (exp.end_date ? dayjs(exp.end_date) : null);
      if (start && end) totalDays += end.diff(start, 'day');
    }
    return fmtDays(totalDays, true);
  };

  const totalCompanies = new Set(experiences.map(e => e.company)).size;

  const durationByType = useMemo(() => {
    const result: Record<string, number> = {};
    for (const exp of experiences) {
      const type = exp.employment_type || 'full_time';
      const start = exp.start_date ? dayjs(exp.start_date) : null;
      const end = exp.is_current ? dayjs() : (exp.end_date ? dayjs(exp.end_date) : null);
      if (!start || !end) continue;
      result[type] = (result[type] || 0) + end.diff(start, 'day');
    }
    return result;
  }, [experiences]);

  const companiesByType = useMemo(() => {
    const seen = new Map<string, string>(); // company key → first-seen type
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

  const TYPE_DISPLAY: Record<string, { label: string; dot: string }> = {
    full_time:  { label: 'Full-time',  dot: 'bg-blue-400' },
    internship: { label: 'Internship', dot: 'bg-amber-400' },
    contract:   { label: 'Contract',   dot: 'bg-purple-400' },
    part_time:  { label: 'Part-time',  dot: 'bg-teal-400' },
    freelance:  { label: 'Freelance',  dot: 'bg-orange-400' },
  };

  const formatRoleDateRange = (exp: Experience, overrideEndDate?: string | null): string => {
    const start = exp.start_date ? dayjs(exp.start_date) : null;
    const end = overrideEndDate
      ? dayjs(overrideEndDate)
      : exp.is_current ? dayjs() : (exp.end_date ? dayjs(exp.end_date) : null);
    const startStr = start ? start.format('MMM YYYY') : '—';
    const endStr = overrideEndDate
      ? dayjs(overrideEndDate).format('MMM YYYY')
      : exp.is_current ? 'Present' : (end ? end.format('MMM YYYY') : '—');
    const dur = start && end ? ` · ${fmtDays(end.diff(start, 'day'), true)}` : '';
    return `${startStr} – ${endStr}${dur}`;
  };

  const getGroupTenure = (group: Experience[]): string => {
    const oldest = group[group.length - 1];
    const newest = group[0];
    const start = oldest.start_date ? dayjs(oldest.start_date) : null;
    const end = newest.is_current ? dayjs() : (newest.end_date ? dayjs(newest.end_date) : null);
    if (!start || !end) return '';
    return fmtDays(end.diff(start, 'day'), true);
  };

  const allSkills = experiences.flatMap(e => e.skills || []);
  const skillCounts = allSkills.reduce((acc, skill) => {
    acc[skill] = (acc[skill] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topSkills = Object.entries(skillCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(entry => entry[0]);
    
  const uniqueUserSkills = Object.keys(skillCounts);

  const filteredExperiences = selectedSkill
    ? experiences.filter(exp => exp.skills?.includes(selectedSkill))
    : experiences;

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

    return groups;
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
          onPrimaryAction={openAddModal}
          primaryActionLabel="Add Experience"
          primaryActionIcon={<PlusOutlined />}
        />
      </div>

      {/* Analytics Dashboard */}
      {experiences.length > 0 && (
        <Card style={{ marginBottom: 48 }} className="rounded-2xl border-gray-100 shadow-sm" bodyStyle={{ padding: '20px 24px' }}>
          <Row gutter={[24, 24]} align="middle">
            <Col xs={24} md={8}>
              <div className="flex items-start gap-4 border-r border-gray-100 pr-4">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 shrink-0 mt-0.5">
                  <ClockCircleOutlined className="text-xl" />
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Total Experience</div>
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className="text-xl font-semibold text-gray-900">{calculateTotalCareerDuration()}</span>
                    {Object.entries(durationByType)
                      .sort((a, b) => b[1] - a[1])
                      .map(([type, months]) => (
                        <span key={type} className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${TYPE_DISPLAY[type]?.dot ?? 'bg-gray-400'}`} />
                          <span className="font-medium text-gray-700">{fmtMonths(months, true)}</span>
                          <span>{TYPE_DISPLAY[type]?.label ?? type}</span>
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            </Col>
            <Col xs={24} md={6}>
              <div className="flex items-start gap-4 md:border-r border-gray-100 pr-4">
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0 mt-0.5">
                  <BankOutlined className="text-xl" />
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Companies</div>
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className="text-xl font-semibold text-gray-900">{totalCompanies}</span>
                    {Object.entries(companiesByType)
                      .sort((a, b) => b[1] - a[1])
                      .map(([type, count]) => (
                        <span key={type} className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${TYPE_DISPLAY[type]?.dot ?? 'bg-gray-400'}`} />
                          <span className="font-medium text-gray-700">{count}</span>
                          <span>{TYPE_DISPLAY[type]?.label ?? type}</span>
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            </Col>
            <Col xs={24} md={10}>
              <div className="pl-2">
                <div className="text-xs text-gray-400 mb-2 uppercase font-semibold letter-spacing-1 flex items-center gap-1">
                  <CodeOutlined /> Top Skills
                  {selectedSkill && (
                    <span 
                      className="ml-2 text-blue-500 cursor-pointer hover:underline lowercase normal-case" 
                      onClick={() => setSelectedSkill(null)}
                    >
                      (Clear filter)
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {topSkills.map(skill => {
                    const isSelected = selectedSkill === skill;
                    return (
                      <Tag.CheckableTag
                        key={skill}
                        checked={isSelected}
                        onChange={(checked) => setSelectedSkill(checked ? skill : null)}
                        className={`m-0 px-3 py-1 rounded-md border transition-all ${
                          isSelected 
                            ? 'bg-blue-600 text-white border-blue-600' 
                            : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-500'
                        }`}
                      >
                        {skill} <span className="opacity-50 text-xs ml-1">{skillCounts[skill]}</span>
                      </Tag.CheckableTag>
                    );
                  })}
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
                          <EmploymentBadge type={exp.employment_type} />
                        </div>
                        <div className="hidden md:block text-lg font-semibold text-gray-800 mb-3 tracking-tight">{exp.company}</div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500 font-medium bg-gray-50 inline-flex px-3 py-1.5 rounded-lg border border-gray-100">
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
                        </div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 shrink-0">
                        <RowActions
                          isLocked={exp.is_locked}
                          onToggleLock={() => handleToggleLock(exp)}
                          onEdit={exp.is_locked ? undefined : () => openEditModal(exp)}
                          onDelete={exp.is_locked ? undefined : () => exp.id && handleDelete(exp.id)}
                          deleteTitle="Delete Experience"
                          deleteDescription="Are you sure you want to remove this role?"
                          disableEdit={exp.is_locked}
                          disableDelete={exp.is_locked}
                        />
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
                            <span className="text-sm text-gray-500">{group.length} roles</span>
                            {tenure && (
                              <>
                                <span className="text-gray-300">·</span>
                                <span className="text-sm font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">{tenure} total</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Group-level delete */}
                      <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 shrink-0">
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

                    {/* Roles — left-border timeline with dots */}
                    <div className="relative pl-6" style={{ borderLeft: '2px solid #e5e7eb' }}>
                      {group.map((exp, roleIdx) => {
                        const skills = exp.skills || [];
                        return (
                          <div key={exp.id} className={`relative ${roleIdx < group.length - 1 ? 'mb-8' : ''}`}>
                            {/* Timeline dot */}
                            <div className="absolute -left-[29px] top-[5px] w-4 h-4 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-gray-400" />
                            </div>

                            <div className="flex justify-between items-start">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-[15px] text-gray-900 leading-snug">{exp.title}</span>
                                  {exp.is_promotion && (
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 whitespace-nowrap">
                                      <RiseOutlined style={{ fontSize: 9 }} /> Promoted
                                    </span>
                                  )}
                                  <EmploymentBadge type={exp.employment_type} />
                                </div>
                                <div className="flex flex-wrap items-center gap-x-3 mt-1 text-sm text-gray-500">
                                  <span className="flex items-center gap-1.5">
                                    <CalendarOutlined style={{ fontSize: 11, color: '#9ca3af' }} />
                                    {/* Older roles auto-derive end date from the next role's start date */}
                                    {formatRoleDateRange(exp, roleIdx > 0 ? group[roleIdx - 1].start_date : null)}
                                  </span>
                                  {exp.location && (
                                    <span className="flex items-center gap-1.5">
                                      <EnvironmentOutlined style={{ fontSize: 11, color: '#9ca3af' }} />
                                      {exp.location}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 shrink-0 ml-2">
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

                            {exp.description && <div className="mt-4 text-[14px]">{renderDescription(exp.description)}</div>}
                            {skills.length > 0 && (
                              <div className="mt-4 flex flex-wrap gap-1.5">
                                {skills.map(skill => (
                                  <Tag key={skill} className="m-0 px-2.5 py-0.5 rounded-md bg-[rgb(248,250,255)] text-blue-600 border border-blue-100/60 font-medium text-xs hover:bg-blue-50 transition-colors">{skill}</Tag>
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
                  <div className="flex-grow min-w-0 bg-white/80 backdrop-blur-sm rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group-hover:border-blue-100">
                    <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-blue-300 to-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    {isMulti ? renderMultiRoles() : renderSingleRole(group[0])}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ExperienceModal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onSave={handleCreateOrUpdate}
        experience={editingExp}
        experiences={experiences}
      />

      <JDMatcherModal 
        open={jdModalOpen}
        onCancel={() => setJdModalOpen(false)}
      />
    </div>
  );
};

export default ExperiencePage;

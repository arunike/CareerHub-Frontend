import React, { useEffect, useState } from 'react';
import { Button, Typography, Spin, message, Empty, Popconfirm, Avatar, Tooltip, Tag, Card, Row, Col, Statistic, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EnvironmentOutlined, CalendarOutlined, BankOutlined, FireFilled, ClockCircleOutlined, CodeOutlined, RobotOutlined, RocketOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getExperiences, createExperience, updateExperience, deleteExperience } from '../../api/career';
import type { Experience } from '../../types';
import ExperienceModal from './ExperienceModal';
import JDMatcherModal from './JDMatcherModal';
import PageActionToolbar from '../../components/PageActionToolbar';

const { Title, Text } = Typography;

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
      // sort by start_date descending
      const sorted = res.data.sort((a, b) => {
        const dateA = a.start_date ? new Date(a.start_date).getTime() : 0;
        const dateB = b.start_date ? new Date(b.start_date).getTime() : 0;
        return dateB - dateA;
      });
      setExperiences(sorted);
    } catch (err: any) {
      message.error('Failed to load experiences');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdate = async (data: Partial<Experience>) => {
    try {
      if (editingExp && editingExp.id) {
        await updateExperience(editingExp.id, data);
        message.success('Experience updated successfully');
      } else {
        await createExperience(data);
        message.success('Experience added successfully');
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
    } catch (err) {
      message.error('Failed to delete experience');
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
    
    const sortedStarts = [...experiences].sort((a, b) => dayjs(a.start_date).diff(dayjs(b.start_date)));
    const earliestStart = dayjs(sortedStarts[0].start_date);
    
    const latestEnd = experiences.some(e => !e.end_date) 
      ? dayjs() 
      : dayjs(Math.max(...experiences.map(e => dayjs(e.end_date).valueOf())));
      
    const totalMonths = latestEnd.diff(earliestStart, 'month');
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    
    if (years === 0) return `${months} mos`;
    return `${years} yrs ${months} mos`;
  };

  const totalCompanies = new Set(experiences.map(e => e.company)).size;

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
              <div className="flex items-center gap-4 border-r border-gray-100 pr-4">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                  <ClockCircleOutlined className="text-xl" />
                </div>
                <Statistic title="Total Experience" value={calculateTotalCareerDuration()} valueStyle={{ fontWeight: 600, fontSize: '20px' }} />
              </div>
            </Col>
            <Col xs={24} md={6}>
              <div className="flex items-center gap-4 md:border-r border-gray-100 pr-4">
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0">
                  <BankOutlined className="text-xl" />
                </div>
                <Statistic title="Companies" value={totalCompanies} valueStyle={{ fontWeight: 600, fontSize: '20px' }} />
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
            {filteredExperiences.map((exp, idx) => {
              const skills = exp.skills || [];
              
              return (
                <div key={exp.id} className="group flex flex-col md:flex-row gap-6 w-full">
                  
                  {/* Timeline Avatar column */}
                  <div className="flex-shrink-0 relative z-10 hidden md:flex flex-col items-center">
                    <Avatar 
                      size={52} 
                      style={getAvatarStyle(exp.company)}
                      className="font-bold text-xl shadow-md border-4 border-white ring-1 ring-gray-100 z-10"
                    >
                      {exp.company?.charAt(0)?.toUpperCase() || <BankOutlined />}
                    </Avatar>
                  </div>
                  
                  {/* Content Card */}
                  <div className="flex-grow min-w-0 bg-white/80 backdrop-blur-sm p-7 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group-hover:border-blue-100">
                    <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-blue-300 to-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    <div className="flex justify-between items-start mb-5">
                      <div>
                        {/* Mobile Avatar (shows only on small screens) */}
                        <div className="flex md:hidden items-center gap-3 mb-3">
                          <Avatar 
                            size={40} 
                            style={getAvatarStyle(exp.company)}
                            className="font-bold shadow-sm"
                          >
                            {exp.company?.charAt(0)?.toUpperCase() || <BankOutlined />}
                          </Avatar>
                          <div className="text-lg font-bold text-gray-800 tracking-tight">{exp.company}</div>
                        </div>

                        <Title level={3} className="!mb-1 text-gray-900 group-hover:text-blue-600 transition-colors font-bold tracking-tight">
                          {exp.title}
                        </Title>
                        <div className="hidden md:block text-lg font-semibold text-gray-800 mb-3 tracking-tight">
                          {exp.company}
                        </div>
                        
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
                      
                      {/* Actions */}
                      <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 flex gap-1 shrink-0 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm absolute right-4 top-4">
                        <Tooltip title="Edit Role">
                          <Button type="text" icon={<EditOutlined />} size="small" className="text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg" onClick={() => openEditModal(exp)} />
                        </Tooltip>
                        <Popconfirm
                          title="Delete Experience"
                          description="Are you sure you want to remove this role?"
                          onConfirm={() => exp.id && handleDelete(exp.id)}
                          okText="Yes"
                          cancelText="No"
                          okButtonProps={{ danger: true, className: "rounded-lg" }}
                          cancelButtonProps={{ className: "rounded-lg" }}
                        >
                          <Tooltip title="Delete">
                            <Button type="text" danger icon={<DeleteOutlined />} size="small" className="rounded-lg hover:bg-red-50" />
                          </Tooltip>
                        </Popconfirm>
                      </div>
                    </div>
                    
                    {/* Description */}
                    {exp.description && (
                      <div className="mt-6 text-[15px]">
                        {renderDescription(exp.description)}
                      </div>
                    )}

                    {/* Auto-extracted Skills */}
                    {skills.length > 0 && (
                      <div className="mt-6 pt-5 border-t border-gray-100 flex flex-wrap gap-2">
                        {skills.map(skill => (
                          <Tag 
                            key={skill} 
                            className="m-0 px-3 py-1 rounded-md bg-[rgb(248,250,255)] text-blue-600 border border-blue-100/60 font-medium hover:bg-blue-50 transition-colors"
                          >
                            {skill}
                          </Tag>
                        ))}
                      </div>
                    )}
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
      />

      <JDMatcherModal 
        open={jdModalOpen}
        onCancel={() => setJdModalOpen(false)}
      />
    </div>
  );
};

export default ExperiencePage;

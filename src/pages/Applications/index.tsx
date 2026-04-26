import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Table,
  Button,
  Input,
  AutoComplete,
  Select,
  Modal,
  Form,
  Space,
  Upload,
  message,
  Typography,
  Row,
  Col,
  DatePicker,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  DollarOutlined,
  GlobalOutlined,
  InboxOutlined,
  LockOutlined,
  UnlockOutlined,
  DeleteOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { UploadProps } from 'antd';
import type { Dayjs } from 'dayjs';
import { usaCities } from 'typed-usa-states';
import {
  getApplications,
  createApplication,
  updateApplication,
  deleteApplication,
  importApplications,
  deleteAllApplications,
  exportApplications,
  getDocuments,
  patchDocument,
} from '../../api';
import { getUserSettings } from '../../api/availability';
import type { Document, EmploymentType } from '../../types';
import type { CareerApplication } from '../../types/application';
import PageActionToolbar from '../../components/PageActionToolbar';
import BulkActionHeader from '../../components/BulkActionHeader';
import RowActions from '../../components/RowActions';
import CoverLetterModal from './CoverLetterModal';
import ApplicationTimelineModal from './ApplicationTimelineModal';
import { getAvailableYears, filterByYear, getCurrentYear } from '../../utils/yearFilter';
import { usePersistedState } from '../../hooks/usePersistedState';
import { DEFAULT_STATE_NAME_TO_ABBR } from '../OfferComparison/calculations';

const { Text, Link } = Typography;
const { Option } = Select;
const { Dragger } = Upload;

type ApplicationFormValues = {
  company?: string;
  role_title?: string;
  status?: string;
  employment_type?: string;
  site_link?: string;
  salary_range?: string;
  office_location?: string;
  visa_sponsorship?: string;
  day_one_gc?: string;
  growth_score?: number;
  work_life_score?: number;
  brand_score?: number;
  team_score?: number;
  current_round?: number;
  date_applied?: Dayjs | null;
  notes?: string;
  linked_document_ids?: number[];
};

const Applications = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();

  // Data State
  const [applications, setApplications] = useState<CareerApplication[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [empTypes, setEmpTypes] = useState<EmploymentType[]>([
    { value: 'full_time', label: 'Full-time', color: 'blue' },
    { value: 'part_time', label: 'Part-time', color: 'teal' },
    { value: 'internship', label: 'Internship', color: 'amber' },
    { value: 'contract', label: 'Contract', color: 'purple' },
    { value: 'freelance', label: 'Freelance', color: 'orange' },
  ]);
  const [appStages, setAppStages] = useState<any[]>([
    { key: 'APPLIED', label: 'Applied', shortLabel: 'Apply', tone: 'bg-blue-500' },
    { key: 'OA', label: 'Online Assessment', shortLabel: 'OA', tone: 'bg-violet-500' },
    { key: 'SCREEN', label: 'Phone Screen', shortLabel: 'Phone', tone: 'bg-sky-500' },
    { key: 'ROUND_1', label: '1st Round', shortLabel: 'R1', tone: 'bg-amber-400' },
    { key: 'ROUND_2', label: '2nd Round', shortLabel: 'R2', tone: 'bg-amber-500' },
    { key: 'ROUND_3', label: '3rd Round', shortLabel: 'R3', tone: 'bg-orange-500' },
    { key: 'ROUND_4', label: '4th Round', shortLabel: 'R4', tone: 'bg-orange-600' },
    { key: 'ONSITE', label: 'Onsite Interview', shortLabel: 'Onsite', tone: 'bg-red-500' },
    { key: 'OFFER', label: 'Offer', shortLabel: 'Offer', tone: 'bg-emerald-500' },
    { key: 'REJECTED', label: 'Rejected', shortLabel: 'Reject', tone: 'bg-rose-500' },
    { key: 'GHOSTED', label: 'Ghosted', shortLabel: 'Ghost', tone: 'bg-slate-400' },
  ]);

  // View State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [coverLetterApp, setCoverLetterApp] = useState<CareerApplication | null>(null);
  const [timelineApp, setTimelineApp] = useState<CareerApplication | null>(null);

  // Bulk Selection State
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // Filter State
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [empTypeFilter, setEmpTypeFilter] = useState('ALL');
  const [selectedYear, setSelectedYear] = usePersistedState<number | 'all'>(
    'applicationsSelectedYear',
    getCurrentYear(),
    {
      serialize: (value) => value.toString(),
      deserialize: (raw) => (raw === 'all' ? 'all' : parseInt(raw)),
    }
  );
  const officeLocationValue = Form.useWatch('office_location', form) || '';
  const allUsCityOptions = useMemo(
    () =>
      Array.from(
        new Set(
          usaCities.map((city) => {
            const abbr = DEFAULT_STATE_NAME_TO_ABBR[city.state] || city.state;
            return `${city.name}, ${abbr}, United States`;
          })
        )
      ),
    []
  );
  const officeLocationOptions = useMemo(() => {
    const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9,\s]/g, '');
    const query = normalize(officeLocationValue).trim();
    const queryTokens = query.split(/\s+/).filter(Boolean);

    const scored = allUsCityOptions
      .map((raw) => {
        const candidate = normalize(raw);
        let score = 0;

        if (query.length === 0) score += 1;
        if (candidate.startsWith(query) && query.length > 0) score += 10;
        if (candidate.includes(query) && query.length > 0) score += 6;
        if (queryTokens.length && queryTokens.every((token) => candidate.includes(token))) score += 4;
        if (candidate === query && query.length > 0) score += 12;

        return { value: raw, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.value.localeCompare(b.value))
      .slice(0, 80)
      .map((item) => ({ value: item.value, label: item.value }));

    const officeQuery = officeLocationValue.trim().toLowerCase();
    if (
      officeLocationValue.trim() &&
      !scored.some((item) => item.value.toLowerCase() === officeQuery)
    ) {
      scored.unshift({ value: officeLocationValue, label: officeLocationValue });
    }

    return scored;
  }, [allUsCityOptions, officeLocationValue]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [appsResp, docsResp] = await Promise.all([getApplications(), getDocuments()]);
      setApplications(appsResp.data);
      setDocuments(docsResp.data);
    } catch (error) {
      messageApi.error('Failed to load applications');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [messageApi]);

  useEffect(() => {
    fetchData();
    getUserSettings().then(res => {
      const types = res.data.employment_types;
      if (types && types.length > 0) setEmpTypes(types);
      const stages = res.data.application_stages;
      if (stages && stages.length > 0) setAppStages(stages);
    }).catch(() => {});
  }, [fetchData]);

  const handleExportWrapper = async (format: string) => {
    const response = await exportApplications(format);
    return {
      data: response.data,
      headers: response.headers as unknown as Record<string, string>,
    };
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteApplication(id);
      messageApi.success('Application deleted');
      fetchData();
    } catch (error) {
      messageApi.error('Failed to delete application');
      console.error(error);
    }
  };

  const handleDeleteAll = async () => {
    try {
      await deleteAllApplications();
      messageApi.success('All applications deleted');
      fetchData();
    } catch (error) {
      messageApi.error('Failed to delete all applications');
      console.error(error);
    }
  };

  const toggleLock = async (app: CareerApplication) => {
    try {
      await updateApplication(app.id, { is_locked: !app.is_locked });
      messageApi.success(app.is_locked ? 'Application unlocked' : 'Application locked');
      setApplications(prev => prev.map(a => a.id === app.id ? { ...a, is_locked: !app.is_locked } : a));
    } catch (error) {
      messageApi.error('Failed to toggle lock');
      console.error(error);
    }
  };

  const handleBulkDelete = () => {
    Modal.confirm({
      title: 'Delete Selected Applications',
      content: `Are you sure you want to delete ${selectedRowKeys.length} applications?`,
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      onOk: async () => {
        try {
          await Promise.all(selectedRowKeys.map(id => deleteApplication(id as number)));
          messageApi.success(`${selectedRowKeys.length} applications deleted`);
          setSelectedRowKeys([]);
          fetchData();
        } catch {
          messageApi.error('Failed to delete some applications');
          fetchData();
        }
      },
    });
  };

  const handleBulkToggleLock = async (lock: boolean) => {
    try {
      await Promise.all(selectedRowKeys.map(id => updateApplication(id as number, { is_locked: lock })));
      messageApi.success(`${selectedRowKeys.length} applications ${lock ? 'locked' : 'unlocked'}`);
      setSelectedRowKeys([]);
      fetchData();
    } catch {
      messageApi.error(`Failed to ${lock ? 'lock' : 'unlock'} some applications`);
      fetchData();
    }
  };

  const isAnySelectedLocked = selectedRowKeys.some((id) => {
    const app = applications.find((a) => a.id === id);
    return app?.is_locked;
  });

  const handleAddEdit = async (values: ApplicationFormValues) => {
    try {
      const selectedDocumentIds: number[] = values.linked_document_ids || [];
      const payload: Record<string, unknown> = {
        ...values,
        company_name: values.company, // API expects company_name
        job_link: values.site_link,
        date_applied: values.date_applied ? values.date_applied.format('YYYY-MM-DD') : undefined,
      };
      ['growth_score', 'work_life_score', 'brand_score', 'team_score'].forEach((field) => {
        if (payload[field] === undefined) payload[field] = null;
      });
      payload.visa_sponsorship = values.visa_sponsorship && values.visa_sponsorship !== 'UNKNOWN'
        ? values.visa_sponsorship
        : '';
      payload.day_one_gc = values.day_one_gc && values.day_one_gc !== 'UNKNOWN' ? values.day_one_gc : '';
      delete payload.company;
      delete payload.site_link;
      delete payload.linked_document_ids;

      if (editingId) {
        await updateApplication(editingId, payload);

        const currentlyLinkedDocIds = documents
          .filter((doc) => doc.application === editingId)
          .map((doc) => doc.id);

        const docsToLink = selectedDocumentIds.filter((id) => !currentlyLinkedDocIds.includes(id));
        const docsToUnlink = currentlyLinkedDocIds.filter((id) => !selectedDocumentIds.includes(id));

        await Promise.all([
          ...docsToLink.map((docId) => patchDocument(docId, { application: editingId })),
          ...docsToUnlink.map((docId) => patchDocument(docId, { application: null })),
        ]);
        messageApi.success('Application updated');
      } else {
        const response = await createApplication(payload);
        const applicationId = response.data.id;

        if (selectedDocumentIds.length > 0) {
          await Promise.all(
            selectedDocumentIds.map((docId) => patchDocument(docId, { application: applicationId }))
          );
        }
        messageApi.success('Application created');
      }
      setIsAddModalOpen(false);
      form.resetFields();
      setEditingId(null);
      fetchData();
    } catch (error) {
      messageApi.error('Failed to save application');
      console.error(error);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({
      status: 'APPLIED',
      employment_type: 'full_time',
      date_applied: dayjs(),
      rto_policy: 'UNKNOWN',
      visa_sponsorship: undefined,
      day_one_gc: undefined,
      current_round: 0,
      linked_document_ids: [],
    });
    setIsAddModalOpen(true);
  };

  const openEditModal = (app: CareerApplication) => {
    setEditingId(app.id);
    form.setFieldsValue({
      company: app.company_details?.name,
      role_title: app.role_title,
      status: app.status,
      employment_type: app.employment_type || 'full_time',
      site_link: app.job_link,
      salary_range: app.salary_range,
      office_location: app.office_location || app.location,
      rto_policy: app.rto_policy || 'UNKNOWN',
      visa_sponsorship: app.visa_sponsorship && app.visa_sponsorship !== 'UNKNOWN' ? app.visa_sponsorship : undefined,
      day_one_gc: app.day_one_gc && app.day_one_gc !== 'UNKNOWN' ? app.day_one_gc : undefined,
      growth_score: app.growth_score ?? null,
      work_life_score: app.work_life_score ?? null,
      brand_score: app.brand_score ?? null,
      team_score: app.team_score ?? null,
      current_round: app.current_round || 0,
      date_applied: app.date_applied ? dayjs(app.date_applied) : null,
      notes: app.notes,
      linked_document_ids: documents
        .filter((doc) => doc.application === app.id)
        .map((doc) => doc.id),
    });
    setIsAddModalOpen(true);
  };

  const importProps: UploadProps = {
    name: 'file',
    multiple: false,
    beforeUpload: (file) => {
      const formData = new FormData();
      formData.append('file', file);
      importApplications(formData)
        .then(() => {
          messageApi.success('Import successful');
          setIsImportModalOpen(false);
          fetchData();
        })
        .catch(() => {
          messageApi.error('Import failed');
        });
      return false; // Prevent default upload
    },
  };

  const filteredData = filterByYear(applications, selectedYear, 'date_applied').filter((app) => {
    const matchesSearch =
      (app.company_details?.name || '').toLowerCase().includes(searchText.toLowerCase()) ||
      (app.role_title || '').toLowerCase().includes(searchText.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || app.status === statusFilter;
    const matchesEmpType = empTypeFilter === 'ALL' || app.employment_type === empTypeFilter;
    return matchesSearch && matchesStatus && matchesEmpType;
  });

  // Get available years and handle year change
  const availableYears = getAvailableYears(applications, 'date_applied');
  const handleYearChange = (year: number | 'all') => {
    setSelectedYear(year);
  };

  const APP_STAGE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
    blue:   { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    violet: { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
    sky:    { bg: '#f0f9ff', color: '#0369a1', border: '#bae6fd' },
    amber:  { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
    emerald:{ bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
    rose:   { bg: '#fff1f2', color: '#be123c', border: '#fecdd3' },
    green:  { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
    slate:  { bg: '#f8fafc', color: '#334155', border: '#e2e8f0' },
    gray:   { bg: '#f9fafb', color: '#374151', border: '#e5e7eb' },
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const stage = appStages.find(s => s.key === status);
    let c = APP_STAGE_COLORS.gray;
    if (stage) {
      const colorMatch = stage.tone.match(/bg-([a-z]+)-\d+/);
      if (colorMatch && APP_STAGE_COLORS[colorMatch[1]]) {
        c = APP_STAGE_COLORS[colorMatch[1]];
      }
    }
    const label = stage ? stage.label : status;
    return (
      <span
        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border"
        style={{ color: c.color, background: c.bg, borderColor: c.border }}
      >
        {label}
      </span>
    );
  };

  const EMP_TYPE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
    blue:   { bg: '#eff6ff', color: '#3b82f6', border: '#bfdbfe' },
    teal:   { bg: '#f0fdfa', color: '#14b8a6', border: '#99f6e4' },
    amber:  { bg: '#fffbeb', color: '#f59e0b', border: '#fde68a' },
    purple: { bg: '#f5f3ff', color: '#8b5cf6', border: '#ddd6fe' },
    orange: { bg: '#fff7ed', color: '#f97316', border: '#fed7aa' },
    green:  { bg: '#f0fdf4', color: '#22c55e', border: '#bbf7d0' },
    gray:   { bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb' },
  };

  const EmploymentTypeBadge = ({ type }: { type?: string | null }) => {
    if (!type || type === 'full_time') return null;
    const meta = empTypes.find(t => t.value === type);
    if (!meta) return null;
    const c = EMP_TYPE_COLORS[meta.color] ?? EMP_TYPE_COLORS.gray;
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
        style={{ color: c.color, background: c.bg, borderColor: c.border }}
      >
        {meta.label}
      </span>
    );
  };

  const columns = [
    {
      title: 'Company',
      key: 'company',
      render: (_: unknown, record: CareerApplication) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.company_details?.name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.office_location || record.location || '—'}
          </Text>
        </Space>
      ),
      sorter: (a: CareerApplication, b: CareerApplication) =>
        (a.company_details?.name || '').localeCompare(b.company_details?.name || ''),
    },
    {
      title: 'Role',
      dataIndex: 'role_title',
      key: 'role',
      render: (text: string, record: CareerApplication) => (
        <Space direction="vertical" size={2}>
          <Space size={6} align="center">
            <Text>{text}</Text>
            <EmploymentTypeBadge type={record.employment_type} />
          </Space>
          {record.job_link && (
            <Link href={record.job_link} target="_blank" style={{ fontSize: 12 }}>
              <GlobalOutlined /> Link
            </Link>
          )}
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <StatusBadge status={status} />,
    },
    {
      title: 'Date Applied',
      dataIndex: 'date_applied',
      key: 'date_applied',
      render: (date: string) => (date ? dayjs(date).format('MMM D, YYYY') : '—'),
      sorter: (a: CareerApplication, b: CareerApplication) =>
        dayjs(a.date_applied).diff(dayjs(b.date_applied)),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: CareerApplication) => (
        <Space>
          <Tooltip title="Generate Cover Letter">
            <Button
              type="text"
              size="small"
              icon={<ThunderboltOutlined style={{ color: '#6366f1' }} />}
              onClick={() => setCoverLetterApp(record)}
            />
          </Tooltip>
          <Tooltip title="Timeline">
            <Button
              type="text"
              size="small"
              icon={<ClockCircleOutlined style={{ color: '#0f766e' }} />}
              onClick={() => setTimelineApp(record)}
            />
          </Tooltip>
          <RowActions
            size="middle"
            isLocked={record.is_locked}
            onToggleLock={() => toggleLock(record)}
            onEdit={() => openEditModal(record)}
            onDelete={() => handleDelete(record.id)}
            disableDelete={record.is_locked}
          />
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 0, width: '100%' }}>
      {contextHolder}
      <div style={{ marginBottom: 24 }}>
        <PageActionToolbar
          title={<span className="whitespace-nowrap">Job Applications</span>}
          subtitle={`${applications.length} applications tracked`}
          singleRowDesktop
          selectedYear={selectedYear}
          onYearChange={handleYearChange}
          availableYears={availableYears}
          onDeleteAll={handleDeleteAll}
          deleteAllConfirmTitle="Delete All Applications?"
          deleteAllConfirmDescription="This will delete all unlocked applications. This cannot be undone."
          onExport={handleExportWrapper}
          exportFilename="applications"
          onImport={() => setIsImportModalOpen(true)}
          onPrimaryAction={openAddModal}
          primaryActionLabel="Add Application"
          primaryActionIcon={<PlusOutlined />}
        />
      </div>

      {/* Bulk action bar */}
      {selectedRowKeys.length > 0 && (
        <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm mb-4 animate-in fade-in slide-in-from-top-2">
          <BulkActionHeader
            selectedCount={selectedRowKeys.length}
            totalCount={filteredData.length}
            title="All Applications"
            onCancelSelection={() => setSelectedRowKeys([])}
            bulkActions={
              <>
                <Button onClick={() => handleBulkToggleLock(true)} icon={<LockOutlined />}>Lock</Button>
                <Button onClick={() => handleBulkToggleLock(false)} icon={<UnlockOutlined />}>Unlock</Button>
                <Tooltip title={isAnySelectedLocked ? 'Unlock selected items before deleting' : ''}>
                  <Button danger onClick={handleBulkDelete} icon={<DeleteOutlined />} disabled={isAnySelectedLocked}>
                    Delete
                  </Button>
                </Tooltip>
              </>
            }
          />
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-4">
        <Input
          size="large"
          placeholder="Search company or role"
          prefix={<SearchOutlined className="text-gray-400" />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ maxWidth: 340 }}
          allowClear
        />
        <Select
          size="large"
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 200 }}
          suffixIcon={<FilterOutlined />}
        >
          <Option value="ALL">All Statuses</Option>
          {appStages.map(stage => (
            <Option key={stage.key} value={stage.key}>{stage.label}</Option>
          ))}
        </Select>
        <Select
          size="large"
          value={empTypeFilter}
          onChange={setEmpTypeFilter}
          style={{ width: 180 }}
          suffixIcon={<FilterOutlined />}
        >
          <Option value="ALL">All Types</Option>
          {empTypes.map(t => (
            <Option key={t.value} value={t.value}>{t.label}</Option>
          ))}
        </Select>
        {(searchText || statusFilter !== 'ALL' || empTypeFilter !== 'ALL') && (
          <Text type="secondary" className="self-center text-sm">
            {filteredData.length} result{filteredData.length !== 1 ? 's' : ''}
          </Text>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <Table
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
          loading={loading}
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: 900 }}
        />
      </div>

      {/* Add/Edit Modal */}
      <Modal
        title={editingId ? 'Edit Application' : 'Add Application'}
        open={isAddModalOpen}
        onCancel={() => setIsAddModalOpen(false)}
        footer={null}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleAddEdit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="company" label="Company" rules={[{ required: true }]}>
                <Input placeholder="Google" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="role_title" label="Role Title" rules={[{ required: true }]}>
                <Input placeholder="Software Engineer" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="Status">
                <Select>
                  {appStages.map(stage => (
                    <Option key={stage.key} value={stage.key}>{stage.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="employment_type" label="Employment Type">
                <Select>
                  {empTypes.map(t => (
                    <Option key={t.value} value={t.value}>{t.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="date_applied" label="Date Applied">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="office_location" label="Location">
                <AutoComplete
                  className="w-full"
                  value={officeLocationValue}
                  options={officeLocationOptions}
                  onChange={(value) => form.setFieldValue('office_location', value)}
                  onSearch={(value) => form.setFieldValue('office_location', value)}
                  placeholder="San Jose, CA"
                  allowClear
                  filterOption={false}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="salary_range" label="Salary Range">
                <Input prefix={<DollarOutlined />} placeholder="150k - 200k" />
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item name="site_link" label="Job Link">
                <Input prefix={<GlobalOutlined />} placeholder="https://..." />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="linked_document_ids" label="Linked Documents (Optional)">
                <Select
                  mode="multiple"
                  allowClear
                  placeholder="Select documents to link"
                  optionFilterProp="label"
                  options={documents.map((doc) => ({
                    value: doc.id,
                    label: `${doc.title} (v${doc.version_number || 1})`,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="notes" label="Notes">
                <Input.TextArea rows={3} />
              </Form.Item>
            </Col>
          </Row>
          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Space>
              <Button onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                Save
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Cover Letter Modal */}
      {coverLetterApp && (
        <CoverLetterModal
          application={coverLetterApp}
          open={!!coverLetterApp}
          onClose={() => setCoverLetterApp(null)}
        />
      )}

      <ApplicationTimelineModal
        application={timelineApp}
        documents={documents}
        open={!!timelineApp}
        onClose={() => setTimelineApp(null)}
        appStages={appStages}
      />

      {/* Import Modal */}
      <Modal
        title="Import Applications"
        open={isImportModalOpen}
        onCancel={() => setIsImportModalOpen(false)}
        footer={null}
      >
        <Dragger {...importProps}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">Click or drag file to this area to upload</p>
          <p className="ant-upload-hint">
            Support for a single or bulk upload. Strictly prohibited from uploading company data or
            other banned files.
          </p>
        </Dragger>
      </Modal>
    </div>
  );
};

export default Applications;

import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Input,
  Select,
  Modal,
  Form,
  Space,
  Tag,
  Upload,
  message,
  Card,
  Typography,
  Row,
  Col,
  DatePicker,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  DollarOutlined,
  GlobalOutlined,
  EnvironmentOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { UploadProps } from 'antd';
import {
  getApplications,
  createApplication,
  updateApplication,
  deleteApplication,
  importApplications,
  deleteAllApplications,
  exportApplications,
} from '../../api';
import type { CareerApplication } from '../../types/application';
import PageActionToolbar from '../../components/PageActionToolbar';
import RowActions from '../../components/RowActions';
import { getAvailableYears, filterByYear, getCurrentYear } from '../../utils/yearFilter';

const { Text, Link } = Typography;
const { Option } = Select;
const { Dragger } = Upload;

const Applications = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();

  // Data State
  const [applications, setApplications] = useState<CareerApplication[]>([]);
  const [loading, setLoading] = useState(false);

  // View State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Filter State
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(() => {
    const saved = localStorage.getItem('applicationsSelectedYear');
    return saved ? (saved === 'all' ? 'all' : parseInt(saved)) : getCurrentYear();
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const resp = await getApplications();
      setApplications(resp.data);
    } catch (error) {
      messageApi.error('Failed to load applications');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
      fetchData();
    } catch (error) {
      messageApi.error('Failed to toggle lock');
      console.error(error);
    }
  };

  const handleAddEdit = async (values: any) => {
    try {
      const payload = {
        ...values,
        company_name: values.company, // API expects company_name
        date_applied: values.date_applied ? values.date_applied.format('YYYY-MM-DD') : undefined,
      };

      if (editingId) {
        await updateApplication(editingId, payload);
        messageApi.success('Application updated');
      } else {
        await createApplication(payload);
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
      date_applied: dayjs(),
      rto_policy: 'UNKNOWN',
      current_round: 0,
    });
    setIsAddModalOpen(true);
  };

  const openEditModal = (app: CareerApplication) => {
    setEditingId(app.id);
    form.setFieldsValue({
      company: app.company_details?.name,
      role_title: app.role_title,
      status: app.status,
      site_link: app.job_link,
      salary_range: app.salary_range,
      location: app.location,
      rto_policy: app.rto_policy || 'UNKNOWN',
      current_round: app.current_round || 0,
      date_applied: app.date_applied ? dayjs(app.date_applied) : null,
      notes: app.notes,
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

  // Filtered Data - Apply year filter first
  const filteredData = filterByYear(applications, selectedYear, 'date_applied').filter((app) => {
    const matchesSearch =
      (app.company_details?.name || '').toLowerCase().includes(searchText.toLowerCase()) ||
      (app.role_title || '').toLowerCase().includes(searchText.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Get available years and handle year change
  const availableYears = getAvailableYears(applications, 'date_applied');
  const handleYearChange = (year: number | 'all') => {
    setSelectedYear(year);
    localStorage.setItem('applicationsSelectedYear', year.toString());
  };

  const columns = [
    {
      title: 'Company',
      key: 'company',
      render: (_: any, record: CareerApplication) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.company_details?.name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.location}
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
        <Space direction="vertical" size={0}>
          <Text>{text}</Text>
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
      render: (status: string) => {
        let color = 'default';
        if (status === 'OFFER') color = 'success';
        if (status === 'REJECTED') color = 'error';
        if (status === 'APPLIED') color = 'blue';
        if (status === 'OA' || status === 'SCREEN') color = 'processing';
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: 'Date Applied',
      dataIndex: 'date_applied',
      key: 'date_applied',
      render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD') : '-'),
      sorter: (a: CareerApplication, b: CareerApplication) =>
        dayjs(a.date_applied).diff(dayjs(b.date_applied)),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: CareerApplication) => (
        <RowActions
          size="middle"
          isLocked={record.is_locked}
          onToggleLock={() => toggleLock(record)}
          onEdit={() => openEditModal(record)}
          onDelete={() => handleDelete(record.id)}
          disableDelete={record.is_locked}
        />
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

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-[300px_200px] gap-3 mb-4">
          <Input
            placeholder="Search company or role"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: '100%' }}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: '100%' }}
            suffixIcon={<FilterOutlined />}
          >
            <Option value="ALL">All Statuses</Option>
            <Option value="APPLIED">Applied</Option>
            <Option value="OA">Online Assessment</Option>
            <Option value="SCREEN">Phone Screen</Option>
            <Option value="ONSITE">Onsite</Option>
            <Option value="OFFER">Offer</Option>
            <Option value="REJECTED">Rejected</Option>
            <Option value="ACCEPTED">Accepted</Option>
            <Option value="GHOSTED">Ghosted</Option>
          </Select>
        </div>

        <Table
          loading={loading}
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          scroll={{ x: 900 }}
        />
      </Card>

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
                  <Option value="APPLIED">Applied</Option>
                  <Option value="OA">Online Assessment</Option>
                  <Option value="SCREEN">Phone Screen</Option>
                  <Option value="ONSITE">Onsite</Option>
                  <Option value="OFFER">Offer</Option>
                  <Option value="REJECTED">Rejected</Option>
                  <Option value="ACCEPTED">Accepted</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="date_applied" label="Date Applied">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="location" label="Location">
                <Input prefix={<EnvironmentOutlined />} placeholder="New York" />
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

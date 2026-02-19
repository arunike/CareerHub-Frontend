import { useState, useEffect } from 'react';
import {
  Tabs,
  List,
  Button,
  Card,
  Typography,
  Tag,
  Space,
  Form,
  Input,
  DatePicker,
  Checkbox,
  message,
  Tooltip,
  Popconfirm,
  Row,
  Col,
  Empty,
  Select,
  Switch,
  Modal,
} from 'antd';
import {
  DeleteOutlined,
  CalendarOutlined,
  LockOutlined,
  UnlockOutlined,
  PlusOutlined,
  SyncOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  getHolidays,
  getFederalHolidays,
  createHoliday,
  deleteHoliday,
  deleteAllHolidays,
  updateHoliday,
  exportHolidays,
  importData,
} from '../../api';
import type { Holiday } from '../../types';
import ExportButton from '../../components/ExportButton';
import YearFilter from '../../components/YearFilter';
import { getAvailableYears, filterByYear, getCurrentYear } from '../../utils/yearFilter';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const Holidays = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();

  // State
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [federalHolidays, setFederalHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);

  // Sorting
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(() => {
    const saved = localStorage.getItem('holidaysSelectedYear');
    return saved ? (saved === 'all' ? 'all' : parseInt(saved)) : getCurrentYear();
  });

  // Add Form State
  const [isRangeMode, setIsRangeMode] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [customResp, federalResp] = await Promise.all([getHolidays(), getFederalHolidays()]);
      setHolidays(customResp.data);
      setFederalHolidays(federalResp.data);
    } catch (error) {
      messageApi.error('Failed to load holidays');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Computed - Filter by year then sort
  const sortedHolidays = filterByYear(holidays, selectedYear, 'date').sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'date') {
      comparison = dayjs(a.date).diff(dayjs(b.date));
    } else {
      comparison = (a.description || '').localeCompare(b.description || '');
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const sortedFederalHolidays = filterByYear(federalHolidays, selectedYear, 'date').sort((a, b) =>
    dayjs(a.date).diff(dayjs(b.date))
  );

  // Get available years
  const availableYears = getAvailableYears(holidays, 'date');

  // Handle year change
  const handleYearChange = (year: number | 'all') => {
    setSelectedYear(year);
    localStorage.setItem('holidaysSelectedYear', year.toString());
  };

  // Handlers
  const handleAdd = async (values: any) => {
    const description = values.name || 'Custom Holiday';
    const isRecurring = values.is_recurring;
    const datesToAdd: string[] = [];

    if (isRangeMode && values.dateRange) {
      const [start, end] = values.dateRange;
      let current = dayjs(start);
      const endDay = dayjs(end);

      if (endDay.isBefore(current)) {
        messageApi.error('End date must be after start date');
        return;
      }

      while (current.isBefore(endDay) || current.isSame(endDay, 'day')) {
        datesToAdd.push(current.format('YYYY-MM-DD'));
        current = current.add(1, 'day');
      }
    } else if (values.date) {
      datesToAdd.push(values.date.format('YYYY-MM-DD'));
    } else {
      return;
    }

    try {
      const promises = datesToAdd.map((date) =>
        createHoliday({
          date,
          description,
          is_recurring: isRecurring,
        })
      );

      await Promise.allSettled(promises);
      messageApi.success('Holiday(s) added');
      form.resetFields();
      fetchData();
    } catch (error) {
      messageApi.error('Failed to create holidays');
      console.error(error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteHoliday(id);
      messageApi.success('Holiday deleted');
      fetchData();
    } catch (error) {
      messageApi.error('Failed to delete holiday');
      console.error(error);
    }
  };

  const handleDeleteAll = async () => {
    try {
      await deleteAllHolidays();
      messageApi.success('All unlocked holidays deleted');
      fetchData();
    } catch (error) {
      messageApi.error('Failed to delete all');
      console.error(error);
    }
  };

  const toggleLock = async (holiday: Holiday) => {
    try {
      await updateHoliday(holiday.id, { is_locked: !holiday.is_locked });
      setHolidays((prev) =>
        prev.map((h) => (h.id === holiday.id ? { ...h, is_locked: !h.is_locked } : h))
      );
      messageApi.success(holiday.is_locked ? 'Unlocked' : 'Locked');
    } catch (error) {
      messageApi.error('Failed to toggle lock');
      console.error(error);
    }
  };

  const handleImportUpload = async () => {
    if (!importFile) return;
    const formData = new FormData();
    formData.append('file', importFile);
    try {
      await importData(formData);
      messageApi.success('Import successful');
      setShowImport(false);
      fetchData();
    } catch (error) {
      messageApi.error('Import failed');
      console.error(error);
    }
  };

  const handleExportWrapper = async (format: string) => {
    const response = await exportHolidays(format);
    return {
      data: response.data,
      headers: response.headers as unknown as Record<string, string>,
    };
  };

  // Tabs Items
  const items = [
    {
      key: 'custom',
      label: 'Manage Custom',
      children: (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Add Form */}
          <Card title="Add New Holiday">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleAdd}
              initialValues={{ is_recurring: false }}
            >
              <Row gutter={16}>
                <Col span={24} md={24} lg={24}>
                  <Form.Item style={{ marginBottom: 0 }}>
                    <Space style={{ marginBottom: 12 }}>
                      <Switch
                        checked={isRangeMode}
                        onChange={setIsRangeMode}
                        checkedChildren="Range"
                        unCheckedChildren="Single Day"
                      />
                      <Text type="secondary">Switch to Date Range</Text>
                    </Space>
                  </Form.Item>
                </Col>

                <Col span={24} md={8}>
                  {isRangeMode ? (
                    <Form.Item
                      name="dateRange"
                      label="Date Range"
                      rules={[{ required: true, message: 'Select dates' }]}
                    >
                      <RangePicker style={{ width: '100%' }} />
                    </Form.Item>
                  ) : (
                    <Form.Item
                      name="date"
                      label="Date"
                      rules={[{ required: true, message: 'Select date' }]}
                    >
                      <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                  )}
                </Col>
                <Col span={24} md={8}>
                  <Form.Item name="name" label="Name">
                    <Input placeholder="Winter Break" />
                  </Form.Item>
                </Col>
                <Col span={24} md={8} style={{ display: 'flex', alignItems: 'center' }}>
                  <Form.Item
                    name="is_recurring"
                    valuePropName="checked"
                    style={{ marginBottom: 0, marginTop: 24 }}
                  >
                    <Checkbox>Recurring (Yearly)</Checkbox>
                  </Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<PlusOutlined />}
                    style={{ marginLeft: 'auto', marginTop: 24 }}
                  >
                    Add
                  </Button>
                </Col>
              </Row>
            </Form>
          </Card>

          {/* List */}
          <Card
            title={
              <div className="flex justify-between items-center">
                <Title level={5} style={{ margin: 0 }}>
                  My Time Off ({holidays.length})
                </Title>
                <Space>
                  <Select
                    value={sortBy}
                    onChange={setSortBy}
                    options={[
                      { value: 'date', label: 'By Date' },
                      { value: 'name', label: 'By Name' },
                    ]}
                    style={{ width: 100 }}
                  />
                  <Button
                    icon={
                      sortOrder === 'asc' ? <SortAscendingOutlined /> : <SortDescendingOutlined />
                    }
                    onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                  />
                  <Popconfirm
                    title="Delete All Unlocked?"
                    description="This will delete all custom holidays that are not locked. This cannot be undone."
                    okText="Delete All"
                    okType="danger"
                    onConfirm={handleDeleteAll}
                    disabled={holidays.length === 0}
                  >
                    <Button danger disabled={holidays.length === 0} icon={<DeleteOutlined />}>
                      Delete All
                    </Button>
                  </Popconfirm>
                </Space>
              </div>
            }
          >
            <List
              loading={loading}
              itemLayout="horizontal"
              dataSource={sortedHolidays}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Tooltip title={item.is_locked ? 'Unlock' : 'Lock'}>
                      <Button
                        type="text"
                        icon={item.is_locked ? <UnlockOutlined /> : <LockOutlined />}
                        onClick={() => toggleLock(item)}
                      />
                    </Tooltip>,
                    <Popconfirm
                      title="Delete?"
                      onConfirm={() => handleDelete(item.id)}
                      disabled={item.is_locked}
                    >
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        disabled={item.is_locked}
                      />
                    </Popconfirm>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <CalendarOutlined style={{ fontSize: 20, color: '#1890ff', marginTop: 8 }} />
                    }
                    title={
                      <Space>
                        <Text strong>{dayjs(item.date).format('YYYY-MM-DD')}</Text>
                        {item.is_recurring && (
                          <Tag color="blue" icon={<SyncOutlined />}>
                            Yearly
                          </Tag>
                        )}
                        {item.is_locked && <LockOutlined style={{ color: '#faad14' }} />}
                      </Space>
                    }
                    description={item.description || 'No description'}
                  />
                </List.Item>
              )}
              locale={{
                emptyText: (
                  <Empty
                    description="No custom holidays found"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                ),
              }}
            />
          </Card>
        </Space>
      ),
    },
    {
      key: 'federal',
      label: 'View Federal',
      children: (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Card>
            <Space align="start">
              <LockOutlined style={{ fontSize: 20, color: '#1890ff' }} />
              <div>
                <Text strong>Federal Holidays are Automatic</Text>
                <div>
                  <Text type="secondary">
                    These are automatically excluded from availability. You don't need to add them.
                  </Text>
                </div>
              </div>
            </Space>
          </Card>
          <List
            loading={loading}
            grid={{ gutter: 16, column: 2 }}
            dataSource={sortedFederalHolidays}
            renderItem={(item) => (
              <List.Item>
                <Card size="small">
                  <List.Item.Meta
                    avatar={<CalendarOutlined style={{ color: '#8c8c8c' }} />}
                    title={dayjs(item.date).format('YYYY-MM-DD')}
                    description={item.description}
                  />
                </Card>
              </List.Item>
            )}
          />
        </Space>
      ),
    },
  ];

  return (
    <>
      {contextHolder}
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <Title level={2} style={{ margin: 0 }}>
              Holiday Manager
            </Title>
          </div>
          <Space>
            <YearFilter
              selectedYear={selectedYear}
              onYearChange={handleYearChange}
              availableYears={availableYears}
            />
            <ExportButton onExport={handleExportWrapper} filename="holidays" />
            <Button icon={<UploadOutlined />} onClick={() => setShowImport(true)}>
              Import
            </Button>
          </Space>
        </div>

        <Tabs defaultActiveKey="custom" items={items} type="card" />

        {/* Import Modal */}
        <Modal
          title="Import Holidays"
          open={showImport}
          onCancel={() => setShowImport(false)}
          onOk={handleImportUpload}
          okText="Upload"
          confirmLoading={loading}
        >
          <Input
            type="file"
            onChange={(e) => setImportFile(e.target.files ? e.target.files[0] : null)}
          />
        </Modal>
      </div>
    </>
  );
};

export default Holidays;

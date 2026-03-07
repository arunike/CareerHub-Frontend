import React, { useState, useEffect } from 'react';
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
  Popconfirm,
  Row,
  Col,
  Empty,
  Select,
  Switch,
  Modal,
  Collapse,
  Tooltip,
} from 'antd';
import {
  DeleteOutlined,
  CalendarOutlined,
  LockOutlined,
  PlusOutlined,
  SyncOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  UnlockOutlined,
  EditOutlined,
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
import PageActionToolbar from '../../components/PageActionToolbar';
import BulkActionHeader from '../../components/BulkActionHeader';
import RowActions from '../../components/RowActions';
import { getAvailableYears, filterByYear, getCurrentYear } from '../../utils/yearFilter';
import { usePersistedState } from '../../hooks/usePersistedState';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const GroupedHolidayItem = ({ 
  item, 
  handleToggleLockGroup, 
  handleDeleteGroup, 
  toggleLock, 
  handleDelete, 
  handleEditItem,
  selectedIds,
  onSelectChange,
  onSelectGroup
}: any) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const startDate = item.items[0].date;
  const endDate = item.items[item.items.length - 1].date;

  const allSelected = item.items.every((i: any) => selectedIds.includes(i.id));
  const someSelected = item.items.some((i: any) => selectedIds.includes(i.id)) && !allSelected;

  return (
    <List.Item
      actions={!isExpanded ? [
        <RowActions
          key={`actions-group-${item.id}`}
          size="middle"
          isLocked={item.is_locked}
          onToggleLock={() => handleToggleLockGroup(item)}
          onDelete={() => handleDeleteGroup(item)}
          onEdit={() => handleEditItem(item)}
          disableDelete={item.is_locked}
        />,
      ] : []}
    >
      <List.Item.Meta
        avatar={
          <div className="flex items-center gap-3">
            <Checkbox 
              checked={allSelected} 
              indeterminate={someSelected}
              onChange={() => onSelectGroup(item.items, !allSelected)}
              style={{ marginTop: 8 }}
            />
            <CalendarOutlined style={{ fontSize: 20, color: '#1890ff', marginTop: 8 }} />
          </div>
        }
        title={
          <Space>
            <Text strong>
              {dayjs(startDate).format('YYYY-MM-DD')} to {dayjs(endDate).format('YYYY-MM-DD')}
            </Text>
            {item.is_recurring && (
              <Tag color="blue" icon={<SyncOutlined />}>
                Yearly
              </Tag>
            )}
            {item.is_locked && <LockOutlined style={{ color: '#faad14' }} />}
          </Space>
        }
        description={
          <div className="mt-2 w-full">
            <Collapse 
              ghost 
              size="small" 
              style={{ marginLeft: -16 }}
              onChange={(keys) => setIsExpanded(keys.length > 0)}
            >
              <Collapse.Panel header={<Text type="secondary">{item.description || 'Date Range Details'}</Text>} key="1">
                <List
                  size="small"
                  dataSource={item.items}
                  renderItem={(subItem: any) => (
                    <List.Item 
                      style={{ 
                        padding: '12px 16px',
                        backgroundColor: '#fafafa',
                        marginBottom: '8px',
                        borderRadius: '8px',
                        border: '1px solid #f0f0f0'
                      }}
                      actions={[
                        <RowActions
                          key={`actions-${subItem.id}`}
                          size="small"
                          isLocked={subItem.is_locked}
                          onToggleLock={() => toggleLock(subItem)}
                          onDelete={() => handleDelete(subItem.id)}
                          onEdit={() => handleEditItem(subItem)}
                          disableDelete={subItem.is_locked}
                        />,
                      ]}
                    >
                      <Space>
                        <Checkbox 
                          checked={selectedIds.includes(subItem.id)}
                          onChange={(e) => onSelectChange(subItem.id, e.target.checked)}
                        />
                        <div className="w-2 h-2 rounded-full bg-blue-400 ml-2" />
                        <Text strong>{dayjs(subItem.date).format('dddd, MMMM D, YYYY')}</Text>
                      </Space>
                    </List.Item>
                  )}
                />
              </Collapse.Panel>
            </Collapse>
          </div>
        }
      />
    </List.Item>
  );
};

const Holidays = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  // State
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [federalHolidays, setFederalHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);

  // Sorting
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedYear, setSelectedYear] = usePersistedState<number | 'all'>(
    'holidaysSelectedYear',
    getCurrentYear(),
    {
      serialize: (value) => value.toString(),
      deserialize: (raw) => (raw === 'all' ? 'all' : parseInt(raw)),
    }
  );

  // Add Form State
  const [isRangeMode, setIsRangeMode] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  
  // Edit State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

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

  const groupedHolidays = React.useMemo(() => {
    const groups: any[] = [];
    const groupMap = new Map();

    sortedHolidays.forEach((item) => {
      if (item.group_id) {
        if (!groupMap.has(item.group_id)) {
          const newGroup = {
            isGroup: true,
            id: item.group_id,
            group_id: item.group_id,
            items: [],
            date: item.date,
            description: item.description,
            is_recurring: item.is_recurring,
            is_locked: false, // Calculated logically if all are locked below
          };
          groupMap.set(item.group_id, newGroup);
          groups.push(newGroup);
        }
        groupMap.get(item.group_id).items.push(item);
      } else {
        groups.push({ isGroup: false, ...item });
      }
    });

    // Check lock status for groups
    groups.forEach((g) => {
      if (g.isGroup) {
        g.is_locked = g.items.every((i: any) => i.is_locked);
      }
    });

    return groups;
  }, [sortedHolidays]);

  const isAnySelectedLocked = React.useMemo(() => {
    return selectedIds.some((id) => {
      const holiday = holidays.find((h) => h.id === id);
      return holiday?.is_locked;
    });
  }, [selectedIds, holidays]);

  const sortedFederalHolidays = filterByYear(federalHolidays, selectedYear, 'date').sort((a, b) =>
    dayjs(a.date).diff(dayjs(b.date))
  );

  // Get available years
  const availableYears = getAvailableYears(holidays, 'date');

  // Handle year change
  const handleYearChange = (year: number | 'all') => {
    setSelectedYear(year);
  };

  // Handlers
  const handleAdd = async (values: any) => {
    const description = values.name || 'Custom Holiday';
    const isRecurring = values.is_recurring;
    
    if (isRangeMode && values.dateRange) {
      const [start, end] = values.dateRange;
      if (end.isBefore(start)) {
        messageApi.error('End date must be after start date');
        return;
      }

      const groupId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
      const promises = [];
      let current = start.clone();
      
      while (current.isBefore(end) || current.isSame(end, 'day')) {
        promises.push(createHoliday({
          date: current.format('YYYY-MM-DD'),
          group_id: groupId,
          description,
          is_recurring: isRecurring,
        }));
        current = current.add(1, 'day');
      }

      try {
        await Promise.allSettled(promises);
        messageApi.success('Holiday collection added');
        form.resetFields();
        fetchData();
      } catch (e) {
        messageApi.error('Failed to create holiday collection');
      }
    } else if (values.date) {
      try {
        await createHoliday({
          date: values.date.format('YYYY-MM-DD'),
          description,
          is_recurring: isRecurring,
        });
        messageApi.success('Holiday added');
        form.resetFields();
        fetchData();
      } catch (error) {
        messageApi.error('Failed to create holiday');
      }
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

  const handleEditClick = (item: any) => {
    setEditingItem(item);
    // If it's a group, populate form with the first item's properties
    const sampleItem = item.isGroup ? item.items[0] : item;
    editForm.setFieldsValue({
      description: sampleItem.description,
      is_recurring: sampleItem.is_recurring,
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async () => {
    try {
      const values = await editForm.validateFields();
      
      let itemsToUpdate: any[] = [];
      if (editingItem.isBulk) {
        itemsToUpdate = editingItem.items; // [{id: 1}, {id: 2}]
      } else if (editingItem.isGroup) {
        itemsToUpdate = editingItem.items; // The group's actual array of CustomHolidays
      } else {
        itemsToUpdate = [editingItem]; // Single CustomHoliday
      }

      await Promise.all(
        itemsToUpdate.map((i: any) => {
          // If bulk editing and name is left blank when they originally had different names, ignore description update
          const updatePayload: any = { is_recurring: values.is_recurring };
          if (values.description !== undefined && values.description !== '') {
            updatePayload.description = values.description;
          } else if (!(editingItem.isBulk && !editingItem.allSameDesc)) {
            // Only force description save if it's NOT the special mixed-bag scenario
            updatePayload.description = values.description;
          }
          return updateHoliday(i.id, updatePayload);
        })
      );
      
      messageApi.success('Holiday updated successfully');
      setEditModalOpen(false);
      setSelectedIds([]); // Clear any bulk selections after a bulk edit
      fetchData();
    } catch (error) {
      if (error && (error as any).errorFields) {
        return;
      }
      messageApi.error('Failed to update holiday');
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

  const handleSelectChange = (id: number, checked: boolean) => {
    setSelectedIds((prev) => 
      checked ? [...prev, id] : prev.filter(selectedId => selectedId !== id)
    );
  };

  const handleSelectGroup = (items: any[], checked: boolean) => {
    const itemIds = items.map(i => i.id);
    setSelectedIds((prev) => {
      if (checked) {
        const newIds = [...prev];
        itemIds.forEach(id => {
          if (!newIds.includes(id)) newIds.push(id);
        });
        return newIds;
      } else {
        return prev.filter(id => !itemIds.includes(id));
      }
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Select all IDs from the currently visible/sorted holidays
      const allIds = sortedHolidays.map(h => h.id);
      setSelectedIds(allIds);
    } else {
      setSelectedIds([]);
    }
  };

  const allSelected = sortedHolidays.length > 0 && selectedIds.length === sortedHolidays.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < sortedHolidays.length;

  const handleBulkDelete = () => {
    Modal.confirm({
      title: 'Delete Selected Holidays',
      content: `Are you sure you want to delete ${selectedIds.length} holidays?`,
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      onOk: async () => {
        try {
          // Filter out locked ones if you want, or just let API fail. We'll disable delete if all selected are locked
          await Promise.all(selectedIds.map(id => deleteHoliday(id)));
          messageApi.success(`${selectedIds.length} holidays deleted`);
          setSelectedIds([]);
          fetchData();
        } catch (error) {
          messageApi.error('Failed to delete some holidays');
          fetchData();
        }
      },
    });
  };

  const handleBulkToggleLock = async (lock: boolean) => {
    try {
      await Promise.all(selectedIds.map(id => updateHoliday(id, { is_locked: lock })));
      messageApi.success(`${selectedIds.length} holidays ${lock ? 'locked' : 'unlocked'}`);
      setSelectedIds([]);
      fetchData();
    } catch (error) {
      messageApi.error(`Failed to ${lock ? 'lock' : 'unlock'} some holidays`);
      fetchData();
    }
  };

  const handleBulkEditClick = () => {
    editForm.resetFields();

    // Find the actual holiday objects for the selected IDs
    const selectedHolidays = selectedIds.map(id => holidays.find(h => h.id === id)).filter(Boolean) as Holiday[];

    if (selectedHolidays.length > 0) {
      const firstDesc = selectedHolidays[0].description;
      const allSameDesc = selectedHolidays.every(h => h.description === firstDesc);
      
      const firstRecur = selectedHolidays[0].is_recurring;
      const allSameRecur = selectedHolidays.every(h => h.is_recurring === firstRecur);

      editForm.setFieldsValue({
        description: allSameDesc ? firstDesc : undefined,
        is_recurring: allSameRecur ? firstRecur : false,
      });
      
      setEditingItem({ 
        isBulk: true, 
        items: selectedHolidays,
        allSameDesc,
      });
    } else {
      setEditingItem({ isBulk: true, items: [] });
    }
    
    setEditModalOpen(true);
  };

  const handleToggleLockGroup = async (groupItem: any) => {
    const newLockState = !groupItem.is_locked;
    try {
      await Promise.all(
        groupItem.items.map((i: any) => updateHoliday(i.id, { is_locked: newLockState }))
      );
      messageApi.success(`Collection ${newLockState ? 'locked' : 'unlocked'}`);
      fetchData();
    } catch (error) {
      messageApi.error(`Failed to toggle lock for collection`);
      fetchData();
    }
  };

  const handleDeleteGroup = (groupItem: any) => {
    Modal.confirm({
      title: 'Delete Holiday Collection',
      content: `Are you sure you want to delete all ${groupItem.items.length} days in this collection?`,
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      onOk: async () => {
        try {
          await Promise.all(groupItem.items.map((i: any) => deleteHoliday(i.id)));
          messageApi.success('Holiday collection deleted');
          fetchData();
        } catch (error) {
          messageApi.error('Failed to delete some holidays in the collection');
          fetchData();
        }
      },
    });
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
                <Col span={24} md={8}>
                  <Form.Item label=" " colon={false} style={{ marginBottom: 0 }}>
                    <div className="flex items-center justify-between gap-3">
                      <Form.Item name="is_recurring" valuePropName="checked" noStyle>
                        <Checkbox>Recurring (Yearly)</Checkbox>
                      </Form.Item>
                      <Button type="primary" htmlType="submit" icon={<PlusOutlined />} size="large">
                        Add
                      </Button>
                    </div>
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>

          {/* List */}
          <Card
            title={
              <BulkActionHeader
                selectedCount={selectedIds.length}
                totalCount={sortedHolidays.length}
                onSelectAll={handleSelectAll}
                onCancelSelection={() => setSelectedIds([])}
                title={`My Time Off (${holidays.length})`}
                bulkActions={
                  <>
                    <Button onClick={() => handleBulkToggleLock(true)} icon={<LockOutlined />}>
                      Lock
                    </Button>
                    <Button onClick={() => handleBulkToggleLock(false)} icon={<UnlockOutlined />}>
                      Unlock
                    </Button>
                    <Button onClick={handleBulkEditClick} icon={<EditOutlined />}>
                      Edit
                    </Button>
                    <Tooltip title={isAnySelectedLocked ? "Cannot delete while locked items are selected" : ""}>
                      <Button 
                        danger 
                        onClick={handleBulkDelete} 
                        icon={<DeleteOutlined />}
                        disabled={isAnySelectedLocked}
                      >
                        Delete
                      </Button>
                    </Tooltip>
                  </>
                }
                defaultActions={
                  <>
                    <Select
                      value={sortBy}
                      onChange={setSortBy}
                      options={[
                        { value: 'date', label: 'By Date' },
                        { value: 'name', label: 'By Name' },
                      ]}
                      style={{ width: 120 }}
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
                  </>
                }
              />
            }
          >
            <List
              loading={loading}
              itemLayout="horizontal"
              dataSource={groupedHolidays}
              renderItem={(item) => {
                if (item.isGroup) {
                  return (
                    <GroupedHolidayItem
                      key={`group-${item.id}`}
                      item={item}
                      handleToggleLockGroup={handleToggleLockGroup}
                      handleDeleteGroup={handleDeleteGroup}
                      toggleLock={toggleLock}
                      handleDelete={handleDelete}
                      handleEditItem={handleEditClick}
                      selectedIds={selectedIds}
                      onSelectChange={handleSelectChange}
                      onSelectGroup={handleSelectGroup}
                    />
                  );
                }

                return (
                  <List.Item
                    actions={[
                      <RowActions
                        key={`actions-${item.id}`}
                        size="middle"
                        isLocked={item.is_locked}
                        onToggleLock={() => toggleLock(item)}
                        onDelete={() => handleDelete(item.id)}
                        onEdit={() => handleEditClick(item)}
                        disableDelete={item.is_locked}
                      />,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <div className="flex items-center gap-3">
                          <Checkbox 
                            checked={selectedIds.includes(item.id)}
                            onChange={(e) => handleSelectChange(item.id, e.target.checked)}
                            style={{ marginTop: 8 }}
                          />
                          <CalendarOutlined style={{ fontSize: 20, color: '#1890ff', marginTop: 8 }} />
                        </div>
                      }
                      title={
                        <Space>
                          <Text strong>
                            {dayjs(item.date).format('YYYY-MM-DD')}
                          </Text>
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
                );
              }}
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
      <div className="w-full">
        <div className="mb-6">
          <PageActionToolbar
            title="Holiday Manager"
            selectedYear={selectedYear}
            onYearChange={handleYearChange}
            availableYears={availableYears}
            onExport={handleExportWrapper}
            exportFilename="holidays"
            onImport={() => setShowImport(true)}
          />
        </div>

        <Tabs defaultActiveKey="custom" items={items} type="card" />

        {/* Edit Modal */}
        <Modal
          title={editingItem?.isGroup ? "Edit Holiday Collection" : (editingItem?.isBulk ? `Edit ${editingItem.items.length} Holidays` : "Edit Holiday")}
          open={editModalOpen}
          onCancel={() => setEditModalOpen(false)}
          onOk={handleEditSubmit}
          okText="Save"
        >
          <Form form={editForm} layout="vertical">
            {editingItem?.isBulk && !editingItem?.allSameDesc && (
              <div className="mb-4 text-gray-500 text-sm italic">
                You are editing multiple holidays with different names. Leave the name field blank to keep their original names, or type a new name to overwrite all of them.
              </div>
            )}
            <Form.Item
              name="description"
              label="Name"
              rules={editingItem?.isBulk && !editingItem?.allSameDesc ? [] : [{ required: true, message: 'Please enter a name' }]}
            >
              <Input placeholder={editingItem?.isBulk && !editingItem?.allSameDesc ? "Leave blank to keep original names..." : "Winter Break"} />
            </Form.Item>
            <Form.Item name="is_recurring" valuePropName="checked">
              <Checkbox>Recurring (Yearly)</Checkbox>
            </Form.Item>
          </Form>
        </Modal>

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

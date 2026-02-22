import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Modal, Select, Table, Tag, message } from 'antd';
import { PlusOutlined, FilePdfOutlined, FileWordOutlined, FileOutlined, LockOutlined } from '@ant-design/icons';
import { getApplications, getDocuments, deleteDocument, deleteAllDocuments, exportDocuments, patchDocument } from '../../api';
import type { Document } from '../../types';
import UploadDocumentModal from './UploadDocumentModal';
import PageActionToolbar from '../../components/PageActionToolbar';
import { getAvailableYears, filterByYear, getCurrentYear } from '../../utils/yearFilter';
import RowActions from '../../components/RowActions';

const Documents: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [applications, setApplications] = useState<Array<{ id: number; role_title: string; company_details?: { name: string } }>>([]);
  const [form] = Form.useForm();
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(() => {
    const saved = localStorage.getItem('documentsSelectedYear');
    return saved ? (saved === 'all' ? 'all' : parseInt(saved, 10)) : getCurrentYear();
  });

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await getDocuments();
      setDocuments(response.data);
    } catch (error) {
      message.error('Failed to load documents');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const response = await getApplications();
      setApplications(response.data);
    } catch (error) {
      console.error('Failed to load applications', error);
    }
  };

  const handleYearChange = (year: number | 'all') => {
    setSelectedYear(year);
    localStorage.setItem('documentsSelectedYear', year.toString());
  };

  const handleDeleteAll = async () => {
    try {
      await deleteAllDocuments();
      message.success('All documents deleted successfully');
      fetchDocuments();
    } catch (error) {
      message.error('Failed to delete all documents');
      console.error(error);
    }
  };

  const handleExportWrapper = async (format: string) => {
    const response = await exportDocuments(format);
    return {
      data: response.data,
      headers: response.headers as unknown as Record<string, string>,
    };
  };

  const availableYears = getAvailableYears(documents, 'created_at');
  const filteredDocuments = filterByYear(documents, selectedYear, 'created_at');

  const handleDelete = async (id: number) => {
    try {
      await deleteDocument(id);
      message.success('Document deleted successfully');
      fetchDocuments();
    } catch (error) {
      message.error('Failed to delete document');
      console.error(error);
    }
  };

  const handleToggleLock = async (record: Document) => {
    try {
      await patchDocument(record.id, { is_locked: !record.is_locked });
      message.success(record.is_locked ? 'Document unlocked' : 'Document locked');
      fetchDocuments();
    } catch (error: any) {
      message.error(error?.response?.data?.error || 'Failed to update lock status');
      console.error(error);
    }
  };

  const openEditModal = (record: Document) => {
    setEditingDocument(record);
    form.setFieldsValue({
      title: record.title,
      document_type: record.document_type,
      application: record.application ?? undefined,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingDocument) return;
    try {
      const values = await form.validateFields();
      setSaving(true);
      await patchDocument(editingDocument.id, {
        title: values.title,
        document_type: values.document_type,
        application: values.application ?? null,
      });
      message.success('Document updated');
      setIsEditModalOpen(false);
      setEditingDocument(null);
      form.resetFields();
      fetchDocuments();
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error(error?.response?.data?.error || 'Failed to update document');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.pdf')) return <FilePdfOutlined className="text-red-500 text-lg" />;
    if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) return <FileWordOutlined className="text-blue-500 text-lg" />;
    return <FileOutlined className="text-gray-500 text-lg" />;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'RESUME': return 'blue';
      case 'COVER_LETTER': return 'green';
      case 'PORTFOLIO': return 'purple';
      default: return 'default';
    }
  };

  const columns = [
    {
      title: 'Type',
      key: 'icon',
      width: 50,
      render: (_: any, record: Document) => getFileIcon(record.file),
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: Document) => (
        <div className="flex items-center gap-2">
          <a href={record.file} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">
            {text}
          </a>
          {record.is_locked ? <LockOutlined className="text-amber-500" /> : null}
        </div>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'document_type',
      key: 'document_type',
      render: (type: string) => (
        <Tag color={getTypeColor(type)}>{type.replace('_', ' ')}</Tag>
      ),
    },
    {
      title: 'Linked Application',
      key: 'application',
      render: (_: any, record: Document) => (
        record.application_details 
          ? `${record.application_details.role} @ ${record.application_details.company}`
          : <span className="text-gray-400">None</span>
      ),
    },
    {
      title: 'Uploaded At',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (dateString: string) => new Date(dateString).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Document) => (
        <RowActions
          size="middle"
          isLocked={record.is_locked}
          onToggleLock={() => handleToggleLock(record)}
          onView={() => window.open(record.file, '_blank', 'noopener,noreferrer')}
          onEdit={() => openEditModal(record)}
          disableEdit={Boolean(record.is_locked)}
          onDelete={() => handleDelete(record.id)}
          disableDelete={Boolean(record.is_locked)}
          deleteTitle="Delete document?"
          deleteDescription="Are you sure to delete this document?"
        />
      ),
    },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      <PageActionToolbar
        title="Document Vault"
        subtitle="Manage your resumes, cover letters, and other career materials."
        selectedYear={selectedYear}
        onYearChange={handleYearChange}
        availableYears={availableYears}
        onDeleteAll={handleDeleteAll}
        deleteAllLabel="Delete All"
        deleteAllConfirmTitle="Delete All Documents?"
        deleteAllConfirmDescription="This will permanently delete all documents."
        deleteAllDisabled={documents.length === 0}
        onExport={handleExportWrapper}
        exportFilename="documents"
        onImport={() => setIsUploadModalVisible(true)}
        onPrimaryAction={() => setIsUploadModalVisible(true)}
        primaryActionLabel="Add Document"
        primaryActionIcon={<PlusOutlined />}
      />

      <Card className="shadow-sm border-gray-100 rounded-xl overflow-hidden">
        <Table 
          columns={columns} 
          dataSource={filteredDocuments} 
          rowKey="id" 
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 900 }}
          className="career-table"
        />
      </Card>

      <UploadDocumentModal 
        visible={isUploadModalVisible}
        onCancel={() => setIsUploadModalVisible(false)}
        onSuccess={() => {
          setIsUploadModalVisible(false);
          fetchDocuments();
        }}
      />

      <Modal
        title="Edit Document"
        open={isEditModalOpen}
        onCancel={() => {
          setIsEditModalOpen(false);
          setEditingDocument(null);
          form.resetFields();
        }}
        onOk={handleSaveEdit}
        confirmLoading={saving}
        okText="Save"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label="Document Title"
            rules={[{ required: true, message: 'Please enter a title' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="document_type"
            label="Document Type"
            rules={[{ required: true, message: 'Please select a type' }]}
          >
            <Select
              options={[
                { value: 'RESUME', label: 'Resume' },
                { value: 'COVER_LETTER', label: 'Cover Letter' },
                { value: 'PORTFOLIO', label: 'Portfolio' },
                { value: 'OTHER', label: 'Other' },
              ]}
            />
          </Form.Item>
          <Form.Item name="application" label="Link to Application (Optional)">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              options={applications.map((app) => ({
                value: app.id,
                label: `${app.role_title} @ ${app.company_details?.name || 'Unknown'}`,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Documents;

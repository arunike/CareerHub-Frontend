import React, { useState, useEffect } from 'react';
import { Button, Card, Table, Tag, Space, Popconfirm, message } from 'antd';
import { PlusOutlined, FilePdfOutlined, FileWordOutlined, FileOutlined, DeleteOutlined } from '@ant-design/icons';
import { getDocuments, deleteDocument, deleteAllDocuments, exportDocuments } from '../../api';
import type { Document } from '../../types';
import UploadDocumentModal from './UploadDocumentModal';
import PageActionToolbar from '../../components/PageActionToolbar';
import { getAvailableYears, filterByYear, getCurrentYear } from '../../utils/yearFilter';

const Documents: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
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
  }, []);

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
        <a href={record.file} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">
          {text}
        </a>
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
        <Space>
          <Popconfirm
            title="Delete the document"
            description="Are you sure to delete this document?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
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
    </div>
  );
};

export default Documents;

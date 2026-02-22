import React, { useState, useEffect } from 'react';
import { Typography, Button, Card, Table, Tag, Space, Popconfirm, message } from 'antd';
import { UploadOutlined, FilePdfOutlined, FileWordOutlined, FileOutlined, DeleteOutlined } from '@ant-design/icons';
import { getDocuments, deleteDocument } from '../../api';
import type { Document } from '../../types';
import UploadDocumentModal from './UploadDocumentModal';

const { Title } = Typography;

const Documents: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Title level={2} className="!mb-1">Document Vault</Title>
          <Typography.Text className="text-gray-500">
            Manage your resumes, cover letters, and other career materials.
          </Typography.Text>
        </div>
        <Button 
          type="primary" 
          icon={<UploadOutlined />} 
          size="large"
          className="shadow-md bg-blue-600 hover:bg-blue-500 border-none px-6"
          onClick={() => setIsUploadModalVisible(true)}
        >
          Upload Document
        </Button>
      </div>

      <Card className="shadow-sm border-gray-100 rounded-xl overflow-hidden">
        <Table 
          columns={columns} 
          dataSource={documents} 
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

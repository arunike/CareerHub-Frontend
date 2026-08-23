import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Form, Grid, Input, Select, Table, Tag, message } from 'antd';
import Modal from '../../components/MobileModal';
import {
  PlusOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileOutlined,
  LockOutlined,
} from '@ant-design/icons';
import {
  getDocuments,
  deleteDocument,
  deleteAllDocuments,
  exportDocuments,
  patchDocument,
  getDocumentVersions,
  createDocumentVersion,
} from '../../api';
import type { Document } from '../../types';
import UploadDocumentModal from './UploadDocumentModal';
import PageActionToolbar from '../../components/PageActionToolbar';
import { getCurrentYear } from '../../utils/yearFilter';
import RowActions from '../../components/RowActions';
import { PageState } from '../../components/PageState';
import { usePersistedState } from '../../hooks/usePersistedState';
import { useLocation, useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../../utils/apiError';
import { SCROLL_TO_FIRST_ERROR } from '../../constants/formDefaults';
import ApplicationSelect from '../../components/ApplicationSelect';
import { openDocumentInNewTab } from '../../utils/openDocument';
import DocumentMobileList from './DocumentMobileList';
import DocumentPreviewBody from './DocumentPreviewBody';
const MAX_DOCUMENT_FILE_BYTES = 4 * 1024 * 1024;
const DOCUMENT_PAGE_SIZE = 10;
type ApiError = { response?: { data?: { error?: string } }; errorFields?: unknown };
type PaginatedDocumentsResponse = {
  count: number;
  // Rows across the whole filtered set that are not locked
  unlocked_count?: number;
  results: Document[];
};

const isPaginatedDocumentsResponse = (
  data: Document[] | PaginatedDocumentsResponse
): data is PaginatedDocumentsResponse => !Array.isArray(data) && Array.isArray(data.results);

const Documents: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentsTotal, setDocumentsTotal] = useState(0);
  const [documentsUnlocked, setDocumentsUnlocked] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [uploadingVersion, setUploadingVersion] = useState(false);
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [versionTarget, setVersionTarget] = useState<Document | null>(null);
  const [versionList, setVersionList] = useState<Document[]>([]);
  const [newVersionFile, setNewVersionFile] = useState<File | null>(null);
  const [form] = Form.useForm();
  const [selectedYear, setSelectedYear] = usePersistedState<number | 'all'>(
    'documentsSelectedYear',
    getCurrentYear(),
    {
      serialize: (value) => value.toString(),
      deserialize: (raw) => (raw === 'all' ? 'all' : parseInt(raw, 10)),
    }
  );

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const response = await getDocuments({
        page: currentPage,
        page_size: DOCUMENT_PAGE_SIZE,
        year: selectedYear,
      });
      const data = response.data as Document[] | PaginatedDocumentsResponse;
      if (isPaginatedDocumentsResponse(data)) {
        setDocuments(data.results);
        setDocumentsTotal(data.count);
        // Counted server-side across every page; the current page cannot answer it.
        setDocumentsUnlocked(data.unlocked_count ?? data.count);
      } else {
        setDocuments(data);
        setDocumentsTotal(data.length);
        setDocumentsUnlocked(data.filter((item) => !item.is_locked).length);
      }
    } catch (error) {
      setLoadError(true);
      message.error('Failed to load documents');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, selectedYear]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') !== 'upload') return;
    setIsUploadModalVisible(true);
    navigate('/documents', { replace: true });
  }, [location.search, navigate]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(documentsTotal / DOCUMENT_PAGE_SIZE));
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [currentPage, documentsTotal]);

  const handleYearChange = (year: number | 'all') => {
    setSelectedYear(year);
    setCurrentPage(1);
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

  const availableYears = useMemo(
    () => (typeof selectedYear === 'number' ? [selectedYear] : []),
    [selectedYear]
  );
  const filteredDocuments = documents;
  const documentLoadFailed = loadError && documents.length === 0;
  const documentEmptyState = (
    <PageState
      title={selectedYear === 'all' ? 'No documents yet' : `No documents in ${selectedYear}`}
      description={
        selectedYear === 'all'
          ? 'Upload a resume, cover letter, offer, or portfolio file to keep it with the rest of your career records.'
          : 'Choose another year, show all years, or upload a document for this year.'
      }
      actionLabel={selectedYear === 'all' ? 'Add document' : 'Show all years'}
      onAction={
        selectedYear === 'all' ? () => setIsUploadModalVisible(true) : () => handleYearChange('all')
      }
      icon={<FileOutlined />}
    />
  );

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
      setDocuments((prev) =>
        prev.map((d) => (d.id === record.id ? { ...d, is_locked: !record.is_locked } : d))
      );
    } catch (error: unknown) {
      const apiError = error as ApiError;
      message.error(getApiErrorMessage(apiError, 'Failed to update lock status'));
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
    } catch (error: unknown) {
      const apiError = error as ApiError;
      if (apiError?.errorFields) return;
      message.error(getApiErrorMessage(apiError, 'Failed to update document'));
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const getFileIcon = (fileName: string | null | undefined) => {
    const normalized = (fileName || '').toLowerCase();
    if (normalized.endsWith('.pdf')) return <FilePdfOutlined className="text-red-500 text-lg" />;
    if (normalized.endsWith('.doc') || normalized.endsWith('.docx'))
      return <FileWordOutlined className="text-blue-500 text-lg" />;
    return <FileOutlined className="text-gray-500 text-lg" />;
  };

  const openDocument = async (record: Document) => {
    try {
      await openDocumentInNewTab(record.id);
    } catch (error) {
      message.error('Failed to open document');
      console.error(error);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'RESUME':
        return 'blue';
      case 'COVER_LETTER':
        return 'green';
      case 'OFFER_LETTER':
        return 'gold';
      case 'PORTFOLIO':
        return 'purple';
      default:
        return 'default';
    }
  };

  const openVersionsModal = async (record: Document) => {
    try {
      setVersionsLoading(true);
      setVersionTarget(record);
      setIsVersionModalOpen(true);
      const response = await getDocumentVersions(record.id);
      setVersionList(response.data);
    } catch (error) {
      message.error('Failed to load version history');
      console.error(error);
    } finally {
      setVersionsLoading(false);
    }
  };

  const handleUploadNewVersion = async () => {
    if (!versionTarget || !newVersionFile) {
      message.error('Please choose a file for the new version');
      return;
    }
    try {
      setUploadingVersion(true);
      const formData = new FormData();
      formData.append('file', newVersionFile);
      formData.append('title', versionTarget.title);
      formData.append('document_type', versionTarget.document_type);
      if (versionTarget.application) {
        formData.append('application', String(versionTarget.application));
      }
      await createDocumentVersion(versionTarget.id, formData);
      message.success('New version uploaded');
      const versionsResp = await getDocumentVersions(versionTarget.id);
      setVersionList(versionsResp.data);
      setNewVersionFile(null);
      fetchDocuments();
    } catch (error: unknown) {
      const apiError = error as ApiError;
      message.error(getApiErrorMessage(apiError, 'Failed to upload new version'));
      console.error(error);
    } finally {
      setUploadingVersion(false);
    }
  };

  const columns = [
    {
      title: 'Type',
      key: 'icon',
      width: 50,
      render: (_: unknown, record: Document) => getFileIcon(record.file_name),
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: Document) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openDocument(record)}
            className="font-medium text-blue-600 hover:underline"
          >
            {text}
          </button>
          {record.is_locked ? <LockOutlined className="text-amber-500" /> : null}
        </div>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'document_type',
      key: 'document_type',
      render: (type: string) => <Tag color={getTypeColor(type)}>{type.replace('_', ' ')}</Tag>,
    },
    {
      title: 'Version',
      key: 'version',
      render: (_: unknown, record: Document) => (
        <div className="flex items-center gap-2">
          <Tag color="geekblue">v{record.version_number || 1}</Tag>
          <Button type="link" size="small" onClick={() => openVersionsModal(record)}>
            History ({record.version_count || 1})
          </Button>
        </div>
      ),
    },
    {
      title: 'Linked Application',
      key: 'application',
      render: (_: unknown, record: Document) =>
        record.application_details ? (
          `${record.application_details.role} @ ${record.application_details.company}`
        ) : (
          <span className="text-gray-400">None</span>
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
      render: (_: unknown, record: Document) => (
        <RowActions
          size="middle"
          isLocked={record.is_locked}
          onToggleLock={() => handleToggleLock(record)}
          onView={() => openDocument(record)}
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
    <div className="space-y-6">
      <PageActionToolbar
        title="Document Vault"
        subtitle={`${documentsTotal.toLocaleString()} documents`}
        selectedYear={selectedYear}
        onYearChange={handleYearChange}
        availableYears={availableYears}
        onDeleteAll={handleDeleteAll}
        deleteAllLabel="Delete All"
        deleteAllConfirmTitle="Delete All Documents?"
        deleteAllConfirmDescription="This will permanently delete all documents."
        deleteAllDisabled={documentsUnlocked === 0}
        onExport={handleExportWrapper}
        exportFilename="documents"
        onImport={() => setIsUploadModalVisible(true)}
        onPrimaryAction={() => setIsUploadModalVisible(true)}
        primaryActionLabel="Add Document"
        primaryActionIcon={<PlusOutlined />}
      />

      {documentLoadFailed ? (
        <PageState
          tone="error"
          title="Documents could not be loaded"
          description="Your saved documents were not changed. Check your connection and try again."
          actionLabel="Retry loading documents"
          onAction={() => void fetchDocuments()}
          icon={<FileOutlined />}
        />
      ) : isMobile ? (
        <DocumentMobileList
          loading={loading}
          openDocument={openDocument}
          DOCUMENT_PAGE_SIZE={DOCUMENT_PAGE_SIZE}
          currentPage={currentPage}
          documentEmptyState={documentEmptyState}
          documentsTotal={documentsTotal}
          filteredDocuments={filteredDocuments}
          getFileIcon={getFileIcon}
          getTypeColor={getTypeColor}
          handleDelete={handleDelete}
          handleToggleLock={handleToggleLock}
          openEditModal={openEditModal}
          openVersionsModal={openVersionsModal}
          setCurrentPage={setCurrentPage}
        />
      ) : filteredDocuments.length === 0 && !loading ? (
        documentEmptyState
      ) : (
        <Card className="enterprise-table-shell">
          <Table
            columns={columns}
            dataSource={filteredDocuments}
            rowKey="id"
            loading={loading}
            pagination={{
              current: currentPage,
              pageSize: DOCUMENT_PAGE_SIZE,
              total: documentsTotal,
              showSizeChanger: false,
              onChange: setCurrentPage,
            }}
            scroll={{ x: 900 }}
            className="career-table"
          />
        </Card>
      )}

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
        <Form scrollToFirstError={SCROLL_TO_FIRST_ERROR} form={form} layout="vertical">
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
                { value: 'OFFER_LETTER', label: 'Offer Letter' },
                { value: 'PORTFOLIO', label: 'Portfolio' },
                { value: 'OTHER', label: 'Other' },
              ]}
            />
          </Form.Item>
          <Form.Item name="application" label="Link to Application (Optional)">
            <ApplicationSelect
              className="w-full"
              formatLabel={(a) => `${a.role_title} @ ${a.company_details?.name || 'Unknown'}`}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Version History${versionTarget ? ` - ${versionTarget.title}` : ''}`}
        open={isVersionModalOpen}
        onCancel={() => {
          setIsVersionModalOpen(false);
          setVersionTarget(null);
          setVersionList([]);
          setNewVersionFile(null);
        }}
        footer={null}
        width={760}
      >
        <DocumentPreviewBody
          isMobile={isMobile}
          MAX_DOCUMENT_FILE_BYTES={MAX_DOCUMENT_FILE_BYTES}
          handleUploadNewVersion={handleUploadNewVersion}
          loading={loading}
          openDocument={openDocument}
          setNewVersionFile={setNewVersionFile}
          uploadingVersion={uploadingVersion}
          versionList={versionList}
          versionsLoading={versionsLoading}
        />
      </Modal>
    </div>
  );
};

export default Documents;

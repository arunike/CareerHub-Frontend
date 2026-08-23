import type { ReactNode } from 'react';
import type React from 'react';
import { Button, Card, Pagination, Tag } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import type { Document } from '../../types';
import RowActions from '../../components/RowActions';

type Props = {
  DOCUMENT_PAGE_SIZE: any;
  documentEmptyState: ReactNode;
  currentPage: number;
  documentsTotal: number;
  filteredDocuments: any;
  getFileIcon: (fileName: string | null | undefined) => ReactNode;
  getTypeColor: (type: string) => string;
  handleDelete: (id: number) => void;
  handleToggleLock: (record: Document) => void;
  loading: boolean;
  openDocument: (record: Document) => void;
  openEditModal: (record: Document) => void;
  openVersionsModal: (record: Document) => void;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
};

const DocumentMobileList = ({
  currentPage,
  documentEmptyState,
  documentsTotal,
  filteredDocuments,
  getFileIcon,
  getTypeColor,
  handleDelete,
  handleToggleLock,
  loading,
  openDocument,
  openEditModal,
  openVersionsModal,
  setCurrentPage,
  DOCUMENT_PAGE_SIZE,
}: Props) => (
  <div className="space-y-3">
    {loading ? (
      <Card className="enterprise-card">
        <div className="space-y-3 py-3">
          <div className="h-4 w-6/12 rounded-full bg-slate-100" />
          <div className="h-3 w-9/12 rounded-full bg-slate-100" />
          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="h-10 rounded-xl bg-slate-100" />
            <div className="h-10 rounded-xl bg-slate-100" />
          </div>
        </div>
      </Card>
    ) : filteredDocuments.length === 0 ? (
      documentEmptyState
    ) : (
      <>
        {filteredDocuments.map((record: any) => (
          <Card key={record.id} className="enterprise-card">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">{getFileIcon(record.file_name)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => openDocument(record)}
                      className="min-w-0 text-left text-base font-semibold text-blue-600"
                    >
                      <span className="line-clamp-2">{record.title}</span>
                    </button>
                    {record.is_locked ? (
                      <LockOutlined className="mt-1 shrink-0 text-amber-500" />
                    ) : null}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Tag color={getTypeColor(record.document_type)}>
                      {record.document_type.replace('_', ' ')}
                    </Tag>
                    <Tag color="geekblue">v{record.version_number || 1}</Tag>
                    <Tag>{new Date(record.created_at).toLocaleDateString()}</Tag>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    {record.application_details
                      ? `${record.application_details.role} @ ${record.application_details.company}`
                      : 'Not linked to an application'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button size="large" onClick={() => openDocument(record)}>
                  Open
                </Button>
                <Button size="large" onClick={() => openVersionsModal(record)}>
                  History
                </Button>
              </div>
              <div className="flex justify-end border-t border-slate-100 pt-2">
                <RowActions
                  size="middle"
                  isLocked={record.is_locked}
                  onToggleLock={() => handleToggleLock(record)}
                  onEdit={() => openEditModal(record)}
                  disableEdit={Boolean(record.is_locked)}
                  onDelete={() => handleDelete(record.id)}
                  disableDelete={Boolean(record.is_locked)}
                  deleteTitle="Delete document?"
                  deleteDescription="This document will be permanently removed."
                />
              </div>
            </div>
          </Card>
        ))}
        {documentsTotal > DOCUMENT_PAGE_SIZE ? (
          <div className="flex justify-center pt-2">
            <Pagination
              current={currentPage}
              pageSize={DOCUMENT_PAGE_SIZE}
              total={documentsTotal}
              showSizeChanger={false}
              onChange={setCurrentPage}
            />
          </div>
        ) : null}
      </>
    )}
  </div>
);

export default DocumentMobileList;

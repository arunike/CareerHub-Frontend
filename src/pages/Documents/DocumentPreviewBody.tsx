import type React from 'react';
import { Button, Input, Table, Tag, message } from 'antd';
import type { Document } from '../../types';

type Props = {
  MAX_DOCUMENT_FILE_BYTES: any;
  handleUploadNewVersion: () => void;
  isMobile: any;
  loading: boolean;
  openDocument: (record: Document) => void;
  setNewVersionFile: React.Dispatch<React.SetStateAction<File | null>>;
  uploadingVersion: boolean;
  versionList: Document[];
  versionsLoading: boolean;
};

const DocumentPreviewBody = ({
  handleUploadNewVersion,
  isMobile,
  openDocument,
  setNewVersionFile,
  uploadingVersion,
  versionList,
  versionsLoading,
  MAX_DOCUMENT_FILE_BYTES,
}: Props) => (
  <div className="space-y-4">
    <div className="p-3 border border-gray-200 dark:border-white/[0.08] rounded-lg bg-gray-50 dark:bg-ink-900">
      <div className="text-sm font-medium text-gray-800 dark:text-ink-50 mb-2">
        Upload New Version
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          type="file"
          onChange={(e) => {
            const file = e.target.files?.[0] || null;
            if (file && file.size > MAX_DOCUMENT_FILE_BYTES) {
              message.error('Document must be smaller than 4 MB.');
              e.target.value = '';
              setNewVersionFile(null);
              return;
            }
            setNewVersionFile(file);
          }}
        />
        <Button type="primary" loading={uploadingVersion} onClick={handleUploadNewVersion}>
          Upload Version
        </Button>
      </div>
    </div>

    {isMobile ? (
      <div className="space-y-2" aria-busy={versionsLoading}>
        {versionsLoading ? (
          <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] p-4 text-sm text-slate-500 dark:text-ink-400">
            Loading version history…
          </div>
        ) : versionList.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] p-4 text-sm text-slate-500 dark:text-ink-400">
            No versions available.
          </div>
        ) : (
          versionList.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => openDocument(row)}
              className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 px-4 py-3 text-left"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-slate-900 dark:text-ink-50">
                  {row.file_name || row.title}
                </span>
                <span className="mt-1 block text-xs text-slate-500 dark:text-ink-400">
                  Uploaded {new Date(row.created_at).toLocaleDateString()}
                </span>
              </span>
              <Tag color={row.is_current ? 'success' : 'default'} className="shrink-0">
                v{row.version_number || 1}
                {row.is_current ? ' · Current' : ''}
              </Tag>
            </button>
          ))
        )}
      </div>
    ) : (
      <Table
        loading={versionsLoading}
        dataSource={versionList}
        rowKey="id"
        pagination={false}
        size="small"
        columns={[
          {
            title: 'Version',
            key: 'version_number',
            width: 110,
            render: (_: unknown, row: Document) => (
              <Tag color={row.is_current ? 'success' : 'default'}>
                v{row.version_number || 1}
                {row.is_current ? ' (current)' : ''}
              </Tag>
            ),
          },
          {
            title: 'File',
            key: 'file',
            render: (_: unknown, row: Document) => (
              <button
                type="button"
                onClick={() => openDocument(row)}
                className="text-blue-600 dark:text-blue-300 hover:underline"
              >
                {row.file_name || row.title}
              </button>
            ),
          },
          {
            title: 'Uploaded',
            dataIndex: 'created_at',
            key: 'created_at',
            width: 140,
            render: (value: string) => new Date(value).toLocaleDateString(),
          },
        ]}
      />
    )}
  </div>
);

export default DocumentPreviewBody;

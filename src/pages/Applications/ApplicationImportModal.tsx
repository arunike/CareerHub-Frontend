import { Button, Input, Select, Spin, Upload, type UploadProps } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import ModalShell from '../../components/ModalShell';
import {
  APPLICATION_IMPORT_REVIEW_FIELDS,
  type ApplicationImportReviewFieldKey,
  type buildEditableImportReview,
} from './applicationImportReview';
import type { ApplicationFileImportPreview } from '../../api';

const { Dragger } = Upload;

type ImportReview = ReturnType<typeof buildEditableImportReview>;
type ReviewField = { key: ApplicationImportReviewFieldKey; label: string; required?: boolean };

type Props = {
  applicationImportApplying: boolean;
  applicationImportFileName: string;
  applicationImportPreviewing: boolean;
  applyApplicationImport: () => void;
  closeImportModal: () => void;
  applicationImportPreview: ApplicationFileImportPreview | null;
  editableImportReview: ImportReview | null;
  importProps: UploadProps;
  applicationImportMapping: Record<string, string>;
  getImportFieldValue: (
    row: Record<string, string>,
    fieldKey: ApplicationImportReviewFieldKey
  ) => string;
  isImportModalOpen: boolean;
  updateImportMapping: (fieldKey: string, header: string) => void;
  updateImportRowValue: (
    rowIndex: number,
    fieldKey: ApplicationImportReviewFieldKey,
    value: string
  ) => void;
  visibleImportReviewFields: readonly ReviewField[];
};

const ApplicationImportModal = ({
  applicationImportApplying,
  applicationImportFileName,
  applicationImportPreviewing,
  applyApplicationImport,
  closeImportModal,
  applicationImportPreview,
  editableImportReview,
  importProps,
  applicationImportMapping,
  getImportFieldValue,
  isImportModalOpen,
  updateImportMapping,
  updateImportRowValue,
  visibleImportReviewFields,
}: Props) => (
  <ModalShell
    isOpen={isImportModalOpen}
    title="Import Applications"
    onClose={closeImportModal}
    maxWidthClass="max-w-[1100px]"
    bodyClassName="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6"
    footer={
      applicationImportPreview ? (
        <>
          <Button size="large" onClick={closeImportModal} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            size="large"
            type="primary"
            disabled={(editableImportReview?.summary.errors || 0) > 0}
            loading={applicationImportApplying}
            onClick={applyApplicationImport}
            className="w-full sm:w-auto"
          >
            Confirm import
          </Button>
        </>
      ) : null
    }
  >
    {applicationImportPreviewing ? (
      <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-ink-900 px-4 py-10">
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 shadow-sm">
            <Spin />
          </div>
          <div className="text-base font-semibold text-slate-900 dark:text-ink-50">
            Preparing import preview
          </div>
          <div className="mt-2 text-sm text-slate-500 dark:text-ink-400">
            Reading {applicationImportFileName || 'your file'}, detecting columns, and checking rows
            against existing applications.
          </div>
          <div className="mt-5 grid w-full grid-cols-3 gap-2 text-left">
            {['Read file', 'Map fields', 'Check rows'].map((step, index) => (
              <div
                key={step}
                className="rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 px-3 py-2"
              >
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-ink-500">
                  Step {index + 1}
                </div>
                <div className="mt-1 text-xs font-medium text-slate-700 dark:text-ink-100">
                  {step}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ) : !applicationImportPreview ? (
      <Dragger {...importProps}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">Click or drag a CSV/XLSX file to preview</p>
        <p className="ant-upload-hint">
          We infer column mapping first. Nothing is created until you confirm.
        </p>
      </Dragger>
    ) : (
      <div className="space-y-4">
        <div className="rounded-xl border border-sky-100 dark:border-sky-500/20 bg-sky-50 dark:bg-sky-500/10 px-4 py-3">
          <div className="text-sm font-semibold text-slate-900 dark:text-ink-50">
            {editableImportReview?.summary.total_rows || 0} rows ready for review
          </div>
          <div className="mt-1 text-xs text-slate-600 dark:text-ink-200">
            {editableImportReview?.summary.creates || 0} new /{' '}
            {editableImportReview?.summary.updates || 0} updates /{' '}
            {editableImportReview?.summary.errors || 0} need attention
          </div>
          <div
            className={`mt-2 text-xs font-medium ${
              applicationImportPreview.ai_status === 'success'
                ? 'text-emerald-700 dark:text-emerald-300'
                : applicationImportPreview.ai_status === 'failed'
                  ? 'text-rose-700 dark:text-rose-300'
                  : 'text-amber-700 dark:text-amber-300'
            }`}
          >
            {applicationImportPreview.ai_status === 'success'
              ? 'AI mapped the columns. Review before importing.'
              : applicationImportPreview.ai_status === 'failed'
                ? 'AI mapping was unavailable, so built-in matching was used.'
                : 'Built-in matching was used. Configure AI provider for multilingual mapping.'}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 p-4">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-ink-50">
                AI Recognized Fields
              </div>
              <div className="text-xs text-slate-500 dark:text-ink-400">
                Review the detected columns, then fix any row values below before importing.
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {visibleImportReviewFields.map((field) => {
              const mappedHeader = applicationImportMapping[field.key];
              return (
                <div
                  key={field.key}
                  className={`rounded-lg border px-3 py-2 ${
                    mappedHeader
                      ? 'border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-ink-900'
                      : field.required
                        ? 'border-rose-200 dark:border-rose-500/25 bg-rose-50 dark:bg-rose-500/10'
                        : 'border-slate-200 dark:border-white/[0.08] bg-white dark:bg-ink-900'
                  }`}
                >
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-ink-400">
                    {field.label}
                    {field.required ? (
                      <span className="text-rose-500 dark:text-rose-400"> *</span>
                    ) : null}
                  </div>
                  <div className="mt-1 truncate text-sm font-medium text-slate-900 dark:text-ink-50">
                    {mappedHeader || 'Needs mapping'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] overflow-hidden">
          <div className="bg-slate-50 dark:bg-ink-900 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-ink-50">
            Confirm Column Mapping
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
            {APPLICATION_IMPORT_REVIEW_FIELDS.map((field: ReviewField) => (
              <label key={field.key} className="space-y-1">
                <span className="text-xs font-medium text-slate-600 dark:text-ink-200">
                  {field.label}
                  {field.required ? (
                    <span className="text-red-500 dark:text-red-400"> *</span>
                  ) : null}
                </span>
                <Select
                  className="w-full"
                  allowClear
                  value={applicationImportMapping[field.key]}
                  placeholder={field.required ? 'Select column' : 'Optional'}
                  onChange={(value) => updateImportMapping(field.key, value || '')}
                  options={applicationImportPreview.headers.map((header) => ({
                    value: header,
                    label: header,
                  }))}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] overflow-hidden">
          <div className="bg-slate-50 dark:bg-ink-900 px-4 py-3">
            <div className="text-sm font-semibold text-slate-900 dark:text-ink-50">
              Review Row Values
            </div>
            <div className="text-xs text-slate-500 dark:text-ink-400">
              Edit the values CareerHub will save. Changes here are included when you confirm.
            </div>
          </div>
          <div className="max-h-96 overflow-auto">
            <table className="min-w-[980px] text-sm">
              <thead className="bg-slate-50 dark:bg-ink-900 text-left text-xs text-slate-500 dark:text-ink-400">
                <tr>
                  <th className="w-14 px-3 py-2">Row</th>
                  <th className="w-24 px-3 py-2">Action</th>
                  {visibleImportReviewFields.map((field) => (
                    <th key={field.key} className="min-w-36 px-3 py-2">
                      {field.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.07]">
                {(editableImportReview?.items || []).slice(0, 50).map((item, rowIndex) => (
                  <tr key={item.row}>
                    <td className="px-3 py-2 align-top text-slate-500 dark:text-ink-400">
                      {item.row}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          item.action === 'create'
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                            : item.action === 'update'
                              ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300'
                              : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300'
                        }`}
                      >
                        {item.action}
                      </span>
                    </td>
                    {visibleImportReviewFields.map((field) => {
                      const mappedHeader = applicationImportMapping[field.key];
                      return (
                        <td key={field.key} className="px-3 py-2 align-top">
                          <Input
                            size="small"
                            disabled={!mappedHeader}
                            value={getImportFieldValue(item.raw, field.key)}
                            placeholder={mappedHeader ? field.label : 'Map column first'}
                            onChange={(event) =>
                              updateImportRowValue(rowIndex, field.key, event.target.value)
                            }
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(editableImportReview?.items.length || 0) > 50 ? (
            <div className="border-t border-slate-100 dark:border-white/[0.07] px-3 py-2 text-xs text-slate-500 dark:text-ink-400">
              Showing first 50 rows.
            </div>
          ) : null}
        </div>
      </div>
    )}
  </ModalShell>
);

export default ApplicationImportModal;

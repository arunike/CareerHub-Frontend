import type React from 'react';
import {
  DeleteOutlined,
  MoreOutlined,
  PlusOutlined,
  TableOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { Button, Segmented, Tabs } from 'antd';
import type { GoogleSheetSyncPreview } from '../../types';
import { DEFAULT_MAPPING } from './sheetMapping';
import type { Draft } from './sheetMapping';

type FieldOption = { key: string; label: string; required?: boolean };

type Props = {
  addMappingField: () => void;
  onAutoMap: (headers: string[]) => void;
  draft: Draft;
  fieldForSheetHeader: (sheetHeader: string) => string;
  fieldToAdd: string;
  fields: FieldOption[];
  preview: GoogleSheetSyncPreview | null;
  removeMappingField: (key: string) => void;
  requiredFields: FieldOption[];
  sampleForHeader: (sheetHeader: string) => string;
  setFieldToAdd: React.Dispatch<React.SetStateAction<string>>;
  sheetMappingHeaders: string[];
  unmappedFields: FieldOption[];
  updateMapping: (key: string, value: string) => void;
  updateSheetColumnMapping: (sheetHeader: string, fieldKey: string) => void;
  updateStrategy: (key: string, value: string) => void;
  visibleMappingFields: FieldOption[];
};

const SheetMappingTabs = ({
  addMappingField,
  onAutoMap,
  draft,
  fieldForSheetHeader,
  fieldToAdd,
  fields,
  preview,
  removeMappingField,
  requiredFields,
  sampleForHeader,
  setFieldToAdd,
  sheetMappingHeaders,
  unmappedFields,
  updateMapping,
  updateSheetColumnMapping,
  updateStrategy,
  visibleMappingFields,
}: Props) => (
  <Tabs
    defaultActiveKey="mapping"
    moreIcon={<MoreOutlined aria-label="More integration tabs" />}
    items={[
      {
        key: 'mapping',
        label: 'Column Mapping',
        children: (
          <div className="rounded-xl border border-gray-200 dark:border-white/[0.08] overflow-hidden">
            <div className="bg-gray-50 dark:bg-ink-900 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <TableOutlined className="text-gray-500 dark:text-ink-400" />
                <span className="text-sm font-semibold text-gray-800 dark:text-ink-50">
                  Column Mapping
                </span>
              </div>
              <Button
                size="small"
                className="min-h-11"
                icon={<ThunderboltOutlined />}
                disabled={!preview?.headers.length}
                onClick={() => {
                  if (!preview?.headers.length) return;
                  onAutoMap(preview.headers);
                }}
              >
                Auto-map
              </Button>
            </div>
            {requiredFields.length > 0 && (
              <div className="border-t border-gray-200 dark:border-white/[0.08] bg-amber-50/60 dark:bg-amber-500/10 px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                  Required mappings
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {requiredFields.map((field) => {
                    const mappedHeader = draft.column_mapping[field.key] || '';
                    return (
                      <span
                        key={field.key}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          mappedHeader
                            ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-200'
                            : 'bg-white dark:bg-ink-900 text-amber-800 dark:text-amber-200 ring-1 ring-amber-200 dark:ring-amber-500/25'
                        }`}
                      >
                        {field.label}: {mappedHeader || 'needs column'}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            {sheetMappingHeaders.length > 0 ? (
              <div className="divide-y divide-gray-100 dark:divide-white/[0.07]">
                {sheetMappingHeaders.map((sheetHeader) => {
                  const selectedField = fieldForSheetHeader(sheetHeader);
                  const availableFields = fields.filter(
                    (field) =>
                      field.key === selectedField ||
                      !Object.prototype.hasOwnProperty.call(draft.column_mapping, field.key)
                  );
                  return (
                    <div
                      key={sheetHeader}
                      className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr_1.1fr_auto] gap-2 px-4 py-3 items-center"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-ink-50 truncate">
                            {sheetHeader}
                          </div>
                          {selectedField &&
                            fields.find((field) => field.key === selectedField)?.required && (
                              <span className="rounded-full bg-amber-100 dark:bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:text-amber-200">
                                Required
                              </span>
                            )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-ink-400">
                          Google Sheet column
                        </div>
                      </div>
                      <select
                        aria-label={`Import destination for ${sheetHeader}`}
                        className="min-h-11 w-full rounded-lg border border-gray-300 dark:border-white/[0.12] bg-white dark:bg-ink-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        value={selectedField}
                        onChange={(event) =>
                          updateSheetColumnMapping(sheetHeader, event.target.value)
                        }
                      >
                        <option value="">Do not import</option>
                        {availableFields.map((field) => (
                          <option key={field.key} value={field.key}>
                            {field.label}
                            {field.required ? ' *' : ''}
                          </option>
                        ))}
                      </select>
                      <div className="rounded-lg bg-gray-50 dark:bg-ink-900 px-3 py-2 text-xs text-gray-600 dark:text-ink-200 truncate min-h-[38px] flex items-center">
                        {sampleForHeader(sheetHeader) || 'No sample value'}
                      </div>
                      <Button
                        size="small"
                        danger
                        aria-label={`Remove mapping for ${sheetHeader}`}
                        className="min-h-11 min-w-11"
                        icon={<DeleteOutlined />}
                        disabled={
                          !selectedField ||
                          !!fields.find((field) => field.key === selectedField)?.required
                        }
                        onClick={() => selectedField && removeMappingField(selectedField)}
                      />
                    </div>
                  );
                })}
              </div>
            ) : visibleMappingFields.length === 0 ? (
              <div className="px-4 py-5 text-sm text-gray-500 dark:text-ink-400">
                Save and test the sheet to generate the mapping from its column headers.
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-white/[0.07]">
                {visibleMappingFields.map((field) => (
                  <div
                    key={field.key}
                    className="grid grid-cols-1 sm:grid-cols-[160px_1fr_auto] gap-2 px-4 py-3 items-center"
                  >
                    <label
                      htmlFor={`google-sheet-mapping-${field.key}`}
                      className="text-sm text-gray-700 dark:text-ink-100"
                    >
                      {field.label}
                      {field.required && (
                        <span className="text-red-500 dark:text-red-400 ml-1">*</span>
                      )}
                    </label>
                    <select
                      id={`google-sheet-mapping-${field.key}`}
                      className="min-h-11 w-full rounded-lg border border-gray-300 dark:border-white/[0.12] bg-white dark:bg-ink-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      value={draft.column_mapping[field.key] || ''}
                      onChange={(event) => updateMapping(field.key, event.target.value)}
                    >
                      <option value="">Choose sheet column</option>
                      {preview?.headers.length ? (
                        preview.headers.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))
                      ) : (
                        <option
                          value={
                            draft.column_mapping[field.key] ||
                            DEFAULT_MAPPING[draft.target_type][field.key]
                          }
                        >
                          {draft.column_mapping[field.key] ||
                            DEFAULT_MAPPING[draft.target_type][field.key]}
                        </option>
                      )}
                    </select>
                    <Button
                      size="small"
                      danger
                      aria-label={`Remove ${field.label} mapping`}
                      className="min-h-11 min-w-11"
                      icon={<DeleteOutlined />}
                      disabled={field.required}
                      onClick={() => removeMappingField(field.key)}
                    />
                  </div>
                ))}
              </div>
            )}
            {unmappedFields.length > 0 && (
              <div className="bg-white dark:bg-ink-900 px-4 py-3 border-t border-gray-200 dark:border-white/[0.08] flex flex-col sm:flex-row gap-2">
                <select
                  aria-label="Field to add"
                  className="min-h-11 flex-1 rounded-lg border border-gray-300 dark:border-white/[0.12] bg-white dark:bg-ink-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  value={fieldToAdd}
                  onChange={(event) => setFieldToAdd(event.target.value)}
                >
                  <option value="">Add another field</option>
                  {unmappedFields.map((field) => (
                    <option key={field.key} value={field.key}>
                      {field.label}
                    </option>
                  ))}
                </select>
                <Button icon={<PlusOutlined />} onClick={addMappingField} disabled={!fieldToAdd}>
                  Add Field
                </Button>
              </div>
            )}
            {preview?.headers.length ? (
              <div className="bg-slate-50 dark:bg-ink-900 border-t border-gray-200 dark:border-white/[0.08] px-4 py-3 text-xs text-gray-500 dark:text-ink-400">
                Showing {preview.headers.filter((header) => header.trim()).length} sheet columns.
                Columns set to "Do not import" are ignored during sync.
              </div>
            ) : null}
          </div>
        ),
      },
      {
        key: 'strategy',
        label: 'Overwrite Strategy',
        children: (
          <div className="rounded-xl border border-gray-200 dark:border-white/[0.08] overflow-hidden bg-white dark:bg-ink-900">
            <div className="bg-gray-50 dark:bg-ink-900 px-4 py-3 border-b border-gray-200 dark:border-white/[0.08]">
              <p className="text-sm text-gray-600 dark:text-ink-200">
                Choose how we handle fields when an application already exists.
              </p>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-white/[0.07]">
              {visibleMappingFields.map((field) => (
                <div
                  key={field.key}
                  className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-4 px-4 py-3 items-center"
                >
                  <label className="text-sm font-medium text-gray-700 dark:text-ink-100">
                    {field.label}
                  </label>
                  <Segmented
                    aria-label={`${field.label} overwrite strategy`}
                    options={[
                      { label: 'Always Overwrite', value: 'always' },
                      { label: 'Only if Empty', value: 'if_empty' },
                      { label: 'Never Overwrite', value: 'never' },
                    ]}
                    value={draft.overwrite_strategies[field.key] || 'always'}
                    onChange={(value) => updateStrategy(field.key, value.toString())}
                  />
                </div>
              ))}
            </div>
          </div>
        ),
      },
    ]}
  />
);

export default SheetMappingTabs;

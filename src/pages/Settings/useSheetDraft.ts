import { useMemo, useState } from 'react';
import type { GoogleSheetSyncPreview, GoogleSheetSyncTarget } from '../../types';
import {
  FIELD_OPTIONS,
  buildAutoMapping,
  emptyDraft,
  normalizeHeader,
  type Draft,
} from './sheetMapping';

export const useSheetDraft = () => {
  const [draft, setDraft] = useState<Draft>(() => emptyDraft());
  const [preview, setPreview] = useState<GoogleSheetSyncPreview | null>(null);
  const [fieldToAdd, setFieldToAdd] = useState('');

  const fields = useMemo(() => FIELD_OPTIONS[draft.target_type], [draft.target_type]);
  const requiredFields = useMemo(() => fields.filter((field) => field.required), [fields]);
  const activeFields = useMemo(
    () =>
      fields.filter((field) =>
        Object.prototype.hasOwnProperty.call(draft.column_mapping, field.key)
      ),
    [draft.column_mapping, fields]
  );
  const visibleMappingFields = useMemo(() => {
    const activeOptionalFields = activeFields.filter((field) => !field.required);
    return [...requiredFields, ...activeOptionalFields];
  }, [activeFields, requiredFields]);
  const unmappedFields = useMemo(
    () =>
      fields.filter(
        (field) =>
          !field.required && !Object.prototype.hasOwnProperty.call(draft.column_mapping, field.key)
      ),
    [draft.column_mapping, fields]
  );
  const missingRequiredFields = useMemo(
    () => requiredFields.filter((field) => !(draft.column_mapping[field.key] || '').trim()),
    [draft.column_mapping, requiredFields]
  );
  const canSaveDraft = Boolean(
    draft.name.trim() && draft.sheet_url.trim() && missingRequiredFields.length === 0
  );
  const sheetMappingHeaders = useMemo(() => {
    const headers = preview?.headers.filter((header) => header.trim()) || [];
    const extraMappedHeaders = Object.values(draft.column_mapping).filter(
      (header) => header && !headers.includes(header)
    );
    return [...headers, ...extraMappedHeaders];
  }, [draft.column_mapping, preview?.headers]);

  const updateDraft = (patch: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const updateMapping = (key: string, value: string) => {
    setDraft((current) => ({
      ...current,
      column_mapping: { ...current.column_mapping, [key]: value },
    }));
  };

  const updateStrategy = (key: string, value: string) => {
    setDraft((current) => ({
      ...current,
      overwrite_strategies: { ...current.overwrite_strategies, [key]: value },
    }));
  };

  const updateSheetColumnMapping = (sheetHeader: string, fieldKey: string) => {
    setDraft((current) => {
      const nextMapping = { ...current.column_mapping };
      for (const [mappedField, mappedHeader] of Object.entries(nextMapping)) {
        if (mappedHeader === sheetHeader || mappedField === fieldKey) {
          delete nextMapping[mappedField];
        }
      }
      if (fieldKey) {
        nextMapping[fieldKey] = sheetHeader;
      }
      return { ...current, column_mapping: nextMapping };
    });
  };

  const applyAutoMapping = (headers: string[], targetType = draft.target_type) => {
    const nextMapping = buildAutoMapping(targetType, headers);
    setDraft((current) => ({
      ...current,
      target_type: targetType,
      column_mapping: nextMapping,
    }));
    return nextMapping;
  };

  const addMappingField = () => {
    if (!fieldToAdd) return;
    const field = fields.find((candidate) => candidate.key === fieldToAdd);
    if (!field) return;
    setDraft((current) => ({
      ...current,
      column_mapping: {
        ...current.column_mapping,
        [field.key]:
          preview?.headers.find(
            (header) => normalizeHeader(header) === normalizeHeader(field.label)
          ) || '',
      },
    }));
    setFieldToAdd('');
  };

  const removeMappingField = (key: string) => {
    setDraft((current) => {
      const nextMapping = { ...current.column_mapping };
      delete nextMapping[key];
      return { ...current, column_mapping: nextMapping };
    });
  };

  const fieldForSheetHeader = (sheetHeader: string) =>
    Object.entries(draft.column_mapping).find(
      ([, mappedHeader]) => mappedHeader === sheetHeader
    )?.[0] || '';

  const sampleForHeader = (sheetHeader: string) =>
    preview?.rows.find((row) => row[sheetHeader])?.[sheetHeader] || '';

  const changeTarget = (targetType: GoogleSheetSyncTarget) => {
    setDraft((current) => ({
      ...current,
      target_type: targetType,
      column_mapping: preview?.headers.length ? buildAutoMapping(targetType, preview.headers) : {},
    }));
    setFieldToAdd('');
  };

  // The first worksheet tab is the fallback when the draft has no tab chosen yet.
  const draftPayload = (fallbackWorksheet = '') => ({
    name: draft.name.trim() || 'Preview',
    sheet_url: draft.sheet_url.trim(),
    worksheet_name: draft.worksheet_name.trim() || fallbackWorksheet,
    target_type: draft.target_type,
    enabled: draft.enabled,
    sync_time: draft.sync_time,
    sync_timezone: draft.sync_timezone,
    header_row: draft.header_row,
    missing_row_strategy: draft.missing_row_strategy,
    missing_row_delete_after_days: draft.missing_row_delete_after_days,
    column_mapping: draft.column_mapping,
    overwrite_strategies: draft.overwrite_strategies,
  });

  return {
    draft,
    setDraft,
    preview,
    setPreview,
    fieldToAdd,
    setFieldToAdd,
    fields,
    requiredFields,
    visibleMappingFields,
    unmappedFields,
    missingRequiredFields,
    canSaveDraft,
    sheetMappingHeaders,
    updateDraft,
    updateMapping,
    updateStrategy,
    updateSheetColumnMapping,
    applyAutoMapping,
    addMappingField,
    removeMappingField,
    fieldForSheetHeader,
    sampleForHeader,
    changeTarget,
    draftPayload,
  };
};

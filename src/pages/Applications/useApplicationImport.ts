import { useCallback, useMemo, useState } from 'react';
import type { MessageInstance } from 'antd/es/message/interface';
import type { UploadProps } from 'antd';
import {
  applyImportApplications,
  previewImportApplications,
  type ApplicationFileImportPreview,
} from '../../api';
import type { CareerApplication } from '../../types/application';
import { getApiErrorMessage } from '../../utils/apiError';
import {
  APPLICATION_IMPORT_REVIEW_FIELDS,
  buildEditableImportReview,
  getCoreImportMapping,
  getImportFieldValue as readImportFieldValue,
  type ApplicationImportReviewFieldKey,
} from './applicationImportReview';

export const useApplicationImport = ({
  applications,
  messageApi,
  onImported,
}: {
  applications: CareerApplication[];
  messageApi: MessageInstance;
  onImported: () => void;
}) => {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [applicationImportPreview, setApplicationImportPreview] =
    useState<ApplicationFileImportPreview | null>(null);
  const [applicationImportRows, setApplicationImportRows] = useState<Array<Record<string, string>>>(
    []
  );
  const [applicationImportFileName, setApplicationImportFileName] = useState('');
  const [applicationImportMapping, setApplicationImportMapping] = useState<Record<string, string>>(
    {}
  );
  const [applicationImportPreviewing, setApplicationImportPreviewing] = useState(false);
  const [applicationImportApplying, setApplicationImportApplying] = useState(false);

  const importProps: UploadProps = {
    name: 'file',
    multiple: false,
    showUploadList: false,
    beforeUpload: (file) => {
      const formData = new FormData();
      formData.append('file', file);
      setApplicationImportFileName(file.name);
      setApplicationImportPreview(null);
      setApplicationImportRows([]);
      setApplicationImportMapping({});
      setApplicationImportPreviewing(true);
      previewImportApplications(formData)
        .then((response) => {
          setApplicationImportPreview(response.data.preview);
          setApplicationImportRows(response.data.preview.rows);
          setApplicationImportMapping(getCoreImportMapping(response.data.preview.mapping));
        })
        .catch((error) => {
          messageApi.error(getApiErrorMessage(error, 'Import preview failed'));
        })
        .finally(() => {
          setApplicationImportPreviewing(false);
        });
      return false;
    },
  };

  const closeImportModal = () => {
    setIsImportModalOpen(false);
    setApplicationImportPreview(null);
    setApplicationImportRows([]);
    setApplicationImportFileName('');
    setApplicationImportMapping({});
  };

  const updateImportMapping = (fieldKey: string, header: string) => {
    setApplicationImportMapping((current) => {
      const next = { ...current };
      if (header) {
        next[fieldKey] = header;
      } else {
        delete next[fieldKey];
      }
      return next;
    });
  };

  const getImportFieldValue = useCallback(
    (row: Record<string, string>, fieldKey: ApplicationImportReviewFieldKey) =>
      readImportFieldValue(row, applicationImportMapping, fieldKey),
    [applicationImportMapping]
  );

  const updateImportRowValue = (
    rowIndex: number,
    fieldKey: ApplicationImportReviewFieldKey,
    value: string
  ) => {
    const header = applicationImportMapping[fieldKey];
    if (!header) {
      messageApi.warning('Map this field to a column before editing its values.');
      return;
    }
    setApplicationImportRows((current) =>
      current.map((row, index) => (index === rowIndex ? { ...row, [header]: value } : row))
    );
  };

  const editableImportReview = useMemo(() => {
    if (!applicationImportPreview) return null;
    return buildEditableImportReview({
      rows: applicationImportRows,
      applications,
      mapping: applicationImportMapping,
    });
  }, [applicationImportPreview, applicationImportRows, applications, applicationImportMapping]);

  const visibleImportReviewFields = useMemo(
    () =>
      APPLICATION_IMPORT_REVIEW_FIELDS.filter(
        (field) => field.required || applicationImportMapping[field.key]
      ),
    [applicationImportMapping]
  );

  const applyApplicationImport = async () => {
    if (!applicationImportPreview) return;
    if (!applicationImportMapping.company_name || !applicationImportMapping.role_title) {
      messageApi.warning('Map Company and Role before importing');
      return;
    }
    setApplicationImportApplying(true);
    try {
      const response = await applyImportApplications(
        applicationImportRows,
        applicationImportMapping
      );
      const { result } = response.data;
      if (result.errors.length > 0) {
        messageApi.warning(
          `Imported with ${result.errors.length} row issue(s): ${result.created} created, ${result.updated} updated`
        );
      } else {
        messageApi.success(`Import complete: ${result.created} created, ${result.updated} updated`);
      }
      closeImportModal();
      onImported();
    } catch (error) {
      messageApi.error(getApiErrorMessage(error, 'Failed to apply import'));
    } finally {
      setApplicationImportApplying(false);
    }
  };

  return {
    isImportModalOpen,
    setIsImportModalOpen,
    applicationImportPreview,
    applicationImportFileName,
    applicationImportMapping,
    applicationImportPreviewing,
    applicationImportApplying,
    importProps,
    closeImportModal,
    updateImportMapping,
    getImportFieldValue,
    updateImportRowValue,
    editableImportReview,
    visibleImportReviewFields,
    applyApplicationImport,
  };
};

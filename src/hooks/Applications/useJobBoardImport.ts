import { useState } from 'react';
import { Form } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';
import dayjs from 'dayjs';
import { createApplication, extractJobBoardPosting, type JobBoardImportResult } from '../../api';
import { getApiErrorMessage } from '../../utils/apiError';

export const useJobBoardImport = ({
  messageApi,
  onCreated,
}: {
  messageApi: MessageInstance;
  onCreated: () => void;
}) => {
  const [jobImportForm] = Form.useForm();
  const [isJobImportModalOpen, setIsJobImportModalOpen] = useState(false);
  const [jobImportUrl, setJobImportUrl] = useState('');
  const [jobImportPreview, setJobImportPreview] = useState<JobBoardImportResult | null>(null);
  const [jobImportLoading, setJobImportLoading] = useState(false);
  const [jobImportSaving, setJobImportSaving] = useState(false);

  const closeJobImportModal = () => {
    setIsJobImportModalOpen(false);
    setJobImportUrl('');
    setJobImportPreview(null);
    jobImportForm.resetFields();
  };

  const handleExtractJobPosting = async () => {
    if (!jobImportUrl.trim()) {
      messageApi.warning('Paste a public HTTPS job posting URL first');
      return;
    }

    try {
      setJobImportLoading(true);
      const response = await extractJobBoardPosting(jobImportUrl.trim());
      setJobImportPreview(response.data);
      jobImportForm.setFieldsValue({
        company: response.data.company,
        role_title: response.data.role_title,
        office_location: response.data.location,
        employment_type: response.data.employment_type || 'full_time',
        salary_range: response.data.salary_range,
        job_description: response.data.job_description,
      });
      messageApi.success('Job details extracted');
    } catch (error: unknown) {
      messageApi.error(getApiErrorMessage(error, 'Failed to extract this job posting'));
      console.error(error);
    } finally {
      setJobImportLoading(false);
    }
  };

  const handleCreateFromJobImport = async () => {
    if (!jobImportPreview) return;

    try {
      const values = await jobImportForm.validateFields();
      setJobImportSaving(true);
      await createApplication({
        company_name: values.company,
        role_title: values.role_title,
        status: 'APPLIED',
        employment_type: values.employment_type || 'full_time',
        job_link: jobImportPreview.source_url,
        salary_range: values.salary_range || '',
        office_location: values.office_location || '',
        location: values.office_location || '',
        // Stored in its own column now, so it stays queryable and out of your notes.
        job_description: values.job_description || '',
        notes: '',
        date_applied: dayjs().format('YYYY-MM-DD'),
      });
      messageApi.success('Application imported');
      closeJobImportModal();
      onCreated();
    } catch (error: unknown) {
      if ((error as { errorFields?: unknown })?.errorFields) return;
      messageApi.error(getApiErrorMessage(error, 'Failed to create imported application'));
      console.error(error);
    } finally {
      setJobImportSaving(false);
    }
  };

  return {
    jobImportForm,
    isJobImportModalOpen,
    setIsJobImportModalOpen,
    jobImportUrl,
    setJobImportUrl,
    jobImportPreview,
    jobImportLoading,
    jobImportSaving,
    closeJobImportModal,
    handleExtractJobPosting,
    handleCreateFromJobImport,
  };
};

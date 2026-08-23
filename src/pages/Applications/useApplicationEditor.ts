import { useCallback, useEffect, useState } from 'react';
import type { FormInstance } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';
import { useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import type React from 'react';
import { createApplication, getApplication, patchDocument, updateApplication } from '../../api';
import type { Document } from '../../types';
import type { CareerApplication } from '../../types/application';
import { dayjsDateOnlyLocal } from '../../utils/dateOnly';
import { getRoundNumberFromStatus, type ApplicationFormValues } from './applicationTypes';

export const useApplicationEditor = ({
  form,
  documents,
  setDocuments,
  setApplications,
  messageApi,
  refresh,
}: {
  form: FormInstance;
  documents: Document[];
  setDocuments: React.Dispatch<React.SetStateAction<Document[]>>;
  setApplications: React.Dispatch<React.SetStateAction<CareerApplication[]>>;
  messageApi: MessageInstance;
  refresh: () => void;
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [detailApp, setDetailApp] = useState<CareerApplication | null>(null);
  const [detailDrawerMode, setDetailDrawerMode] = useState<'view' | 'edit'>('view');

  const populateApplicationForm = (app: CareerApplication) => {
    setEditingId(app.id);
    form.setFieldsValue({
      company: app.company_details?.name,
      role_title: app.role_title,
      status: app.status,
      employment_type: app.employment_type || 'full_time',
      level: app.level || '',
      site_link: app.job_link,
      job_description: app.job_description || '',
      salary_range: app.salary_range,
      office_location: app.office_location || app.location,
      rto_policy: app.rto_policy || 'UNKNOWN',
      visa_sponsorship:
        app.visa_sponsorship && app.visa_sponsorship !== 'UNKNOWN'
          ? app.visa_sponsorship
          : undefined,
      day_one_gc: app.day_one_gc && app.day_one_gc !== 'UNKNOWN' ? app.day_one_gc : undefined,
      growth_score: app.growth_score ?? null,
      work_life_score: app.work_life_score ?? null,
      brand_score: app.brand_score ?? null,
      team_score: app.team_score ?? null,
      date_applied: dayjsDateOnlyLocal(app.date_applied),
      notes: app.notes,
      linked_document_ids: documents
        .filter((doc) => doc.application === app.id)
        .map((doc) => doc.id),
    });
  };

  const openAddModal = useCallback(() => {
    setEditingId(null);
    setDetailApp(null);
    setDetailDrawerMode('view');
    form.resetFields();
    form.setFieldsValue({
      status: 'APPLIED',
      employment_type: 'full_time',
      date_applied: dayjs(),
      rto_policy: 'UNKNOWN',
      visa_sponsorship: undefined,
      day_one_gc: undefined,
      linked_document_ids: [],
    });
    setIsAddModalOpen(true);
  }, [form]);

  const handleDuplicateApplication = (app: CareerApplication) => {
    populateApplicationForm(app);
    setEditingId(null);
    form.setFieldValue('role_title', `${app.role_title} (Copy)`);
    setDetailApp(null);
    setDetailDrawerMode('view');
    setIsAddModalOpen(true);
  };

  const buildPayload = (values: ApplicationFormValues) => {
    const payload: Record<string, unknown> = {
      ...values,
      company_name: values.company,
      job_link: values.site_link,
      job_description: values.job_description || '',
      date_applied: values.date_applied ? values.date_applied.format('YYYY-MM-DD') : undefined,
      current_round: getRoundNumberFromStatus(values.status),
    };
    ['growth_score', 'work_life_score', 'brand_score', 'team_score'].forEach((field) => {
      if (payload[field] === undefined) payload[field] = null;
    });
    payload.visa_sponsorship =
      values.visa_sponsorship && values.visa_sponsorship !== 'UNKNOWN'
        ? values.visa_sponsorship
        : '';
    payload.day_one_gc =
      values.day_one_gc && values.day_one_gc !== 'UNKNOWN' ? values.day_one_gc : '';
    delete payload.company;
    delete payload.site_link;
    delete payload.linked_document_ids;
    delete payload.notes;
    return payload;
  };

  const saveExisting = async (
    applicationId: number,
    payload: Record<string, unknown>,
    selectedDocumentIds: number[]
  ) => {
    const isDrawerEdit = detailDrawerMode === 'edit' && detailApp?.id === applicationId;
    const response = await updateApplication(applicationId, payload);

    const currentlyLinkedDocIds = documents
      .filter((doc) => doc.application === applicationId)
      .map((doc) => doc.id);
    const docsToLink = selectedDocumentIds.filter((id) => !currentlyLinkedDocIds.includes(id));
    const docsToUnlink = currentlyLinkedDocIds.filter((id) => !selectedDocumentIds.includes(id));

    await Promise.all([
      ...docsToLink.map((docId) => patchDocument(docId, { application: applicationId })),
      ...docsToUnlink.map((docId) => patchDocument(docId, { application: null })),
    ]);
    messageApi.success('Application updated');

    const updatedApplication = response.data as CareerApplication;
    setApplications((prev) =>
      prev.map((app) => (app.id === applicationId ? updatedApplication : app))
    );
    setDocuments((prev) =>
      prev.map((doc) => {
        if (docsToLink.includes(doc.id)) return { ...doc, application: applicationId };
        if (docsToUnlink.includes(doc.id)) return { ...doc, application: null };
        return doc;
      })
    );

    if (isDrawerEdit) {
      setDetailApp(updatedApplication);
      setDetailDrawerMode('view');
    } else {
      setIsAddModalOpen(false);
    }
  };

  const handleAddEdit = async (values: ApplicationFormValues) => {
    try {
      const selectedDocumentIds: number[] = values.linked_document_ids || [];
      const payload = buildPayload(values);

      if (editingId) {
        await saveExisting(editingId, payload, selectedDocumentIds);
      } else {
        const response = await createApplication(payload);
        const applicationId = response.data.id;
        if (selectedDocumentIds.length > 0) {
          await Promise.all(
            selectedDocumentIds.map((docId) => patchDocument(docId, { application: applicationId }))
          );
        }
        messageApi.success('Application created');
        setIsAddModalOpen(false);
        refresh();
      }
      form.resetFields();
      setEditingId(null);
    } catch (error) {
      messageApi.error('Failed to save application');
      console.error(error);
    }
  };

  // ?application=<id> opens that drawer once, then clears the param.
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const requested = Number(searchParams.get('application'));
    if (!requested) return;
    const params = new URLSearchParams(searchParams);
    params.delete('application');
    setSearchParams(params, { replace: true });
    void getApplication(requested)
      .then((response) => {
        setDetailApp(response.data);
        setDetailDrawerMode('view');
      })
      .catch((error) => {
        console.error('Failed to open the requested application', error);
        messageApi.error('Could not open that application.');
      });
    // Runs for whatever id the URL carries; the drawer setters are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const openDetailDrawer = (app: CareerApplication) => {
    setDetailApp(app);
    setDetailDrawerMode('view');
  };

  const openEditDrawer = (app: CareerApplication) => {
    populateApplicationForm(app);
    setIsAddModalOpen(false);
    setDetailApp(app);
    setDetailDrawerMode('edit');
  };

  const closeDetailDrawer = () => {
    setDetailApp(null);
    setDetailDrawerMode('view');
    setEditingId(null);
    form.resetFields();
  };

  const cancelDrawerEdit = () => {
    setDetailDrawerMode('view');
    setEditingId(null);
    form.resetFields();
  };

  return {
    isAddModalOpen,
    setIsAddModalOpen,
    detailApp,
    setDetailApp,
    detailDrawerMode,
    openAddModal,
    handleAddEdit,
    handleDuplicateApplication,
    openDetailDrawer,
    openEditDrawer,
    closeDetailDrawer,
    cancelDrawerEdit,
  };
};

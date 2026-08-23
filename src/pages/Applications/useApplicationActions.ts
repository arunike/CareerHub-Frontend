import { Modal } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';
import type React from 'react';
import {
  deleteAllApplications,
  deleteApplication,
  exportApplications,
  updateApplication,
} from '../../api';
import type { CareerApplication } from '../../types/application';
import type { ApplicationSummary } from './applicationTypes';

export const useApplicationActions = ({
  applications,
  selectedRowKeys,
  setSelectedRowKeys,
  setApplications,
  setApplicationSummary,
  messageApi,
  refresh,
}: {
  applications: CareerApplication[];
  selectedRowKeys: React.Key[];
  setSelectedRowKeys: React.Dispatch<React.SetStateAction<React.Key[]>>;
  setApplications: React.Dispatch<React.SetStateAction<CareerApplication[]>>;
  setApplicationSummary: React.Dispatch<React.SetStateAction<ApplicationSummary>>;
  messageApi: MessageInstance;
  refresh: () => void;
}) => {
  const handleExportWrapper = async (format: string) => {
    const response = await exportApplications(format);
    return {
      data: response.data,
      headers: response.headers as unknown as Record<string, string>,
    };
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteApplication(id);
      messageApi.success('Application deleted');
      refresh();
    } catch (error) {
      messageApi.error('Failed to delete application');
      console.error(error);
    }
  };

  const requestDeleteApplication = (application: CareerApplication) => {
    const companyName = application.company_details?.name || 'this application';
    Modal.confirm({
      title: 'Delete application?',
      content: `Delete ${application.role_title} at ${companyName}? This cannot be undone.`,
      okText: 'Delete application',
      okType: 'danger',
      cancelText: 'Keep application',
      onOk: () => handleDelete(application.id),
    });
  };

  const handleDeleteAll = async () => {
    try {
      await deleteAllApplications();
      messageApi.success('All applications deleted');
      refresh();
    } catch (error) {
      messageApi.error('Failed to delete all applications');
      console.error(error);
    }
  };

  const toggleLock = async (app: CareerApplication) => {
    try {
      await updateApplication(app.id, { is_locked: !app.is_locked });
      messageApi.success(app.is_locked ? 'Application unlocked' : 'Application locked');
      setApplications((prev) =>
        prev.map((a) => (a.id === app.id ? { ...a, is_locked: !app.is_locked } : a))
      );
      setApplicationSummary((prev) => ({
        ...prev,
        locked: Math.max(0, prev.locked + (app.is_locked ? -1 : 1)),
      }));
    } catch (error) {
      messageApi.error('Failed to toggle lock');
      console.error(error);
    }
  };

  const handleBulkDelete = () => {
    Modal.confirm({
      title: 'Delete Selected Applications',
      content: `Are you sure you want to delete ${selectedRowKeys.length} applications?`,
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      onOk: async () => {
        try {
          await Promise.all(selectedRowKeys.map((id) => deleteApplication(id as number)));
          messageApi.success(`${selectedRowKeys.length} applications deleted`);
          setSelectedRowKeys([]);
          refresh();
        } catch {
          messageApi.error('Failed to delete some applications');
          refresh();
        }
      },
    });
  };

  const handleBulkToggleLock = async (lock: boolean) => {
    try {
      await Promise.all(
        selectedRowKeys.map((id) => updateApplication(id as number, { is_locked: lock }))
      );
      messageApi.success(`${selectedRowKeys.length} applications ${lock ? 'locked' : 'unlocked'}`);
      setSelectedRowKeys([]);
      refresh();
    } catch {
      messageApi.error(`Failed to ${lock ? 'lock' : 'unlock'} some applications`);
      refresh();
    }
  };

  const isAnySelectedLocked = selectedRowKeys.some(
    (id) => applications.find((app) => app.id === id)?.is_locked
  );

  return {
    handleExportWrapper,
    handleDelete,
    requestDeleteApplication,
    handleDeleteAll,
    toggleLock,
    handleBulkDelete,
    handleBulkToggleLock,
    isAnySelectedLocked,
  };
};

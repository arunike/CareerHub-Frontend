import { useState, useEffect, useMemo, useCallback } from 'react';
import { Form, message, Grid } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { MetricCardsSkeleton, TableSkeleton } from '../../components/SkeletonLoader';
import type { TableProps } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { getApplications, getDocuments } from '../../api';
import { getUserSettings } from '../../api/availability';
import type { Document, EmploymentType } from '../../types';
import type { CareerApplication } from '../../types/application';
import { PageState } from '../../components/PageState';
import CoverLetterModal from './CoverLetterModal';
import ApplicationDetailDrawer from './ApplicationDetailDrawer';
import ApplicationFilterBar from './ApplicationFilterBar';
import ApplicationBulkBar from './ApplicationBulkBar';
import ApplicationsToolbar from './ApplicationsToolbar';
import ApplicationTable from './ApplicationTable';
import ApplicationEmptyState from './ApplicationEmptyState';
import { orderingFromSorter } from './applicationSorting';
import ApplicationAddModal from './ApplicationAddModal';
import ApplicationMobileList from './ApplicationMobileList';
import ApplicationMetricCards from './ApplicationMetricCards';
import { useApplicationFilters } from './useApplicationFilters';
import { useApplicationImport } from './useApplicationImport';
import { useJobBoardImport } from './useJobBoardImport';
import { useApplicationActions } from './useApplicationActions';
import { useApplicationEditor } from './useApplicationEditor';
import ApplicationImportModal from './ApplicationImportModal';
import JobBoardImportModal from './JobBoardImportModal';
import ApplicationFormFields from './ApplicationFormFields';
import { buildApplicationColumns } from './applicationColumns';
import { buildApplicationMetrics } from './applicationMetrics';
import {
  getApplicationStatusEditOptions,
  getApplicationStatusFilterOptions,
} from '../../constants/applicationStages';
import {
  APPLICATION_PAGE_SIZE,
  DEFAULT_APPLICATION_STAGES,
  DEFAULT_APPLICATION_SUMMARY,
  type ApplicationOrdering,
  isPaginatedApplicationsResponse,
  type PaginatedApplicationsResponse,
  summarizeApplications,
} from './applicationTypes';
import { useCompanyList } from '../../hooks/useCompanyList';

const Applications = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const { options: companyListOptions, loading: companyListLoading } = useCompanyList();

  const [applications, setApplications] = useState<CareerApplication[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [applicationsTotal, setApplicationsTotal] = useState(0);
  const [applicationSummary, setApplicationSummary] = useState(DEFAULT_APPLICATION_SUMMARY);
  const [applicationOrdering, setApplicationOrdering] = useState<ApplicationOrdering>();
  const [empTypes, setEmpTypes] = useState<EmploymentType[]>([
    { value: 'full_time', label: 'Full-time', color: 'blue' },
    { value: 'part_time', label: 'Part-time', color: 'blue' },
    { value: 'internship', label: 'Internship', color: 'amber' },
    { value: 'contract', label: 'Contract', color: 'purple' },
    { value: 'freelance', label: 'Freelance', color: 'orange' },
  ]);
  const [appStages, setAppStages] = useState(DEFAULT_APPLICATION_STAGES);
  const statusFilterOptions = useMemo(
    () => getApplicationStatusFilterOptions(appStages),
    [appStages]
  );
  const editableStatusOptions = useMemo(
    () => getApplicationStatusEditOptions(appStages),
    [appStages]
  );

  const [coverLetterApp, setCoverLetterApp] = useState<CareerApplication | null>(null);

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const {
    currentPage,
    setCurrentPage,
    searchText,
    setSearchText,
    debouncedSearchText,
    statusFilter,
    setStatusFilter,
    empTypeFilter,
    setEmpTypeFilter,
    locationFilter,
    setLocationFilter,
    isLockedFilter,
    setIsLockedFilter,
    selectedYear,
    availableYears,
    handleYearChange,
    activeFilterCount,
    hasActiveSearchFilters,
    isYearFiltered,
    clearApplicationFilters,
  } = useApplicationFilters({ applications, setSelectedRowKeys });

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const appsResp = await getApplications({
        page: currentPage,
        page_size: APPLICATION_PAGE_SIZE,
        search: debouncedSearchText || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        employment_type: empTypeFilter !== 'ALL' ? empTypeFilter : undefined,
        location: locationFilter !== 'ALL' ? locationFilter : undefined,
        is_locked: isLockedFilter !== undefined ? String(isLockedFilter) : undefined,
        year: selectedYear,
        ordering: applicationOrdering,
      });
      const data = appsResp.data as CareerApplication[] | PaginatedApplicationsResponse;
      if (isPaginatedApplicationsResponse(data)) {
        setApplications(data.results);
        setApplicationsTotal(data.count);
        setApplicationSummary(data.summary || summarizeApplications(data.results, data.count));
      } else {
        setApplications(data);
        setApplicationsTotal(data.length);
        setApplicationSummary(summarizeApplications(data));
      }
    } catch (error) {
      setLoadError(true);
      messageApi.error('Failed to load applications');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [
    applicationOrdering,
    currentPage,
    debouncedSearchText,
    empTypeFilter,
    isLockedFilter,
    locationFilter,
    messageApi,
    selectedYear,
    statusFilter,
  ]);

  const {
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
  } = useApplicationImport({
    applications,
    messageApi,
    onImported: () => fetchApplications(),
  });

  const {
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
  } = useJobBoardImport({ messageApi, onCreated: () => fetchApplications() });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const jobUrl = params.get('jobUrl');
    if (!jobUrl) return;
    setJobImportUrl(jobUrl);
    setIsJobImportModalOpen(true);
    navigate('/applications', { replace: true });
  }, [location.search, navigate, setIsJobImportModalOpen, setJobImportUrl]);

  const fetchDocuments = useCallback(async () => {
    try {
      const docsResp = await getDocuments();
      setDocuments(docsResp.data);
    } catch (error) {
      messageApi.error('Failed to load documents');
      console.error(error);
    }
  }, [messageApi]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(applicationsTotal / APPLICATION_PAGE_SIZE));
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [applicationsTotal, currentPage, setCurrentPage]);

  useEffect(() => {
    fetchDocuments();
    getUserSettings()
      .then((res) => {
        const types = res.data.employment_types;
        if (types && types.length > 0) setEmpTypes(types);
        const stages = res.data.application_stages;
        if (stages && stages.length > 0) setAppStages(stages);
      })
      .catch(() => {});
  }, [fetchDocuments]);

  const {
    handleExportWrapper,
    handleDelete,
    requestDeleteApplication,
    handleDeleteAll,
    toggleLock,
    handleBulkDelete,
    handleBulkToggleLock,
    isAnySelectedLocked,
  } = useApplicationActions({
    applications,
    selectedRowKeys,
    setSelectedRowKeys,
    setApplications,
    setApplicationSummary,
    messageApi,
    refresh: fetchApplications,
  });

  const {
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
  } = useApplicationEditor({
    form,
    documents,
    setDocuments,
    setApplications,
    messageApi,
    refresh: fetchApplications,
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const action = params.get('action');
    if (action === 'create') {
      openAddModal();
    } else if (action === 'job-import') {
      setIsJobImportModalOpen(true);
    } else {
      return;
    }
    navigate('/applications', { replace: true });
  }, [location.search, navigate, openAddModal, setIsJobImportModalOpen]);

  const filteredData = applications;
  const paginatedData = applications;

  const applicationMetrics = useMemo(
    () =>
      buildApplicationMetrics(applicationSummary, {
        statusFilter,
        isLockedFilter,
        setStatusFilter,
        setIsLockedFilter,
      }),
    [applicationSummary, statusFilter, isLockedFilter, setStatusFilter, setIsLockedFilter]
  );

  const toggleSelectedApplication = (id: number, checked: boolean) => {
    setSelectedRowKeys((prev) => {
      if (checked) {
        return prev.includes(id) ? prev : [...prev, id];
      }
      return prev.filter((key) => key !== id);
    });
  };

  const columns = buildApplicationColumns({
    appStages,
    empTypes,
    openDetailDrawer,
    openEditDrawer,
    handleDelete,
    handleDuplicateApplication,
    toggleLock,
    setCoverLetterApp,
    applicationOrdering,
  });
  const applicationEmptyState = (
    <ApplicationEmptyState
      hasActiveSearchFilters={hasActiveSearchFilters}
      isYearFiltered={isYearFiltered}
      selectedYear={selectedYear}
      onClearFilters={clearApplicationFilters}
      onShowAllYears={() => handleYearChange('all')}
      onAddApplication={openAddModal}
    />
  );

  const applicationLoadFailed = loadError && applications.length === 0;

  const handleTableChange: TableProps<CareerApplication>['onChange'] = (
    _pagination,
    _filters,
    sorter,
    extra
  ) => {
    if (extra.action !== 'sort') return;
    setApplicationOrdering(orderingFromSorter(sorter));
    setCurrentPage(1);
    setSelectedRowKeys([]);
  };

  const renderApplicationForm = (props: {
    onCancel: () => void;
    submitLabel?: string;
    showActions?: boolean;
  }) => (
    <ApplicationFormFields
      form={form}
      handleAddEdit={handleAddEdit}
      documents={documents}
      empTypes={empTypes}
      editableStatusOptions={editableStatusOptions}
      companyListOptions={companyListOptions}
      companyListLoading={companyListLoading}
      {...props}
    />
  );

  return (
    <div style={{ padding: 0, width: '100%' }}>
      {contextHolder}
      <ApplicationsToolbar
        selectedYear={selectedYear}
        onJobImport={() => setIsJobImportModalOpen(true)}
        onCsvImport={() => setIsImportModalOpen(true)}
        onDeleteAll={handleDeleteAll}
        onExport={handleExportWrapper}
        onAddApplication={openAddModal}
        applicationsTotal={applicationsTotal}
        availableYears={availableYears}
        handleYearChange={handleYearChange}
      />

      {/* Bulk action bar */}
      {selectedRowKeys.length > 0 && (
        <ApplicationBulkBar
          totalCount={filteredData.length}
          isAnySelectedLocked={isAnySelectedLocked}
          handleBulkToggleLock={handleBulkToggleLock}
          handleBulkDelete={handleBulkDelete}
          selectedRowKeys={selectedRowKeys}
          setSelectedRowKeys={setSelectedRowKeys}
        />
      )}

      {applicationLoadFailed ? null : loading ? (
        <MetricCardsSkeleton count={4} />
      ) : (
        <ApplicationMetricCards applicationMetrics={applicationMetrics} />
      )}

      {/* Filter bar */}
      <ApplicationFilterBar
        activeFilterCount={activeFilterCount}
        applicationLoadFailed={applicationLoadFailed}
        applicationsTotal={applicationsTotal}
        clearApplicationFilters={clearApplicationFilters}
        empTypeFilter={empTypeFilter}
        empTypes={empTypes}
        hasActiveSearchFilters={hasActiveSearchFilters}
        isLockedFilter={isLockedFilter}
        isMobile={isMobile}
        locationFilter={locationFilter}
        mobileFiltersOpen={mobileFiltersOpen}
        searchText={searchText}
        setEmpTypeFilter={setEmpTypeFilter}
        setIsLockedFilter={setIsLockedFilter}
        setLocationFilter={setLocationFilter}
        setMobileFiltersOpen={setMobileFiltersOpen}
        setSearchText={setSearchText}
        setStatusFilter={setStatusFilter}
        statusFilter={statusFilter}
        statusFilterOptions={statusFilterOptions}
      />

      {/* Data list */}
      {applicationLoadFailed ? (
        <PageState
          tone="error"
          title="Applications could not be loaded"
          description="Your saved applications were not changed. Check your connection and try again."
          actionLabel="Retry loading applications"
          onAction={() => void fetchApplications()}
          icon={<InboxOutlined />}
        />
      ) : isMobile ? (
        <ApplicationMobileList
          openDetailDrawer={openDetailDrawer}
          openEditDrawer={openEditDrawer}
          handleDuplicateApplication={handleDuplicateApplication}
          toggleLock={toggleLock}
          requestDeleteApplication={requestDeleteApplication}
          appStages={appStages}
          applicationEmptyState={applicationEmptyState}
          applicationsTotal={applicationsTotal}
          currentPage={currentPage}
          empTypes={empTypes}
          filteredData={filteredData}
          loading={loading}
          paginatedData={paginatedData}
          selectedRowKeys={selectedRowKeys}
          setCoverLetterApp={setCoverLetterApp}
          setCurrentPage={setCurrentPage}
          toggleSelectedApplication={toggleSelectedApplication}
        />
      ) : loading ? (
        <TableSkeleton />
      ) : filteredData.length === 0 ? (
        applicationEmptyState
      ) : (
        <ApplicationTable
          onChange={handleTableChange}
          applicationsTotal={applicationsTotal}
          columns={columns}
          currentPage={currentPage}
          filteredData={filteredData}
          loading={loading}
          selectedRowKeys={selectedRowKeys}
          setCurrentPage={setCurrentPage}
          setSelectedRowKeys={setSelectedRowKeys}
        />
      )}

      {/* Add Modal */}
      <ApplicationAddModal
        isAddModalOpen={isAddModalOpen}
        setIsAddModalOpen={setIsAddModalOpen}
        onSubmit={() => form.submit()}
        renderApplicationForm={renderApplicationForm}
      />

      {/* Cover Letter Modal */}
      {coverLetterApp && (
        <CoverLetterModal
          application={coverLetterApp}
          open={!!coverLetterApp}
          onClose={() => setCoverLetterApp(null)}
        />
      )}

      <ApplicationDetailDrawer
        application={detailApp}
        documents={documents}
        onDocumentsChange={fetchDocuments}
        open={!!detailApp}
        mode={detailDrawerMode}
        appStages={appStages}
        editContent={
          detailDrawerMode === 'edit'
            ? renderApplicationForm({ onCancel: cancelDrawerEdit, submitLabel: 'Save Application' })
            : null
        }
        onClose={closeDetailDrawer}
        onCancelEdit={cancelDrawerEdit}
        onEdit={openEditDrawer}
        onDuplicate={handleDuplicateApplication}
        onGenerateCoverLetter={setCoverLetterApp}
        onNotesUpdate={(id, notes) => {
          setApplications((prev) => prev.map((app) => (app.id === id ? { ...app, notes } : app)));
          setDetailApp((prev) => (prev && prev.id === id ? { ...prev, notes } : prev));
        }}
      />

      <JobBoardImportModal
        jobImportForm={jobImportForm}
        closeJobImportModal={closeJobImportModal}
        companyListLoading={companyListLoading}
        companyListOptions={companyListOptions}
        empTypes={empTypes}
        handleCreateFromJobImport={handleCreateFromJobImport}
        handleExtractJobPosting={handleExtractJobPosting}
        isJobImportModalOpen={isJobImportModalOpen}
        jobImportLoading={jobImportLoading}
        jobImportPreview={jobImportPreview}
        jobImportSaving={jobImportSaving}
        jobImportUrl={jobImportUrl}
        setJobImportUrl={setJobImportUrl}
      />
      {/* Import Modal */}
      <ApplicationImportModal
        applicationImportApplying={applicationImportApplying}
        applicationImportFileName={applicationImportFileName}
        applicationImportPreviewing={applicationImportPreviewing}
        applicationImportMapping={applicationImportMapping}
        applicationImportPreview={applicationImportPreview}
        applyApplicationImport={applyApplicationImport}
        closeImportModal={closeImportModal}
        editableImportReview={editableImportReview}
        importProps={importProps}
        getImportFieldValue={getImportFieldValue}
        isImportModalOpen={isImportModalOpen}
        updateImportMapping={updateImportMapping}
        updateImportRowValue={updateImportRowValue}
        visibleImportReviewFields={visibleImportReviewFields}
      />
    </div>
  );
};

export default Applications;

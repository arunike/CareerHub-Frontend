import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Table,
  Button,
  Input,
  Select,
  Spin,
  Modal,
  Form,
  Space,
  Upload,
  message,
  Typography,
  Row,
  Col,
  DatePicker,
  Tooltip,
  Grid,
  Checkbox,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  DollarOutlined,
  GlobalOutlined,
  InboxOutlined,
  LockOutlined,
  UnlockOutlined,
  DeleteOutlined,
  ThunderboltOutlined,
  DownOutlined,
  UpOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { UploadProps } from 'antd';
import type { Dayjs } from 'dayjs';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  getApplications,
  createApplication,
  updateApplication,
  deleteApplication,
  applyImportApplications,
  extractJobBoardPosting,
  previewImportApplications,
  deleteAllApplications,
  exportApplications,
  getDocuments,
  patchDocument,
} from '../../api';
import type { ApplicationFileImportPreview, JobBoardImportResult } from '../../api';
import { getUserSettings } from '../../api/availability';
import type { Document, EmploymentType } from '../../types';
import type { CareerApplication } from '../../types/application';
import PageActionToolbar from '../../components/PageActionToolbar';
import BulkActionHeader from '../../components/BulkActionHeader';
import RowActions from '../../components/RowActions';
import CoverLetterModal from './CoverLetterModal';
import ApplicationDetailDrawer from './ApplicationDetailDrawer';
import { getAvailableYears, filterByYear, getCurrentYear } from '../../utils/yearFilter';
import { dayjsDateOnlyLocal, formatDateOnly } from '../../utils/dateOnly';
import { usePersistedState } from '../../hooks/usePersistedState';
import { loadUsCityOptions } from '../../lib/usCityOptions';

const { Text, Link } = Typography;
const { Option } = Select;
const { Dragger } = Upload;

const APPLICATION_IMPORT_REVIEW_FIELDS = [
  { key: 'company_name', label: 'Company', required: true },
  { key: 'role_title', label: 'Role', required: true },
  { key: 'status', label: 'Status', required: false },
  { key: 'location', label: 'Location', required: false },
  { key: 'salary_range', label: 'Salary', required: false },
  { key: 'job_link', label: 'Link', required: false },
] as const;

type ApplicationImportReviewFieldKey = (typeof APPLICATION_IMPORT_REVIEW_FIELDS)[number]['key'];
const APPLICATION_IMPORT_REVIEW_FIELD_KEYS = new Set<string>(
  APPLICATION_IMPORT_REVIEW_FIELDS.map((field) => field.key)
);

const getCoreImportMapping = (mapping: Record<string, string>) =>
  Object.fromEntries(
    Object.entries(mapping).filter(([fieldKey]) =>
      APPLICATION_IMPORT_REVIEW_FIELD_KEYS.has(fieldKey)
    )
  );

type EditableApplicationImportItem = {
  row: number;
  action: 'create' | 'update' | 'error';
  detail: string;
  company_name: string;
  role_title: string;
  status: string;
  local_object_id?: number | null;
  raw: Record<string, string>;
};

type ApplicationFormValues = {
  company?: string;
  role_title?: string;
  status?: string;
  employment_type?: string;
  site_link?: string;
  salary_range?: string;
  office_location?: string;
  visa_sponsorship?: string;
  day_one_gc?: string;
  growth_score?: number;
  work_life_score?: number;
  brand_score?: number;
  team_score?: number;
  current_round?: number;
  date_applied?: Dayjs | null;
  notes?: string;
  linked_document_ids?: number[];
};

type ApplicationStage = {
  key: string;
  label: string;
  shortLabel: string;
  tone: string;
};

const getRoundNumberFromStatus = (status?: string) => {
  const match = status?.match(/^ROUND_(\d+)$/);
  return match ? Number(match[1]) : 0;
};

const Applications = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();
  const [jobImportForm] = Form.useForm();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const [applications, setApplications] = useState<CareerApplication[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [empTypes, setEmpTypes] = useState<EmploymentType[]>([
    { value: 'full_time', label: 'Full-time', color: 'blue' },
    { value: 'part_time', label: 'Part-time', color: 'teal' },
    { value: 'internship', label: 'Internship', color: 'amber' },
    { value: 'contract', label: 'Contract', color: 'purple' },
    { value: 'freelance', label: 'Freelance', color: 'orange' },
  ]);
  const [appStages, setAppStages] = useState<ApplicationStage[]>([
    { key: 'APPLIED', label: 'Applied', shortLabel: 'Apply', tone: 'bg-blue-500' },
    { key: 'OA', label: 'Online Assessment', shortLabel: 'OA', tone: 'bg-blue-500' },
    { key: 'SCREEN', label: 'Phone Screen', shortLabel: 'Phone', tone: 'bg-sky-500' },
    { key: 'ROUND_1', label: '1st Round', shortLabel: 'R1', tone: 'bg-amber-400' },
    { key: 'ROUND_2', label: '2nd Round', shortLabel: 'R2', tone: 'bg-amber-500' },
    { key: 'ROUND_3', label: '3rd Round', shortLabel: 'R3', tone: 'bg-orange-500' },
    { key: 'ROUND_4', label: '4th Round', shortLabel: 'R4', tone: 'bg-orange-600' },
    { key: 'ONSITE', label: 'Onsite Interview', shortLabel: 'Onsite', tone: 'bg-red-500' },
    { key: 'OFFER', label: 'Offer', shortLabel: 'Offer', tone: 'bg-emerald-500' },
    { key: 'REJECTED', label: 'Rejected', shortLabel: 'Reject', tone: 'bg-rose-500' },
    { key: 'GHOSTED', label: 'Ghosted', shortLabel: 'Ghost', tone: 'bg-slate-400' },
    {
      key: 'REMOVED_FROM_SHEET',
      label: 'Removed from Sheet',
      shortLabel: 'Removed',
      tone: 'bg-slate-500',
    },
  ]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
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
  const [isJobImportModalOpen, setIsJobImportModalOpen] = useState(false);
  const [jobImportUrl, setJobImportUrl] = useState('');
  const [jobImportPreview, setJobImportPreview] = useState<JobBoardImportResult | null>(null);
  const [jobImportLoading, setJobImportLoading] = useState(false);
  const [jobImportSaving, setJobImportSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [detailApp, setDetailApp] = useState<CareerApplication | null>(null);
  const [detailDrawerMode, setDetailDrawerMode] = useState<'view' | 'edit'>('view');
  const [coverLetterApp, setCoverLetterApp] = useState<CareerApplication | null>(null);

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [allUsCityOptions, setAllUsCityOptions] = useState<string[]>([]);

  const [searchText, setSearchText] = useState('');
  const [locationSearchText, setLocationSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [empTypeFilter, setEmpTypeFilter] = useState('ALL');
  const [locationFilter, setLocationFilter] = useState('ALL');
  const [selectedYear, setSelectedYear] = usePersistedState<number | 'all'>(
    'applicationsSelectedYear',
    getCurrentYear(),
    {
      serialize: (value) => value.toString(),
      deserialize: (raw) => (raw === 'all' ? 'all' : parseInt(raw)),
    }
  );
  const officeLocationOptions = useMemo(() => {
    const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9,\s]/g, '');
    const query = normalize(locationSearchText).trim();
    const queryTokens = query.split(/\s+/).filter(Boolean);

    const scored = allUsCityOptions
      .map((raw) => {
        const candidate = normalize(raw);
        let score = 0;

        if (query.length === 0) score += 1;
        if (candidate.startsWith(query) && query.length > 0) score += 10;
        if (candidate.includes(query) && query.length > 0) score += 6;
        if (queryTokens.length && queryTokens.every((token) => candidate.includes(token)))
          score += 4;
        if (candidate === query && query.length > 0) score += 12;

        return { value: raw, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.value.localeCompare(b.value))
      .slice(0, 80)
      .map((item) => ({ value: item.value, label: item.value }));

    return scored;
  }, [allUsCityOptions, locationSearchText]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [appsResp, docsResp] = await Promise.all([getApplications(), getDocuments()]);
      setApplications(appsResp.data);
      setDocuments(docsResp.data);
    } catch (error) {
      messageApi.error('Failed to load applications');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [messageApi]);

  useEffect(() => {
    fetchData();
    getUserSettings()
      .then((res) => {
        const types = res.data.employment_types;
        if (types && types.length > 0) setEmpTypes(types);
        const stages = res.data.application_stages;
        if (stages && stages.length > 0) setAppStages(stages);
      })
      .catch(() => {});

    loadUsCityOptions()
      .then(setAllUsCityOptions)
      .catch((error) => {
        console.error('Failed to load US city options', error);
      });
  }, [fetchData]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const jobUrl = params.get('jobUrl');
    if (!jobUrl) return;
    setJobImportUrl(jobUrl);
    setIsJobImportModalOpen(true);
    navigate('/applications', { replace: true });
  }, [location.search, navigate]);

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
      fetchData();
    } catch (error) {
      messageApi.error('Failed to delete application');
      console.error(error);
    }
  };

  const handleDeleteAll = async () => {
    try {
      await deleteAllApplications();
      messageApi.success('All applications deleted');
      fetchData();
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
          fetchData();
        } catch {
          messageApi.error('Failed to delete some applications');
          fetchData();
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
      fetchData();
    } catch {
      messageApi.error(`Failed to ${lock ? 'lock' : 'unlock'} some applications`);
      fetchData();
    }
  };

  const isAnySelectedLocked = selectedRowKeys.some((id) => {
    const app = applications.find((a) => a.id === id);
    return app?.is_locked;
  });

  const handleAddEdit = async (values: ApplicationFormValues) => {
    try {
      const selectedDocumentIds: number[] = values.linked_document_ids || [];
      const payload: Record<string, unknown> = {
        ...values,
        company_name: values.company,
        job_link: values.site_link,
        date_applied: values.date_applied ? values.date_applied.format('YYYY-MM-DD') : undefined,
      };
      payload.current_round = getRoundNumberFromStatus(values.status);
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

      if (editingId) {
        const isDrawerEdit = detailDrawerMode === 'edit' && detailApp?.id === editingId;
        const response = await updateApplication(editingId, payload);

        const currentlyLinkedDocIds = documents
          .filter((doc) => doc.application === editingId)
          .map((doc) => doc.id);

        const docsToLink = selectedDocumentIds.filter((id) => !currentlyLinkedDocIds.includes(id));
        const docsToUnlink = currentlyLinkedDocIds.filter(
          (id) => !selectedDocumentIds.includes(id)
        );

        await Promise.all([
          ...docsToLink.map((docId) => patchDocument(docId, { application: editingId })),
          ...docsToUnlink.map((docId) => patchDocument(docId, { application: null })),
        ]);
        messageApi.success('Application updated');

        const updatedApplication = response.data as CareerApplication;
        setApplications((prev) =>
          prev.map((app) => (app.id === editingId ? updatedApplication : app))
        );
        setDocuments((prev) =>
          prev.map((doc) => {
            if (docsToLink.includes(doc.id)) return { ...doc, application: editingId };
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
        fetchData();
      }
      form.resetFields();
      setEditingId(null);
    } catch (error) {
      messageApi.error('Failed to save application');
      console.error(error);
    }
  };

  const openAddModal = () => {
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
  };

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
      const apiError = error as { response?: { data?: { error?: string } } };
      messageApi.error(apiError?.response?.data?.error || 'Failed to extract this job posting');
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
        notes: values.job_description
          ? `Job description imported from ${jobImportPreview.source_url}\n\n${values.job_description}`
          : '',
        date_applied: dayjs().format('YYYY-MM-DD'),
      });
      messageApi.success('Application imported');
      closeJobImportModal();
      fetchData();
    } catch (error: unknown) {
      const formError = error as {
        errorFields?: unknown;
        response?: { data?: { error?: string } };
      };
      if (formError?.errorFields) return;
      messageApi.error(formError?.response?.data?.error || 'Failed to create imported application');
      console.error(error);
    } finally {
      setJobImportSaving(false);
    }
  };

  const populateApplicationForm = (app: CareerApplication) => {
    setEditingId(app.id);
    form.setFieldsValue({
      company: app.company_details?.name,
      role_title: app.role_title,
      status: app.status,
      employment_type: app.employment_type || 'full_time',
      site_link: app.job_link,
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
          messageApi.error(error?.response?.data?.error || 'Import preview failed');
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
    (row: Record<string, string>, fieldKey: ApplicationImportReviewFieldKey) => {
      const header = applicationImportMapping[fieldKey];
      return header ? row[header] || '' : '';
    },
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
    const companyApplications = new Map<string, CareerApplication[]>();
    applications.forEach((application) => {
      const companyName = application.company_details?.name || '';
      if (!companyName) return;
      const current = companyApplications.get(companyName) || [];
      current.push(application);
      companyApplications.set(companyName, current);
    });

    const items: EditableApplicationImportItem[] = applicationImportRows.map((row, index) => {
      const companyName = getImportFieldValue(row, 'company_name').trim();
      const roleTitle = getImportFieldValue(row, 'role_title').trim();
      const statusValue = getImportFieldValue(row, 'status').trim() || 'APPLIED';
      let action: EditableApplicationImportItem['action'] = 'error';
      let detail = 'Company and role are required.';
      let localObjectId: number | null = null;

      if (companyName && roleTitle) {
        const existing = (companyApplications.get(companyName) || []).find(
          (application) => application.role_title === roleTitle
        );
        if (existing) {
          action = 'update';
          detail = 'Matches an existing application by company and role.';
          localObjectId = existing.id;
        } else {
          action = 'create';
          detail = 'New application.';
        }
      }

      return {
        row: index + 2,
        action,
        detail,
        company_name: companyName,
        role_title: roleTitle,
        status: statusValue,
        local_object_id: localObjectId,
        raw: row,
      };
    });

    return {
      items,
      summary: {
        total_rows: applicationImportRows.length,
        creates: items.filter((item) => item.action === 'create').length,
        updates: items.filter((item) => item.action === 'update').length,
        errors: items.filter((item) => item.action === 'error').length,
      },
    };
  }, [applicationImportPreview, applicationImportRows, applications, getImportFieldValue]);

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
      fetchData();
    } catch (error: any) {
      messageApi.error(error?.response?.data?.error || 'Failed to apply import');
    } finally {
      setApplicationImportApplying(false);
    }
  };

  const filteredData = filterByYear(applications, selectedYear, 'date_applied').filter((app) => {
    const matchesSearch =
      (app.company_details?.name || '').toLowerCase().includes(searchText.toLowerCase()) ||
      (app.role_title || '').toLowerCase().includes(searchText.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || app.status === statusFilter;
    const matchesEmpType = empTypeFilter === 'ALL' || app.employment_type === empTypeFilter;
    const appLocation = app.office_location || app.location || '';
    const matchesLocation = locationFilter === 'ALL' || appLocation === locationFilter;
    return matchesSearch && matchesStatus && matchesEmpType && matchesLocation;
  });

  const uniqueLocations = useMemo(() => {
    const locations = new Set<string>();
    applications.forEach((app) => {
      const loc = app.office_location || app.location;
      if (loc) locations.add(loc);
    });
    return Array.from(locations).sort();
  }, [applications]);

  const availableYears = getAvailableYears(applications, 'date_applied');
  const handleYearChange = (year: number | 'all') => {
    setSelectedYear(year);
  };

  const toggleSelectedApplication = (id: number, checked: boolean) => {
    setSelectedRowKeys((prev) => {
      if (checked) {
        return prev.includes(id) ? prev : [...prev, id];
      }
      return prev.filter((key) => key !== id);
    });
  };

  const APP_STAGE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
    blue: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    sky: { bg: '#f0f9ff', color: '#0369a1', border: '#bae6fd' },
    violet: { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
    purple: { bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff' },
    indigo: { bg: '#eef2ff', color: '#4338ca', border: '#c7d2fe' },
    amber: { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
    orange: { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
    red: { bg: '#fff1f2', color: '#b91c1c', border: '#fecaca' },
    emerald: { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
    green: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
    teal: { bg: '#f0fdfa', color: '#0f766e', border: '#99f6e4' },
    cyan: { bg: '#ecfeff', color: '#0e7490', border: '#a5f3fc' },
    rose: { bg: '#fff1f2', color: '#be123c', border: '#fecdd3' },
    pink: { bg: '#fdf2f8', color: '#9d174d', border: '#fbcfe8' },
    slate: { bg: '#f8fafc', color: '#334155', border: '#e2e8f0' },
    gray: { bg: '#f9fafb', color: '#374151', border: '#e5e7eb' },
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const stage = appStages.find((s) => s.key === status);
    let c = APP_STAGE_COLORS.gray;
    if (stage) {
      const colorMatch = stage.tone.match(/bg-([a-z]+)-\d+/);
      if (colorMatch && APP_STAGE_COLORS[colorMatch[1]]) {
        c = APP_STAGE_COLORS[colorMatch[1]];
      }
    }
    const label = stage ? stage.label : status;
    return (
      <span
        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border"
        style={{ color: c.color, background: c.bg, borderColor: c.border }}
      >
        {label}
      </span>
    );
  };

  const EMP_TYPE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
    blue: { bg: '#eff6ff', color: '#3b82f6', border: '#bfdbfe' },
    teal: { bg: '#f0fdfa', color: '#14b8a6', border: '#99f6e4' },
    amber: { bg: '#fffbeb', color: '#f59e0b', border: '#fde68a' },
    purple: { bg: '#eff6ff', color: '#3b82f6', border: '#bfdbfe' },
    orange: { bg: '#fff7ed', color: '#f97316', border: '#fed7aa' },
    green: { bg: '#f0fdf4', color: '#22c55e', border: '#bbf7d0' },
    gray: { bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb' },
  };

  const EmploymentTypeBadge = ({ type }: { type?: string | null }) => {
    if (!type || type === 'full_time') return null;
    const meta = empTypes.find((t) => t.value === type);
    if (!meta) return null;
    const c = EMP_TYPE_COLORS[meta.color] ?? EMP_TYPE_COLORS.gray;
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
        style={{ color: c.color, background: c.bg, borderColor: c.border }}
      >
        {meta.label}
      </span>
    );
  };

  const columns = [
    {
      title: 'Company',
      key: 'company',
      render: (_: unknown, record: CareerApplication) => (
        <Space direction="vertical" size={0}>
          <Button
            type="link"
            className="!h-auto !p-0 !font-semibold"
            onClick={() => openDetailDrawer(record)}
          >
            {record.company_details?.name}
          </Button>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.office_location || record.location || '—'}
          </Text>
        </Space>
      ),
      sorter: (a: CareerApplication, b: CareerApplication) =>
        (a.company_details?.name || '').localeCompare(b.company_details?.name || ''),
      defaultSortOrder: 'ascend' as const,
    },
    {
      title: 'Role',
      dataIndex: 'role_title',
      key: 'role',
      render: (text: string, record: CareerApplication) => (
        <Space direction="vertical" size={2}>
          <Space size={6} align="center">
            <Text>{text}</Text>
            <EmploymentTypeBadge type={record.employment_type} />
          </Space>
          {record.job_link && (
            <Link href={record.job_link} target="_blank" style={{ fontSize: 12 }}>
              <GlobalOutlined /> Link
            </Link>
          )}
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <StatusBadge status={status} />,
    },
    {
      title: 'Date Applied',
      dataIndex: 'date_applied',
      key: 'date_applied',
      render: (date: string) => formatDateOnly(date, '—'),
      sorter: (a: CareerApplication, b: CareerApplication) =>
        (dayjsDateOnlyLocal(a.date_applied)?.valueOf() ?? 0) -
        (dayjsDateOnlyLocal(b.date_applied)?.valueOf() ?? 0),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: CareerApplication) => (
        <Space>
          <Tooltip title="Details">
            <Button
              type="text"
              size="small"
              icon={<InboxOutlined style={{ color: '#334155' }} />}
              onClick={() => openDetailDrawer(record)}
            />
          </Tooltip>
          <Tooltip title="Generate Cover Letter">
            <Button
              type="text"
              size="small"
              icon={<ThunderboltOutlined style={{ color: '#0ea5e9' }} />}
              onClick={() => setCoverLetterApp(record)}
            />
          </Tooltip>
          <RowActions
            size="middle"
            isLocked={record.is_locked}
            onToggleLock={() => toggleLock(record)}
            onEdit={() => openEditDrawer(record)}
            onDelete={() => handleDelete(record.id)}
            disableDelete={record.is_locked}
          />
        </Space>
      ),
    },
  ];

  const activeFilterCount =
    Number(Boolean(searchText)) +
    Number(statusFilter !== 'ALL') +
    Number(empTypeFilter !== 'ALL') +
    Number(locationFilter !== 'ALL');

  const renderApplicationForm = (onCancel: () => void, submitLabel = 'Save') => (
    <Form form={form} layout="vertical" onFinish={handleAddEdit}>
      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item name="company" label="Company" rules={[{ required: true }]}>
            <Input placeholder="Google" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name="role_title" label="Role Title" rules={[{ required: true }]}>
            <Input placeholder="Software Engineer" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name="status" label="Status">
            <Select>
              {appStages.map((stage) => (
                <Option key={stage.key} value={stage.key}>
                  {stage.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name="employment_type" label="Employment Type">
            <Select>
              {empTypes.map((t) => (
                <Option key={t.value} value={t.value}>
                  {t.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name="date_applied" label="Date Applied">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name="office_location" label="Location">
            <Select
              className="w-full"
              showSearch
              options={officeLocationOptions}
              onSearch={(value) => setLocationSearchText(value)}
              onChange={(value) => {
                form.setFieldValue('office_location', value);
                setLocationSearchText('');
              }}
              onBlur={() => setLocationSearchText('')}
              placeholder="e.g. San Francisco, CA"
              allowClear
              filterOption={false}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="salary_range" label="Salary Range">
            <Input prefix={<DollarOutlined />} placeholder="150k - 200k" />
          </Form.Item>
        </Col>

        <Col span={24}>
          <Form.Item name="site_link" label="Job Link">
            <Input prefix={<GlobalOutlined />} placeholder="https://..." />
          </Form.Item>
        </Col>
        <Col span={24}>
          <Form.Item name="linked_document_ids" label="Linked Documents (Optional)">
            <Select
              mode="multiple"
              allowClear
              placeholder="Select documents to link"
              optionFilterProp="label"
              options={documents.map((doc) => ({
                value: doc.id,
                label: `${doc.title} (v${doc.version_number || 1})`,
              }))}
            />
          </Form.Item>
        </Col>
      </Row>
      <div style={{ textAlign: 'right', marginTop: 16 }}>
        <Space>
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="primary" htmlType="submit">
            {submitLabel}
          </Button>
        </Space>
      </div>
    </Form>
  );

  return (
    <div style={{ padding: 0, width: '100%' }}>
      {contextHolder}
      <div style={{ marginBottom: 24 }}>
        <PageActionToolbar
          title={<span className="whitespace-nowrap">Job Applications</span>}
          subtitle={`${applications.length} applications tracked`}
          singleRowDesktop
          selectedYear={selectedYear}
          onYearChange={handleYearChange}
          availableYears={availableYears}
          extraActions={
            <Button
              className="toolbar-btn"
              size="large"
              icon={<GlobalOutlined />}
              onClick={() => setIsJobImportModalOpen(true)}
            >
              Import URL
            </Button>
          }
          onDeleteAll={handleDeleteAll}
          deleteAllConfirmTitle="Delete All Applications?"
          deleteAllConfirmDescription="This will delete all unlocked applications. This cannot be undone."
          onExport={handleExportWrapper}
          exportFilename="applications"
          onImport={() => setIsImportModalOpen(true)}
          onPrimaryAction={openAddModal}
          primaryActionLabel="Add Application"
          primaryActionIcon={<PlusOutlined />}
        />
      </div>

      {/* Bulk action bar */}
      {selectedRowKeys.length > 0 && (
        <div className="bg-white p-4 rounded-xl border border-sky-100 shadow-sm mb-4 animate-in fade-in slide-in-from-top-2">
          <BulkActionHeader
            selectedCount={selectedRowKeys.length}
            totalCount={filteredData.length}
            title="All Applications"
            onCancelSelection={() => setSelectedRowKeys([])}
            bulkActions={
              <>
                <Button onClick={() => handleBulkToggleLock(true)} icon={<LockOutlined />}>
                  Lock
                </Button>
                <Button onClick={() => handleBulkToggleLock(false)} icon={<UnlockOutlined />}>
                  Unlock
                </Button>
                <Tooltip title={isAnySelectedLocked ? 'Unlock selected items before deleting' : ''}>
                  <Button
                    danger
                    onClick={handleBulkDelete}
                    icon={<DeleteOutlined />}
                    disabled={isAnySelectedLocked}
                  >
                    Delete
                  </Button>
                </Tooltip>
              </>
            }
          />
        </div>
      )}

      {/* Filter bar */}
      {isMobile ? (
        <div className="mb-4 space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">Filters</div>
                <div className="mt-1 text-xs text-slate-500">
                  {activeFilterCount > 0
                    ? `${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} active`
                    : 'Search, status, and type'}
                </div>
              </div>
              <Button
                size="large"
                className="toolbar-native-btn"
                icon={mobileFiltersOpen ? <UpOutlined /> : <DownOutlined />}
                onClick={() => setMobileFiltersOpen((current) => !current)}
              >
                {mobileFiltersOpen ? 'Hide' : 'Show'}
              </Button>
            </div>

            {mobileFiltersOpen ? (
              <div className="mt-4 grid grid-cols-1 gap-3">
                <Input
                  size="large"
                  placeholder="Search company or role"
                  prefix={<SearchOutlined className="text-gray-400" />}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  allowClear
                />
                <Select
                  size="large"
                  value={statusFilter}
                  onChange={setStatusFilter}
                  suffixIcon={<FilterOutlined />}
                >
                  <Option value="ALL">All Statuses</Option>
                  {appStages.map((stage) => (
                    <Option key={stage.key} value={stage.key}>
                      {stage.label}
                    </Option>
                  ))}
                </Select>
                <Select
                  size="large"
                  value={empTypeFilter}
                  onChange={setEmpTypeFilter}
                  suffixIcon={<FilterOutlined />}
                >
                  <Option value="ALL">All Types</Option>
                  {empTypes.map((t) => (
                    <Option key={t.value} value={t.value}>
                      {t.label}
                    </Option>
                  ))}
                </Select>
                <Select
                  size="large"
                  value={locationFilter}
                  onChange={setLocationFilter}
                  suffixIcon={<GlobalOutlined />}
                  showSearch
                  allowClear
                  onClear={() => setLocationFilter('ALL')}
                >
                  <Option value="ALL">All Locations</Option>
                  {uniqueLocations.map((loc) => (
                    <Option key={loc} value={loc}>
                      {loc}
                    </Option>
                  ))}
                </Select>
                <Text type="secondary" className="text-sm">
                  {filteredData.length} result{filteredData.length !== 1 ? 's' : ''}
                </Text>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3 mb-4">
          <Input
            size="large"
            placeholder="Search company or role"
            prefix={<SearchOutlined className="text-gray-400" />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ maxWidth: 340 }}
            allowClear
          />
          <Select
            size="large"
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 200 }}
            suffixIcon={<FilterOutlined />}
          >
            <Option value="ALL">All Statuses</Option>
            {appStages.map((stage) => (
              <Option key={stage.key} value={stage.key}>
                {stage.label}
              </Option>
            ))}
          </Select>
          <Select
            size="large"
            value={empTypeFilter}
            onChange={setEmpTypeFilter}
            style={{ width: 180 }}
            suffixIcon={<FilterOutlined />}
          >
            <Option value="ALL">All Types</Option>
            {empTypes.map((t) => (
              <Option key={t.value} value={t.value}>
                {t.label}
              </Option>
            ))}
          </Select>
          <Select
            size="large"
            value={locationFilter}
            onChange={setLocationFilter}
            style={{ width: 200 }}
            suffixIcon={<GlobalOutlined />}
            showSearch
            allowClear
            onClear={() => setLocationFilter('ALL')}
          >
            <Option value="ALL">All Locations</Option>
            {uniqueLocations.map((loc) => (
              <Option key={loc} value={loc}>
                {loc}
              </Option>
            ))}
          </Select>
          {(searchText ||
            statusFilter !== 'ALL' ||
            empTypeFilter !== 'ALL' ||
            locationFilter !== 'ALL') && (
            <Text type="secondary" className="self-center text-sm">
              {filteredData.length} result{filteredData.length !== 1 ? 's' : ''}
            </Text>
          )}
        </div>
      )}

      {/* Data list */}
      {isMobile ? (
        <div className="space-y-3">
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500 shadow-sm">
              Loading applications...
            </div>
          ) : filteredData.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center shadow-sm">
              <div className="text-sm font-semibold text-slate-900">No applications found</div>
              <div className="mt-1 text-xs text-slate-500">
                Adjust your filters or add a new application.
              </div>
            </div>
          ) : (
            filteredData.map((record) => {
              const isSelected = selectedRowKeys.includes(record.id);
              return (
                <article
                  key={record.id}
                  className={`rounded-3xl border bg-white p-4 shadow-sm transition ${
                    isSelected ? 'border-sky-200 ring-2 ring-sky-100' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isSelected}
                      onChange={(event) =>
                        toggleSelectedApplication(record.id, event.target.checked)
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-base font-semibold text-slate-900">
                            {record.company_details?.name || 'Unknown company'}
                          </div>
                          <div className="mt-1 text-sm text-slate-600">{record.role_title}</div>
                        </div>
                        <StatusBadge status={record.status} />
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                          Applied {formatDateOnly(record.date_applied, 'Unknown')}
                        </span>
                        {record.office_location || record.location ? (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                            {record.office_location || record.location}
                          </span>
                        ) : null}
                        <EmploymentTypeBadge type={record.employment_type} />
                        {record.is_locked ? (
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                            Locked
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <Button
                          size="large"
                          icon={<ThunderboltOutlined />}
                          onClick={() => setCoverLetterApp(record)}
                        >
                          Letter
                        </Button>
                        <Button
                          size="large"
                          icon={<InboxOutlined />}
                          onClick={() => openDetailDrawer(record)}
                        >
                          Details
                        </Button>
                        <Button size="large" onClick={() => openEditDrawer(record)}>
                          Edit
                        </Button>
                        <Button
                          size="large"
                          icon={record.is_locked ? <UnlockOutlined /> : <LockOutlined />}
                          onClick={() => toggleLock(record)}
                        >
                          {record.is_locked ? 'Unlock' : 'Lock'}
                        </Button>
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {record.job_link ? (
                          <Button
                            size="large"
                            icon={<GlobalOutlined />}
                            onClick={() =>
                              window.open(record.job_link || '', '_blank', 'noopener,noreferrer')
                            }
                          >
                            Open Link
                          </Button>
                        ) : (
                          <div />
                        )}
                        <Button
                          danger
                          size="large"
                          icon={<DeleteOutlined />}
                          disabled={record.is_locked}
                          onClick={() => handleDelete(record.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <Table
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
            }}
            loading={loading}
            columns={columns}
            dataSource={filteredData}
            rowKey="id"
            pagination={{ pageSize: 10, showSizeChanger: false }}
            scroll={{ x: 900 }}
          />
        </div>
      )}

      {/* Add Modal */}
      <Modal
        title="Add Application"
        open={isAddModalOpen}
        onCancel={() => setIsAddModalOpen(false)}
        footer={null}
        width={700}
      >
        {isAddModalOpen ? renderApplicationForm(() => setIsAddModalOpen(false)) : null}
      </Modal>

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
        open={!!detailApp}
        mode={detailDrawerMode}
        appStages={appStages}
        editContent={
          detailDrawerMode === 'edit'
            ? renderApplicationForm(cancelDrawerEdit, 'Save Application')
            : null
        }
        onClose={closeDetailDrawer}
        onCancelEdit={cancelDrawerEdit}
        onEdit={openEditDrawer}
        onGenerateCoverLetter={setCoverLetterApp}
        onNotesUpdate={(id, notes) => {
          setApplications((prev) => prev.map((app) => (app.id === id ? { ...app, notes } : app)));
          setDetailApp((prev) => (prev && prev.id === id ? { ...prev, notes } : prev));
        }}
      />

      <Modal
        title="Import from Job URL"
        open={isJobImportModalOpen}
        onCancel={closeJobImportModal}
        width={760}
        footer={[
          <Button key="cancel" onClick={closeJobImportModal}>
            Cancel
          </Button>,
          <Button
            key="extract"
            icon={<GlobalOutlined />}
            loading={jobImportLoading}
            onClick={handleExtractJobPosting}
          >
            Extract
          </Button>,
          <Button
            key="create"
            type="primary"
            disabled={!jobImportPreview}
            loading={jobImportSaving}
            onClick={handleCreateFromJobImport}
          >
            Create Application
          </Button>,
        ]}
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-sky-100 bg-sky-50/50 px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                Paste a supported job posting URL
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Paste a LinkedIn, Greenhouse, Lever, or Workday link. CareerHub will extract the
                fields and keep them editable before saving.
              </div>
            </div>
          </div>

          <Input
            size="large"
            prefix={<GlobalOutlined className="text-slate-400" />}
            placeholder="https://company.wd1.myworkdayjobs.com/..."
            value={jobImportUrl}
            onChange={(event) => setJobImportUrl(event.target.value)}
            onPressEnter={handleExtractJobPosting}
          />

          {jobImportPreview && (
            <Form form={jobImportForm} layout="vertical">
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="company"
                    label="Company"
                    rules={[{ required: true, message: 'Company is required' }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="role_title"
                    label="Role Title"
                    rules={[{ required: true, message: 'Role title is required' }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item name="office_location" label="Location">
                    <Input placeholder="Remote, San Francisco, CA, ..." />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="employment_type" label="Employment Type">
                    <Select>
                      {empTypes.map((type) => (
                        <Option key={type.value} value={type.value}>
                          {type.label}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="salary_range" label="Salary">
                    <Input placeholder="$150k - $180k" />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item name="job_description" label="Job Description">
                    <Input.TextArea rows={8} />
                  </Form.Item>
                </Col>
              </Row>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                <div>Source: {jobImportPreview.source_host}</div>
                <div
                  className={
                    jobImportPreview.ai_status === 'success'
                      ? 'mt-1 font-medium text-emerald-700'
                      : jobImportPreview.ai_status === 'failed'
                        ? 'mt-1 font-medium text-rose-700'
                        : 'mt-1 font-medium text-amber-700'
                  }
                >
                  AI status:{' '}
                  {jobImportPreview.ai_status === 'success'
                    ? 'Success'
                    : jobImportPreview.ai_status === 'failed'
                      ? 'Failed'
                      : 'Not configured'}{' '}
                  · {jobImportPreview.ai_message || 'Used the built-in parser.'}
                </div>
              </div>
            </Form>
          )}
        </div>
      </Modal>

      {/* Import Modal */}
      <Modal
        title="Import Applications"
        open={isImportModalOpen}
        onCancel={closeImportModal}
        width={1100}
        footer={
          applicationImportPreview
            ? [
                <Button key="cancel" onClick={closeImportModal}>
                  Cancel
                </Button>,
                <Button
                  key="apply"
                  type="primary"
                  disabled={(editableImportReview?.summary.errors || 0) > 0}
                  loading={applicationImportApplying}
                  onClick={applyApplicationImport}
                >
                  Confirm Import
                </Button>,
              ]
            : null
        }
      >
        {applicationImportPreviewing ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-10">
            <div className="mx-auto flex max-w-md flex-col items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
                <Spin />
              </div>
              <div className="text-base font-semibold text-slate-900">Preparing import preview</div>
              <div className="mt-2 text-sm text-slate-500">
                Reading {applicationImportFileName || 'your file'}, detecting columns, and checking
                rows against existing applications.
              </div>
              <div className="mt-5 grid w-full grid-cols-3 gap-2 text-left">
                {['Read file', 'Map fields', 'Check rows'].map((step, index) => (
                  <div key={step} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Step {index + 1}
                    </div>
                    <div className="mt-1 text-xs font-medium text-slate-700">{step}</div>
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
            <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3">
              <div className="text-sm font-semibold text-slate-900">
                {editableImportReview?.summary.total_rows || 0} rows ready for review
              </div>
              <div className="mt-1 text-xs text-slate-600">
                {editableImportReview?.summary.creates || 0} new /{' '}
                {editableImportReview?.summary.updates || 0} updates /{' '}
                {editableImportReview?.summary.errors || 0} need attention
              </div>
              <div
                className={`mt-2 text-xs font-medium ${
                  applicationImportPreview.ai_status === 'success'
                    ? 'text-emerald-700'
                    : applicationImportPreview.ai_status === 'failed'
                      ? 'text-rose-700'
                      : 'text-amber-700'
                }`}
              >
                {applicationImportPreview.ai_status === 'success'
                  ? 'AI mapped the columns. Review before importing.'
                  : applicationImportPreview.ai_status === 'failed'
                    ? 'AI mapping was unavailable, so built-in matching was used.'
                    : 'Built-in matching was used. Configure AI provider for multilingual mapping.'}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900">AI Recognized Fields</div>
                  <div className="text-xs text-slate-500">
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
                          ? 'border-slate-200 bg-slate-50'
                          : field.required
                            ? 'border-rose-200 bg-rose-50'
                            : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        {field.label}
                        {field.required ? <span className="text-rose-500"> *</span> : null}
                      </div>
                      <div className="mt-1 truncate text-sm font-medium text-slate-900">
                        {mappedHeader || 'Needs mapping'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900">
                Confirm Column Mapping
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
                {APPLICATION_IMPORT_REVIEW_FIELDS.map((field) => (
                  <label key={field.key} className="space-y-1">
                    <span className="text-xs font-medium text-slate-600">
                      {field.label}
                      {field.required ? <span className="text-red-500"> *</span> : null}
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

            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-3">
                <div className="text-sm font-semibold text-slate-900">Review Row Values</div>
                <div className="text-xs text-slate-500">
                  Edit the values CareerHub will save. Changes here are included when you confirm.
                </div>
              </div>
              <div className="max-h-96 overflow-auto">
                <table className="min-w-[980px] text-sm">
                  <thead className="bg-slate-50 text-left text-xs text-slate-500">
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
                  <tbody className="divide-y divide-slate-100">
                    {(editableImportReview?.items || []).slice(0, 50).map((item, rowIndex) => (
                      <tr key={item.row}>
                        <td className="px-3 py-2 align-top text-slate-500">{item.row}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              item.action === 'create'
                                ? 'bg-emerald-50 text-emerald-700'
                                : item.action === 'update'
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'bg-rose-50 text-rose-700'
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
                <div className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500">
                  Showing first 50 rows.
                </div>
              ) : null}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Applications;

import React, { useState, useEffect, useRef } from 'react';
import {
  getApplications,
  createApplication,
  updateApplication,
  deleteApplication,
  importApplications,
  deleteAllApplications,
  exportApplications,
} from '../../api';
import ExportButton from '../../components/ExportButton';
import {
  Briefcase,
  Plus,
  Upload,
  X,
  FileSpreadsheet,
  Loader,
  Pencil,
  Trash2,
  Eye,
  MapPin,
  DollarSign,
  ExternalLink,
  Calendar,
  Search,
  Filter,
  ArrowUpDown,
  ArrowDownAz,
  Lock,
  Unlock,
} from 'lucide-react';
import EmptyState from '../../components/EmptyState';
import { useToast } from '../../context/ToastContext';
import { useNavigate } from 'react-router-dom';

import type { CareerApplication } from '../../types/application';

const Applications: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [applications, setApplications] = useState<CareerApplication[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'date' | 'company' | 'updated'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewingApp, setViewingApp] = useState<typeof applications[number] | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);

  const initialFormState = {
    company: '',
    role_title: '',
    status: 'APPLIED',
    site_link: '',
    salary_range: '',
    location: '',
    rto_policy: 'UNKNOWN',
    date_applied: new Date().toISOString().split('T')[0],
    salary_range: '',
    location: '',
    current_round: 0,
    date_applied: new Date().toISOString().split('T')[0],
    notes: '',
  };
  const [formData, setFormData] = useState(initialFormState);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const resp = await getApplications();
      setApplications(resp.data);
    } catch (err) {
      console.error('Failed to fetch applications', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Convert numbers for specific fields
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: parseInt(value) || 0 }));
  };

  // Derived Filtered & Sorted List
  const filteredApplications = applications
    .filter((app) => {
      const matchesSearch =
        (app.company_details?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (app.role_title || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'ALL' || app.status === statusFilter;

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'date': {
          // Use date_applied if available, else created_at
          const dateA = new Date(a.date_applied || a.created_at).getTime();
          const dateB = new Date(b.date_applied || b.created_at).getTime();
          comparison = dateA - dateB;
          break;
        }
        case 'company': {
          const nameA = a.company_details?.name || '';
          const nameB = b.company_details?.name || '';
          comparison = nameA.localeCompare(nameB);
          break;
        }
        case 'updated':
          comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const openAddModal = () => {
    setEditingId(null);
    setFormData(initialFormState);
    setIsAddOpen(true);
  };

  const toggleLock = async (app: CareerApplication) => {
    try {
      await updateApplication(app.id, { is_locked: !app.is_locked });
      fetchData();
      addToast(app.is_locked ? 'Application unlocked' : 'Application locked', 'success');
    } catch (err) {
      console.error('Failed to toggle lock', err);
      addToast('Failed to update lock status', 'error');
    }
  };

  const openEditModal = (app: CareerApplication) => {
    setEditingId(app.id);
    setFormData({
      company: app.company_details?.name || '',
      role_title: app.role_title,
      status: app.status,
      site_link: app.job_link || '',
      salary_range: app.salary_range || '',
      location: app.location || '',
      rto_policy: app.rto_policy || 'UNKNOWN',
      date_applied: app.date_applied || '',
      salary_range: app.salary_range || '',
      location: app.location || '',
      current_round: app.current_round || 0,
      date_applied: app.date_applied || '',
      notes: app.notes || '',
    });
    setIsAddOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteApplication(deletingId);
      fetchData();
      setDeletingId(null);
    } catch (err) {
      console.error('Failed to delete application', err);
      addToast('Failed to delete application.', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const fullLink = formData.site_link
        ? `https://${formData.site_link.replace(/^https?:\/\//, '')}`
        : '';

      const payload = {
        company_name: formData.company,
        ...formData,
        job_link: fullLink,
      };

      if (editingId) {
        await updateApplication(editingId, payload);
      } else {
        await createApplication(payload);
      }

      fetchData();
      setIsAddOpen(false);
      setFormData(initialFormState);
      setEditingId(null);
    } catch (err) {
      addToast('Failed to save application.', 'error');
      console.error(err);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;

    const form = new FormData();
    form.append('file', importFile);

    try {
      setImporting(true);
      await importApplications(form);
      addToast('Import successful!', 'success');
      setIsImportOpen(false);
      setImportFile(null);
      fetchData();
    } catch (err) {
      console.error(err);
      addToast('Import failed. Check file format.', 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteAll = async () => {
    try {
      await deleteAllApplications();
      addToast('All applications deleted.', 'success');
      setIsDeleteAllOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      addToast('Failed to delete all applications.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Applications</h1>
          <p className="text-sm text-gray-500 mt-1">
            {filteredApplications.length}{' '}
            {filteredApplications.length === 1 ? 'application' : 'applications'}
            {applications.length !== filteredApplications.length &&
              ` (filtered from ${applications.length})`}
          </p>
        </div>
        <div className="flex space-x-3">
          {applications.length > 0 && (
            <button
              onClick={() => setIsDeleteAllOpen(true)}
              className="flex items-center px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors shadow-sm"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete All
            </button>
          )}
          <ExportButton onExport={exportApplications} filename="applications" label="Export" />
          <button
            onClick={() => setIsImportOpen(true)}
            className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Application
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search company or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
          />
        </div>

        <div className="flex gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          {/* Status Filter */}
          <div className="relative min-w-[140px]">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-8 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm appearance-none bg-white cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="APPLIED">Applied</option>
              <option value="OA">Online Assessment</option>
              <option value="SCREEN">Phone Screen</option>
              <option value="ONSITE">Onsite</option>
              <option value="OFFER">Offer</option>
              <option value="REJECTED">Rejected</option>
              <option value="ACCEPTED">Accepted</option>
            </select>
            <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
          </div>

          {/* Sort By */}
          <div className="relative min-w-[140px]">
            <ArrowDownAz className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'company' | 'updated')}
              className="w-full pl-10 pr-8 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm appearance-none bg-white cursor-pointer"
            >
              <option value="date">Date Applied</option>
              <option value="company">Company</option>
              <option value="updated">Last Updated</option>
            </select>
          </div>

          {/* Sort Order Toggle */}
          <button
            onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
            title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          >
            <ArrowUpDown
              className={`h-4 w-4 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-8 text-gray-400">Loading...</div>
      ) : filteredApplications.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredApplications.map((app) => (
            <div
              key={app.id}
              className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all group relative"
            >
              {/* Lock Indicator */}
              {app.is_locked && (
                <div className="absolute top-4 right-4 text-amber-500 group-hover:opacity-0 transition-opacity duration-200">
                  <Lock className="h-4 w-4" />
                </div>
              )}

              {/* Actions */}
              <div className="absolute top-4 right-4 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm rounded-lg p-1 shadow-sm border border-gray-100 will-change-transform transform-gpu">
                <button
                  onClick={() => toggleLock(app)}
                  className={`p-1.5 rounded-md transition-colors ${
                    app.is_locked
                      ? 'text-amber-600 hover:bg-amber-50'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                  }`}
                  title={app.is_locked ? 'Unlock Application' : 'Lock Application'}
                >
                  {app.is_locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                </button>
                {app.status === 'OFFER' && (
                  <button
                    onClick={() => navigate('/offers')}
                    className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
                    title="Manage Offer"
                  >
                    <DollarSign className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => setViewingApp(app)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  title="View Details"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  onClick={() => openEditModal(app)}
                  className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    if (app.is_locked) {
                      addToast('Unlock this application to delete it.', 'error');
                      return;
                    }
                    setDeletingId(app.id);
                  }}
                  disabled={app.is_locked}
                  className={`p-1.5 rounded-md transition-colors ${
                    app.is_locked
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                  }`}
                  title={app.is_locked ? 'Unlock to delete' : 'Delete'}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="flex justify-between items-start pr-20">
                <div>
                  <h4
                    className="font-semibold text-gray-900 truncate max-w-[180px]"
                    title={app.role_title}
                  >
                    {app.role_title}
                  </h4>
                  <p
                    className="text-sm text-indigo-600 font-medium truncate max-w-[180px]"
                    title={app.company_details?.name}
                  >
                    {app.company_details?.name || 'Unknown Company'}
                  </p>
                </div>
              </div>

              <div className="mt-2 mb-3">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-bold ${
                    app.status === 'OFFER'
                      ? 'bg-green-100 text-green-800'
                      : app.status === 'REJECTED'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {app.status}
                </span>
              </div>

              <div className="space-y-1 text-sm text-gray-500">
                {app.location && (
                  <div className="flex items-center">
                    <MapPin className="h-3 w-3 mr-1.5" /> {app.location}
                  </div>
                )}
                {app.salary_range && (
                  <div className="flex items-center">
                    <DollarSign className="h-3 w-3 mr-1.5" /> {app.salary_range}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-gray-50 flex justify-between text-xs text-gray-400">
                <span>Applied: {app.date_applied || 'N/A'}</span>
                {app.job_link ? (
                  <a
                    href={
                      app.job_link.startsWith('http') ? app.job_link : `https://${app.job_link}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center"
                  >
                    Apply / View <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                ) : (
                  <span className="text-gray-300 italic cursor-not-allowed text-xs flex items-center">
                    No Link
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Briefcase}
          title={applications.length === 0 ? 'No applications yet' : 'No applications match'}
          description={
            applications.length === 0
              ? 'Start tracking your job hunt by adding your first application or importing a spreadsheet.'
              : 'Try adjusting your search or filters.'
          }
          action={
            applications.length === 0 ? (
              <>
                <button
                  onClick={() => setIsImportOpen(true)}
                  className="text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  Import File
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={openAddModal}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                >
                  + Add Manually
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                }}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
              >
                Clear Search & Filters
              </button>
            )
          }
        />
      )}

      {/* Import Modal */}
      {isImportOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-semibold text-gray-900">Import Applications</h3>
              <button
                onClick={() => setIsImportOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleImport} className="p-6">
              <div
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileSpreadsheet className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 font-medium">
                  {importFile ? importFile.name : 'Click to upload Excel, CSV, or JSON'}
                </p>
                <p className="text-xs text-gray-400 mt-1">Supported formats: .xlsx, .csv, .json</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".csv, .xlsx, .xls, .json"
                  onChange={(e) => e.target.files && setImportFile(e.target.files[0])}
                />
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsImportOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!importFile || importing}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center"
                >
                  {importing && <Loader className="h-4 w-4 mr-2 animate-spin" />}
                  {importing ? 'Importing...' : 'Start Import'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-y-auto max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-semibold text-gray-900">
                {editingId ? 'Edit Application' : 'Add Application'}
              </h3>
              <button onClick={() => setIsAddOpen(false)}>
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Grid Layout */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company *</label>
                  <input
                    name="company"
                    required
                    value={formData.company}
                    onChange={handleInputChange}
                    placeholder="e.g. Google"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role Title *
                  </label>
                  <input
                    name="role_title"
                    required
                    value={formData.role_title}
                    onChange={handleInputChange}
                    placeholder="e.g. Senior Software Engineer"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="APPLIED">Applied</option>
                    <option value="OA">Online Assessment</option>
                    <option value="SCREEN">Phone Screen</option>
                    <option value="ONSITE">Onsite</option>
                    <option value="OFFER">Offer</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="ACCEPTED">Accepted</option>
                    <option value="GHOSTED">Ghosted</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">RTO Policy</label>
                  <select
                    name="rto_policy"
                    value={formData.rto_policy}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="UNKNOWN">Unknown</option>
                    <option value="REMOTE">Remote</option>
                    <option value="HYBRID">Hybrid</option>
                    <option value="ONSITE">Onsite</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Round
                  </label>
                  <input
                    type="number"
                    name="current_round"
                    min="0"
                    max="10"
                    value={formData.current_round}
                    onChange={handleNumberChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">0 = None, 1 = Screen/OA, etc.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Salary Range
                  </label>
                  <input
                    name="salary_range"
                    value={formData.salary_range}
                    onChange={handleInputChange}
                    placeholder="$150k - $200k"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job Link</label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                      https://
                    </span>
                    <input
                      name="site_link"
                      value={formData.site_link}
                      onChange={handleInputChange}
                      placeholder="linkedin.com/jobs/..."
                      className="w-full rounded-none rounded-r-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="e.g. New York (Hybrid)"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date Applied
                  </label>
                  <input
                    type="date"
                    name="date_applied"
                    value={formData.date_applied}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Add any notes..."
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-3 border-t border-gray-100 mt-4">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium shadow-sm"
                >
                  {editingId ? 'Update Application' : 'Save Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-center text-gray-900 mb-2">
              Delete Application?
            </h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              Are you sure you want to delete this application? This action cannot be undone.
            </p>

            <div className="flex space-x-3">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Confirmation Modal */}
      {isDeleteAllOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-center text-gray-900 mb-2">
              Delete All Applications?
            </h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              This will permanently delete all <strong>unlocked</strong> applications.
              <br />
              <span className="text-xs text-amber-600 mt-2 block">
                Locked applications will be preserved.
              </span>
            </p>

            <div className="flex space-x-3">
              <button
                onClick={() => setIsDeleteAllOpen(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAll}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-sm"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewingApp && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-y-auto max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-semibold text-gray-900">Application Details</h3>
              <button onClick={() => setViewingApp(null)}>
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{viewingApp.role_title}</h2>
                  <p className="text-lg text-indigo-600 font-medium">
                    {viewingApp.company_details?.name}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-bold ${
                    viewingApp.status === 'OFFER'
                      ? 'bg-green-100 text-green-800'
                      : viewingApp.status === 'REJECTED'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {viewingApp.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                {viewingApp.location && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <label className="block text-xs text-gray-500 uppercase font-semibold mb-1">
                      Location
                    </label>
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2 text-gray-400" /> {viewingApp.location}
                    </div>
                  </div>
                )}
                {viewingApp.salary_range && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <label className="block text-xs text-gray-500 uppercase font-semibold mb-1">
                      Salary
                    </label>
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-2 text-gray-400" />{' '}
                      {viewingApp.salary_range}
                    </div>
                  </div>
                )}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-xs text-gray-500 uppercase font-semibold mb-1">
                    Applied On
                  </label>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-400" />{' '}
                    {viewingApp.date_applied || 'N/A'}
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-xs text-gray-500 uppercase font-semibold mb-1">
                    Job Link
                  </label>
                  {viewingApp.job_link ? (
                    <a
                      href={
                        viewingApp.job_link.startsWith('http')
                          ? viewingApp.job_link
                          : `https://${viewingApp.job_link}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center text-indigo-600 hover:underline"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" /> Open Link
                    </a>
                  ) : (
                    <span className="text-gray-400 italic">No link provided</span>
                  )}
                </div>
              </div>

              {viewingApp.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Notes</label>
                  <div className="bg-gray-50 p-4 rounded-lg text-gray-700 text-sm whitespace-pre-wrap">
                    {viewingApp.notes}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button
                  onClick={() => {
                    setViewingApp(null);
                    openEditModal(viewingApp);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium mr-3"
                >
                  Edit
                </button>
                <button
                  onClick={() => setViewingApp(null)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Applications;

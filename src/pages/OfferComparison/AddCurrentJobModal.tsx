import { useState, useEffect, useCallback } from 'react';
import { Select, Spin } from 'antd';
import ModalShell from '../../components/ModalShell';
import { getApplicationOptions } from '../../api';

type Props = {
  isOpen: boolean;
  newJobName: string;
  onNameChange: (value: string) => void;
  linkedApplicationId: number | null;
  onLinkedApplicationChange: (value: number | null) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
};

const AddCurrentJobModal = ({
  isOpen,
  newJobName,
  onNameChange,
  linkedApplicationId,
  onLinkedApplicationChange,
  onClose,
  onSubmit,
}: Props) => {
  const [options, setOptions] = useState<
    { value: number; label: string; companyName: string; hasOffer?: boolean }[]
  >([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchOptions = useCallback(async (searchStr: string, pageNum: number, append: boolean) => {
    try {
      setLoading(true);
      const pageSize = 20;
      const resp = await getApplicationOptions({
        search: searchStr,
        page: pageNum,
        page_size: pageSize,
      });
      const data = resp.data || [];
      const newOptions = data.map((app: any) => ({
        value: app.id,
        label: `${app.company_details?.name || 'Unknown'} - ${app.role_title} (${app.status})`,
        companyName: app.company_details?.name || '',
        hasOffer: app.has_offer,
      }));

      setOptions((prev) => (append ? [...prev, ...newOptions] : newOptions));
      setHasMore(data.length === pageSize);
    } catch (err) {
      console.error('Failed to load application options', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        fetchOptions(searchTerm, page, page > 1);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchTerm, page, isOpen, fetchOptions]);

  const handleSearch = (val: string) => {
    setSearchTerm(val);
    setPage(1);
  };

  const handlePopupScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollTop + target.clientHeight >= target.scrollHeight - 10) {
      if (!loading && hasMore) {
        setPage((p) => p + 1);
      }
    }
  };

  const handleSelectChange = (val: number | null) => {
    onLinkedApplicationChange(val);
    if (val) {
      const selectedOpt = options.find((o) => o.value === val);
      if (selectedOpt) {
        onNameChange(selectedOpt.companyName);
      }
    } else {
      onNameChange('');
    }
  };

  const selectedOpt = options.find((o) => o.value === linkedApplicationId);

  return (
    <ModalShell
      isOpen={isOpen}
      title="Add Current Job"
      onClose={onClose}
      maxWidthClass="max-w-md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-current-job-form"
            className="min-h-11 rounded-xl border border-transparent bg-blue-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Add Job
          </button>
        </>
      }
    >
      <form id="add-current-job-form" onSubmit={onSubmit}>
        <div className="space-y-5 p-4 sm:p-6">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Link an existing application <span className="text-slate-400">(optional)</span>
            </label>
            <Select
              showSearch
              value={linkedApplicationId ?? undefined}
              placeholder="Search applications"
              defaultActiveFirstOption={false}
              showArrow
              filterOption={false}
              onSearch={handleSearch}
              onChange={handleSelectChange}
              onPopupScroll={handlePopupScroll}
              notFoundContent={loading ? <Spin size="small" /> : 'No applications found'}
              className="w-full"
              allowClear
              loading={loading}
              options={options}
            />
            {linkedApplicationId && selectedOpt && (
              <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-800">
                {selectedOpt.hasOffer ? (
                  <span>
                    <strong>Note:</strong> This application already has an associated offer. Saving
                    will set that offer as your current job baseline and open it for editing.
                  </span>
                ) : (
                  <span>
                    <strong>Note:</strong> This application does not have an offer yet. Saving will
                    create an offer for it, mark it as your current job baseline, and open it for
                    editing.
                  </span>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Company name</label>
            <input
              type="text"
              required
              value={newJobName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="e.g. Current Employer"
              className="min-h-11 w-full rounded-xl border border-slate-300 px-4 text-base outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
              disabled={!!linkedApplicationId}
            />
          </div>
        </div>
      </form>
    </ModalShell>
  );
};

export default AddCurrentJobModal;

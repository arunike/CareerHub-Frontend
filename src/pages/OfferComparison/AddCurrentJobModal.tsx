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
      bodyClassName=""
    >
      <form onSubmit={onSubmit}>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Link Existing Application (Optional)
            </label>
            <Select
              showSearch
              value={linkedApplicationId ?? undefined}
              placeholder="Search existing applications..."
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
              <div className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-2.5 mt-2">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
            <input
              type="text"
              required
              value={newJobName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="e.g. Current Employer"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              disabled={!!linkedApplicationId}
            />
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700"
          >
            Add Job
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

export default AddCurrentJobModal;

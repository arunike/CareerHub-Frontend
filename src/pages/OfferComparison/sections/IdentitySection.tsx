import { useState, useEffect, useCallback } from 'react';
import { Select, Spin } from 'antd';
import { getApplicationOptions } from '../../../api';
import type { ApplicationOption } from './types';

type IdentitySectionProps = {
  showLinkApplication: boolean;
  linkedApplicationId: number | null;
  onLinkedApplicationChange?: (value: number | null) => void;
  applicationOptions: ApplicationOption[];
  shouldShowCompanyRole: boolean;
  companyName: string;
  onCompanyNameChange: (value: string) => void;
  roleTitle: string;
  onRoleTitleChange: (value: string) => void;
  companyPlaceholder: string;
  rolePlaceholder: string;
};

const IdentitySection = ({
  showLinkApplication,
  linkedApplicationId,
  onLinkedApplicationChange,
  applicationOptions,
  shouldShowCompanyRole,
  companyName,
  onCompanyNameChange,
  roleTitle,
  onRoleTitleChange,
  companyPlaceholder,
  rolePlaceholder,
}: IdentitySectionProps) => {
  const [options, setOptions] = useState<{ value: number; label: string }[]>([]);
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
      }));

      setOptions((prev) => (append ? [...prev, ...newOptions] : newOptions));
      setHasMore(data.length === pageSize);
    } catch (err) {
      console.error('Failed to load application options', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search / load effect
  useEffect(() => {
    if (!showLinkApplication) return;
    const timer = setTimeout(() => {
      fetchOptions(searchTerm, page, page > 1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, page, showLinkApplication, fetchOptions]);

  // Sync selected linked application option
  useEffect(() => {
    if (linkedApplicationId) {
      const matched = applicationOptions.find((opt) => opt.id === linkedApplicationId);
      if (matched) {
        setOptions((prev) => {
          if (prev.some((o) => o.value === matched.id)) return prev;
          return [{ value: matched.id, label: matched.label }, ...prev];
        });
      }
    }
  }, [linkedApplicationId, applicationOptions]);

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

  return (
    <>
      {showLinkApplication && onLinkedApplicationChange && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Link Existing Application (Optional)
          </label>
          <Select
            showSearch
            value={linkedApplicationId ?? undefined}
            placeholder="No link (custom)"
            defaultActiveFirstOption={false}
            showArrow
            filterOption={false}
            onSearch={handleSearch}
            onChange={(val) => onLinkedApplicationChange(val ? Number(val) : null)}
            onPopupScroll={handlePopupScroll}
            notFoundContent={loading ? <Spin size="small" /> : 'No applications found'}
            className="w-full"
            allowClear
            loading={loading}
            options={options}
          />
        </div>
      )}

      {shouldShowCompanyRole && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => onCompanyNameChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder={companyPlaceholder}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <input
              type="text"
              value={roleTitle}
              onChange={(e) => onRoleTitleChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder={rolePlaceholder}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default IdentitySection;

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Select, Spin } from 'antd';
import type { SelectProps } from 'antd';
import { getApplicationOptions } from '../api/career';

export interface ApplicationOption {
  id: number;
  role_title: string;
  status: string;
  company_details?: { id: number; name: string } | null;
  has_offer?: boolean;
}

const PAGE_SIZE = 25;
// Start loading before the user actually hits the bottom, so the next page is usually
// already there by the time they get to it.
const SCROLL_THRESHOLD_PX = 80;

const defaultLabel = (application: ApplicationOption) =>
  `${application.company_details?.name || 'Unknown'} · ${application.role_title}`;

interface Props {
  value?: number | null;
  onChange?: (value: number | undefined, application?: ApplicationOption) => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  className?: string;
  status?: SelectProps['status'];
  // Restricts the list to one company, for pickers scoped to a company already chosen.
  company?: string;
  formatLabel?: (application: ApplicationOption) => string;
}

const ApplicationSelect = ({
  value,
  onChange,
  placeholder = 'Search by company or role',
  allowClear = true,
  disabled,
  className,
  status,
  company,
  formatLabel = defaultLabel,
}: Props) => {
  const [items, items_set] = useState<ApplicationOption[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  // Guards against a stale response from an earlier keystroke overwriting a newer one.
  const requestId = useRef(0);

  const query = company?.trim() || search.trim();

  const load = useCallback(
    async (pageNumber: number, append: boolean) => {
      const ticket = ++requestId.current;
      setLoading(true);
      try {
        const response = await getApplicationOptions({
          search: query || undefined,
          page: pageNumber,
          page_size: PAGE_SIZE,
        });
        if (ticket !== requestId.current) return;
        const batch = (response.data || []) as ApplicationOption[];
        items_set((prev) => {
          if (!append) return batch;
          const known = new Set(prev.map((item) => item.id));
          return [...prev, ...batch.filter((item) => !known.has(item.id))];
        });
        // A short page means the end; a full one might not, so keep the door open.
        setHasMore(batch.length === PAGE_SIZE);
      } catch (error) {
        console.error('Failed to load applications', error);
        if (ticket === requestId.current) setHasMore(false);
      } finally {
        if (ticket === requestId.current) setLoading(false);
      }
    },
    [query]
  );

  // Debounced so typing does not fire a request per keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      void load(1, false);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [load]);

  // A saved value can sit on any page, so fetch that one directly rather than paging to it.
  const [resolved, setResolved] = useState<ApplicationOption | null>(null);
  useEffect(() => {
    if (!value) {
      setResolved(null);
      return;
    }
    if (items.some((item) => item.id === value) || resolved?.id === value) return;
    let active = true;
    getApplicationOptions({ ids: String(value) })
      .then((response) => {
        const found = ((response.data || []) as ApplicationOption[])[0];
        if (active && found) setResolved(found);
      })
      .catch((error) => console.error('Failed to resolve application', error));
    return () => {
      active = false;
    };
  }, [items, resolved, value]);

  const options = useMemo(() => {
    const merged =
      resolved && !items.some((item) => item.id === resolved.id) ? [resolved, ...items] : items;
    return merged.map((application) => ({
      value: application.id,
      label: formatLabel(application),
    }));
  }, [formatLabel, items, resolved]);

  const onPopupScroll: SelectProps['onPopupScroll'] = (event) => {
    const target = event.currentTarget;
    if (loading || !hasMore) return;
    if (target.scrollTop + target.offsetHeight >= target.scrollHeight - SCROLL_THRESHOLD_PX) {
      const next = page + 1;
      setPage(next);
      void load(next, true);
    }
  };

  return (
    <Select
      className={className}
      value={value ?? undefined}
      onChange={(next) =>
        onChange?.(
          next ?? undefined,
          [...items, ...(resolved ? [resolved] : [])].find((item) => item.id === next)
        )
      }
      onSearch={company ? undefined : setSearch}
      onPopupScroll={onPopupScroll}
      showSearch={!company}
      // Filtering happens on the server, so keep every option antd was given.
      filterOption={false}
      options={options}
      allowClear={allowClear}
      disabled={disabled}
      status={status}
      placeholder={placeholder}
      notFoundContent={loading ? <Spin size="small" className="my-2 block" /> : 'No applications'}
      dropdownRender={(menu) => (
        <>
          {menu}
          {loading && options.length > 0 && (
            <div className="flex items-center justify-center gap-2 border-t border-slate-100 py-2 text-xs text-slate-400">
              <Spin size="small" />
              Loading more…
            </div>
          )}
        </>
      )}
    />
  );
};

export default ApplicationSelect;

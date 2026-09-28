import { RightOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export interface SummaryRow {
  id: string;
  to: string;
  title: string;
  meta?: ReactNode;
  trailing?: ReactNode;
  leading?: ReactNode;
}

// Every row is a link: the point of the page is to get you into the record, not to read a list.
const SummaryRowList = ({ rows }: { rows: SummaryRow[] }) => (
  <ul className="divide-y divide-slate-100/80 dark:divide-white/[0.05]">
    {rows.map((row) => (
      <li key={row.id}>
        <Link
          to={row.to}
          className="group flex min-h-11 items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-50/80 dark:hover:bg-white/[0.03]"
        >
          {row.leading}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-slate-800 dark:text-ink-100">
              {row.title}
            </span>
            {row.meta && (
              <span className="mt-0.5 block truncate text-[11.5px] text-slate-500 dark:text-ink-400">
                {row.meta}
              </span>
            )}
          </span>
          <span className="flex shrink-0 items-center gap-2.5">
            {row.trailing}
            <RightOutlined className="text-[10px] text-slate-300 transition-transform group-hover:translate-x-0.5 dark:text-ink-600" />
          </span>
        </Link>
      </li>
    ))}
  </ul>
);

export default SummaryRowList;

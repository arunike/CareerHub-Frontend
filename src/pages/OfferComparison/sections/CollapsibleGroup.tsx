import { useId, useState } from 'react';
import { DownOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';

const CollapsibleGroup = ({
  title,
  summary,
  hasValue = false,
  children,
}: {
  title: ReactNode;
  summary?: ReactNode;
  hasValue?: boolean;
  children: ReactNode;
}) => {
  const [open, setOpen] = useState(hasValue);
  const panelId = useId();

  return (
    <section className="rounded-xl border border-gray-200 bg-white">
      <h4 className="m-0">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
        >
          <span className="min-w-0 text-sm font-bold uppercase tracking-wide text-gray-800">
            {title}
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {summary ? (
              <span className="text-xs font-semibold tabular-nums text-slate-500">{summary}</span>
            ) : null}
            <DownOutlined
              className={`text-[10px] text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </span>
        </button>
      </h4>
      <div id={panelId} hidden={!open} className="border-t border-gray-100 p-3">
        {children}
      </div>
    </section>
  );
};

export default CollapsibleGroup;

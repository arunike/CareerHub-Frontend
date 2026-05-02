import { Link } from 'react-router-dom';

type PublicHeaderNavItem = {
  label: string;
  to: string;
  active?: boolean;
};

type PublicHeaderProps = {
  brandHref?: string;
  navItems?: PublicHeaderNavItem[];
  actionLabel?: string;
  actionHref?: string;
};

export default function PublicHeader({
  brandHref = '/login',
  navItems = [],
  actionLabel = 'Login',
  actionHref = '/login',
}: PublicHeaderProps) {
  return (
    <nav className="flex flex-col gap-4 border-b border-slate-200 pb-5 text-sm sm:flex-row sm:items-center sm:justify-between">
      <Link to={brandHref} className="text-lg font-bold tracking-tight text-slate-950 hover:text-indigo-600">
        CareerHub
      </Link>
      <div className="flex flex-wrap items-center gap-3 sm:justify-end">
        {navItems.length > 0 && (
          <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`rounded-full px-3 py-1.5 transition ${
                  item.active
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-500 hover:bg-indigo-50 hover:text-slate-950'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
        <Link
          to={actionHref}
          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 font-semibold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
        >
          {actionLabel}
        </Link>
      </div>
    </nav>
  );
}

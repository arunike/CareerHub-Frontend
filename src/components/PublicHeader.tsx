import { Link } from 'react-router-dom';
import logo from '../assets/logo.png';

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
  brandHref = '/',
  navItems = [],
  actionLabel = 'Login',
  actionHref = '/login',
}: PublicHeaderProps) {
  return (
    <nav className="fixed left-1/2 top-6 z-50 flex w-[calc(100%-2.5rem)] max-w-5xl -translate-x-1/2 flex-col items-center justify-between gap-4 rounded-[2rem] border border-slate-200/70 bg-white/75 px-4 py-3 text-sm shadow-[0_24px_70px_-48px_rgba(15,23,42,0.75)] backdrop-blur-xl sm:flex-row sm:gap-0">
      <Link
        to={brandHref}
        className="inline-flex items-center gap-3 text-lg font-bold text-slate-900 transition hover:text-blue-600"
      >
        <img src={logo} alt="" className="h-8 w-8 rounded-xl shadow-sm ring-1 ring-slate-200" />
        <span className="tracking-tight">CareerHub</span>
      </Link>
      <div className="flex flex-wrap items-center justify-center gap-4 sm:justify-end">
        {navItems.length > 0 && (
          <div className="flex items-center gap-1 rounded-full border border-slate-200/50 bg-slate-50/50 p-1">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`rounded-full px-4 py-1.5 font-medium transition ${
                  item.active
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/10'
                    : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
        <Link
          to={actionHref}
          className="inline-flex min-h-[38px] items-center justify-center rounded-full border border-blue-600 bg-blue-600 px-5 font-bold text-white shadow-md shadow-blue-900/15 transition hover:scale-[1.03] hover:border-blue-500 hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-900/20"
        >
          {actionLabel}
        </Link>
      </div>
    </nav>
  );
}

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
    <nav
      aria-label="Public navigation"
      className="fixed left-1/2 top-[max(1rem,env(safe-area-inset-top))] z-50 flex w-[calc(100%-2rem)] max-w-5xl -translate-x-1/2 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-[0_18px_48px_-36px_rgba(15,23,42,0.6)] sm:px-4"
    >
      <Link
        to={brandHref}
        aria-label="CareerHub home"
        className="inline-flex min-h-11 items-center gap-3 rounded-xl px-1 text-lg font-bold text-slate-900 transition hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        <img src={logo} alt="" className="h-8 w-8 rounded-lg ring-1 ring-slate-200" />
        <span className="hidden tracking-tight sm:inline">CareerHub</span>
      </Link>
      <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-4">
        {navItems.length > 0 && (
          <div className="flex items-center gap-1 rounded-full border border-slate-200/50 bg-slate-50/50 p-1">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`inline-flex min-h-11 items-center rounded-xl px-3 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:px-4 ${
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
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-blue-600 bg-blue-600 px-4 font-semibold text-white transition-colors hover:border-blue-700 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:px-5"
        >
          {actionLabel}
        </Link>
      </div>
    </nav>
  );
}

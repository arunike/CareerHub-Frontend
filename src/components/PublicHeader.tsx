import type { ReactNode } from 'react';
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
  utility?: ReactNode;
};

export default function PublicHeader({
  brandHref = '/',
  navItems = [],
  actionLabel = 'Login',
  actionHref = '/login',
  utility,
}: PublicHeaderProps) {
  return (
    <nav
      aria-label="Public navigation"
      className="fixed left-1/2 top-[max(1rem,env(safe-area-inset-top))] z-50 flex w-[calc(100%-2rem)] max-w-5xl -translate-x-1/2 items-center justify-between gap-3 rounded-2xl border border-white/80 bg-white/85 dark:bg-ink-900/85 px-3 py-2.5 text-sm shadow-[0_18px_52px_-34px_rgba(30,64,175,0.38)] backdrop-blur-xl transition-colors duration-300 dark:border-white/[0.12] dark:shadow-[0_18px_52px_-34px_rgba(0,0,0,0.9)] sm:px-4"
    >
      <Link
        to={brandHref}
        aria-label="CareerHub home"
        className="inline-flex min-h-11 items-center gap-3 rounded-xl px-1 text-lg font-bold text-slate-900 dark:text-ink-50 transition hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:text-ink-50 dark:hover:text-blue-300 dark:focus-visible:ring-offset-ink-950"
      >
        <img
          src={logo}
          alt=""
          className="h-8 w-8 rounded-lg ring-1 ring-slate-200 dark:ring-white/[0.08] dark:ring-white/[0.12]"
        />
        <span className="hidden tracking-tight sm:inline">CareerHub</span>
      </Link>
      <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-4">
        {navItems.length > 0 && (
          <div className="hidden items-center gap-1 rounded-full border border-slate-200/50 dark:border-white/[0.08] bg-slate-50/50 dark:bg-ink-900/50 p-1 dark:border-white/[0.12] md:flex">
            {navItems.map((item) => {
              const className = `inline-flex min-h-11 items-center rounded-xl px-3 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:px-4 ${
                item.active
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/10'
                  : 'text-slate-600 dark:text-ink-200 hover:bg-slate-200/50 hover:text-slate-900 dark:hover:text-ink-200 dark:hover:bg-ink-800 dark:hover:text-ink-50'
              }`;
              return item.to.startsWith('#') ? (
                <a key={item.to} href={item.to} className={className}>
                  {item.label}
                </a>
              ) : (
                <Link key={item.to} to={item.to} className={className}>
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
        {utility}
        <Link
          to={actionHref}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-blue-600 bg-blue-600 px-4 font-semibold text-white shadow-[0_12px_24px_-16px_rgba(37,99,235,0.9)] transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-700 hover:bg-blue-700 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:px-5"
        >
          {actionLabel}
        </Link>
      </div>
    </nav>
  );
}

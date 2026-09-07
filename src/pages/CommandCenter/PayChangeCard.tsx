import { useState } from 'react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { EyeInvisibleOutlined, EyeOutlined, RiseOutlined } from '@ant-design/icons';
import type { CommandRaise } from './commandCenter';

const money = (value: number) => `$${Math.round(value).toLocaleString()}`;

const PayChangeCard = ({ raise }: { raise: CommandRaise }) => {
  // Masked on load: a salary is the one number on this page you might not want over your shoulder.
  const [revealed, setRevealed] = useState(false);

  return (
    <section className="enterprise-card p-5">
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-slate-400 dark:text-ink-500">
          <RiseOutlined /> Latest pay change
        </span>
        <button
          type="button"
          aria-pressed={revealed}
          aria-label={revealed ? 'Hide pay figures' : 'Show pay figures'}
          onClick={() => setRevealed((current) => !current)}
          className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-ink-500 dark:hover:bg-white/[0.06]"
        >
          {revealed ? (
            <EyeOutlined className="text-[13px]" />
          ) : (
            <EyeInvisibleOutlined className="text-[13px]" />
          )}
        </button>
      </div>
      {/* Blurred rather than swapped for dots: the row keeps its shape and its typography. */}
      <p
        aria-hidden={!revealed}
        className={`mt-2.5 flex flex-wrap items-baseline gap-x-2 gap-y-1 transition-[filter] duration-200 ${
          revealed ? '' : 'pointer-events-none select-none blur-[9px]'
        }`}
      >
        <span className="text-[13px] tabular-nums text-slate-400 line-through dark:text-ink-500">
          {money(raise.base_before)}
        </span>
        <span className="text-[22px] font-semibold tabular-nums tracking-[-0.02em] text-slate-900 dark:text-ink-50">
          {money(raise.base_after)}
        </span>
        <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-300">
          +{money(raise.base_after - raise.base_before)}
        </span>
      </p>
      {!revealed && <span className="sr-only">Pay figures hidden</span>}
      <p className="mt-1.5 truncate text-[11.5px] text-slate-500 dark:text-ink-400">
        {raise.company}
        {raise.roleTitle ? ` · ${raise.roleTitle}` : ''} · {dayjs(raise.date).format('D MMM YYYY')}
      </p>
      <Link
        to="/experience"
        className="mt-3 inline-block text-[11px] font-semibold text-blue-600 hover:underline dark:text-blue-300"
      >
        Career history
      </Link>
    </section>
  );
};

export default PayChangeCard;

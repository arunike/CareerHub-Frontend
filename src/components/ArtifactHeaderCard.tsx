import React from 'react';

interface ArtifactHeaderCardProps {
  typeLabel: string;
  typeIcon: React.ReactNode;
  title: string;
  date: string;
  subtitle: string;
  themeColor?: 'blue' | 'sky' | 'indigo' | 'emerald' | 'amber' | 'violet';
}

const themeConfigs = {
  blue: {
    text: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
  },
  sky: {
    text: 'text-sky-600',
    bg: 'bg-sky-50',
    border: 'border-sky-100',
  },
  indigo: {
    text: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-100',
  },
  emerald: {
    text: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
  },
  amber: {
    text: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
  },
  violet: {
    text: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-100',
  },
};

const ArtifactHeaderCard: React.FC<ArtifactHeaderCardProps> = ({
  typeLabel,
  typeIcon,
  title,
  date,
  subtitle,
  themeColor = 'blue',
}) => {
  const config = themeConfigs[themeColor] || themeConfigs.blue;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_48px_-42px_rgba(15,23,42,0.62)] sm:px-6 md:px-8 md:py-6">
      <div>
        <div
          className={`mb-4 inline-flex min-h-8 items-center gap-2 rounded-lg border ${config.border} ${config.bg} px-2.5`}
        >
          <span className={`${config.text} flex shrink-0 items-center text-sm`}>{typeIcon}</span>
          <span className={`shrink-0 text-xs font-semibold ${config.text}`}>{typeLabel}</span>
        </div>
        <h1 className="mb-2 max-w-4xl text-2xl font-bold leading-tight tracking-tight text-slate-950 md:text-3xl">
          {title}
        </h1>
        <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500">
          <span>{date}</span>
          <span className="h-1 w-1 rounded-full bg-slate-300" />
          <span>{subtitle}</span>
        </div>
      </div>
    </div>
  );
};

export default ArtifactHeaderCard;

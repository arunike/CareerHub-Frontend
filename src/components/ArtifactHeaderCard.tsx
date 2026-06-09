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
    bg: 'bg-blue-50/80',
    border: 'border-blue-100/60',
    glow: 'bg-blue-400/10',
  },
  sky: {
    text: 'text-sky-600',
    bg: 'bg-sky-50/80',
    border: 'border-sky-100/60',
    glow: 'bg-sky-400/10',
  },
  indigo: {
    text: 'text-indigo-600',
    bg: 'bg-indigo-50/80',
    border: 'border-indigo-100/60',
    glow: 'bg-indigo-400/10',
  },
  emerald: {
    text: 'text-emerald-600',
    bg: 'bg-emerald-50/80',
    border: 'border-emerald-100/60',
    glow: 'bg-emerald-400/10',
  },
  amber: {
    text: 'text-amber-600',
    bg: 'bg-amber-50/80',
    border: 'border-amber-100/60',
    glow: 'bg-amber-400/10',
  },
  violet: {
    text: 'text-violet-600',
    bg: 'bg-violet-50/80',
    border: 'border-violet-100/60',
    glow: 'bg-violet-400/10',
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
    <div className="relative overflow-hidden rounded-[1.25rem] border border-slate-200/80 bg-white/80 backdrop-blur-sm px-6 py-6 shadow-[0_24px_70px_-56px_rgba(15,23,42,0.7)] md:px-8">
      {/* Decorative Glows */}
      <div
        className={`absolute right-0 top-0 -mr-12 -mt-12 w-40 h-40 rounded-full ${config.glow} blur-3xl pointer-events-none`}
      />
      <div className="absolute left-0 top-0 -ml-16 -mt-16 w-40 h-40 rounded-full bg-slate-100/50 blur-3xl pointer-events-none" />

      <div className="relative z-10">
        <div
          className={`mb-4 inline-flex items-center gap-2 rounded-full border ${config.border} ${config.bg} px-3 py-1 shadow-sm`}
        >
          <span className={`${config.text} text-xs flex items-center shrink-0`}>{typeIcon}</span>
          <span
            className={`text-[10px] font-bold ${config.text} uppercase tracking-widest shrink-0`}
          >
            {typeLabel}
          </span>
        </div>
        <h1 className="mb-2 max-w-4xl text-2xl md:text-3xl font-bold leading-tight tracking-tight text-slate-950">
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

import React from 'react';

interface SkeletonBlockProps {
  width?: string;
  height?: string;
  className?: string;
  circle?: boolean;
}

export const SkeletonBlock: React.FC<SkeletonBlockProps> = ({
  width = '100%',
  height = '1rem',
  className = '',
  circle = false,
}) => {
  return (
    <div
      className={`shimmer-bg ${circle ? 'rounded-full' : 'rounded-lg'} ${className}`}
      style={{
        width,
        height,
      }}
    />
  );
};

export const PageHeaderSkeleton: React.FC = () => {
  return (
    <div className="page-toolbar mb-6 animate-in fade-in duration-300">
      <div className="page-toolbar-heading space-y-2">
        <SkeletonBlock width="200px" height="2.25rem" />
        <SkeletonBlock width="340px" height="1rem" className="opacity-75" />
      </div>
      <div className="flex gap-2.5 items-center">
        <SkeletonBlock width="110px" height="2.5rem" className="hidden sm:block" />
        <SkeletonBlock width="150px" height="2.5rem" />
      </div>
    </div>
  );
};

export const MetricCardsSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className={`grid grid-cols-2 gap-3 mb-6 ${count === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
      {Array.from({ length: count }).map((_, idx) => {
        // Vary the color block themes (blue, emerald, amber, slate)
        const tones = [
          { bg: 'bg-blue-50/60', dot: 'bg-blue-400' },
          { bg: 'bg-emerald-50/60', dot: 'bg-emerald-400' },
          { bg: 'bg-amber-50/60', dot: 'bg-amber-400' },
          { bg: 'bg-slate-50/70', dot: 'bg-slate-400' },
        ];
        const tone = tones[idx % tones.length];

        return (
          <div key={idx} className="enterprise-card px-4 py-4 md:px-5 md:py-5 space-y-4 bg-white">
            <div className="flex justify-between items-center">
              <SkeletonBlock width="50%" height="0.8rem" className="opacity-60" />
              <div className={`w-7 h-7 rounded-lg ${tone.bg} flex items-center justify-center shrink-0`}>
                <div className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
              </div>
            </div>
            <div className="space-y-1.5">
              <SkeletonBlock width="65%" height="1.85rem" />
              <SkeletonBlock width="40%" height="0.7rem" className="opacity-50" />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const TableSkeleton: React.FC = () => {
  return (
    <div className="enterprise-table-shell animate-in fade-in duration-300 bg-white">
      {/* Fake Filter bar */}
      <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2.5 flex-1 max-w-lg">
          <SkeletonBlock width="180px" height="2.25rem" />
          <SkeletonBlock width="130px" height="2.25rem" className="hidden sm:block" />
          <SkeletonBlock width="130px" height="2.25rem" className="hidden md:block" />
        </div>
        <div className="flex gap-2">
          <SkeletonBlock width="36px" height="2.25rem" className="rounded-lg" />
          <SkeletonBlock width="100px" height="2.25rem" />
        </div>
      </div>

      {/* Fake Table Header */}
      <div className="bg-slate-50/80 p-4 grid grid-cols-4 md:grid-cols-6 gap-4 border-b border-slate-200/60 items-center">
        <div className="flex items-center gap-3">
          <SkeletonBlock width="16px" height="16px" className="rounded shrink-0" />
          <SkeletonBlock width="50%" height="0.75rem" className="opacity-80" />
        </div>
        <SkeletonBlock width="60%" height="0.75rem" className="opacity-80" />
        <SkeletonBlock width="40%" height="0.75rem" className="opacity-80 hidden md:block" />
        <SkeletonBlock width="50%" height="0.75rem" className="opacity-80" />
        <SkeletonBlock width="60%" height="0.75rem" className="opacity-80 hidden md:block" />
        <SkeletonBlock width="50px" height="0.75rem" className="opacity-80 justify-self-end text-right" />
      </div>

      {/* Fake Table Rows */}
      <div className="divide-y divide-slate-100">
        {Array.from({ length: 6 }).map((_, idx) => {
          const statuses = [
            { bg: 'bg-blue-50/80 border-blue-100/60', dot: 'bg-blue-400', width: '60px' },
            { bg: 'bg-emerald-50/80 border-emerald-100/60', dot: 'bg-emerald-400', width: '55px' },
            { bg: 'bg-amber-50/80 border-amber-100/60', dot: 'bg-amber-400', width: '70px' },
            { bg: 'bg-rose-50/80 border-rose-100/60', dot: 'bg-rose-400', width: '65px' },
          ];
          const status = statuses[idx % statuses.length];

          return (
            <div key={idx} className="p-4 grid grid-cols-4 md:grid-cols-6 gap-4 items-center hover:bg-slate-50/30">
              <div className="flex items-center gap-3 min-w-0">
                <SkeletonBlock width="16px" height="16px" className="rounded shrink-0 opacity-40" />
                <SkeletonBlock width="24px" height="24px" className="rounded-lg shrink-0 opacity-80" />
                <SkeletonBlock width="70%" height="0.95rem" className="font-semibold" />
              </div>
              <SkeletonBlock width="85%" height="0.95rem" />
              <SkeletonBlock width="65%" height="0.85rem" className="hidden md:block opacity-75" />
              <div className="flex">
                <div className={`h-5.5 rounded-full ${status.bg} border flex items-center px-2 gap-1.5 shrink-0`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${status.dot} shrink-0`} />
                  <SkeletonBlock width={status.width} height="0.45rem" className="opacity-75" />
                </div>
              </div>
              <SkeletonBlock width="75%" height="0.85rem" className="hidden md:block opacity-75" />
              <div className="flex gap-2.5 justify-end justify-self-end shrink-0">
                <SkeletonBlock width="26px" height="26px" circle className="opacity-80" />
                <SkeletonBlock width="26px" height="26px" circle className="opacity-80" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Fake Table Pagination */}
      <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
        <SkeletonBlock width="140px" height="0.8rem" className="opacity-60" />
        <div className="flex gap-1.5">
          <SkeletonBlock width="28px" height="28px" className="rounded-lg" />
          <SkeletonBlock width="28px" height="28px" className="rounded-lg" />
          <SkeletonBlock width="28px" height="28px" className="rounded-lg" />
        </div>
      </div>
    </div>
  );
};

export const ListSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="enterprise-card p-5 flex flex-col justify-between gap-5 bg-white border border-slate-100"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
            <div className="flex items-center gap-4 flex-1">
              <SkeletonBlock width="44px" height="44px" circle className="shrink-0 opacity-90" />
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <SkeletonBlock width="240px" height="1.1rem" className="font-semibold" />
                  <div className="h-5 rounded-full bg-blue-50/50 border border-blue-100/30 px-2 flex items-center">
                    <SkeletonBlock width="45px" height="0.45rem" className="opacity-75 bg-blue-300" />
                  </div>
                </div>
                <div className="flex gap-4 items-center flex-wrap">
                  <SkeletonBlock width="120px" height="0.8rem" className="opacity-65" />
                  <SkeletonBlock width="150px" height="0.8rem" className="opacity-65" />
                </div>
              </div>
            </div>
            <div className="flex gap-2.5 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-slate-100/70 justify-end items-center">
              <SkeletonBlock width="85px" height="2rem" />
              <SkeletonBlock width="85px" height="2rem" />
            </div>
          </div>

          {/* Realistic Skill Tag Row for Journey List items */}
          <div className="pt-3 border-t border-slate-100/60 flex flex-wrap gap-2">
            {Array.from({ length: 3 }).map((_, tIdx) => (
              <SkeletonBlock key={tIdx} width="65px" height="1.5rem" className="rounded-md opacity-70" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export const GridSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 animate-in fade-in duration-300">
      {Array.from({ length: count }).map((_, idx) => {
        const borderColors = ['border-blue-100/50', 'border-emerald-100/50', 'border-amber-100/50', 'border-slate-100/60'];
        const tagColors = [
          { bg: 'bg-blue-50/70', dot: 'bg-blue-400' },
          { bg: 'bg-emerald-50/70', dot: 'bg-emerald-400' },
          { bg: 'bg-amber-50/70', dot: 'bg-amber-400' },
          { bg: 'bg-slate-50/80', dot: 'bg-slate-400' },
        ];
        const border = borderColors[idx % borderColors.length];
        const tag = tagColors[idx % tagColors.length];

        return (
          <div
            key={idx}
            className={`enterprise-card p-5 flex flex-col justify-between bg-white border ${border}`}
            style={{ height: '225px' }}
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2 flex-1 min-w-0">
                  <SkeletonBlock width="80%" height="1.1rem" className="font-semibold" />
                  <SkeletonBlock width="50%" height="0.75rem" className="opacity-60" />
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <SkeletonBlock width="22px" height="22px" circle className="opacity-70" />
                  <SkeletonBlock width="22px" height="22px" circle className="opacity-70" />
                </div>
              </div>
              <div className="space-y-2 pt-1.5">
                <SkeletonBlock width="95%" height="0.85rem" className="opacity-80" />
                <SkeletonBlock width="85%" height="0.85rem" className="opacity-80" />
              </div>
            </div>
            <div className="pt-3.5 border-t border-slate-100 flex justify-between items-center">
              <div className={`h-5.5 rounded-md ${tag.bg} flex items-center px-2 gap-1.5`}>
                <div className={`w-1.2 h-1.2 rounded-full ${tag.dot}`} />
                <SkeletonBlock width="45px" height="0.45rem" className="opacity-75" />
              </div>
              <SkeletonBlock width="30px" height="1.5rem" className="rounded-md" />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const CalendarSkeleton: React.FC = () => {
  return (
    <div className="enterprise-section p-5 space-y-5 animate-in fade-in duration-300 bg-white/50">
      {/* Calendar Header */}
      <div className="flex items-center justify-between gap-4">
        <SkeletonBlock width="140px" height="1.75rem" />
        <div className="flex gap-2">
          <SkeletonBlock width="80px" height="2rem" />
          <SkeletonBlock width="120px" height="2rem" />
        </div>
      </div>

      {/* Weekdays Row */}
      <div className="grid grid-cols-7 gap-2 border-b border-slate-100 pb-2">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div key={day} className="text-center">
            <SkeletonBlock width="40%" height="0.75rem" className="mx-auto opacity-70" />
          </div>
        ))}
      </div>

      {/* Grid Cells */}
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }).map((_, idx) => {
          const hasEvent1 = idx % 7 === 1 || idx % 7 === 4;
          const hasEvent2 = idx % 7 === 4;
          return (
            <div
              key={idx}
              className="border border-slate-100 rounded-xl p-2 min-h-[95px] flex flex-col justify-between bg-white shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
            >
              <div className="flex justify-between items-center">
                <SkeletonBlock width="20px" height="0.85rem" className="opacity-60" />
              </div>
              <div className="space-y-1.5 mt-2 flex-grow flex flex-col justify-end">
                {hasEvent1 && (
                  <div className="h-5 rounded-md bg-blue-50/80 border border-blue-100/50 flex items-center px-1.5 gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                    <SkeletonBlock width="60%" height="0.45rem" className="opacity-80" />
                  </div>
                )}
                {hasEvent2 && (
                  <div className="h-5 rounded-md bg-amber-50/80 border border-amber-100/50 flex items-center px-1.5 gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    <SkeletonBlock width="50%" height="0.45rem" className="opacity-80" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const AvailabilityTextSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* AvailabilityGeneratorCard Skeleton */}
      <div className="enterprise-card p-6 space-y-4 bg-white">
        <SkeletonBlock width="160px" height="1.25rem" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <SkeletonBlock width="80px" height="0.8rem" className="opacity-75" />
            <SkeletonBlock width="100%" height="2.25rem" />
          </div>
          <div className="space-y-2">
            <SkeletonBlock width="110px" height="0.8rem" className="opacity-75" />
            <SkeletonBlock width="100%" height="2.25rem" />
          </div>
          <div className="space-y-2">
            <SkeletonBlock width="120px" height="0.8rem" className="opacity-75" />
            <SkeletonBlock width="100%" height="2.25rem" />
          </div>
          <div className="space-y-2 pt-5">
            <SkeletonBlock width="100%" height="2.25rem" />
          </div>
        </div>
      </div>

      {/* AvailabilityBookingCard Skeleton */}
      <div className="enterprise-card p-6 space-y-5 bg-white">
        <div className="border-b border-slate-100 pb-3 flex justify-between">
          <SkeletonBlock width="220px" height="1.25rem" />
          <SkeletonBlock width="80px" height="1.25rem" className="rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <SkeletonBlock width="120px" height="0.8rem" className="opacity-75" />
              <SkeletonBlock width="100%" height="2.25rem" />
            </div>
            <div className="space-y-2">
              <SkeletonBlock width="120px" height="0.8rem" className="opacity-75" />
              <SkeletonBlock width="100%" height="2.25rem" />
            </div>
            <div className="space-y-2">
              <SkeletonBlock width="120px" height="0.8rem" className="opacity-75" />
              <SkeletonBlock width="100%" height="2.25rem" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <SkeletonBlock width="120px" height="0.8rem" className="opacity-75" />
              <SkeletonBlock width="100%" height="4.5rem" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <SkeletonBlock width="85px" height="0.8rem" className="opacity-75" />
                <SkeletonBlock width="100%" height="2.25rem" />
              </div>
              <div className="space-y-2">
                <SkeletonBlock width="85px" height="0.8rem" className="opacity-75" />
                <SkeletonBlock width="100%" height="2.25rem" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PublicBookingManager Skeleton */}
      <div className="enterprise-card p-5 space-y-4 bg-white">
        <SkeletonBlock width="180px" height="1.25rem" />
        <TableSkeleton />
      </div>
    </div>
  );
};

export const SettingsSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in duration-300">
      <PageHeaderSkeleton />

      {/* Tab bar list */}
      <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="flex-1 min-w-[100px] h-9 px-4 py-2 rounded-lg bg-white/70">
            <SkeletonBlock width="60%" height="0.85rem" className="mx-auto" />
          </div>
        ))}
      </div>

      {/* Settings general layout (Form) */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
        <div className="border-b pb-2">
          <SkeletonBlock width="120px" height="1.25rem" />
        </div>

        <div className="space-y-5">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="space-y-2">
              <SkeletonBlock width="180px" height="0.85rem" className="opacity-85 font-semibold" />
              <SkeletonBlock width="100%" height="2.25rem" />
              {idx === 2 && <SkeletonBlock width="280px" height="0.7rem" className="opacity-60" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const DocumentGridSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in duration-300">
      {Array.from({ length: 8 }).map((_, idx) => (
        <div key={idx} className="enterprise-card p-4 space-y-4 bg-white border border-slate-100">
          <div className="aspect-video bg-slate-50 border border-slate-100/50 rounded-xl flex items-center justify-center p-4">
            <SkeletonBlock width="36px" height="36px" circle className="opacity-85 bg-blue-100/50" />
          </div>
          <div className="space-y-2">
            <SkeletonBlock width="85%" height="1.05rem" className="font-semibold" />
            <SkeletonBlock width="55%" height="0.75rem" className="opacity-60" />
          </div>
          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
            <SkeletonBlock width="60px" height="1.35rem" className="rounded-full bg-slate-100" />
            <div className="flex gap-2">
              <SkeletonBlock width="22px" height="22px" circle className="opacity-70" />
              <SkeletonBlock width="22px" height="22px" circle className="opacity-70" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const OfferComparisonSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
      {Array.from({ length: 3 }).map((_, idx) => (
        <div key={idx} className="enterprise-card p-6 space-y-5 bg-white">
          <div className="space-y-2.5 text-center pb-4.5 border-b border-slate-100">
            <SkeletonBlock width="65%" height="1.35rem" className="mx-auto font-semibold" />
            <SkeletonBlock width="45%" height="0.85rem" className="mx-auto opacity-60" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, rIdx) => (
              <div key={rIdx} className="flex justify-between items-center py-0.5">
                <SkeletonBlock width="90px" height="0.8rem" className="opacity-70" />
                <SkeletonBlock width="110px" height="1rem" className="font-semibold" />
              </div>
            ))}
          </div>
          <div className="pt-4.5 border-t border-slate-100">
            <SkeletonBlock width="100%" height="2.5rem" className="rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
};

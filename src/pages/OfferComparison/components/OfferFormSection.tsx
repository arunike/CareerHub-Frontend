import type { ReactNode } from 'react';

type OfferFormSectionProps = {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
};

const OfferFormSection = ({ id, title, description, icon, children }: OfferFormSectionProps) => (
  <section id={id} className="min-w-0 scroll-mt-24 px-4 py-5 sm:px-6 sm:py-6">
    <div className="mb-5 flex items-start gap-3">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700">
        {icon}
      </span>
      <div className="min-w-0">
        <h4 className="text-sm font-semibold tracking-[-0.01em] text-slate-950">{title}</h4>
        <p className="mt-1 max-w-2xl break-words text-xs leading-5 text-slate-600">{description}</p>
      </div>
    </div>
    <div className="min-w-0 space-y-4">{children}</div>
  </section>
);

export default OfferFormSection;

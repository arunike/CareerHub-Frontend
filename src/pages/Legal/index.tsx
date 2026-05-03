import { Link } from 'react-router-dom';
import {
  CheckCircleOutlined,
  FileProtectOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import PublicHeader from '../../components/PublicHeader';

type LegalPageProps = {
  type: 'privacy' | 'terms';
};

type LegalSection = {
  title: string;
  body: string;
  bullets?: string[];
};

const updatedAt = 'May 2, 2026';

const pageCopy: Record<
  LegalPageProps['type'],
  {
    eyebrow: string;
    title: string;
    intro: string;
    summary: string[];
    sections: LegalSection[];
  }
> = {
  privacy: {
    eyebrow: 'Privacy at CareerHub',
    title: 'Privacy Policy',
    intro:
      'CareerHub helps you organize job applications, interviews, offers, notes, documents, and optional Google Sheets imports. This policy explains what data is handled and how it is used.',
    summary: [
      'Google Sheets access is read-only.',
      'Connected Google tokens are encrypted on the backend.',
      'Your data is used to provide CareerHub features, not advertising.',
    ],
    sections: [
      {
        title: 'Information You Add',
        body:
          'CareerHub stores the account information and career-tracking data you choose to add, such as applications, events, offers, compensation details, documents, notes, tasks, settings, and analytics preferences.',
      },
      {
        title: 'Google Sheets Data',
        body:
          'If you connect Google, CareerHub requests read-only access to Google Sheets and Drive metadata. Drive metadata is used to show a spreadsheet picker. Sheet values are read only for sheets you choose to preview or sync.',
        bullets: [
          'CareerHub does not write to your Google Sheets.',
          'CareerHub does not read spreadsheets you have not selected for preview or sync.',
          'CareerHub does not sell Google user data or use it for advertising.',
        ],
      },
      {
        title: 'How Your Data Is Used',
        body:
          'Data is used to run the product features you request: displaying your pipeline, importing rows from configured sheets, updating application and event records, generating analytics, and powering account settings.',
      },
      {
        title: 'Security',
        body:
          'CareerHub uses authenticated account access for private data. Google OAuth refresh tokens are encrypted before storage, and synced records are scoped to the CareerHub account that connected Google.',
      },
      {
        title: 'Retention And Deletion',
        body:
          'Your CareerHub data remains in your account until you edit it, delete it, disconnect an integration, or request account deletion. Disconnecting Google removes the stored OAuth credential used for future syncs.',
      },
      {
        title: 'Contact',
        body:
          'For privacy requests or questions, contact the CareerHub app owner using the support email shown on the Google OAuth consent screen.',
      },
    ],
  },
  terms: {
    eyebrow: 'Terms for CareerHub',
    title: 'Terms of Service',
    intro:
      'These terms describe the basic conditions for using CareerHub as a personal career-management workspace.',
    summary: [
      'Use CareerHub for data you are allowed to store.',
      'Review imported and synced information for accuracy.',
      'You can disconnect Google Sheets access at any time.',
    ],
    sections: [
      {
        title: 'Use Of CareerHub',
        body:
          'CareerHub is a personal tool for tracking job applications, interviews, offers, documents, tasks, analytics, and related career-planning information.',
      },
      {
        title: 'Your Responsibility',
        body:
          'You are responsible for the data you enter, upload, connect, or sync. Do not store or import information you do not have permission to use.',
      },
      {
        title: 'Google Sheets Sync',
        body:
          'When you connect Google, you authorize CareerHub to read spreadsheet files you select for preview or sync. You can disconnect Google from Settings, and CareerHub will stop using the stored credential for scheduled syncs.',
      },
      {
        title: 'Service Availability',
        body:
          'CareerHub is provided as-is. The product is designed to keep data handling and sync behavior predictable, but uninterrupted service, complete availability, and error-free imports are not guaranteed.',
      },
      {
        title: 'Account And Access',
        body:
          'Keep your account credentials secure. Activity performed from your authenticated account may affect the applications, events, files, integrations, and settings stored in that account.',
      },
      {
        title: 'Changes',
        body:
          'These terms may be updated as CareerHub changes. The latest version is published on this page with the effective update date.',
      },
    ],
  },
};

const trustItems = [
  { icon: LockOutlined, label: 'Encrypted integration tokens' },
  { icon: SafetyCertificateOutlined, label: 'Authenticated account access' },
  { icon: FileProtectOutlined, label: 'Publicly available legal pages' },
];

export default function LegalPage({ type }: LegalPageProps) {
  const copy = pageCopy[type];
  const alternateType = type === 'privacy' ? 'terms' : 'privacy';
  const alternateLabel = type === 'privacy' ? 'Terms of Service' : 'Privacy Policy';

  return (
    <main className="relative min-h-screen bg-slate-50 text-slate-600 selection:bg-sky-500/30 overflow-hidden">
      {/* Subtle glowing ambient backgrounds for light mode */}
      <div className="pointer-events-none absolute left-0 top-0 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-400/20 opacity-50 blur-[100px]" />
      <div className="pointer-events-none absolute right-0 top-1/4 h-[500px] w-[500px] translate-x-1/3 rounded-full bg-sky-400/20 opacity-50 blur-[100px]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-5 pt-24 pb-5 sm:px-8 sm:pt-32 lg:px-10">
        <PublicHeader />

        <div className="mx-auto w-full max-w-6xl">
          <section className="grid gap-8 py-10 lg:grid-cols-[1.35fr_0.65fr] lg:items-end lg:py-16">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-600">{copy.eyebrow}</p>
              <h1 className="mt-4 max-w-3xl text-4xl font-black leading-[1.05] tracking-tight text-slate-950 sm:text-6xl">
                {copy.title}
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">{copy.intro}</p>
              <div className="mt-8 flex flex-wrap gap-4">
                {trustItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <span
                      key={item.label}
                      className="inline-flex items-center gap-2 rounded-2xl border border-sky-100 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-sky-200 hover:shadow-md"
                    >
                      <Icon className="text-sky-600" />
                      {item.label}
                    </span>
                  );
                })}
              </div>
            </div>

            <aside className="rounded-[28px] border border-white/80 bg-white/70 p-8 shadow-xl shadow-sky-900/5 backdrop-blur-xl">
              <p className="text-[11px] font-black uppercase tracking-wider text-sky-600">Quick summary</p>
              <ul className="mt-5 space-y-4">
                {copy.summary.map((item) => (
                  <li key={item} className="flex gap-3 text-sm font-medium leading-6 text-slate-700">
                    <CheckCircleOutlined className="mt-1 shrink-0 text-emerald-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 border-t border-slate-200/60 pt-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Last updated: {updatedAt}
              </p>
            </aside>
          </section>

          <section className="grid gap-5 pb-12 lg:grid-cols-2">
            {copy.sections.map((section, index) => (
              <article
                key={section.title}
                className={`group rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-sm backdrop-blur-sm transition-all hover:border-sky-200 hover:shadow-xl hover:shadow-sky-500/5 ${
                  index === 0 ? 'lg:col-span-2' : ''
                }`}
              >
                <div className="flex flex-col items-start gap-5 sm:flex-row">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-xl font-black text-sky-600 shadow-inner transition-transform group-hover:scale-110">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 sm:mt-2">{section.title}</h2>
                    <p className="mt-3 text-sm leading-relaxed text-slate-600">{section.body}</p>
                    {section.bullets && (
                      <ul className="mt-5 space-y-3">
                        {section.bullets.map((bullet) => (
                          <li key={bullet} className="flex gap-3 text-sm font-medium leading-6 text-slate-600">
                            <CheckCircleOutlined className="mt-1 shrink-0 text-sky-500" />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </section>

          <footer className="mt-auto flex flex-col gap-4 border-t border-slate-200 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-medium">CareerHub legal information is available without signing in.</span>
            <Link to={`/${alternateType}`} className="font-bold text-slate-600 transition hover:text-slate-900">
              View {alternateLabel}
            </Link>
          </footer>
        </div>
      </div>
    </main>
  );
}

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
        body: 'CareerHub stores the account information and career-tracking data you choose to add, such as applications, events, offers, compensation details, documents, notes, tasks, settings, and analytics preferences.',
      },
      {
        title: 'Google Sheets Data',
        body: 'If you connect Google, CareerHub requests read-only access to Google Sheets and Drive metadata. Drive metadata is used to show a spreadsheet picker. Sheet values are read only for sheets you choose to preview or sync.',
        bullets: [
          'CareerHub does not write to your Google Sheets.',
          'CareerHub does not read spreadsheets you have not selected for preview or sync.',
          'CareerHub does not sell Google user data or use it for advertising.',
        ],
      },
      {
        title: 'How Your Data Is Used',
        body: 'Data is used to run the product features you request: displaying your pipeline, importing rows from configured sheets, updating application and event records, generating analytics, and powering account settings.',
      },
      {
        title: 'Security',
        body: 'CareerHub uses authenticated account access for private data. Google OAuth refresh tokens are encrypted before storage, and synced records are scoped to the CareerHub account that connected Google.',
      },
      {
        title: 'Retention And Deletion',
        body: 'Your CareerHub data remains in your account until you edit it, delete it, disconnect an integration, or request account deletion. Disconnecting Google removes the stored OAuth credential used for future syncs.',
      },
      {
        title: 'Contact',
        body: 'For privacy requests or questions, contact the CareerHub app owner using the support email shown on the Google OAuth consent screen.',
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
        body: 'CareerHub is a personal tool for tracking job applications, interviews, offers, documents, tasks, analytics, and related career-planning information.',
      },
      {
        title: 'Your Responsibility',
        body: 'You are responsible for the data you enter, upload, connect, or sync. Do not store or import information you do not have permission to use.',
      },
      {
        title: 'Google Sheets Sync',
        body: 'When you connect Google, you authorize CareerHub to read spreadsheet files you select for preview or sync. You can disconnect Google from Settings, and CareerHub will stop using the stored credential for scheduled syncs.',
      },
      {
        title: 'Service Availability',
        body: 'CareerHub is provided as-is. The product is designed to keep data handling and sync behavior predictable, but uninterrupted service, complete availability, and error-free imports are not guaranteed.',
      },
      {
        title: 'Account And Access',
        body: 'Keep your account credentials secure. Activity performed from your authenticated account may affect the applications, events, files, integrations, and settings stored in that account.',
      },
      {
        title: 'Changes',
        body: 'These terms may be updated as CareerHub changes. The latest version is published on this page with the effective update date.',
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
    <main className="min-h-screen bg-slate-50 text-slate-600 selection:bg-blue-500/20">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-5 pb-5 pt-24 sm:px-8 sm:pt-32 lg:px-10">
        <PublicHeader />

        <div className="mx-auto w-full max-w-6xl">
          <section className="grid gap-8 py-8 sm:py-10 lg:grid-cols-[1.35fr_0.65fr] lg:items-end lg:py-16">
            <div>
              <p className="text-sm font-semibold text-blue-700">{copy.eyebrow}</p>
              <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight tracking-tight text-slate-950 sm:text-5xl">
                {copy.title}
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                {copy.intro}
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                {trustItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <span
                      key={item.label}
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                    >
                      <Icon className="text-blue-600" />
                      {item.label}
                    </span>
                  );
                })}
              </div>
            </div>

            <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_18px_48px_-42px_rgba(15,23,42,0.55)] sm:p-8">
              <p className="text-sm font-semibold text-blue-700">Quick summary</p>
              <ul className="mt-5 space-y-4">
                {copy.summary.map((item) => (
                  <li
                    key={item}
                    className="flex gap-3 text-sm font-medium leading-6 text-slate-700"
                  >
                    <CheckCircleOutlined className="mt-1 shrink-0 text-emerald-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 border-t border-slate-200 pt-4 text-xs font-medium text-slate-500">
                Last updated: {updatedAt}
              </p>
            </aside>
          </section>

          <section className="mb-12 rounded-2xl border border-slate-200 bg-white px-5 shadow-[0_18px_48px_-42px_rgba(15,23,42,0.55)] sm:px-8">
            {copy.sections.map((section) => (
              <article
                key={section.title}
                className="border-b border-slate-200 py-6 last:border-b-0 sm:py-8"
              >
                <h2 className="text-xl font-bold text-slate-900">{section.title}</h2>
                <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600">{section.body}</p>
                {section.bullets && (
                  <ul className="mt-5 max-w-4xl space-y-3">
                    {section.bullets.map((bullet) => (
                      <li
                        key={bullet}
                        className="flex gap-3 text-sm font-medium leading-6 text-slate-600"
                      >
                        <CheckCircleOutlined className="mt-1 shrink-0 text-blue-600" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </section>

          <footer className="mt-auto flex flex-col gap-4 border-t border-slate-200 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-medium">
              CareerHub legal information is available without signing in.
            </span>
            <Link
              to={`/${alternateType}`}
              className="inline-flex min-h-11 items-center font-bold text-slate-600 transition hover:text-slate-900"
            >
              View {alternateLabel}
            </Link>
          </footer>
        </div>
      </div>
    </main>
  );
}

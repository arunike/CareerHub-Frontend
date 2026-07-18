import { Link } from 'react-router-dom';
import {
  AppstoreOutlined,
  ArrowRightOutlined,
  CalendarOutlined,
  DollarOutlined,
  FileTextOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import PublicHeader from '../../components/PublicHeader';

const workspaceContents = [
  {
    icon: AppstoreOutlined,
    title: 'Applications and interviews',
    body: 'Statuses, notes, deadlines, contacts, and follow-ups.',
  },
  {
    icon: DollarOutlined,
    title: 'Offers and compensation',
    body: 'Salary, bonus, benefits, taxes, living costs, and equity liquidity.',
  },
  {
    icon: FileTextOutlined,
    title: 'Documents and career history',
    body: 'Resumes, cover letters, experience records, and promotion reviews.',
  },
  {
    icon: CalendarOutlined,
    title: 'Availability and planning',
    body: 'Interview availability, events, holidays, and personal tasks.',
  },
];

const decisionSupport = [
  {
    icon: AppstoreOutlined,
    title: 'Know what needs attention',
    body: 'See active applications, upcoming interviews, and overdue follow-ups without rebuilding a tracker every week.',
  },
  {
    icon: DollarOutlined,
    title: 'Compare offers on usable value',
    body: 'Account for taxes, rent, commute, benefits, time off, and whether private-company equity can actually be sold.',
  },
  {
    icon: LockOutlined,
    title: 'Keep AI optional and accountable',
    body: 'Use your own provider keys for job matching and writing tools. Your records remain useful when AI is turned off.',
  },
];

const privacyFacts = [
  'Private data requires an authenticated account.',
  'AI provider keys are stored encrypted and used only for requests you initiate.',
  'Google Sheets connections are optional and use read-only access to selected spreadsheets.',
  'CareerHub does not use advertising trackers.',
];

export default function HomePage() {
  return (
    <main className="min-h-screen w-full min-w-0 overflow-x-hidden bg-slate-50 text-slate-700 selection:bg-blue-500/20">
      <PublicHeader />

      <div className="flex min-h-screen w-full flex-col pt-24 sm:pt-32">
        <section className="px-5 pb-16 pt-10 sm:px-8 sm:pb-20 lg:px-10 lg:pb-24 lg:pt-16">
          <div className="mx-auto grid w-full max-w-6xl gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)] lg:items-center lg:gap-16">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-blue-700">
                A private workspace for your career
              </p>
              <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-[-0.025em] text-slate-950 sm:text-5xl lg:text-[3.5rem]">
                Keep your job search organized and your decisions grounded.
              </h1>
              <p className="mt-6 max-w-[68ch] text-base leading-8 text-slate-600 sm:text-lg">
                CareerHub keeps applications, interviews, offers, documents, and career records in
                one private account. It is built for one person managing real decisions, not for a
                recruiting team.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/login"
                  className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                  Sign in to CareerHub
                  <ArrowRightOutlined />
                </Link>
                <Link
                  to="/privacy"
                  className="inline-flex min-h-[50px] items-center justify-center rounded-xl border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                  Review privacy details
                </Link>
              </div>

              <div className="mt-8 flex items-start gap-3 text-sm leading-6 text-slate-600">
                <SafetyCertificateOutlined className="mt-1 shrink-0 text-emerald-600" />
                <p>No ads, no shared company workspace, and no AI provider account required.</p>
              </div>
            </div>

            <section
              aria-labelledby="workspace-contents-title"
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_-54px_rgba(15,23,42,0.5)]"
            >
              <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
                <h2 id="workspace-contents-title" className="text-lg font-semibold text-slate-950">
                  What stays together
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  One record of the work you are already doing.
                </p>
              </div>
              <div className="divide-y divide-slate-200">
                {workspaceContents.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="flex gap-4 px-5 py-5 sm:px-6">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-base text-slate-700">
                        <Icon />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-slate-950">{item.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{item.body}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
          <div className="mx-auto w-full max-w-6xl">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold tracking-[-0.02em] text-slate-950 sm:text-4xl">
                Support for the decisions that take real work
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                The useful details stay visible, and the calculations remain explainable.
              </p>
            </div>

            <div className="mt-10 border-t border-slate-200">
              {decisionSupport.map((item) => {
                const Icon = item.icon;
                return (
                  <article
                    key={item.title}
                    className="grid gap-3 border-b border-slate-200 py-7 sm:grid-cols-[minmax(220px,0.7fr)_minmax(0,1.3fr)] sm:gap-10 sm:py-8"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-sm text-blue-700">
                        <Icon />
                      </span>
                      <h3 className="pt-1 text-base font-semibold text-slate-950">{item.title}</h3>
                    </div>
                    <p className="max-w-[68ch] text-sm leading-7 text-slate-600 sm:text-base">
                      {item.body}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
          <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[minmax(260px,0.7fr)_minmax(0,1.3fr)] lg:gap-16">
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg text-blue-700">
                <LockOutlined />
              </div>
              <h2 className="mt-5 text-2xl font-bold tracking-[-0.015em] text-slate-950">
                Clear privacy boundaries
              </h2>
              <p className="mt-3 max-w-md text-sm leading-7 text-slate-600">
                Security claims should be specific enough to verify. The full policy explains what
                CareerHub stores, why it is needed, and how to remove it.
              </p>
              <Link
                to="/privacy"
                className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg font-semibold text-blue-700 transition-colors hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                Read the privacy policy
                <ArrowRightOutlined />
              </Link>
            </div>

            <ul className="divide-y divide-slate-200 border-y border-slate-200">
              {privacyFacts.map((fact) => (
                <li key={fact} className="flex gap-3 py-5 text-sm leading-7 text-slate-700">
                  <SafetyCertificateOutlined className="mt-1.5 shrink-0 text-emerald-600" />
                  <span>{fact}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <footer className="mt-auto border-t border-slate-200 bg-white px-5 sm:px-8 lg:px-10">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 py-7 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <span>CareerHub is a personal career management workspace.</span>
            <div className="flex gap-6">
              <Link to="/privacy" className="font-semibold hover:text-slate-950">
                Privacy
              </Link>
              <Link to="/terms" className="font-semibold hover:text-slate-950">
                Terms
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}

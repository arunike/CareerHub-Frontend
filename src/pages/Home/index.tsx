import { Link } from 'react-router-dom';
import {
  AppstoreOutlined,
  ArrowRightOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  FilePdfOutlined,
  LockOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  ThunderboltFilled,
} from '@ant-design/icons';
import PublicHeader from '../../components/PublicHeader';

const productPoints = [
  'Track applications, interviews, offers, documents, and follow-ups in one private workspace.',
  'Analyze total compensation with base, bonus, equity, and local tax simulations.',
  'Tailor resumes and match job descriptions using your own private AI API keys.',
];

const valueCards = [
  {
    icon: AppstoreOutlined,
    title: 'Full-Cycle Tracking',
    body: 'Manage your entire pipeline from sourcing job board URLs to negotiating the final offer.',
  },
  {
    icon: DollarOutlined,
    title: 'Total Compensation',
    body: 'Go beyond base salary. Simulate take-home pay, equity schedules, and local living costs.',
  },
  {
    icon: ThunderboltFilled,
    title: 'Bring Your Own AI',
    body: 'Generate cover letters and run JD gap analysis securely using your own API keys.',
  },
  {
    icon: LockOutlined,
    title: 'Private by Default',
    body: 'Your data is yours. Authenticated access, encrypted API keys, and zero ad tracking.',
  },
];

const securityTransparency = [
  {
    icon: LockOutlined,
    title: 'Encrypted API Keys',
    body: 'Your personal AI provider keys (OpenAI, Claude, etc.) are encrypted on the backend and never exposed.',
  },
  {
    icon: SafetyCertificateOutlined,
    title: 'Read-only Integrations',
    body: 'Optional Google Sheets integration requires only read-only access to preview and sync selected rows.',
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-600 selection:bg-blue-500/20">
      <PublicHeader />

      <div className="flex min-h-screen w-full flex-col pt-24 sm:pt-32">
        <section className="relative px-5 py-10 sm:px-8 lg:px-10 lg:py-16">
          <div className="pointer-events-none absolute left-0 top-0 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 glow-blob glow-blob-blue animate-pulse-slow" />
          <div className="pointer-events-none absolute right-0 top-1/4 h-[500px] w-[500px] translate-x-1/3 glow-blob glow-blob-sky animate-pulse-slow" />

          <div className="relative mx-auto grid w-full max-w-[1440px] gap-12 lg:grid-cols-[minmax(0,0.92fr)_minmax(600px,1.08fr)] lg:items-center xl:gap-16">
            <div className="max-w-[640px]">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm backdrop-blur">
                <SafetyCertificateOutlined />
                Private career operating system
              </div>

              <h1 className="mt-8 text-4xl font-black leading-[1.05] tracking-tight text-slate-950 sm:text-5xl xl:text-[64px]">
                Your private command center for every{' '}
                <span className="text-blue-600">job application.</span>
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                Track your pipeline, analyze total compensation, and use your own AI to match job
                descriptions—all in one secure, private workspace.
              </p>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Link
                  to="/login"
                  className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-bold text-white shadow-lg shadow-blue-900/15 transition-all hover:scale-[1.02] hover:bg-blue-500 hover:shadow-xl hover:shadow-blue-900/20"
                >
                  Start tracking
                  <ArrowRightOutlined />
                </Link>
                <Link
                  to="/privacy"
                  className="inline-flex min-h-[50px] items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-bold text-slate-700 shadow-sm transition-all hover:border-blue-200 hover:bg-slate-50"
                >
                  View privacy policy
                </Link>
              </div>

              <ul className="mt-12 grid gap-4 text-sm font-medium text-slate-600">
                {productPoints.map((point) => (
                  <li key={point} className="flex gap-3">
                    <CheckCircleOutlined className="mt-0.5 text-emerald-500" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative min-w-0 animate-float">
              <div className="absolute -inset-4 rounded-[32px] bg-gradient-to-br from-blue-200/10 via-sky-100/20 to-transparent blur-2xl animate-pulse-slow" />
              <div className="relative overflow-hidden rounded-[24px] border border-white/70 bg-white/75 shadow-2xl shadow-slate-900/5 backdrop-blur-xl">
                <div className="grid gap-4 bg-slate-100/30 p-4 sm:grid-cols-3">
                  {/* Card 1: Application Pipeline (col-span-2) */}
                  <section className="col-span-3 rounded-xl border border-white/60 bg-white/80 p-5 shadow-sm backdrop-blur-md sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                          Pipeline
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-900">
                          Application Tracking
                        </p>
                      </div>
                      <BarChartOutlined className="text-xl text-blue-600" />
                    </div>

                    <div className="mt-4 flex gap-3 overflow-hidden">
                      <div className="w-1/3 rounded-xl border border-slate-100 bg-slate-50 p-2">
                        <p className="px-2 py-1 text-[10px] font-bold uppercase text-slate-400">
                          Applied
                        </p>
                        <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
                          <p className="text-xs font-bold text-slate-900">Stripe</p>
                          <p className="mt-0.5 text-[10px] text-slate-500">Frontend Eng</p>
                        </div>
                      </div>
                      <div className="w-1/3 rounded-xl border border-slate-100 bg-slate-50 p-2">
                        <p className="px-2 py-1 text-[10px] font-bold uppercase text-blue-600">
                          Onsite
                        </p>
                        <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50/30 p-2.5 shadow-sm">
                          <p className="text-xs font-bold text-slate-900">Google</p>
                          <p className="mt-0.5 text-[10px] text-slate-500">L4 Engineer</p>
                        </div>
                      </div>
                      <div className="w-1/3 rounded-xl border border-slate-100 bg-slate-50 p-2">
                        <p className="px-2 py-1 text-[10px] font-bold uppercase text-emerald-500">
                          Offer
                        </p>
                        <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50/30 p-2.5 shadow-sm">
                          <p className="text-xs font-bold text-slate-900">OpenAI</p>
                          <p className="mt-0.5 text-[10px] text-slate-500">MTS</p>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Card 2: BYOK AI (col-span-1) */}
                  <section className="col-span-3 rounded-xl border border-blue-100/70 bg-gradient-to-br from-blue-50/45 to-white/90 p-5 shadow-sm backdrop-blur-md sm:col-span-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-wider text-blue-600">
                          Smart Tools
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-900">BYOK AI</p>
                      </div>
                      <RobotOutlined className="text-xl text-blue-600" />
                    </div>
                    <div className="mt-4 rounded-xl border border-blue-50 bg-white/80 p-3 shadow-sm">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                        <ThunderboltFilled className="text-amber-400" />
                        <span className="text-xs font-bold text-slate-700">JD Matcher</span>
                      </div>
                      <div className="mt-2 space-y-2">
                        <div className="h-2 w-3/4 rounded bg-slate-100" />
                        <div className="h-2 w-1/2 rounded bg-slate-100" />
                        <div className="mt-3 flex items-center justify-between rounded bg-emerald-50 px-2 py-1">
                          <span className="text-[10px] font-bold text-emerald-700">Fit Score</span>
                          <span className="text-xs font-black text-emerald-700">92%</span>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Card 3: Document Vault (col-span-1) */}
                  <section className="col-span-3 rounded-xl border border-white/60 bg-white/80 p-5 shadow-sm backdrop-blur-md sm:col-span-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                          Vault
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-900">Documents</p>
                      </div>
                      <FilePdfOutlined className="text-xl text-slate-400" />
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                        <div className="flex items-center gap-2">
                          <FilePdfOutlined className="text-red-400" />
                          <span className="text-xs font-bold text-slate-700">Resume_v4.pdf</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">Current</span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                        <div className="flex items-center gap-2">
                          <FilePdfOutlined className="text-red-400 opacity-50" />
                          <span className="text-xs font-medium text-slate-500">
                            Cover_Letter.pdf
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">v1.2</span>
                      </div>
                    </div>
                  </section>

                  {/* Card 4: Total Compensation Simulator (col-span-2) */}
                  <section className="col-span-3 rounded-xl border border-white/60 bg-white/80 p-5 shadow-sm backdrop-blur-md sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                          Simulation
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-900">Total Compensation</p>
                      </div>
                      <DollarOutlined className="text-xl text-emerald-600" />
                    </div>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <div className="flex-1 rounded-xl border border-emerald-100 bg-emerald-50/30 p-4">
                        <p className="text-[10px] font-black uppercase text-emerald-600">
                          Base Salary
                        </p>
                        <p className="mt-1 text-2xl font-black text-slate-900">$180k</p>
                        <div className="mt-2 h-1.5 w-full rounded-full bg-emerald-100">
                          <div className="h-full w-[60%] rounded-full bg-emerald-500" />
                        </div>
                      </div>
                      <div className="flex-1 rounded-xl border border-blue-100 bg-blue-50/30 p-4">
                        <p className="text-[10px] font-black uppercase text-blue-600">
                          Annual Equity
                        </p>
                        <p className="mt-1 text-2xl font-black text-slate-900">$120k</p>
                        <div className="mt-2 h-1.5 w-full rounded-full bg-blue-100">
                          <div className="h-full w-[40%] rounded-full bg-blue-600" />
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-slate-50" />

          <div className="relative mx-auto w-full max-w-[1440px]">
            <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
                  Why register
                </p>
                <h2 className="mt-3 max-w-2xl text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                  Built to manage your entire career trajectory, not just spreadsheets.
                </h2>
              </div>
              <Link
                to="/login"
                className="inline-flex w-fit items-center gap-2 rounded-xl bg-white px-6 py-4 text-sm font-bold text-slate-900 shadow-sm border border-slate-200 transition hover:bg-slate-50 hover:border-slate-300"
              >
                Login to CareerHub
                <ArrowRightOutlined />
              </Link>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {valueCards.map((card) => {
                const Icon = card.icon;
                return (
                  <article key={card.title} className="group enterprise-card p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-600 transition-transform group-hover:scale-105">
                      <Icon />
                    </div>
                    <h2 className="mt-6 text-lg font-bold text-slate-900">{card.title}</h2>
                    <p className="mt-3 text-sm leading-relaxed text-slate-600">{card.body}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="px-5 pb-20 sm:px-8 lg:px-10">
          <div className="mx-auto grid w-full max-w-[1440px] gap-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-xl shadow-slate-900/5 lg:grid-cols-[0.68fr_1.32fr] lg:p-6">
            <div className="relative overflow-hidden rounded-2xl border border-blue-50 bg-blue-50/25 p-8">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blue-200/20 blur-3xl animate-pulse-slow" />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-xl border border-blue-100/60 bg-white text-2xl text-blue-600 shadow-sm">
                <SafetyCertificateOutlined />
              </div>
              <h2 className="relative mt-6 text-3xl font-black tracking-tight text-slate-900">
                Security by default
              </h2>
              <p className="relative mt-4 text-base leading-relaxed text-slate-600">
                CareerHub asks for the minimum access needed. API keys are strictly encrypted, and
                optional Google integrations are transparently scoped. Your data is yours.
              </p>
              <Link
                to="/privacy"
                className="relative mt-8 inline-flex items-center text-sm font-bold text-blue-600 transition hover:text-blue-700"
              >
                Read the Privacy Policy
                <ArrowRightOutlined className="ml-2 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {securityTransparency.map((item) => {
                const Icon = item.icon;
                return (
                  <article
                    key={item.title}
                    className="rounded-2xl border border-slate-100 bg-slate-50/50 p-6 transition duration-200 hover:border-slate-200/80 hover:bg-white hover:shadow-lg hover:shadow-slate-900/5"
                  >
                    <Icon className="text-2xl text-slate-400" />
                    <h3 className="mt-5 text-base font-bold text-slate-900">{item.title}</h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-slate-600">{item.body}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <footer className="border-t border-slate-200 bg-slate-50 px-5 sm:px-8 lg:px-10">
          <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-medium">
              CareerHub public information is available without signing in.
            </span>
            <div className="flex gap-6">
              <Link
                to="/privacy"
                className="font-bold text-slate-600 transition hover:text-slate-900"
              >
                Privacy Policy
              </Link>
              <Link
                to="/terms"
                className="font-bold text-slate-600 transition hover:text-slate-900"
              >
                Terms
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}

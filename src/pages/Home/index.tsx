import { Link } from 'react-router-dom';
import {
  ArrowRightOutlined,
  CalendarOutlined,
  CheckCircleFilled,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  DollarOutlined,
  ExportOutlined,
  FileTextOutlined,
  GoogleOutlined,
  KeyOutlined,
  LockOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  SolutionOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import PublicHeader from '../../components/PublicHeader';
import PublicFaq from './PublicFaq';
import WeekAtGlance from './WeekAtGlance';

const lifecycle = [
  {
    icon: SolutionOutlined,
    title: 'Capture the opportunity',
    body: 'Keep the posting, compensation range, contacts, notes, and every stage change attached to one application.',
    detail: 'Applications · timeline · source',
  },
  {
    icon: CalendarOutlined,
    title: 'Prepare with context',
    body: 'Bring the job description, submitted documents, interview schedule, and debriefs into the same preparation view.',
    detail: 'Interviews · documents · debriefs',
  },
  {
    icon: DollarOutlined,
    title: 'Compare what matters',
    body: 'Evaluate salary, equity, benefits, taxes, commute, rent, and time off instead of stopping at the headline offer.',
    detail: 'Offers · scenarios · real value',
  },
  {
    icon: CheckCircleOutlined,
    title: 'Carry the decision forward',
    body: 'Turn an accepted role into career history and income planning without rebuilding the record somewhere else.',
    detail: 'Experience · income · growth',
  },
];

const privacyFacts = [
  {
    icon: ExportOutlined,
    title: 'Export anytime',
    body: 'Download an account export from your Profile whenever you want a portable copy.',
  },
  {
    icon: DeleteOutlined,
    title: 'Delete on your terms',
    body: 'Schedule account deletion from your Profile, with a grace period before permanent removal.',
  },
  {
    icon: RobotOutlined,
    title: 'Optional AI',
    body: 'Core career tracking works without AI. Connect a provider only when you want AI features.',
  },
  {
    icon: KeyOutlined,
    title: 'Encrypted provider key',
    body: 'Your AI provider key is encrypted on the backend and used for requests you initiate.',
  },
  {
    icon: GoogleOutlined,
    title: 'Read-only Google Sheets',
    body: 'CareerHub reads only the spreadsheets you select for preview or sync and does not write to them.',
  },
];

const upcomingItems = [
  { time: 'Oct 1', title: 'Interview · Google', tone: 'bg-blue-500' },
  { time: 'Oct 1', title: 'Review submitted resume', tone: 'bg-violet-500' },
  { time: 'Oct 1', title: 'Send follow-up', tone: 'bg-emerald-500' },
];

function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[620px] lg:mx-0">
      <div className="absolute -inset-8 rounded-[2.5rem] bg-blue-200/35 blur-3xl" aria-hidden />
      <div
        className="absolute -bottom-5 left-12 right-12 h-16 rounded-full bg-blue-300/30 blur-2xl"
        aria-hidden
      />
      <div className="relative overflow-hidden rounded-[1.4rem] bg-white shadow-[0_42px_110px_-54px_rgba(30,64,175,0.48)] ring-1 ring-slate-200/90">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2" aria-hidden>
            <span className="h-2 w-2 rounded-full bg-slate-300" />
            <span className="h-2 w-2 rounded-full bg-slate-300" />
            <span className="h-2 w-2 rounded-full bg-slate-300" />
          </div>
          <span className="text-[11px] font-semibold tracking-wide text-slate-500">
            ILLUSTRATIVE WORKSPACE
          </span>
        </div>

        <div className="grid gap-px bg-slate-200 sm:grid-cols-[minmax(0,1.3fr)_minmax(180px,0.7fr)]">
          <div className="bg-white p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-slate-500">Active application</p>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-slate-950">
                  Software Engineer
                </h2>
                <p className="mt-1 text-sm text-slate-500">Google · Mountain View, CA</p>
              </div>
              <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-200">
                Interview
              </span>
            </div>

            <div className="mt-7">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Application progress</span>
                <span>Interview stage</span>
              </div>
              <div className="mt-3 flex items-center">
                {[true, true, false].map((complete, index) => (
                  <div key={index} className="flex flex-1 items-center last:flex-none">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ring-4 ring-white ${complete ? 'bg-blue-500' : 'bg-slate-300'}`}
                    />
                    {index < 2 && (
                      <span
                        className={`h-px flex-1 ${index < 1 ? 'bg-blue-500' : 'bg-slate-300'}`}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-3 text-[11px] text-slate-400">
                <span>Applied</span>
                <span className="text-center font-medium text-blue-700">Interview</span>
                <span className="text-right">Decision</span>
              </div>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-3.5 ring-1 ring-inset ring-slate-200">
                <FileTextOutlined className="text-slate-400" />
                <p className="mt-4 text-xs text-slate-500">Submitted</p>
                <p className="mt-1 text-sm font-medium text-slate-950">Resume</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3.5 ring-1 ring-inset ring-slate-200">
                <TeamOutlined className="text-slate-400" />
                <p className="mt-4 text-xs text-slate-500">Contacts</p>
                <p className="mt-1 text-sm font-medium text-slate-950">Connected</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50/70 p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500">Next up</p>
              <ClockCircleOutlined className="text-slate-400" />
            </div>
            <div className="mt-4 space-y-4">
              {upcomingItems.map((item) => (
                <div key={item.title} className="grid grid-cols-[8px_minmax(0,1fr)] gap-3">
                  <span className={`mt-1.5 h-2 w-2 rounded-full ${item.tone}`} />
                  <div>
                    <p className="text-sm font-medium leading-5 text-slate-900">{item.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link
              to="/login"
              className="mt-7 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-[0_14px_28px_-18px_rgba(37,99,235,0.85)] transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-blue-50"
            >
              Open workspace
              <ArrowRightOutlined />
            </Link>
          </div>
        </div>
      </div>
      <p className="mt-4 text-center text-xs leading-5 text-slate-500 lg:text-left">
        Illustrative data only. No personal information is shown.
      </p>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="public-home min-h-screen w-full min-w-0 overflow-x-hidden bg-[#f6f8fc] text-slate-700">
      <PublicHeader
        navItems={[
          { label: 'How it works', to: '#workflow' },
          { label: 'Privacy', to: '#privacy' },
          { label: 'FAQ', to: '#faq' },
        ]}
        actionLabel="Sign in"
      />

      <section className="relative isolate px-5 pb-20 pt-36 sm:px-8 sm:pb-28 sm:pt-44 lg:px-10 lg:pb-32">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[660px] bg-[radial-gradient(circle_at_75%_24%,rgba(191,219,254,0.55),transparent_33%),radial-gradient(circle_at_12%_6%,rgba(224,231,255,0.55),transparent_28%)]"
          aria-hidden
        />
        <div
          className="public-home-grid pointer-events-none absolute inset-0 -z-10 opacity-45"
          aria-hidden
        />
        <div className="relative mx-auto grid w-full max-w-7xl gap-14 lg:grid-cols-[minmax(0,0.88fr)_minmax(520px,1.12fr)] lg:items-center lg:gap-16">
          <div className="max-w-2xl">
            <p className="mb-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              Private career workspace
            </p>
            <h1 className="max-w-[13ch] text-balance text-5xl font-bold leading-[0.98] tracking-[-0.04em] text-slate-950 sm:text-6xl lg:text-[4.5rem]">
              Your career decisions deserve a system.
            </h1>
            <p className="mt-7 max-w-[58ch] text-pretty text-lg leading-8 text-slate-600 sm:text-xl sm:leading-9">
              CareerHub keeps the full story—from first application to accepted offer, career
              growth, and income planning—in one private workspace built for you.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/login"
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-[0_18px_30px_-20px_rgba(37,99,235,0.85)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-[0_22px_36px_-20px_rgba(37,99,235,0.9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                Sign in to CareerHub
                <ArrowRightOutlined />
              </Link>
              <a
                href="#workflow"
                className="inline-flex min-h-[52px] items-center justify-center rounded-xl px-5 text-sm font-semibold text-slate-700 transition-colors hover:bg-white/70 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                See how it works
              </a>
            </div>

            <div className="mt-9 flex flex-wrap gap-2 text-sm text-slate-600">
              {['Private by default', 'AI is optional', 'No ad trackers'].map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2 ring-1 ring-slate-200/80 backdrop-blur-sm"
                >
                  <CheckCircleFilled className="text-emerald-600" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <ProductPreview />
        </div>
      </section>

      <section className="border-y border-slate-200/80 bg-white px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto grid w-full max-w-7xl gap-5 text-sm font-medium text-slate-600 sm:grid-cols-3 sm:divide-x sm:divide-slate-200">
          <p className="flex items-center justify-center gap-2 sm:justify-start">
            <SolutionOutlined className="text-blue-600" /> One record across the full career cycle
          </p>
          <p className="flex items-center justify-center gap-2 sm:px-8">
            <SafetyCertificateOutlined className="text-blue-600" /> Your own AI provider, if wanted
          </p>
          <p className="flex items-center justify-center gap-2 sm:justify-end">
            <ExportOutlined className="text-blue-600" /> Account data can be exported
          </p>
        </div>
      </section>

      <section
        id="workflow"
        className="relative scroll-mt-28 overflow-hidden px-5 py-20 sm:px-8 sm:py-28 lg:px-10"
      >
        <div
          className="pointer-events-none absolute -left-40 bottom-20 h-80 w-80 rounded-full bg-indigo-100/60 blur-3xl"
          aria-hidden
        />
        <div className="mx-auto w-full max-w-7xl">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-20">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                01 · The connected workflow
              </p>
              <h2 className="mt-5 max-w-[13ch] text-balance text-4xl font-bold leading-tight tracking-[-0.035em] text-slate-950 sm:text-5xl">
                One story. No scattered pieces.
              </h2>
            </div>
            <p className="max-w-[65ch] text-lg leading-8 text-slate-600">
              Most tools stop at a list of applications. CareerHub connects the work before, during,
              and after the decision, so context follows you instead of disappearing at every
              milestone.
            </p>
          </div>

          <div className="mt-14 border-t border-slate-300">
            {lifecycle.map((item, index) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="group relative grid gap-5 border-b border-slate-200 py-8 transition-colors duration-300 hover:border-blue-200 sm:grid-cols-[64px_minmax(200px,0.75fr)_minmax(0,1.25fr)] sm:items-start sm:gap-8 sm:py-10"
                >
                  <div className="flex items-center gap-4 sm:block">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-lg text-blue-700 ring-1 ring-inset ring-blue-100 transition-transform duration-300 group-hover:-translate-y-0.5">
                      <Icon />
                    </span>
                    <span className="text-xs font-semibold text-slate-400 sm:mt-3 sm:block">
                      0{index + 1}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold tracking-[-0.015em] text-slate-950">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
                      {item.detail}
                    </p>
                  </div>
                  <p className="max-w-[62ch] text-base leading-7 text-slate-600">{item.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <WeekAtGlance />

      <section className="relative overflow-hidden border-y border-blue-100 bg-blue-50/70 px-5 py-20 sm:px-8 sm:py-28 lg:px-10">
        <div
          className="pointer-events-none absolute -right-32 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-white/80 blur-3xl"
          aria-hidden
        />
        <div className="mx-auto grid w-full max-w-7xl gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(440px,1.1fr)] lg:items-center lg:gap-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
              03 · Decision support
            </p>
            <h2 className="mt-5 max-w-[14ch] text-balance text-4xl font-bold leading-tight tracking-[-0.035em] text-slate-950 sm:text-5xl">
              Compare the life around the offer.
            </h2>
            <p className="mt-6 max-w-[60ch] text-lg leading-8 text-slate-600">
              Headline compensation is only the opening number. CareerHub keeps the assumptions
              visible, so a decision can include the costs, benefits, and tradeoffs that shape the
              workday.
            </p>
            <div className="mt-9 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
              {[
                'Taxes and take-home',
                'Benefits and time off',
                'Commute and local costs',
                'Equity and vesting',
              ].map((item) => (
                <span key={item} className="flex items-center gap-3 border-t border-blue-200 py-3">
                  <CheckCircleOutlined className="text-blue-600" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="relative rounded-2xl bg-white p-5 text-slate-900 shadow-[0_34px_90px_-54px_rgba(30,64,175,0.5)] ring-1 ring-slate-200 sm:p-7">
            <span
              className="absolute left-0 top-7 h-12 w-1 rounded-r-full bg-blue-600"
              aria-hidden
            />
            <div className="flex items-start justify-between gap-5 border-b border-slate-200 pb-5">
              <div>
                <p className="text-xs font-medium text-slate-500">Illustrative offer</p>
                <h3 className="mt-1 text-xl font-semibold">Google · Software Engineer</h3>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Active
              </span>
            </div>
            <dl className="divide-y divide-slate-200">
              <div className="flex items-center justify-between gap-6 py-4">
                <dt className="text-sm text-slate-500">Base salary</dt>
                <dd className="font-semibold tabular-nums">$165,000</dd>
              </div>
              <div className="flex items-center justify-between gap-6 py-4">
                <dt className="text-sm text-slate-500">Annual bonus</dt>
                <dd className="font-semibold tabular-nums">$24,750</dd>
              </div>
              <div className="flex items-center justify-between gap-6 py-4">
                <dt className="text-sm text-slate-500">Equity per year</dt>
                <dd className="font-semibold tabular-nums">$50,000</dd>
              </div>
              <div className="flex items-center justify-between gap-6 pt-5">
                <dt className="font-semibold text-slate-950">Year-one package</dt>
                <dd className="text-xl font-bold tabular-nums text-blue-700">$239,750</dd>
              </div>
            </dl>
            <p className="mt-5 rounded-xl bg-slate-100 px-4 py-3 text-xs leading-5 text-slate-600">
              Illustrative values only. Real comparisons stay private to the signed-in account.
            </p>
          </div>
        </div>
      </section>

      <section id="privacy" className="scroll-mt-28 px-5 py-20 sm:px-8 sm:py-28 lg:px-10">
        <div className="mx-auto w-full max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <LockOutlined className="text-2xl text-blue-700" />
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                04 · Ownership
              </p>
              <h2 className="mt-5 max-w-[14ch] text-balance text-4xl font-bold leading-tight tracking-[-0.035em] text-slate-950 sm:text-5xl">
                Private should be specific.
              </h2>
              <p className="mt-5 max-w-[58ch] text-base leading-8 text-slate-600">
                CareerHub states the boundary clearly: what requires an account, when an outside
                provider is involved, and how to take your records with you.
              </p>
              <Link
                to="/privacy"
                className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-lg font-semibold text-blue-700 transition-colors hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                Read the privacy policy
                <ArrowRightOutlined />
              </Link>
            </div>

            <div className="border-t border-slate-300">
              {privacyFacts.map((fact) => {
                const Icon = fact.icon;
                return (
                  <article
                    key={fact.title}
                    className="grid gap-3 border-b border-slate-200 py-8 sm:grid-cols-[48px_minmax(160px,0.65fr)_minmax(0,1.35fr)] sm:items-start sm:gap-6 sm:py-10"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                      <Icon />
                    </span>
                    <h3 className="pt-2 text-base font-semibold text-slate-950">{fact.title}</h3>
                    <p className="text-sm leading-7 text-slate-600 sm:pt-1.5">{fact.body}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <PublicFaq />

      <section className="bg-white px-5 pb-10 pt-16 sm:px-8 sm:pb-12 sm:pt-20 lg:px-10">
        <div className="relative mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-8 overflow-hidden rounded-3xl bg-blue-600 px-6 py-10 text-white shadow-[0_32px_80px_-42px_rgba(29,78,216,0.72)] sm:px-10 sm:py-12 lg:flex-row lg:items-center lg:px-14">
          <div
            className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full border-[40px] border-white/10"
            aria-hidden
          />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-100">
              Your workspace is ready
            </p>
            <h2 className="mt-4 text-balance text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
              Put the whole decision in one place.
            </h2>
            <p className="mt-3 max-w-[62ch] text-base leading-7 text-blue-100">
              Sign in to your private CareerHub workspace and pick up where you left off.
            </p>
          </div>
          <Link
            to="/login"
            className="relative inline-flex min-h-[52px] shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-blue-700 shadow-[0_18px_30px_-20px_rgba(15,23,42,0.8)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-50 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-600"
          >
            Sign in to CareerHub
            <ArrowRightOutlined />
          </Link>
        </div>
      </section>

      <footer className="px-5 sm:px-8 lg:px-10">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 border-t border-slate-200 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>CareerHub is a private career management workspace for individuals.</span>
          <div className="flex gap-6">
            <Link className="font-medium transition-colors hover:text-slate-950" to="/privacy">
              Privacy
            </Link>
            <Link className="font-medium transition-colors hover:text-slate-950" to="/terms">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

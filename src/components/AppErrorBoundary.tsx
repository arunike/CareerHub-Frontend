import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('CareerHub render error', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-slate-50 dark:bg-ink-900 px-5 py-10 text-slate-700 dark:text-ink-100">
        <section className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 p-6 shadow-[0_24px_70px_-52px_rgba(15,23,42,0.55)] sm:p-8">
          <div className="mb-5 inline-flex rounded-lg border border-amber-200 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-800 dark:text-amber-200">
            This view stopped
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-ink-50">
            CareerHub could not finish loading this view.
          </h1>
          {/* The old copy blamed a deploy for every render error, which is a guess, not a diagnosis. */}
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-ink-200">
            Your saved data is not affected. Reloading fixes this when the tab was open across an
            update; if it happens again on the same page, the fault is in that page and another
            section should still work.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              Reload this page
            </button>
            {/* A second way out: reloading a page that fails every time is a loop. */}
            <a
              href="/command-center"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition-colors hover:border-blue-300 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-white/[0.10] dark:text-ink-100 dark:hover:border-blue-400/40"
            >
              Go to Command Center
            </a>
          </div>
          {this.state.error?.message && (
            <details className="mt-5 text-xs text-slate-500 dark:text-ink-400">
              <summary className="cursor-pointer font-semibold">Technical detail</summary>
              <p className="mt-2 break-words font-mono">{this.state.error.message}</p>
            </details>
          )}
        </section>
      </main>
    );
  }
}

export default AppErrorBoundary;

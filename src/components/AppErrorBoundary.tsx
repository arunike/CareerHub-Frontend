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
      <main className="flex min-h-[100dvh] items-center justify-center bg-slate-50 px-5 py-10 text-slate-700">
        <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_24px_70px_-52px_rgba(15,23,42,0.55)] sm:p-8">
          <div className="mb-5 inline-flex rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
            Page refresh needed
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            CareerHub could not finish loading this view.
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            The app may have been updated while this tab was open. Your saved data is not affected.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:w-auto"
          >
            Reload CareerHub
          </button>
        </section>
      </main>
    );
  }
}

export default AppErrorBoundary;

import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import { PageState } from './components/PageState';
import {
  PageHeaderSkeleton,
  MetricCardsSkeleton,
  TableSkeleton,
  ListSkeleton,
  GridSkeleton,
  CalendarSkeleton,
  SettingsSkeleton,
  DocumentGridSkeleton,
  OfferComparisonSkeleton,
  SkeletonBlock,
  AvailabilityTextSkeleton,
} from './components/SkeletonLoader';

const HomePage = lazy(() => import('./pages/Home'));
const Availability = lazy(() => import('./pages/Availability'));
const Events = lazy(() => import('./pages/Events'));
const Holidays = lazy(() => import('./pages/Holidays'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Settings = lazy(() => import('./pages/Settings'));
const Applications = lazy(() => import('./pages/Applications'));
const OfferComparison = lazy(() => import('./pages/OfferComparison'));
const Documents = lazy(() => import('./pages/Documents'));
const Tasks = lazy(() => import('./pages/Tasks'));
const ExperiencePage = lazy(() => import('./pages/Experience'));
const PublicBookingPage = lazy(() => import('./pages/PublicBooking'));
const JDReportPage = lazy(() => import('./pages/JDReport'));
const JDReportsListPage = lazy(() => import('./pages/JDReportsList'));
const AIToolsPage = lazy(() => import('./pages/AITools'));
const LoginPage = lazy(() => import('./pages/Login'));
const NegotiationResultPage = lazy(() => import('./pages/NegotiationResult'));
const ProfilePage = lazy(() => import('./pages/Profile'));
const LegalPage = lazy(() => import('./pages/Legal'));
const PromotionReviewPage = lazy(() => import('./pages/Experience/PromotionReviewPage'));
const Layout = lazy(() => import('./components/Layout'));
const CareerHubThemeProvider = lazy(() => import('./components/CareerHubThemeProvider'));

const getRouteTitle = (pathname: string, isAuthenticated: boolean) => {
  if (pathname === '/') return isAuthenticated ? 'Availability | CareerHub' : 'CareerHub';
  if (pathname === '/login') return 'Sign in | CareerHub';
  if (pathname === '/privacy') return 'Privacy | CareerHub';
  if (pathname === '/terms') return 'Terms | CareerHub';
  if (pathname === '/events') return 'Events | CareerHub';
  if (pathname === '/holidays') return 'Holidays | CareerHub';
  if (pathname === '/analytics') return 'Analytics | CareerHub';
  if (pathname === '/settings') return 'Settings | CareerHub';
  if (pathname === '/applications') return 'Applications | CareerHub';
  if (pathname === '/offers') return 'Offers | CareerHub';
  if (pathname === '/documents') return 'Documents | CareerHub';
  if (pathname === '/tasks') return 'Tasks | CareerHub';
  if (pathname === '/experience') return 'Experience | CareerHub';
  if (pathname === '/jd-reports') return 'Job match reports | CareerHub';
  if (pathname === '/cover-letters' || pathname === '/ai-tools') {
    return 'Intelligence | CareerHub';
  }
  if (pathname === '/profile') return 'Profile | CareerHub';
  if (pathname.startsWith('/promotion-review/')) return 'Promotion review | CareerHub';
  if (pathname.startsWith('/jd-report/')) return 'Job match report | CareerHub';
  if (pathname.startsWith('/negotiation-result/')) return 'Negotiation result | CareerHub';
  if (pathname === '/book' || pathname.startsWith('/book/')) return 'Book a time | CareerHub';
  return 'Page not found | CareerHub';
};

const NotFoundPage = ({ standalone = false }: { standalone?: boolean }) => {
  const navigate = useNavigate();
  const content = (
    <PageState
      title="Page not found"
      description="This link may be outdated, or the page may have moved. Your saved CareerHub data is unchanged."
      actionLabel={standalone ? 'Go to home' : 'Go to dashboard'}
      onAction={() => navigate('/', { replace: true })}
      icon={<span className="text-sm font-bold">404</span>}
    />
  );

  if (!standalone) return content;

  return (
    <main className="flex min-h-screen w-full min-w-0 items-center overflow-x-hidden bg-slate-50 px-4 py-12 sm:px-6">
      {content}
    </main>
  );
};

const RouteFallback = () => {
  const path = window.location.pathname;

  if (path === '/' || path.startsWith('/availability')) {
    const isCalendar = window.location.search.includes('view=calendar');
    return (
      <div className="w-full space-y-6">
        <PageHeaderSkeleton />
        {isCalendar ? <CalendarSkeleton /> : <AvailabilityTextSkeleton />}
      </div>
    );
  }

  if (path.startsWith('/events')) {
    return (
      <div className="w-full space-y-6">
        <PageHeaderSkeleton />
        <GridSkeleton count={4} />
      </div>
    );
  }

  if (path.startsWith('/holidays')) {
    return (
      <div className="w-full space-y-6">
        <PageHeaderSkeleton />
        <ListSkeleton count={3} />
      </div>
    );
  }

  if (path.startsWith('/analytics')) {
    return (
      <div className="w-full space-y-6">
        <PageHeaderSkeleton />
        <MetricCardsSkeleton count={3} />
        <div className="enterprise-card p-6 min-h-[300px] flex flex-col justify-between">
          <SkeletonBlock width="140px" height="1.25rem" />
          <SkeletonBlock width="100%" height="200px" className="opacity-80" />
        </div>
      </div>
    );
  }

  if (path.startsWith('/settings')) {
    return <SettingsSkeleton />;
  }

  if (path.startsWith('/applications')) {
    return (
      <div className="w-full space-y-6">
        <PageHeaderSkeleton />
        <MetricCardsSkeleton count={4} />
        <TableSkeleton />
      </div>
    );
  }

  if (path.startsWith('/offers')) {
    return (
      <div className="w-full space-y-6">
        <PageHeaderSkeleton />
        <OfferComparisonSkeleton />
      </div>
    );
  }

  if (path.startsWith('/documents')) {
    return (
      <div className="w-full space-y-6">
        <PageHeaderSkeleton />
        <DocumentGridSkeleton />
      </div>
    );
  }

  if (path.startsWith('/tasks')) {
    return (
      <div className="w-full space-y-6">
        <PageHeaderSkeleton />
        <div className="enterprise-card p-5 space-y-4 animate-in fade-in duration-300">
          <div className="border-b border-slate-100 pb-3 flex justify-between">
            <SkeletonBlock width="120px" height="1.1rem" />
            <SkeletonBlock width="80px" height="1.1rem" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-b-0"
              >
                <SkeletonBlock width="20px" height="20px" circle className="shrink-0" />
                <SkeletonBlock width="60%" height="0.95rem" />
                <SkeletonBlock
                  width="60px"
                  height="1.25rem"
                  className="rounded-full ml-auto shrink-0"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (path.startsWith('/experience')) {
    return (
      <div className="w-full space-y-6">
        <PageHeaderSkeleton />
        <MetricCardsSkeleton count={4} />
        <ListSkeleton count={3} />
      </div>
    );
  }

  if (path.startsWith('/jd-reports')) {
    return (
      <div className="w-full space-y-6">
        <PageHeaderSkeleton />
        <TableSkeleton />
      </div>
    );
  }

  if (
    path.startsWith('/ai-tools') ||
    path.startsWith('/cover-letters') ||
    path.startsWith('/promotion-review')
  ) {
    return (
      <div className="w-full space-y-6">
        <PageHeaderSkeleton />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
          <div className="md:col-span-1 enterprise-card p-6 space-y-4">
            <SkeletonBlock width="120px" height="1.1rem" />
            <SkeletonBlock width="100%" height="2.25rem" />
            <SkeletonBlock width="100%" height="2.25rem" />
            <SkeletonBlock width="100%" height="8rem" />
          </div>
          <div className="md:col-span-2 enterprise-card p-6 space-y-4">
            <SkeletonBlock width="180px" height="1.25rem" />
            <div className="space-y-2 pt-2">
              <SkeletonBlock width="95%" height="0.9rem" />
              <SkeletonBlock width="90%" height="0.9rem" />
              <SkeletonBlock width="95%" height="0.9rem" />
              <SkeletonBlock width="80%" height="0.9rem" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (path.startsWith('/profile')) {
    return (
      <div className="w-full space-y-6">
        <PageHeaderSkeleton />
        <div className="enterprise-card p-6 flex flex-col md:flex-row gap-6 animate-in fade-in duration-300">
          <div className="flex flex-col items-center shrink-0">
            <SkeletonBlock width="100px" height="100px" circle />
            <SkeletonBlock width="120px" height="1.1rem" className="mt-3" />
            <SkeletonBlock width="80px" height="0.75rem" className="mt-2 opacity-60" />
          </div>
          <div className="flex-1 space-y-5">
            <div className="border-b border-slate-100 pb-2">
              <SkeletonBlock width="140px" height="1.25rem" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="space-y-2">
                  <SkeletonBlock width="100px" height="0.8rem" className="opacity-75" />
                  <SkeletonBlock width="100%" height="2.25rem" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[40vh] items-center justify-center animate-in fade-in duration-300">
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200/70 bg-white/75 p-5 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.45)] backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="shimmer-bg w-6 h-6 rounded-full" />
          <SkeletonBlock width="120px" height="1.1rem" />
        </div>
        <div className="space-y-2">
          <SkeletonBlock width="95%" height="0.75rem" />
          <SkeletonBlock width="70%" height="0.75rem" />
        </div>
      </div>
    </div>
  );
};

const ThemedSurface = ({ children }: { children: ReactNode }) => (
  <Suspense fallback={<RouteFallback />}>
    <CareerHubThemeProvider>{children}</CareerHubThemeProvider>
  </Suspense>
);

function AppRoutes() {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  const isPublicBooking = location.pathname === '/book' || location.pathname.startsWith('/book/');
  const isStandalone = isPublicBooking;
  const isLoginPage = location.pathname === '/login';
  const isLegalPage = location.pathname === '/privacy' || location.pathname === '/terms';
  const isHomePage = location.pathname === '/';

  useEffect(() => {
    if (isLoading) return;
    document.title = getRouteTitle(location.pathname, isAuthenticated);
  }, [isAuthenticated, isLoading, location.pathname]);

  if (isStandalone) {
    return (
      <ThemedSurface>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/book/:uuid" element={<PublicBookingPage />} />
            <Route path="/book/:uuid/:bookingUuid/:action" element={<PublicBookingPage />} />
            <Route path="*" element={<NotFoundPage standalone />} />
          </Routes>
        </Suspense>
      </ThemedSurface>
    );
  }

  if (isLoginPage) {
    return (
      <ThemedSurface>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </Suspense>
      </ThemedSurface>
    );
  }

  if (isLegalPage) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/privacy" element={<LegalPage type="privacy" />} />
          <Route path="/terms" element={<LegalPage type="terms" />} />
        </Routes>
      </Suspense>
    );
  }

  if (isHomePage && !isLoading && !isAuthenticated) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <ProtectedRoute>
      <ThemedSurface>
        <Layout>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Availability />} />
              <Route path="/events" element={<Events />} />
              <Route path="/holidays" element={<Holidays />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/applications" element={<Applications />} />
              <Route path="/offers" element={<OfferComparison />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/experience" element={<ExperiencePage />} />
              <Route path="/jd-reports" element={<JDReportsListPage />} />
              <Route path="/cover-letters" element={<AIToolsPage />} />
              <Route path="/ai-tools" element={<AIToolsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/promotion-review/:id" element={<PromotionReviewPage />} />
              <Route path="/jd-report/:id" element={<JDReportPage />} />
              <Route path="/negotiation-result/:id" element={<NegotiationResultPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </Layout>
      </ThemedSurface>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;

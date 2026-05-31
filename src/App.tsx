import { lazy, Suspense } from 'react';
import { ConfigProvider, Spin } from 'antd';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';

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

const RouteFallback = () => (
  <div className="flex min-h-[40vh] items-center justify-center">
    <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200/70 bg-white/75 p-5 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.45)] backdrop-blur">
      <div className="flex items-center gap-3">
        <Spin size="small" />
        <div className="text-sm font-semibold text-slate-700">Loading workspace</div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-11/12 rounded-full bg-slate-100" />
        <div className="h-3 w-8/12 rounded-full bg-slate-100" />
      </div>
    </div>
  </div>
);

function AppRoutes() {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  const isPublicBooking = location.pathname.startsWith('/book/');
  const isStandalone =
    isPublicBooking ||
    location.pathname.startsWith('/jd-report/') ||
    location.pathname.startsWith('/negotiation-result/');
  const isLoginPage = location.pathname === '/login';
  const isLegalPage = location.pathname === '/privacy' || location.pathname === '/terms';
  const isHomePage = location.pathname === '/';

  if (isStandalone) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/book/:uuid" element={<PublicBookingPage />} />
          <Route path="/book/:uuid/:bookingUuid/:action" element={<PublicBookingPage />} />
          <Route path="/jd-report/:id" element={<JDReportPage />} />
          <Route path="/negotiation-result/:id" element={<NegotiationResultPage />} />
        </Routes>
      </Suspense>
    );
  }

  if (isLoginPage) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </Suspense>
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
          </Routes>
        </Suspense>
      </Layout>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#2563eb',
          colorPrimaryHover: '#1d4ed8',
          colorPrimaryActive: '#1e40af',
          colorLink: '#2563eb',
          colorLinkHover: '#1d4ed8',
          borderRadius: 9,
          borderRadiusLG: 12,
          borderRadiusSM: 5,
          fontSize: 14,
          fontSizeLG: 15,
          fontFamily: `'Aptos', 'Geist', 'Satoshi', ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
          colorBgContainer: '#ffffff',
          colorBgLayout: '#f8fafc',
          colorBorder: '#e2e8f0',
          colorBorderSecondary: '#f1f5f9',
          colorTextBase: '#111827',
          colorTextSecondary: '#475569',
          colorTextTertiary: '#8a98a8',
          boxShadow: '0 1px 2px 0 rgba(15, 23, 42, 0.05)',
          boxShadowSecondary:
            '0 18px 45px -30px rgba(15, 23, 42, 0.45), 0 4px 14px -12px rgba(15, 23, 42, 0.35)',
          controlHeight: 38,
          controlHeightLG: 44,
          controlHeightSM: 30,
          lineHeight: 1.6,
        },
        components: {
          Button: {
            fontWeight: 650,
            primaryShadow: 'none',
            defaultShadow: 'none',
            dangerShadow: 'none',
          },
          Table: {
            headerBg: '#f8fafc',
            headerColor: '#475569',
            headerSplitColor: 'transparent',
            borderColor: '#f1f5f9',
            rowHoverBg: '#fafbff',
            cellPaddingBlock: 14,
            cellPaddingInline: 18,
            headerBorderRadius: 0,
            fontSize: 14,
          },
          Card: {
            paddingLG: 22,
            boxShadowTertiary: 'none',
          },
          Input: {
            activeShadow: '0 0 0 3px rgba(49,88,183,0.14)',
            paddingInline: 14,
          },
          Select: {
            optionSelectedBg: '#eff6ff',
            optionActiveBg: '#f8fafc',
          },
          Menu: {
            activeBarBorderWidth: 0,
            itemSelectedBg: '#eff6ff',
            itemSelectedColor: '#2563eb',
            itemHoverBg: '#f8fafc',
            subMenuItemBg: '#fafafa',
            groupTitleColor: '#475569',
            groupTitleFontSize: 11,
          },
          Modal: {
            titleFontSize: 16,
            titleLineHeight: 1.5,
          },
          Tag: {
            borderRadiusSM: 20,
          },
          Tabs: {
            inkBarColor: '#2563eb',
            itemSelectedColor: '#2563eb',
            itemHoverColor: '#1d4ed8',
            titleFontSizeLG: 14,
          },
          Progress: {
            defaultColor: '#2563eb',
          },
          Badge: {
            colorPrimary: '#2563eb',
          },
          Tooltip: {
            borderRadius: 8,
            fontSize: 13,
          },
        },
      }}
    >
      <Router>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </Router>
    </ConfigProvider>
  );
}

export default App;

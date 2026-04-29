import { lazy, Suspense } from 'react';
import { ConfigProvider, Spin } from 'antd';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';

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

const RouteFallback = () => (
  <div className="flex min-h-[40vh] items-center justify-center">
    <Spin size="large" />
  </div>
);

function AppRoutes() {
  const location = useLocation();
  const isPublicBooking = location.pathname.startsWith('/book/');
  const isStandalone =
    isPublicBooking ||
    location.pathname.startsWith('/jd-report/') ||
    location.pathname.startsWith('/negotiation-result/');
  const isLoginPage = location.pathname === '/login';

  if (isStandalone) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/book/:uuid" element={<PublicBookingPage />} />
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
          colorPrimary: '#6366f1',
          colorPrimaryHover: '#4f46e5',
          colorPrimaryActive: '#4338ca',
          colorLink: '#6366f1',
          colorLinkHover: '#4f46e5',
          borderRadius: 10,
          borderRadiusLG: 14,
          borderRadiusSM: 6,
          fontSize: 14,
          fontSizeLG: 15,
          fontFamily: `-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif`,
          colorBgContainer: '#ffffff',
          colorBgLayout: '#f8fafc',
          colorBorder: '#e2e8f0',
          colorBorderSecondary: '#f1f5f9',
          colorTextBase: '#0f172a',
          colorTextSecondary: '#64748b',
          colorTextTertiary: '#94a3b8',
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.07)',
          boxShadowSecondary: '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.07)',
          controlHeight: 38,
          controlHeightLG: 44,
          controlHeightSM: 30,
          lineHeight: 1.6,
        },
        components: {
          Button: {
            fontWeight: 500,
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
            cellPaddingInline: 16,
            headerBorderRadius: 0,
            fontSize: 14,
          },
          Card: {
            paddingLG: 24,
            boxShadowTertiary: 'none',
          },
          Input: {
            activeShadow: '0 0 0 3px rgba(99,102,241,0.12)',
            paddingInline: 14,
          },
          Select: {
            optionSelectedBg: '#eef2ff',
            optionActiveBg: '#f5f3ff',
          },
          Menu: {
            activeBarBorderWidth: 0,
            itemSelectedBg: '#eef2ff',
            itemSelectedColor: '#6366f1',
            itemHoverBg: '#f8fafc',
            subMenuItemBg: '#fafafa',
            groupTitleColor: '#94a3b8',
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
            inkBarColor: '#6366f1',
            itemSelectedColor: '#6366f1',
            itemHoverColor: '#4f46e5',
            titleFontSizeLG: 14,
          },
          Progress: {
            defaultColor: '#6366f1',
          },
          Badge: {
            colorPrimary: '#6366f1',
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

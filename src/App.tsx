import { ConfigProvider } from 'antd';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import Availability from './pages/Availability';
import Events from './pages/Events';
import Holidays from './pages/Holidays';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Applications from './pages/Applications';
import OfferComparison from './pages/OfferComparison';
import Documents from './pages/Documents';
import Tasks from './pages/Tasks';
import ExperiencePage from './pages/Experience';
import PublicBookingPage from './pages/PublicBooking';
import JDReportPage from './pages/JDReport';
import JDReportsListPage from './pages/JDReportsList';
import AIToolsPage from './pages/AITools';
import LoginPage from './pages/Login';
import NegotiationResultPage from './pages/NegotiationResult';
import ProfilePage from './pages/Profile';

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
      <Routes>
        <Route path="/book/:uuid" element={<PublicBookingPage />} />
        <Route path="/jd-report/:id" element={<JDReportPage />} />
        <Route path="/negotiation-result/:id" element={<NegotiationResultPage />} />
      </Routes>
    );
  }

  if (isLoginPage) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
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

import { ConfigProvider } from 'antd';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
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
import NegotiationResultPage from './pages/NegotiationResult';

function AppRoutes() {
  const location = useLocation();
  const isPublicBooking = location.pathname.startsWith('/book/');
  const isStandalone =
    isPublicBooking ||
    location.pathname.startsWith('/jd-report/') ||
    location.pathname.startsWith('/negotiation-result/');

  if (isStandalone) {
    return (
      <Routes>
        <Route path="/book/:uuid" element={<PublicBookingPage />} />
        <Route path="/jd-report/:id" element={<JDReportPage />} />
        <Route path="/negotiation-result/:id" element={<NegotiationResultPage />} />
      </Routes>
    );
  }

  return (
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
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#1890ff',
            borderRadius: 8,
            fontSize: 18,
          },
        }}
      >
        <Router>
          <AppRoutes />
        </Router>
      </ConfigProvider>
  );
}

export default App;

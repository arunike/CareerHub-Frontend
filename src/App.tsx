import { ConfigProvider } from 'antd';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Availability from './pages/Availability';
import Events from './pages/Events';
import Holidays from './pages/Holidays';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Applications from './pages/Applications';
import OfferComparison from './pages/OfferComparison';
import Documents from './pages/Documents';

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
            </Routes>
          </Layout>
        </Router>
      </ConfigProvider>
  );
}

export default App;

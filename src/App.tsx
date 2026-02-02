import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import AvailabilityDashboard from './pages/AvailabilityDashboard';
import EventList from './pages/EventList';
import Holidays from './pages/HolidayList';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Applications from './pages/Applications';
import OfferComparison from './pages/OfferComparison';
import { ToastProvider } from './context/ToastContext';

function App() {
  return (
    <ToastProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<AvailabilityDashboard />} />
            <Route path="/events" element={<EventList />} />
            <Route path="/holidays" element={<Holidays />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/applications" element={<Applications />} />
            <Route path="/offers" element={<OfferComparison />} />
          </Routes>
        </Layout>
      </Router>
    </ToastProvider>
  );
}

export default App;

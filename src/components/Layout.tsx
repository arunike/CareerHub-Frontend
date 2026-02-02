import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Calendar,
  List,
  Sun,
  BarChart3,
  Settings as SettingsIcon,
  Briefcase,
  DollarSign,
  Menu,
  X,
} from 'lucide-react';
import clsx from 'clsx';

import NotificationBell from './NotificationBell';
import logoWithText from '../assets/logo_with_text.png';

const NavItem = ({
  to,
  icon: Icon,
  children,
  onClick,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  onClick?: () => void;
}) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      onClick={onClick}
      className={clsx(
        'flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors',
        isActive
          ? 'bg-indigo-50 text-indigo-700'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      )}
    >
      <Icon className="mr-3 h-5 w-5" />
      {children}
    </Link>
  );
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="h-screen overflow-hidden bg-gray-50 flex">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-gray-200"
      >
        {mobileMenuOpen ? (
          <X className="h-6 w-6 text-gray-600" />
        ) : (
          <Menu className="h-6 w-6 text-gray-600" />
        )}
      </button>

      {/* Sidebar */}
      <aside
        className={clsx(
          'w-full lg:w-64 shrink-0 bg-white border-r border-gray-200 flex flex-col z-40',
          'fixed lg:relative h-full',
          'transition-transform duration-300 ease-in-out',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center">
            <img src={logoWithText} alt="CareerHub" className="h-22" />
          </div>
          <NotificationBell />
        </div>

        {/* Scrollable Navigation Area */}
        <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col">
          <div className="space-y-6 flex-1">
            {/* Module: Availability */}
            <div>
              <h3 className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Availability
              </h3>
              <nav className="space-y-0.5">
                <NavItem to="/" icon={Sun} onClick={closeMobileMenu}>
                  Dashboard
                </NavItem>
                <NavItem to="/events" icon={Calendar} onClick={closeMobileMenu}>
                  Events
                </NavItem>
                <NavItem to="/holidays" icon={List} onClick={closeMobileMenu}>
                  Holidays
                </NavItem>
              </nav>
            </div>

            {/* Module: Career */}
            <div>
              <h3 className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Career & Growth
              </h3>
              <nav className="space-y-0.5">
                <NavItem to="/applications" icon={Briefcase} onClick={closeMobileMenu}>
                  Applications
                </NavItem>
                <NavItem to="/offers" icon={DollarSign} onClick={closeMobileMenu}>
                  Offers
                </NavItem>
              </nav>
            </div>

            {/* Module: Insights */}
            <div>
              <h3 className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Insights
              </h3>
              <nav className="space-y-0.5">
                <NavItem to="/analytics" icon={BarChart3} onClick={closeMobileMenu}>
                  Analytics
                </NavItem>
              </nav>
            </div>

            {/* Settings */}
            <div>
              <div className="my-2 border-t border-gray-100 mx-4"></div>
              <nav className="space-y-0.5">
                <NavItem to="/settings" icon={SettingsIcon} onClick={closeMobileMenu}>
                  Settings
                </NavItem>
              </nav>
            </div>
          </div>

          <div className="mt-auto px-4 py-4 border-t border-gray-100 shrink-0">
            <p className="text-xs text-gray-400">© 2026 CareerHub</p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-4 lg:p-8 pt-16 lg:pt-8">
        <div className="max-w-5xl mx-auto">{children}</div>
      </main>
    </div>
  );
};

export default Layout;

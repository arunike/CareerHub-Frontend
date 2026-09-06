import React, { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Layout as AntLayout, Menu, Grid, ConfigProvider } from 'antd';
import {
  DashboardOutlined,
  CalendarOutlined,
  ScheduleOutlined,
  LineChartOutlined,
  SolutionOutlined,
  DollarOutlined,
  WalletOutlined,
  FileTextOutlined,
  CheckSquareOutlined,
  TrophyOutlined,
  RobotOutlined,
  ThunderboltOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { getUserSettings } from '../api/availability';
import { useAuth } from '../context/AuthContext';
import {
  getMobileNavigationItemForLocation,
  getMobileToolbarItems,
  getRecentMobileNavigationKeys,
  matchesMobileNavigationItem,
  recordMobileNavigationUse,
} from '../constants/mobileNavigation';
import MobileQuickActions, { hasMobileQuickActionsForSource } from './MobileQuickActions';
import { applyNavOrder, navLabel } from '../constants/navigationItems';
import MobileBottomNav from './MobileBottomNav';
import SidebarHeader from './SidebarHeader';
import SidebarFooter from './SidebarFooter';
import Modal from './MobileModal';
import { UnsavedChangesProvider, useUnsavedChangesApi } from '../hooks/useUnsavedChanges';

const { Sider, Content } = AntLayout;

// Asks before abandoning typed-but-unsaved work; resolves false to stay on the page.
const confirmLeaveDialog = (label: string) =>
  new Promise<boolean>((resolve) => {
    Modal.confirm({
      title: 'Leave without saving?',
      content: `Your unsaved ${label} will be lost.`,
      okText: 'Leave',
      okButtonProps: { danger: true },
      cancelText: 'Stay on this page',
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    });
  });
const { useBreakpoint } = Grid;
const SIDEBAR_COLLAPSED_STORAGE_KEY = 'careerhub.sidebar.collapsed';
const NotificationBell = lazy(() => import('./NotificationBell'));

const NotificationBellFallback = () => (
  <div className="h-11 w-11 rounded-xl bg-slate-100 dark:bg-ink-800" aria-hidden="true" />
);

const LayoutInner = ({ children }: { children: React.ReactNode }) => {
  const unsaved = useUnsavedChangesApi();
  const screens = useBreakpoint();
  const [collapsed, setCollapsed] = useState(true);
  const [desktopCollapsed, setDesktopCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true';
  });
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [hiddenNavItems, setHiddenNavItems] = useState<string[]>([]);
  const [navItemOrder, setNavItemOrder] = useState<string[]>([]);
  const [mobileToolbarKeys, setMobileToolbarKeys] = useState<string[]>([]);
  const [navItemLabels, setNavItemLabels] = useState<Record<string, string>>({});
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [quickActionsSourceKey, setQuickActionsSourceKey] = useState<string>();
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('');
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressedLongPressClick = useRef<string | null>(null);
  const isDesktopSidebarCollapsed = Boolean(screens.lg && desktopCollapsed);
  const shouldLoadNotifications = Boolean(screens.lg || !collapsed);

  const notificationBell = shouldLoadNotifications ? (
    <Suspense fallback={<NotificationBellFallback />}>
      <NotificationBell placement="top-left" />
    </Suspense>
  ) : (
    <NotificationBellFallback />
  );

  useEffect(() => {
    getUserSettings()
      .then((res) => {
        setHiddenNavItems(res.data.hidden_nav_items || []);
        setNavItemOrder(res.data.nav_item_order || []);
        setMobileToolbarKeys(res.data.mobile_toolbar_items || []);
        setNavItemLabels(res.data.nav_item_labels || {});
        setProfilePic(res.data.profile_picture);
        setDisplayName(res.data.display_name || user?.full_name || '');
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        if (detail.hidden_nav_items !== undefined) setHiddenNavItems(detail.hidden_nav_items);
        if (detail.nav_item_order !== undefined) setNavItemOrder(detail.nav_item_order);
        if (detail.mobile_toolbar_items !== undefined) {
          setMobileToolbarKeys(detail.mobile_toolbar_items);
        }
        if (detail.nav_item_labels !== undefined) setNavItemLabels(detail.nav_item_labels);
        if (detail.profile_picture !== undefined) setProfilePic(detail.profile_picture);
        if (detail.display_name !== undefined) setDisplayName(detail.display_name);
      }
    };
    window.addEventListener('settings-saved', handler);
    return () => window.removeEventListener('settings-saved', handler);
  }, []);

  useEffect(() => {
    if (!screens.lg) {
      setCollapsed(true);
    }
  }, [location, screens.lg]);

  useEffect(() => {
    if (!screens.lg) {
      setCollapsed(true);
    }
  }, [screens.lg]);

  useEffect(() => {
    const currentItem = getMobileNavigationItemForLocation(location.pathname, location.search);
    if (currentItem) recordMobileNavigationUse(currentItem.key);
  }, [location.pathname, location.search]);

  const menuItems = [
    {
      key: 'grp-1',
      label: 'Schedule',
      type: 'group' as const,
      children: [
        {
          key: '/',
          icon: <DashboardOutlined />,
          label: 'Availability',
        },
        {
          key: '/events',
          icon: <CalendarOutlined />,
          label: 'Events',
        },
        {
          key: '/holidays',
          icon: <ScheduleOutlined />,
          label: 'Holidays',
        },
      ],
    },
    {
      key: 'grp-2',
      label: 'Career & Growth',
      type: 'group' as const,
      children: [
        {
          key: '/applications',
          icon: <SolutionOutlined />,
          label: 'Applications',
        },
        { key: '/offers', icon: <DollarOutlined />, label: 'Offers' },
        { key: '/income', icon: <WalletOutlined />, label: 'Income' },
        { key: '/documents', icon: <FileTextOutlined />, label: 'Documents' },
        { key: '/tasks', icon: <CheckSquareOutlined />, label: 'Action Items' },
        { key: '/experience', icon: <TrophyOutlined />, label: 'Experience' },
        { key: '/contacts', icon: <TeamOutlined />, label: 'Contacts' },
        {
          key: 'intelligence',
          icon: <RobotOutlined />,
          label: 'Intelligence',
          children: [
            { key: '/jd-reports', label: 'JD Reports' },
            { key: '/ai-tools?tab=cover-letters', label: 'Cover Letters' },
            { key: '/ai-tools?tab=negotiation-results', label: 'Negotiation Results' },
            { key: '/ai-tools?tab=promotion-reviews', label: 'Promotion Reviews' },
          ],
        },
      ],
    },
    {
      key: 'grp-3',
      label: 'Insights',
      type: 'group' as const,
      children: [
        {
          key: '/analytics',
          icon: <LineChartOutlined />,
          label: 'Analytics',
        },
      ],
    },
  ];

  const isVisible = (key: string) => location.pathname === key || !hiddenNavItems.includes(key);

  const holdsActiveRoute = (group: { children?: Array<{ key: string; children?: unknown }> }) =>
    (group.children ?? []).some(
      (item) =>
        item.key === location.pathname ||
        ('children' in item &&
          (item.children as Array<{ key: string }> | undefined)?.some(
            (child) => child.key.split('?')[0] === location.pathname
          ))
    );

  const filterChildren = (items: (typeof menuItems)[0]['children']) =>
    items
      ?.filter((item) =>
        !('children' in item) || isVisible(item.key) ? isVisible(item.key) : false
      )
      .map((item) =>
        'children' in item && item.children
          ? {
              ...item,
              children: (item.children as Array<{ key: string }>).filter((child) =>
                isVisible(child.key)
              ),
            }
          : item
      );

  // A renamed entry keeps its route; only the text the user reads changes.
  const rename = <T extends { key: string; label?: React.ReactNode }>(item: T): T =>
    typeof item.label === 'string'
      ? { ...item, label: navLabel(item.key, item.label, navItemLabels) }
      : item;

  const visibleMenuItems = menuItems
    .map((group) => ({
      ...rename(group),
      children: applyNavOrder(filterChildren(group.children) ?? [], navItemOrder)
        .map((item) =>
          'children' in item && item.children
            ? { ...item, children: applyNavOrder(item.children, navItemOrder).map(rename) }
            : item
        )
        .map(rename),
    }))
    .filter(
      (group) =>
        (group.children?.length ?? 0) > 0 &&
        (!hiddenNavItems.includes(group.key) || holdsActiveRoute(group))
    );

  const menuDisplayItems = isDesktopSidebarCollapsed
    ? visibleMenuItems.flatMap((group, idx) => {
        const items = group.children || [];
        if (idx > 0 && items.length > 0) {
          return [{ type: 'divider' as const, key: `div-${idx}` }, ...items];
        }
        return items;
      })
    : visibleMenuItems;

  const handleMenuClick = async ({ key }: { key: string }) => {
    if (!key.startsWith('/')) return;
    if (await unsaved.confirmLeave()) navigate(key);
  };

  const toggleDesktopSidebar = () => {
    setDesktopCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(next));
      return next;
    });
  };

  const activeKey = location.pathname + location.search;
  const intelligencePaths = ['/jd-reports', '/ai-tools', '/cover-letters'];
  const isIntelligence = intelligencePaths.some((p) => location.pathname.startsWith(p));
  const selectedKey =
    location.pathname === '/cover-letters' || activeKey === '/ai-tools'
      ? '/ai-tools?tab=cover-letters'
      : activeKey;
  const mobilePrimaryNavItems = getMobileToolbarItems(mobileToolbarKeys, {
    pathname: location.pathname,
    recentKeys: getRecentMobileNavigationKeys(),
  });
  const currentMobileNavigationItem = getMobileNavigationItemForLocation(
    location.pathname,
    location.search
  );
  const currentQuickActionSourceKey =
    currentMobileNavigationItem && hasMobileQuickActionsForSource(currentMobileNavigationItem.key)
      ? currentMobileNavigationItem.key
      : undefined;
  const matchesNavKey = (key: string) =>
    matchesMobileNavigationItem(location.pathname, location.search, key);
  const isMoreActive =
    !screens.lg && !mobilePrimaryNavItems.some((item) => matchesNavKey(item.key));

  const openQuickActions = (sourceKey?: string) => {
    const resolvedSourceKey = sourceKey || currentQuickActionSourceKey;
    if (!resolvedSourceKey || !hasMobileQuickActionsForSource(resolvedSourceKey)) return;
    setCollapsed(true);
    setQuickActionsSourceKey(resolvedSourceKey);
    setQuickActionsOpen(true);
  };

  const navigateFromQuickActions = async (destination: string) => {
    const [pathname, search = ''] = destination.split('?');
    const destinationItem = getMobileNavigationItemForLocation(
      pathname,
      search ? `?${search}` : ''
    );
    if (!(await unsaved.confirmLeave())) return;
    if (destinationItem) recordMobileNavigationUse(destinationItem.key);
    setQuickActionsOpen(false);
    setQuickActionsSourceKey(undefined);
    navigate(destination);
  };

  const startLongPress = (pressKey: string, sourceKey?: string) => {
    suppressedLongPressClick.current = null;
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    longPressTimer.current = window.setTimeout(() => {
      suppressedLongPressClick.current = pressKey;
      window.navigator.vibrate?.(10);
      openQuickActions(sourceKey);
    }, 450);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const consumeSuppressedLongPressClick = (pressKey: string) => {
    if (suppressedLongPressClick.current !== pressKey) return false;
    suppressedLongPressClick.current = null;
    return true;
  };

  const SidebarContent = (
    <div className="enterprise-shell flex h-full flex-col">
      <SidebarHeader
        isDesktopSidebarCollapsed={isDesktopSidebarCollapsed}
        screens={screens}
        setCollapsed={setCollapsed}
        toggleDesktopSidebar={toggleDesktopSidebar}
      />

      <div className="flex-1 overflow-y-auto py-3">
        {!screens.lg && currentQuickActionSourceKey && (
          <div className="px-3 pb-2">
            <button
              type="button"
              onClick={() => openQuickActions()}
              className="flex min-h-11 w-full items-center gap-3 rounded-xl border border-blue-100 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/10 px-3 text-left text-sm font-bold text-blue-700 dark:text-blue-300 transition hover:border-blue-200 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              <ThunderboltOutlined />
              <span>{currentMobileNavigationItem?.label} actions</span>
            </button>
          </div>
        )}
        <ConfigProvider
          theme={{
            components: {
              Menu: {
                itemHeight: 38,
                itemMarginInline: 12,
                itemMarginBlock: 2,
                collapsedWidth: 76,
                collapsedIconSize: 18,
                iconSize: 18,
                iconMarginInlineEnd: 12,
                fontSize: 14,
                itemSelectedBg: '#eff6ff',
                itemSelectedColor: '#2563eb',
                itemHoverBg: '#f8fafc',
              },
            },
          }}
        >
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            defaultOpenKeys={isIntelligence ? ['intelligence'] : []}
            inlineCollapsed={isDesktopSidebarCollapsed}
            items={menuDisplayItems}
            onClick={handleMenuClick}
            style={{ borderRight: 0 }}
            className="border-none bg-transparent"
          />
        </ConfigProvider>
      </div>

      <SidebarFooter
        settingsActive={location.pathname === '/settings'}
        displayName={displayName}
        isDesktopSidebarCollapsed={isDesktopSidebarCollapsed}
        isLoggingOut={isLoggingOut}
        logout={logout}
        navigate={navigate}
        notificationBell={notificationBell}
        profilePic={profilePic}
        setIsLoggingOut={setIsLoggingOut}
        user={user}
      />
    </div>
  );

  return (
    <AntLayout style={{ minHeight: '100dvh', flexDirection: 'row' }}>
      <a
        href="#careerhub-main-content"
        className="fixed left-4 top-4 z-[var(--careerhub-z-skip-link)] -translate-y-24 rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
      >
        Skip to main content
      </a>
      {/* Unified Sider */}
      <Sider
        width={260}
        theme="light"
        collapsible
        collapsed={screens.lg ? desktopCollapsed : collapsed}
        trigger={null}
        collapsedWidth={screens.lg ? 76 : 0}
        style={{
          height: '100dvh',
          position: screens.lg ? 'sticky' : 'fixed',
          top: 0,
          left: 0,
          zIndex: screens.lg ? 100 : 1005,
          boxShadow: !collapsed && !screens.lg ? '4px 0 24px rgba(0,0,0,0.1)' : 'none',
        }}
        className={!screens.lg && !collapsed ? 'fixed-sider-mobile' : ''}
      >
        {SidebarContent}
      </Sider>

      {/* Mobile Overlay (Darken background when menu is open) */}
      {!screens.lg && !collapsed && (
        <div className="fixed inset-0 z-[1004] bg-black/40" onClick={() => setCollapsed(true)} />
      )}

      <AntLayout className="min-h-[100dvh] bg-transparent transition-all duration-300">
        <Content
          id="careerhub-main-content"
          tabIndex={-1}
          style={{ margin: 0, overflow: 'initial', position: 'relative' }}
        >
          <div
            className={`enterprise-page mx-auto w-full max-w-[1560px] p-4 md:p-6 lg:p-7 xl:p-8 ${!screens.lg ? 'pb-[8.5rem]' : ''}`}
          >
            {children}
          </div>
        </Content>
      </AntLayout>

      {!screens.lg ? (
        <MobileBottomNav
          currentQuickActionSourceKey={currentQuickActionSourceKey}
          isMoreActive={isMoreActive}
          cancelLongPress={cancelLongPress}
          collapsed={collapsed}
          consumeSuppressedLongPressClick={consumeSuppressedLongPressClick}
          currentMobileNavigationItem={currentMobileNavigationItem}
          matchesNavKey={matchesNavKey}
          mobilePrimaryNavItems={mobilePrimaryNavItems}
          navigate={navigate}
          openQuickActions={openQuickActions}
          setCollapsed={setCollapsed}
          startLongPress={startLongPress}
        />
      ) : null}
      {!screens.lg && (
        <MobileQuickActions
          open={quickActionsOpen}
          sourceKey={quickActionsSourceKey}
          onClose={() => {
            setQuickActionsOpen(false);
            setQuickActionsSourceKey(undefined);
          }}
          onNavigate={navigateFromQuickActions}
        />
      )}
    </AntLayout>
  );
};

// The provider sits above the shell so the nav can ask the page before leaving it.
const Layout = ({ children }: { children: React.ReactNode }) => (
  <UnsavedChangesProvider confirm={confirmLeaveDialog}>
    <LayoutInner>{children}</LayoutInner>
  </UnsavedChangesProvider>
);

export default Layout;

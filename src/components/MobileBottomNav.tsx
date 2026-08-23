import type {
  MobileNavigationItem,
  ResolvedMobileToolbarItem,
} from '../constants/mobileNavigation';
import type React from 'react';
import { AppstoreOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { recordMobileNavigationUse } from '../constants/mobileNavigation';
import { hasMobileQuickActionsForSource } from './MobileQuickActions';

type Props = {
  currentQuickActionSourceKey: any;
  isMoreActive: any;
  cancelLongPress: () => void;
  collapsed: boolean;
  consumeSuppressedLongPressClick: (pressKey: string) => boolean;
  currentMobileNavigationItem: MobileNavigationItem | undefined;
  matchesNavKey: (key: string) => boolean;
  mobilePrimaryNavItems: ResolvedMobileToolbarItem[];
  navigate: any;
  openQuickActions: (sourceKey?: string) => void;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  startLongPress: (pressKey: string, sourceKey?: string) => void;
};

const MobileBottomNav = ({
  cancelLongPress,
  collapsed,
  consumeSuppressedLongPressClick,
  currentMobileNavigationItem,
  matchesNavKey,
  mobilePrimaryNavItems,
  navigate,
  openQuickActions,
  setCollapsed,
  startLongPress,
  currentQuickActionSourceKey,
  isMoreActive,
}: Props) => (
  <div className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-[910] border-t border-slate-200/80 bg-white shadow-[0_-18px_48px_-36px_rgba(15,23,42,0.65)]">
    <div
      className="mx-auto grid max-w-3xl gap-1 px-2 pt-2"
      style={{
        gridTemplateColumns: `repeat(${mobilePrimaryNavItems.length + 1}, minmax(0, 1fr))`,
      }}
    >
      {mobilePrimaryNavItems.map((item) => {
        const isActive = matchesNavKey(item.key);
        const Icon = item.icon;
        const hasQuickActions = hasMobileQuickActionsForSource(item.key);
        return (
          <button
            key={item.slotKey}
            type="button"
            onPointerDown={
              hasQuickActions ? () => startLongPress(item.slotKey, item.key) : undefined
            }
            onPointerUp={cancelLongPress}
            onPointerCancel={cancelLongPress}
            onPointerLeave={cancelLongPress}
            onContextMenu={
              hasQuickActions
                ? (event) => {
                    event.preventDefault();
                    cancelLongPress();
                    openQuickActions(item.key);
                  }
                : undefined
            }
            onClick={() => {
              if (consumeSuppressedLongPressClick(item.slotKey)) return;
              recordMobileNavigationUse(item.key);
              navigate(item.key);
            }}
            className={`flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold transition ${
              isActive
                ? 'bg-blue-50 text-blue-600 shadow-[inset_0_0_0_1px_rgba(191,219,254,0.65)]'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
            aria-description={
              hasQuickActions ? `Press and hold for ${item.label} actions` : undefined
            }
          >
            <span className="text-lg">
              <Icon />
            </span>
            <span className="flex max-w-full items-center gap-1 truncate">
              {item.isSmart && <ThunderboltOutlined className="text-[9px]" aria-hidden="true" />}
              <span className="truncate">{item.shortLabel}</span>
            </span>
          </button>
        );
      })}
      <button
        type="button"
        onPointerDown={currentQuickActionSourceKey ? () => startLongPress('__more__') : undefined}
        onPointerUp={cancelLongPress}
        onPointerCancel={cancelLongPress}
        onPointerLeave={cancelLongPress}
        onContextMenu={
          currentQuickActionSourceKey
            ? (event) => {
                event.preventDefault();
                cancelLongPress();
                openQuickActions();
              }
            : undefined
        }
        onClick={() => {
          if (consumeSuppressedLongPressClick('__more__')) return;
          setCollapsed(false);
        }}
        className={`flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold transition ${
          isMoreActive || !collapsed
            ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/15'
            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
        }`}
        aria-label="Open more navigation"
        aria-description={
          currentQuickActionSourceKey
            ? `Press and hold for ${currentMobileNavigationItem?.label} actions`
            : undefined
        }
      >
        <span className="text-lg">
          <AppstoreOutlined />
        </span>
        <span>More</span>
      </button>
    </div>
  </div>
);

export default MobileBottomNav;

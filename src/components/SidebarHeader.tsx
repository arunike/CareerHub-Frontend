import type React from 'react';
import { Button, Tooltip } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined, CloseOutlined } from '@ant-design/icons';
import logo from '../assets/logo.png';
import logoWithText from '../assets/logo_with_text.png';

type Props = {
  isDesktopSidebarCollapsed: any;
  screens: any;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  toggleDesktopSidebar: () => void;
};

const SidebarHeader = ({
  isDesktopSidebarCollapsed,
  screens,
  setCollapsed,
  toggleDesktopSidebar,
}: Props) => (
  <div
    className={`relative shrink-0 border-b border-slate-200/70 transition-all duration-200 ${
      isDesktopSidebarCollapsed
        ? 'h-[72px] px-0 flex items-center justify-center'
        : 'h-[72px] px-5 py-3 flex items-center justify-between gap-3'
    }`}
  >
    {isDesktopSidebarCollapsed ? (
      screens.lg ? (
        <Tooltip title="Expand sidebar" placement="right">
          <button
            type="button"
            onClick={toggleDesktopSidebar}
            aria-label="Expand sidebar"
            className="group relative flex h-11 w-12 items-center justify-center rounded-xl border border-transparent transition-all duration-200 hover:border-slate-200/90 hover:bg-white hover:shadow-xs"
          >
            <img
              src={logo}
              alt="CareerHub"
              className="h-7 w-7 object-contain block mx-auto transition-transform duration-200 group-hover:scale-105"
            />
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-blue-600/90 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <MenuUnfoldOutlined style={{ fontSize: 16 }} />
            </div>
          </button>
        </Tooltip>
      ) : (
        <img src={logo} alt="CareerHub" className="h-7 w-7 object-contain block mx-auto" />
      )
    ) : (
      <>
        <img src={logoWithText} alt="CareerHub" className="h-10 object-contain" />
        {screens.lg ? (
          <Tooltip title="Collapse sidebar" placement="right">
            <Button
              type="text"
              icon={<MenuFoldOutlined />}
              onClick={toggleDesktopSidebar}
              aria-label="Collapse sidebar"
              className="!h-9 !w-9 !shrink-0 !rounded-xl !text-slate-400 hover:!text-blue-600 hover:!bg-blue-50"
            />
          </Tooltip>
        ) : (
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={() => setCollapsed(true)}
            aria-label="Close navigation"
            className="!h-11 !w-11 !text-gray-500 hover:!text-gray-700"
          />
        )}
      </>
    )}
  </div>
);

export default SidebarHeader;

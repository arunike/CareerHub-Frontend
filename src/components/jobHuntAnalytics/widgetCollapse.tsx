import { createContext, useContext } from 'react';
import { DownOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';

interface WidgetCollapse {
  collapsed: boolean;
  toggle: () => void;
}

// Context, not props: SectionCard sits eight widget components deep.
const WidgetCollapseContext = createContext<WidgetCollapse | null>(null);

export const WidgetCollapseProvider = ({
  collapsed,
  onToggle,
  children,
}: {
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
}) => (
  <WidgetCollapseContext.Provider value={{ collapsed, toggle: onToggle }}>
    {children}
  </WidgetCollapseContext.Provider>
);

// Null outside a dashboard, so a card rendered on its own keeps working with no toggle.
export const useWidgetCollapse = () => useContext(WidgetCollapseContext);

// Renders nothing outside a dashboard, so a card used on its own keeps its plain header.
export const WidgetCollapseToggle = ({ title }: { title: string }) => {
  const collapse = useWidgetCollapse();
  if (!collapse) return null;
  const { collapsed, toggle } = collapse;
  return (
    <button
      type="button"
      aria-expanded={!collapsed}
      aria-label={collapsed ? `Expand ${title}` : `Collapse ${title}`}
      onClick={toggle}
      // mr-9 keeps the drag handle's corner clear at every width.
      className="ml-auto mr-9 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
    >
      <DownOutlined
        className={`text-[11px] transition-transform ${collapsed ? '-rotate-90' : ''}`}
      />
    </button>
  );
};

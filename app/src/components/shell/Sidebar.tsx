import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAdminAccess } from '../../auth/AdminAccessProvider';
import { BrandMark } from './BrandMark';
import { PRIMARY_NAV, FOOTER_NAV, type NavItemData } from './navItems';

const SIDEBAR_COLLAPSED_KEY = 'blur.sidebarCollapsed';

function NavItem({ to, label, icon: Icon, end, collapsed }: NavItemData & { collapsed: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        [
          'group relative mx-2 flex items-center py-2 text-xs tracking-wide uppercase transition-colors',
          collapsed ? 'justify-center px-0' : 'gap-3 px-3',
          isActive ? 'bg-fg text-bg' : 'text-muted hover:text-fg',
        ].join(' ')
      }
      aria-label={collapsed ? label : undefined}
    >
      <Icon size={15} strokeWidth={1.5} />
      {!collapsed && <span>{label}</span>}
      {collapsed && (
        <span
          className={[
            'pointer-events-none absolute left-[calc(100%+0.5rem)] top-1/2 z-50 -translate-y-1/2 border border-line bg-surface px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-fg opacity-0 shadow-none',
            'transition-[opacity,transform] duration-150 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100',
          ].join(' ')}
        >
          {label}
        </span>
      )}
    </NavLink>
  );
}

function SidebarCollapseControl({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose;
  const label = collapsed ? 'Expand' : 'Collapse';

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`${label} sidebar`}
      className={[
        'group relative flex h-8 w-8 shrink-0 items-center justify-center border border-line text-muted transition-colors hover:border-fg hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
      ].join(' ')}
    >
      <Icon size={15} strokeWidth={1.5} />
      <span
        className={[
          'pointer-events-none absolute left-[calc(100%+0.5rem)] top-1/2 z-50 -translate-y-1/2 border border-line bg-surface px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-fg opacity-0 shadow-none',
          'transition-[opacity,transform] duration-150 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100',
        ].join(' ')}
      >
        {label}
      </span>
    </button>
  );
}

// Desktop navigation. Hidden on mobile, where BottomNav takes over.
export function Sidebar() {
  const { isAdmin } = useAdminAccess();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
  });
  const footer = FOOTER_NAV.filter((item) => !item.adminOnly || isAdmin);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
  }, [collapsed]);

  return (
    <aside
      className={[
        'hidden h-full shrink-0 flex-col border-r border-line bg-bg transition-[width] duration-200 ease-out lg:flex',
        collapsed ? 'w-16' : 'w-52',
      ].join(' ')}
    >
      <div
        className={[
          'flex items-center border-b border-line',
          collapsed ? 'h-20 flex-col justify-center gap-2 px-2' : 'h-14 justify-between px-4',
        ].join(' ')}
      >
        <BrandMark className={collapsed ? 'text-base' : ''} />
        <SidebarCollapseControl collapsed={collapsed} onToggle={() => setCollapsed((current) => !current)} />
      </div>

      <nav className="flex flex-col py-2">
        {PRIMARY_NAV.map((item) => (
          <NavItem key={item.to} {...item} collapsed={collapsed} />
        ))}
      </nav>

      {/* Footer: Admin (admins only) above Settings */}
      <div className="mt-auto border-t border-line py-2">
        <nav className="flex flex-col">
          {footer.map((item) => (
            <NavItem key={item.to} {...item} collapsed={collapsed} />
          ))}
        </nav>
      </div>
    </aside>
  );
}

import { NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/features/auth/useAuth';
import { IconHome, IconMenu, IconPackage, IconWallet } from './ui/Icons';

const mobileLinks = [
  { to: '/dashboard', label: 'Home', icon: IconHome },
  { to: '/transactions', label: 'Kas', icon: IconWallet },
  { to: '/stock', label: 'Stok', icon: IconPackage },
  { to: '/more', label: 'More', icon: IconMenu },
];

const desktopLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: IconHome },
  { to: '/transactions', label: 'Kas', icon: IconWallet },
  { to: '/stock', label: 'Stok', icon: IconPackage },
  { to: '/categories', label: 'Kategori', icon: IconMenu },
  { to: '/more', label: 'More', icon: IconMenu },
];

export function AppShell({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  const { profile } = useAuth();

  return (
    <div className="app-shell">
      <aside className="app-sidebar" aria-label="Navigasi desktop">
        <div className="app-sidebar__brand">KasFlow</div>
        {desktopLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => (isActive ? 'is-active' : undefined)}
          >
            <link.icon />
            <span>{link.label}</span>
          </NavLink>
        ))}
      </aside>

      <header className="app-header">
        <div>
          <p className="app-kicker">KasFlow</p>
          <h1>{title}</h1>
          <p className="app-user">{subtitle || profile?.name || profile?.email}</p>
        </div>
        <div className="app-header-actions">{action}</div>
      </header>

      <main className="app-main">{children}</main>

      <nav className="app-nav" aria-label="Navigasi utama">
        {mobileLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => (isActive ? 'app-nav-link is-active' : 'app-nav-link')}
          >
            <link.icon />
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

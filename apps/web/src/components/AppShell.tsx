import { NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/features/auth/useAuth';

const links = [
  { to: '/dashboard', label: 'Home' },
  { to: '/stock', label: 'Stok' },
  { to: '/transactions', label: 'Kas' },
  { to: '/categories', label: 'Kategori' },
];

export function AppShell({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  const { signOut, profile } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="app-kicker">KasFlow</p>
          <h1>{title}</h1>
          {profile?.name ? <p className="app-user">{profile.name}</p> : null}
        </div>
        <div className="app-header-actions">
          {action}
          <button type="button" className="link-button" onClick={() => void signOut()}>
            Logout
          </button>
        </div>
      </header>

      <main className="app-main">{children}</main>

      <nav className="app-nav" aria-label="Navigasi utama">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => (isActive ? 'app-nav-link is-active' : 'app-nav-link')}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

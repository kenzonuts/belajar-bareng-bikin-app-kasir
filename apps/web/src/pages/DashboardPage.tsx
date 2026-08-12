import { useState } from 'react';
import { useAuth } from '@/features/auth/useAuth';

export function DashboardPage() {
  const { profile, user, signOut } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const displayName = profile?.name || user?.email || 'User';

  async function onLogout() {
    setError(null);
    setLoggingOut(true);
    const result = await signOut();
    setLoggingOut(false);
    if (result.error) {
      setError(result.error);
    }
  }

  return (
    <main className="page">
      <section className="auth-card">
        <header className="auth-header">
          <p className="auth-brand">KasFlow</p>
          <p className="auth-subtitle">Dashboard</p>
        </header>

        <div className="dashboard-body">
          <p className="dashboard-success">Authenticated successfully.</p>
          <p className="dashboard-hello">Hello, {displayName}</p>
          {profile?.email ? <p className="dashboard-email">{profile.email}</p> : null}
        </div>

        {error ? (
          <p className="auth-error" role="alert">
            {error}
          </p>
        ) : null}

        <button className="auth-button auth-button--ghost" type="button" onClick={onLogout} disabled={loggingOut}>
          {loggingOut ? 'Keluar...' : 'Logout'}
        </button>
      </section>
    </main>
  );
}

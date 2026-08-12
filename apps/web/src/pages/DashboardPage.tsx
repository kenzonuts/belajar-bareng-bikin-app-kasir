import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { LoadingBlock } from '@/components/LoadingBlock';
import { useAuth } from '@/features/auth/useAuth';
import { apiRequest, ApiError } from '@/lib/api';
import { formatRp } from '@/lib/format';
import type { DashboardData } from '@/lib/types';

export function DashboardPage() {
  const { session } = useAuth();
  const token = session?.access_token ?? '';

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<DashboardData>('/dashboard', { token });
      setData(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal memuat dashboard.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AppShell title="Dashboard">
      {error ? (
        <p className="auth-error" role="alert">
          {error}
        </p>
      ) : null}

      {loading || !data ? (
        <LoadingBlock label="Loading dashboard..." />
      ) : (
        <div className="stack">
          <section className="stat-card stat-card--hero">
            <p className="muted">Saldo Kas</p>
            <p className="stat-value">{formatRp(data.balance)}</p>
          </section>

          <section className="stat-grid">
            <div className="stat-card">
              <p className="muted">Pemasukan</p>
              <p className="income">{formatRp(data.income)}</p>
            </div>
            <div className="stat-card">
              <p className="muted">Pengeluaran</p>
              <p className="expense">{formatRp(data.expense)}</p>
            </div>
          </section>

          <section className="group-section">
            <div className="section-head">
              <h2>⚠ Stok Menipis</h2>
              <Link to="/stock">Lihat</Link>
            </div>
            {data.lowStock.length === 0 ? (
              <p className="muted">Tidak ada stok menipis.</p>
            ) : (
              <ul className="list-cards">
                {data.lowStock.map((item) => (
                  <li key={item.id} className="list-card">
                    <Link to={`/stock/${item.id}`} className="list-card-link">
                      <strong>{item.name}</strong>
                      <p>
                        {item.quantity} {item.unit} tersisa
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="group-section">
            <div className="section-head">
              <h2>Transaksi Terakhir</h2>
              <Link to="/transactions">Lihat</Link>
            </div>
            {data.recentTransactions.length === 0 ? (
              <p className="muted">Belum ada transaksi.</p>
            ) : (
              <ul className="list-cards">
                {data.recentTransactions.map((txn) => (
                  <li key={txn.id} className="list-card">
                    <div>
                      <strong className={txn.type === 'INCOME' ? 'income' : 'expense'}>
                        {txn.type === 'INCOME' ? '+ ' : '- '}
                        {txn.description || (txn.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran')}
                      </strong>
                      <p className={txn.type === 'INCOME' ? 'income' : 'expense'}>
                        {formatRp(txn.amount)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </AppShell>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/Button';
import { Currency } from '@/components/ui/Currency';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/features/auth/useAuth';
import { apiRequest, ApiError } from '@/lib/api';
import { formatDateId } from '@/lib/format';
import type { DashboardData } from '@/lib/types';

export function DashboardPage() {
  const { session, profile } = useAuth();
  const token = session?.access_token ?? '';
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setData(await apiRequest<DashboardData>('/dashboard', { token }));
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
    <AppShell title="Selamat datang" subtitle={profile?.name || 'User'}>
      {loading ? <ListSkeleton count={4} /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {!loading && !error && data ? (
        <div className="ui-stack">
          <section className="ui-card stat-hero">
            <p className="ui-muted">Saldo Kas</p>
            <p className="stat-hero__value">
              <Currency value={data.balance} />
            </p>
            <p className="ui-muted">
              <span className="ui-income">
                + <Currency value={data.income} />
              </span>
              {' · '}
              <span className="ui-expense">
                - <Currency value={data.expense} />
              </span>
            </p>
          </section>

          <section className="stat-grid">
            <div className="ui-card ui-card--flat">
              <p className="ui-muted">Pemasukan</p>
              <p className="ui-income">
                <Currency value={data.income} />
              </p>
            </div>
            <div className="ui-card ui-card--flat">
              <p className="ui-muted">Pengeluaran</p>
              <p className="ui-expense">
                <Currency value={data.expense} />
              </p>
            </div>
          </section>

          <section className="quick-actions">
            <Button size="sm" onClick={() => navigate('/transactions?action=income')}>
              + Pemasukan
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate('/transactions?action=expense')}
            >
              - Pengeluaran
            </Button>
            <Button size="sm" variant="ghost" onClick={() => navigate('/stock?action=create')}>
              + Barang
            </Button>
          </section>

          <section className="ui-card">
            <div className="ui-row">
              <h2 className="ui-section-title">Stok Menipis</h2>
              <Link to="/stock">Lihat semua →</Link>
            </div>
            {data.lowStock.length === 0 ? (
              <p className="ui-muted">Tidak ada stok menipis.</p>
            ) : (
              <div className="ui-stack">
                {data.lowStock.map((item) => (
                  <Link key={item.id} to={`/stock/${item.id}`} className="list-item">
                    <div className="list-item__meta">
                      <span className="list-item__title">{item.name}</span>
                      <span className="ui-muted">
                        {item.quantity} {item.unit} tersisa
                      </span>
                    </div>
                    <span className="ui-badge ui-badge--warn">Menipis</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="ui-card">
            <div className="ui-row">
              <h2 className="ui-section-title">Transaksi Terakhir</h2>
              <Link to="/transactions">Lihat semua →</Link>
            </div>
            {data.recentTransactions.length === 0 ? (
              <EmptyState
                title="Belum ada transaksi"
                description="Catat pemasukan atau pengeluaran untuk mulai melihat aktivitas kas."
                action={
                  <Button onClick={() => navigate('/transactions?action=income')}>
                    + Tambah Transaksi
                  </Button>
                }
              />
            ) : (
              <div className="ui-stack">
                {data.recentTransactions.map((txn) => (
                  <div key={txn.id} className="list-item">
                    <div className="list-item__meta">
                      <span
                        className={`list-item__title ${txn.type === 'INCOME' ? 'ui-income' : 'ui-expense'}`}
                      >
                        ● {txn.description || (txn.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran')}
                      </span>
                      <span className="ui-muted">{formatDateId(txn.transactionDate)}</span>
                    </div>
                    <Currency
                      value={txn.amount}
                      signed={txn.type === 'INCOME' ? 'income' : 'expense'}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}

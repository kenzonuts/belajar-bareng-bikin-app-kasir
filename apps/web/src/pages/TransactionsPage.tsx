import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { AppShell } from '@/components/AppShell';
import { EmptyState } from '@/components/EmptyState';
import { LoadingBlock } from '@/components/LoadingBlock';
import { useAuth } from '@/features/auth/useAuth';
import { apiRequest, ApiError } from '@/lib/api';
import { formatDateId, formatRp, todayIsoDate } from '@/lib/format';
import type { Transaction } from '@/lib/types';

type Filter = 'ALL' | 'INCOME' | 'EXPENSE';
type Mode = 'list' | 'create' | 'edit';

export function TransactionsPage() {
  const { session } = useAuth();
  const token = session?.access_token ?? '';

  const [items, setItems] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('list');
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [transactionDate, setTransactionDate] = useState(todayIsoDate());

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const query = filter === 'ALL' ? '' : `?type=${filter}`;
      const res = await apiRequest<{ data: Transaction[] }>(`/transactions${query}`, { token });
      setItems(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal memuat transaksi.');
    } finally {
      setLoading(false);
    }
  }, [token, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const item of items) {
      const list = map.get(item.transactionDate) ?? [];
      list.push(item);
      map.set(item.transactionDate, list);
    }
    return [...map.entries()];
  }, [items]);

  function openCreate(nextType: 'INCOME' | 'EXPENSE' = 'INCOME') {
    setMode('create');
    setEditing(null);
    setType(nextType);
    setAmount('');
    setDescription('');
    setTransactionDate(todayIsoDate());
    setError(null);
  }

  function openEdit(txn: Transaction) {
    setMode('edit');
    setEditing(txn);
    setType(txn.type);
    setAmount(String(txn.amount));
    setDescription(txn.description ?? '');
    setTransactionDate(txn.transactionDate);
    setError(null);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      const body = {
        type,
        amount: Number(amount),
        description,
        transactionDate,
      };
      if (mode === 'create') {
        await apiRequest('/transactions', { method: 'POST', token, body });
      } else if (editing) {
        await apiRequest(`/transactions/${editing.id}`, { method: 'PATCH', token, body });
      }
      setMode('list');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal menyimpan transaksi.');
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(txn: Transaction) {
    if (!token) return;
    const label = txn.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran';
    const confirmed = window.confirm(`Hapus transaksi?\n\n${label}\n${formatRp(txn.amount)}`);
    if (!confirmed) return;
    try {
      await apiRequest(`/transactions/${txn.id}`, { method: 'DELETE', token });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal menghapus transaksi.');
    }
  }

  return (
    <AppShell
      title="Transaksi"
      action={
        mode === 'list' ? (
          <button type="button" className="link-button" onClick={() => openCreate('INCOME')}>
            + Catat
          </button>
        ) : null
      }
    >
      {error ? (
        <p className="auth-error" role="alert">
          {error}
        </p>
      ) : null}

      {mode !== 'list' ? (
        <form className="panel-form" onSubmit={onSubmit}>
          <h2>
            {mode === 'create'
              ? type === 'INCOME'
                ? 'Pemasukan'
                : 'Pengeluaran'
              : 'Edit Transaksi'}
          </h2>
          <label className="auth-field">
            <span>Tipe</span>
            <select value={type} onChange={(e) => setType(e.target.value as 'INCOME' | 'EXPENSE')}>
              <option value="INCOME">Pemasukan</option>
              <option value="EXPENSE">Pengeluaran</option>
            </select>
          </label>
          <label className="auth-field">
            <span>Nominal</span>
            <input
              type="number"
              min={1}
              step={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </label>
          <label className="auth-field">
            <span>Keterangan</span>
            <input value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <label className="auth-field">
            <span>Tanggal</span>
            <input
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              required
            />
          </label>
          <div className="button-row">
            <button
              type="button"
              className="auth-button auth-button--ghost"
              onClick={() => setMode('list')}
              disabled={submitting}
            >
              Batal
            </button>
            <button type="submit" className="auth-button" disabled={submitting}>
              {submitting
                ? 'Menyimpan...'
                : type === 'INCOME'
                  ? 'Simpan Pemasukan'
                  : 'Simpan Pengeluaran'}
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="filter-row">
            {(['ALL', 'INCOME', 'EXPENSE'] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={filter === value ? 'chip is-active' : 'chip'}
                onClick={() => setFilter(value)}
              >
                {value === 'ALL' ? 'Semua' : value === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'}
              </button>
            ))}
          </div>

          {loading ? (
            <LoadingBlock label="Loading transactions..." />
          ) : items.length === 0 ? (
            <EmptyState
              title="Belum ada transaksi."
              description="Catat pemasukan atau pengeluaran pertama kamu."
              actionLabel="+ Catat Transaksi"
              onAction={() => openCreate('INCOME')}
            />
          ) : (
            <div className="stack">
              {grouped.map(([date, rows]) => (
                <section key={date} className="group-section">
                  <h2>{formatDateId(date)}</h2>
                  <ul className="list-cards">
                    {rows.map((txn) => (
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
                        <div className="button-row">
                          <button type="button" className="link-button" onClick={() => openEdit(txn)}>
                            Edit
                          </button>
                          <button
                            type="button"
                            className="link-button danger"
                            onClick={() => void onDelete(txn)}
                          >
                            Hapus
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}

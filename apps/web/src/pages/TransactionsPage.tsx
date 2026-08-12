import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Currency } from '@/components/ui/Currency';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Field, TextInput, TextArea } from '@/components/ui/Field';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/features/auth/useAuth';
import { useToast } from '@/features/ui/ToastProvider';
import { apiRequest, ApiError } from '@/lib/api';
import { formatDateId, todayIsoDate } from '@/lib/format';
import type { Transaction } from '@/lib/types';

type Filter = 'ALL' | 'INCOME' | 'EXPENSE';

export function TransactionsPage() {
  const { session } = useAuth();
  const token = session?.access_token ?? '';
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();

  const [items, setItems] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
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

  useEffect(() => {
    const action = params.get('action');
    if (action === 'income' || action === 'expense') {
      openCreate(action === 'income' ? 'INCOME' : 'EXPENSE');
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

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
    setEditing(null);
    setType(nextType);
    setAmount('');
    setDescription('');
    setTransactionDate(todayIsoDate());
    setSheetOpen(true);
  }

  function openEdit(txn: Transaction) {
    setEditing(txn);
    setType(txn.type);
    setAmount(String(txn.amount));
    setDescription(txn.description ?? '');
    setTransactionDate(txn.transactionDate);
    setSheetOpen(true);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setSubmitting(true);
    try {
      const body = { type, amount: Number(amount), description, transactionDate };
      if (editing) {
        await apiRequest(`/transactions/${editing.id}`, { method: 'PATCH', token, body });
        toast('✓ Transaksi berhasil diperbarui');
      } else {
        await apiRequest('/transactions', { method: 'POST', token, body });
        toast('✓ Transaksi berhasil disimpan');
      }
      setSheetOpen(false);
      await load();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Gagal menyimpan transaksi.');
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete() {
    if (!token || !deleting) return;
    setSubmitting(true);
    try {
      await apiRequest(`/transactions/${deleting.id}`, { method: 'DELETE', token });
      toast('✓ Transaksi dihapus');
      setDeleting(null);
      await load();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Gagal menghapus transaksi.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell
      title="Kas"
      action={
        <Button size="sm" onClick={() => openCreate('INCOME')}>
          + Tambah
        </Button>
      }
    >
      <div className="ui-chip-row" role="tablist" aria-label="Filter transaksi">
        {([
          ['ALL', 'Semua'],
          ['INCOME', 'Pemasukan'],
          ['EXPENSE', 'Pengeluaran'],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={filter === value ? 'ui-chip is-active' : 'ui-chip'}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? <ListSkeleton count={4} /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

      {!loading && !error && items.length === 0 ? (
        <EmptyState
          title="Belum ada transaksi"
          description="Catat pemasukan atau pengeluaran untuk mulai melihat aktivitas kas."
          action={<Button onClick={() => openCreate('INCOME')}>+ Tambah Transaksi</Button>}
        />
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <div className="ui-stack">
          {grouped.map(([date, rows]) => (
            <section key={date} className="ui-stack">
              <h2 className="ui-muted">{formatDateId(date)}</h2>
              {rows.map((txn) => (
                <article key={txn.id} className="ui-card ui-stack">
                  <button type="button" className="list-item" onClick={() => openEdit(txn)}>
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
                  </button>
                  <div className="ui-row">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(txn)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleting(txn)}>
                      Hapus
                    </Button>
                  </div>
                </article>
              ))}
            </section>
          ))}
        </div>
      ) : null}

      <BottomSheet
        open={sheetOpen}
        title={editing ? 'Edit Transaksi' : 'Tambah Transaksi'}
        onClose={() => setSheetOpen(false)}
      >
        <form className="ui-stack" onSubmit={onSubmit}>
          <div className="segmented" role="group" aria-label="Jenis transaksi">
            <button
              type="button"
              className={type === 'INCOME' ? 'is-active' : undefined}
              onClick={() => setType('INCOME')}
            >
              Pemasukan
            </button>
            <button
              type="button"
              className={type === 'EXPENSE' ? 'is-active' : undefined}
              onClick={() => setType('EXPENSE')}
            >
              Pengeluaran
            </button>
          </div>
          <Field label="Nominal">
            <TextInput
              type="number"
              inputMode="decimal"
              min={1}
              step={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              placeholder="0"
            />
          </Field>
          <Field label="Keterangan">
            <TextArea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Penjualan hari ini"
            />
          </Field>
          <Field label="Tanggal">
            <TextInput
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              required
            />
          </Field>
          <Button type="submit" block disabled={submitting}>
            {submitting ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </form>
      </BottomSheet>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Hapus transaksi?"
        description="Tindakan ini tidak dapat dibatalkan."
        confirmLabel={submitting ? 'Menghapus...' : 'Hapus'}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void onDelete()}
      />
    </AppShell>
  );
}

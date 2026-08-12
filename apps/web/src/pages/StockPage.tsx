import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { EmptyState } from '@/components/EmptyState';
import { LoadingBlock } from '@/components/LoadingBlock';
import { useAuth } from '@/features/auth/useAuth';
import { apiRequest, ApiError } from '@/lib/api';
import type { Category, StockGroup } from '@/lib/types';

export function StockPage() {
  const { session } = useAuth();
  const token = session?.access_token ?? '';

  const [groups, setGroups] = useState<StockGroup[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [quantity, setQuantity] = useState('0');
  const [unit, setUnit] = useState('');
  const [price, setPrice] = useState('0');
  const [minimumStock, setMinimumStock] = useState('0');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [stockRes, categoryRes] = await Promise.all([
        apiRequest<{ data: StockGroup[] }>('/stock?grouped=1', { token }),
        apiRequest<{ data: Category[] }>('/categories', { token }),
      ]);
      setGroups(stockRes.data);
      setCategories(categoryRes.data);
      setCategoryId((current) => current || categoryRes.data[0]?.id || '');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal memuat stok.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalItems = groups.reduce((sum, group) => sum + group.items.length, 0);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiRequest('/stock', {
        method: 'POST',
        token,
        body: {
          name,
          categoryId,
          quantity: Number(quantity),
          unit,
          price: Number(price),
          minimumStock: Number(minimumStock),
        },
      });
      setShowForm(false);
      setName('');
      setQuantity('0');
      setUnit('');
      setPrice('0');
      setMinimumStock('0');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal menambah barang.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell
      title="Stok"
      action={
        <button type="button" className="link-button" onClick={() => setShowForm(true)}>
          + Tambah
        </button>
      }
    >
      {error ? (
        <p className="auth-error" role="alert">
          {error}
        </p>
      ) : null}

      {showForm ? (
        <form className="panel-form" onSubmit={onCreate}>
          <h2>Tambah Barang</h2>
          <label className="auth-field">
            <span>Nama Barang</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="auth-field">
            <span>Kategori</span>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
              <option value="" disabled>
                Pilih kategori
              </option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="auth-field">
            <span>Jumlah Awal</span>
            <input
              type="number"
              min={0}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </label>
          <label className="auth-field">
            <span>Satuan</span>
            <input value={unit} onChange={(e) => setUnit(e.target.value)} required />
          </label>
          <label className="auth-field">
            <span>Harga</span>
            <input
              type="number"
              min={0}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </label>
          <label className="auth-field">
            <span>Minimum Stok</span>
            <input
              type="number"
              min={0}
              value={minimumStock}
              onChange={(e) => setMinimumStock(e.target.value)}
              required
            />
          </label>
          <div className="button-row">
            <button
              type="button"
              className="auth-button auth-button--ghost"
              onClick={() => setShowForm(false)}
              disabled={submitting}
            >
              Batal
            </button>
            <button type="submit" className="auth-button" disabled={submitting || categories.length === 0}>
              {submitting ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
          {categories.length === 0 ? (
            <p className="muted">Buat kategori dulu sebelum menambah barang.</p>
          ) : null}
        </form>
      ) : null}

      {loading ? (
        <LoadingBlock label="Loading stock..." />
      ) : totalItems === 0 && !showForm ? (
        <EmptyState
          title="Belum ada barang."
          description="Tambahkan barang pertama."
          actionLabel="+ Tambah Barang"
          onAction={() => setShowForm(true)}
        />
      ) : (
        <div className="stack">
          {groups.map((group) =>
            group.items.length === 0 ? null : (
              <section key={group.id} className="group-section">
                <h2>{group.name}</h2>
                <ul className="list-cards">
                  {group.items.map((item) => (
                    <li key={item.id} className="list-card">
                      <Link to={`/stock/${item.id}`} className="list-card-link">
                        <strong>
                          {item.name}
                          {item.isLowStock ? <span className="badge-warn"> LOW</span> : null}
                        </strong>
                        <p>
                          {item.quantity} {item.unit}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ),
          )}
        </div>
      )}
    </AppShell>
  );
}

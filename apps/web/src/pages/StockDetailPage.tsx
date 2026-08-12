import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { LoadingBlock } from '@/components/LoadingBlock';
import { useAuth } from '@/features/auth/useAuth';
import { apiRequest, ApiError } from '@/lib/api';
import { formatRp } from '@/lib/format';
import type { Category, StockItem } from '@/lib/types';

type AdjustMode = 'increase' | 'decrease' | null;

export function StockDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const token = session?.access_token ?? '';

  const [item, setItem] = useState<StockItem | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adjustMode, setAdjustMode] = useState<AdjustMode>(null);
  const [amount, setAmount] = useState('1');
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [unit, setUnit] = useState('');
  const [price, setPrice] = useState('0');
  const [minimumStock, setMinimumStock] = useState('0');

  const load = useCallback(async () => {
    if (!token || !id) return;
    setLoading(true);
    setError(null);
    try {
      const [stockRes, categoryRes] = await Promise.all([
        apiRequest<{ data: StockItem }>(`/stock/${id}`, { token }),
        apiRequest<{ data: Category[] }>('/categories', { token }),
      ]);
      setItem(stockRes.data);
      setCategories(categoryRes.data);
      setName(stockRes.data.name);
      setCategoryId(stockRes.data.categoryId);
      setUnit(stockRes.data.unit);
      setPrice(String(stockRes.data.price));
      setMinimumStock(String(stockRes.data.minimumStock));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal memuat barang.');
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onAdjust(event: FormEvent) {
    event.preventDefault();
    if (!token || !id || !adjustMode) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiRequest<{ data: StockItem }>(`/stock/${id}/${adjustMode}`, {
        method: 'POST',
        token,
        body: { amount: Number(amount) },
      });
      setItem(res.data);
      setAdjustMode(null);
      setAmount('1');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal menyesuaikan stok.');
    } finally {
      setSubmitting(false);
    }
  }

  async function onSaveEdit(event: FormEvent) {
    event.preventDefault();
    if (!token || !id) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiRequest<{ data: StockItem }>(`/stock/${id}`, {
        method: 'PATCH',
        token,
        body: {
          name,
          categoryId,
          unit,
          price: Number(price),
          minimumStock: Number(minimumStock),
        },
      });
      setItem(res.data);
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal memperbarui barang.');
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete() {
    if (!token || !id || !item) return;
    const confirmed = window.confirm(`Hapus barang "${item.name}"?`);
    if (!confirmed) return;
    try {
      await apiRequest(`/stock/${id}`, { method: 'DELETE', token });
      navigate('/stock');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal menghapus barang.');
    }
  }

  return (
    <AppShell
      title="Detail Stok"
      action={
        <Link to="/stock" className="link-button">
          Kembali
        </Link>
      }
    >
      {error ? (
        <p className="auth-error" role="alert">
          {error}
        </p>
      ) : null}

      {loading || !item ? (
        <LoadingBlock label="Loading stock..." />
      ) : editing ? (
        <form className="panel-form" onSubmit={onSaveEdit}>
          <h2>Edit Barang</h2>
          <label className="auth-field">
            <span>Nama</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="auth-field">
            <span>Kategori</span>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
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
              onClick={() => setEditing(false)}
              disabled={submitting}
            >
              Batal
            </button>
            <button type="submit" className="auth-button" disabled={submitting}>
              {submitting ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      ) : adjustMode ? (
        <form className="panel-form" onSubmit={onAdjust}>
          <h2>{adjustMode === 'increase' ? '+ Tambah Stok' : '- Kurangi Stok'}</h2>
          <p>
            {item.name}: {item.quantity} {item.unit}
          </p>
          <label className="auth-field">
            <span>Jumlah</span>
            <input
              type="number"
              min={1}
              step={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </label>
          <div className="button-row">
            <button
              type="button"
              className="auth-button auth-button--ghost"
              onClick={() => setAdjustMode(null)}
              disabled={submitting}
            >
              Batal
            </button>
            <button type="submit" className="auth-button" disabled={submitting}>
              {submitting ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      ) : (
        <section className="detail-card">
          <h2>
            {item.name}
            {item.isLowStock ? <span className="badge-warn"> LOW STOCK</span> : null}
          </h2>
          <p className="detail-qty">
            {item.quantity} {item.unit}
          </p>
          <dl className="detail-grid">
            <div>
              <dt>Harga</dt>
              <dd>{formatRp(item.price)}</dd>
            </div>
            <div>
              <dt>Minimum Stok</dt>
              <dd>
                {item.minimumStock} {item.unit}
              </dd>
            </div>
            <div>
              <dt>Kategori</dt>
              <dd>{item.categoryName}</dd>
            </div>
          </dl>

          <div className="button-row wrap">
            <button type="button" className="auth-button" onClick={() => setAdjustMode('decrease')}>
              - Kurangi Stok
            </button>
            <button type="button" className="auth-button" onClick={() => setAdjustMode('increase')}>
              + Tambah Stok
            </button>
          </div>
          <div className="button-row wrap">
            <button type="button" className="auth-button auth-button--ghost" onClick={() => setEditing(true)}>
              Edit Barang
            </button>
            <button type="button" className="auth-button auth-button--ghost danger" onClick={() => void onDelete()}>
              Hapus Barang
            </button>
          </div>
        </section>
      )}
    </AppShell>
  );
}

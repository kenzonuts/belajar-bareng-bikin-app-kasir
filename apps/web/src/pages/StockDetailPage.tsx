import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Currency } from '@/components/ui/Currency';
import { ErrorState } from '@/components/ui/ErrorState';
import { Field, TextInput, TextSelect } from '@/components/ui/Field';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/features/auth/useAuth';
import { useToast } from '@/features/ui/useToast';
import { apiRequest, ApiError } from '@/lib/api';
import type { Category, StockItem } from '@/lib/types';

type SheetMode = 'increase' | 'decrease' | 'edit' | null;

export function StockDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const token = session?.access_token ?? '';
  const { toast } = useToast();

  const [item, setItem] = useState<StockItem | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const [amount, setAmount] = useState('1');
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  const previewQty = useMemo(() => {
    if (!item) return 0;
    const n = Number(amount) || 0;
    return sheetMode === 'increase' ? item.quantity + n : item.quantity - n;
  }, [item, amount, sheetMode]);

  async function onAdjust(event: FormEvent) {
    event.preventDefault();
    if (!token || !id || (sheetMode !== 'increase' && sheetMode !== 'decrease')) return;
    setSubmitting(true);
    try {
      const res = await apiRequest<{ data: StockItem }>(`/stock/${id}/${sheetMode}`, {
        method: 'POST',
        token,
        body: { amount: Number(amount) },
      });
      setItem(res.data);
      setSheetMode(null);
      setAmount('1');
      toast('✓ Stok berhasil diperbarui');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Gagal menyesuaikan stok.');
    } finally {
      setSubmitting(false);
    }
  }

  async function onSaveEdit(event: FormEvent) {
    event.preventDefault();
    if (!token || !id) return;
    setSubmitting(true);
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
      setSheetMode(null);
      toast('✓ Barang berhasil diperbarui');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Gagal memperbarui barang.');
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete() {
    if (!token || !id) return;
    setSubmitting(true);
    try {
      await apiRequest(`/stock/${id}`, { method: 'DELETE', token });
      toast('✓ Barang dihapus');
      navigate('/stock');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Gagal menghapus barang.');
      setSubmitting(false);
    }
  }

  return (
    <AppShell
      title="Detail Stok"
      action={
        <Link to="/stock" className="ui-btn ui-btn--ghost ui-btn--sm">
          Kembali
        </Link>
      }
    >
      {loading ? <ListSkeleton count={3} /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

      {!loading && !error && item ? (
        <section className="ui-card ui-stack">
          <div>
            <h2 className="ui-section-title">{item.name}</h2>
            {item.isLowStock ? <span className="ui-badge ui-badge--warn">⚠ Stok menipis</span> : null}
          </div>
          <p className="stat-hero__value">
            {item.quantity} <span className="ui-muted" style={{ fontSize: '1rem' }}>{item.unit}</span>
          </p>
          <div className="ui-stack">
            <div>
              <p className="ui-muted">Kategori</p>
              <p>{item.categoryName}</p>
            </div>
            <div>
              <p className="ui-muted">Harga</p>
              <p>
                <Currency value={item.price} />
              </p>
            </div>
            <div>
              <p className="ui-muted">Minimum stok</p>
              <p>
                {item.minimumStock} {item.unit}
              </p>
            </div>
          </div>
          <Button block onClick={() => { setSheetMode('increase'); setAmount('1'); }}>
            Tambah Stok
          </Button>
          <Button
            block
            variant="secondary"
            onClick={() => {
              setSheetMode('decrease');
              setAmount('1');
            }}
          >
            Kurangi Stok
          </Button>
          <div className="ui-row">
            <Button variant="ghost" onClick={() => setSheetMode('edit')}>
              Edit
            </Button>
            <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
              Hapus
            </Button>
          </div>
        </section>
      ) : null}

      <BottomSheet
        open={sheetMode === 'increase' || sheetMode === 'decrease'}
        title={sheetMode === 'increase' ? 'Tambah Stok' : 'Kurangi Stok'}
        onClose={() => setSheetMode(null)}
      >
        {item ? (
          <form className="ui-stack" onSubmit={onAdjust}>
            <div>
              <p className="list-item__title">{item.name}</p>
              <p className="ui-muted">
                Stok sekarang: {item.quantity} {item.unit}
              </p>
            </div>
            <Field label="Jumlah">
              <TextInput
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </Field>
            <p className="ui-muted">
              Stok setelah perubahan: {previewQty} {item.unit}
            </p>
            {sheetMode === 'decrease' && previewQty < 0 ? (
              <p className="auth-error">Stok tidak mencukupi.</p>
            ) : null}
            <Button type="submit" block disabled={submitting || previewQty < 0}>
              {submitting ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </form>
        ) : null}
      </BottomSheet>

      <BottomSheet open={sheetMode === 'edit'} title="Edit Barang" onClose={() => setSheetMode(null)}>
        <form className="ui-stack" onSubmit={onSaveEdit}>
          <Field label="Nama">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Kategori">
            <TextSelect value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </TextSelect>
          </Field>
          <Field label="Satuan">
            <TextInput value={unit} onChange={(e) => setUnit(e.target.value)} required />
          </Field>
          <Field label="Harga">
            <TextInput
              type="number"
              inputMode="decimal"
              min={0}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </Field>
          <Field label="Minimum Stok">
            <TextInput
              type="number"
              inputMode="numeric"
              min={0}
              value={minimumStock}
              onChange={(e) => setMinimumStock(e.target.value)}
              required
            />
          </Field>
          <Button type="submit" block disabled={submitting}>
            {submitting ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </form>
      </BottomSheet>

      <ConfirmDialog
        open={confirmDelete}
        title="Hapus barang?"
        description="Tindakan ini tidak dapat dibatalkan."
        confirmLabel={submitting ? 'Menghapus...' : 'Hapus'}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void onDelete()}
      />
    </AppShell>
  );
}

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Currency } from '@/components/ui/Currency';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Field, TextInput, TextSelect } from '@/components/ui/Field';
import { IconSearch } from '@/components/ui/Icons';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/features/auth/useAuth';
import { useToast } from '@/features/ui/useToast';
import { apiRequest, ApiError } from '@/lib/api';
import type { Category, StockGroup, StockItem } from '@/lib/types';

export function StockPage() {
  const { session } = useAuth();
  const token = session?.access_token ?? '';
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();

  const [groups, setGroups] = useState<StockGroup[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sheetOpen, setSheetOpen] = useState(false);
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

  useEffect(() => {
    if (params.get('action') === 'create') {
      setSheetOpen(true);
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups
      .filter((group) => categoryFilter === 'ALL' || group.id === categoryFilter)
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          if (!q) return true;
          return (
            item.name.toLowerCase().includes(q) ||
            (item.categoryName ?? '').toLowerCase().includes(q)
          );
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, query, categoryFilter]);

  const totalItems = groups.reduce((sum, group) => sum + group.items.length, 0);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setSubmitting(true);
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
      toast('✓ Barang berhasil ditambahkan');
      setSheetOpen(false);
      setName('');
      setQuantity('0');
      setUnit('');
      setPrice('0');
      setMinimumStock('0');
      await load();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Gagal menambah barang.');
    } finally {
      setSubmitting(false);
    }
  }

  async function quickAdjust(item: StockItem, direction: 'increase' | 'decrease') {
    if (!token) return;
    try {
      await apiRequest(`/stock/${item.id}/${direction}`, {
        method: 'POST',
        token,
        body: { amount: 1 },
      });
      toast(direction === 'increase' ? '✓ Stok ditambah' : '✓ Stok dikurangi');
      await load();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Gagal menyesuaikan stok.');
    }
  }

  return (
    <AppShell
      title="Stok"
      action={
        <Button size="sm" onClick={() => setSheetOpen(true)}>
          + Tambah
        </Button>
      }
    >
      <div className="search-field">
        <IconSearch />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari barang..."
          aria-label="Cari barang"
        />
      </div>

      <div className="ui-chip-row" role="tablist" aria-label="Filter kategori">
        <button
          type="button"
          className={categoryFilter === 'ALL' ? 'ui-chip is-active' : 'ui-chip'}
          onClick={() => setCategoryFilter('ALL')}
        >
          Semua
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            className={categoryFilter === category.id ? 'ui-chip is-active' : 'ui-chip'}
            onClick={() => setCategoryFilter(category.id)}
          >
            {category.name}
          </button>
        ))}
      </div>

      {loading ? <ListSkeleton count={4} /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

      {!loading && !error && totalItems === 0 ? (
        <EmptyState
          title="Belum ada barang"
          description="Tambahkan barang pertama untuk mulai mengelola stok."
          action={<Button onClick={() => setSheetOpen(true)}>+ Tambah Barang</Button>}
        />
      ) : null}

      {!loading && !error && totalItems > 0 && filtered.length === 0 ? (
        <EmptyState title="Tidak ditemukan" description="Coba ubah kata kunci atau filter kategori." />
      ) : null}

      {!loading && !error ? (
        <div className="ui-stack">
          {filtered.map((group) => (
            <section key={group.id} className="ui-stack">
              <h2 className="ui-section-title">{group.name}</h2>
              {group.items.map((item) => (
                <article key={item.id} className="ui-card stock-card">
                  <Link to={`/stock/${item.id}`} className="list-item">
                    <div className="list-item__meta">
                      <span className="list-item__title">{item.name}</span>
                      <span className="ui-muted">{item.categoryName}</span>
                      <span>
                        {item.quantity} {item.unit}
                      </span>
                      <Currency value={item.price} />
                    </div>
                    {item.isLowStock ? <span className="ui-badge ui-badge--warn">⚠ Menipis</span> : null}
                  </Link>
                  <div className="stock-card__actions">
                    <button
                      type="button"
                      className="ui-icon-btn"
                      aria-label={`Kurangi ${item.name}`}
                      onClick={() => void quickAdjust(item, 'decrease')}
                    >
                      -
                    </button>
                    <button
                      type="button"
                      className="ui-icon-btn"
                      aria-label={`Tambah ${item.name}`}
                      onClick={() => void quickAdjust(item, 'increase')}
                    >
                      +
                    </button>
                  </div>
                </article>
              ))}
            </section>
          ))}
        </div>
      ) : null}

      <BottomSheet open={sheetOpen} title="Tambah Barang" onClose={() => setSheetOpen(false)}>
        <form className="ui-stack" onSubmit={onCreate}>
          <Field label="Nama Barang">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Kategori">
            <TextSelect value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
              <option value="" disabled>
                Pilih kategori
              </option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </TextSelect>
          </Field>
          <Field label="Jumlah Awal">
            <TextInput
              type="number"
              inputMode="numeric"
              min={0}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
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
          <Button type="submit" block disabled={submitting || categories.length === 0}>
            {submitting ? 'Menyimpan...' : 'Simpan'}
          </Button>
          {categories.length === 0 ? (
            <p className="ui-muted">Buat kategori dulu di menu More → Kategori.</p>
          ) : null}
        </form>
      </BottomSheet>
    </AppShell>
  );
}

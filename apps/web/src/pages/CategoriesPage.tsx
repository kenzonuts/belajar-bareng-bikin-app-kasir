import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { AppShell } from '@/components/AppShell';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Field, TextInput, TextArea } from '@/components/ui/Field';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/features/auth/useAuth';
import { useToast } from '@/features/ui/ToastProvider';
import { apiRequest, ApiError } from '@/lib/api';
import type { Category } from '@/lib/types';

export function CategoriesPage() {
  const { session } = useAuth();
  const token = session?.access_token ?? '';
  const { toast } = useToast();

  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ data: Category[] }>('/categories', { token });
      setItems(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal memuat kategori.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setName('');
    setDescription('');
    setSheetOpen(true);
  }

  function openEdit(category: Category) {
    setEditing(category);
    setName(category.name);
    setDescription(category.description ?? '');
    setSheetOpen(true);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setSubmitting(true);
    try {
      if (editing) {
        await apiRequest(`/categories/${editing.id}`, {
          method: 'PATCH',
          token,
          body: { name, description },
        });
        toast('✓ Kategori berhasil diperbarui');
      } else {
        await apiRequest('/categories', {
          method: 'POST',
          token,
          body: { name, description },
        });
        toast('✓ Kategori berhasil dibuat');
      }
      setSheetOpen(false);
      await load();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Gagal menyimpan kategori.');
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete() {
    if (!token || !deleting) return;
    setSubmitting(true);
    try {
      await apiRequest(`/categories/${deleting.id}`, { method: 'DELETE', token });
      toast('✓ Kategori dihapus');
      setDeleting(null);
      await load();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Gagal menghapus kategori.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell
      title="Kategori"
      action={
        <Button size="sm" onClick={openCreate}>
          + Tambah
        </Button>
      }
    >
      {loading ? <ListSkeleton count={3} /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

      {!loading && !error && items.length === 0 ? (
        <EmptyState
          title="Belum ada kategori"
          description="Buat kategori pertama untuk mulai mengelola stok."
          action={<Button onClick={openCreate}>+ Tambah Kategori</Button>}
        />
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <div className="ui-stack">
          {items.map((item) => (
            <article key={item.id} className="ui-card">
              <div className="list-item">
                <div className="list-item__meta">
                  <span className="list-item__title">{item.name}</span>
                  <span className="ui-muted">{item.itemCount} barang</span>
                  {item.description ? <span className="ui-muted">{item.description}</span> : null}
                </div>
              </div>
              <div className="ui-row" style={{ marginTop: '0.75rem' }}>
                <Button size="sm" variant="ghost" onClick={() => openEdit(item)}>
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDeleting(item)}>
                  Hapus
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      <BottomSheet
        open={sheetOpen}
        title={editing ? 'Edit Kategori' : 'Tambah Kategori'}
        onClose={() => setSheetOpen(false)}
      >
        <form className="ui-stack" onSubmit={onSubmit}>
          <Field label="Nama">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Deskripsi">
            <TextArea value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <Button type="submit" block disabled={submitting}>
            {submitting ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </form>
      </BottomSheet>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Hapus kategori?"
        description={
          deleting
            ? deleting.itemCount > 0
              ? `Kategori "${deleting.name}" masih memiliki ${deleting.itemCount} barang. Hapus atau pindahkan barang terlebih dahulu.`
              : 'Tindakan ini tidak dapat dibatalkan.'
            : ''
        }
        confirmLabel={submitting ? 'Menghapus...' : 'Hapus'}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void onDelete()}
      />
    </AppShell>
  );
}

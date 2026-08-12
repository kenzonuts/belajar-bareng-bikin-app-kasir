import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { AppShell } from '@/components/AppShell';
import { EmptyState } from '@/components/EmptyState';
import { LoadingBlock } from '@/components/LoadingBlock';
import { useAuth } from '@/features/auth/useAuth';
import { apiRequest, ApiError } from '@/lib/api';
import type { Category } from '@/lib/types';

type Mode = 'list' | 'create' | 'edit';

export function CategoriesPage() {
  const { session } = useAuth();
  const token = session?.access_token ?? '';

  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('list');
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
    setMode('create');
    setEditing(null);
    setName('');
    setDescription('');
    setError(null);
  }

  function openEdit(category: Category) {
    setMode('edit');
    setEditing(category);
    setName(category.name);
    setDescription(category.description ?? '');
    setError(null);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      if (mode === 'create') {
        await apiRequest('/categories', {
          method: 'POST',
          token,
          body: { name, description },
        });
      } else if (editing) {
        await apiRequest(`/categories/${editing.id}`, {
          method: 'PATCH',
          token,
          body: { name, description },
        });
      }
      setMode('list');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal menyimpan kategori.');
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(category: Category) {
    if (!token) return;
    const confirmed = window.confirm(`Hapus kategori "${category.name}"?`);
    if (!confirmed) return;

    setError(null);
    try {
      await apiRequest(`/categories/${category.id}`, { method: 'DELETE', token });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal menghapus kategori.');
    }
  }

  return (
    <AppShell
      title="Kategori"
      action={
        mode === 'list' ? (
          <button type="button" className="link-button" onClick={openCreate}>
            + Tambah
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
          <h2>{mode === 'create' ? 'Tambah Kategori' : 'Edit Kategori'}</h2>
          <label className="auth-field">
            <span>Nama Kategori</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="auth-field">
            <span>Deskripsi</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
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
              {submitting ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      ) : loading ? (
        <LoadingBlock label="Loading categories..." />
      ) : items.length === 0 ? (
        <EmptyState
          title="Belum ada kategori."
          description="Buat kategori pertama untuk mulai mengelola stok."
          actionLabel="+ Tambah Kategori"
          onAction={openCreate}
        />
      ) : (
        <ul className="list-cards">
          {items.map((item) => (
            <li key={item.id} className="list-card">
              <div>
                <strong>{item.name}</strong>
                <p>{item.itemCount} barang</p>
                {item.description ? <p className="muted">{item.description}</p> : null}
              </div>
              <div className="button-row">
                <button type="button" className="link-button" onClick={() => openEdit(item)}>
                  Edit
                </button>
                <button type="button" className="link-button danger" onClick={() => void onDelete(item)}>
                  Hapus
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}

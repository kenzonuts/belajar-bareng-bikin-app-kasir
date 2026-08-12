import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAuth } from '@/features/auth/useAuth';
import { useToast } from '@/features/ui/ToastProvider';

export function MorePage() {
  const { profile, user, signOut } = useAuth();
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleLogout() {
    setBusy(true);
    const result = await signOut();
    setBusy(false);
    setConfirmOpen(false);
    if (result.error) {
      toast(result.error);
    }
  }

  return (
    <AppShell title="More" subtitle="Akun & pengaturan">
      <section className="ui-card">
        <p className="ui-muted">Profile</p>
        <h2 className="ui-section-title">{profile?.name || 'Pengguna'}</h2>
        <p className="ui-muted">{profile?.email || user?.email}</p>
      </section>

      <section className="more-list">
        <Link className="more-item" to="/categories">
          <span>Kategori</span>
          <span aria-hidden>→</span>
        </Link>
        <div className="more-item" aria-disabled="true">
          <span>Pengaturan</span>
          <span className="ui-muted">Segera</span>
        </div>
        <div className="more-item" aria-disabled="true">
          <span>Tentang</span>
          <span className="ui-muted">KasFlow</span>
        </div>
        <button
          type="button"
          className="more-item more-item--danger"
          onClick={() => setConfirmOpen(true)}
          disabled={busy}
        >
          Keluar
        </button>
      </section>

      <ConfirmDialog
        open={confirmOpen}
        title="Apakah kamu yakin ingin keluar?"
        description="Sesi aktif akan diakhiri dari perangkat ini."
        confirmLabel={busy ? 'Keluar...' : 'Keluar'}
        cancelLabel="Batal"
        danger
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void handleLogout()}
      />
    </AppShell>
  );
}


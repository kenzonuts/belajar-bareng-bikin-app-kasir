import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Field, TextInput } from '@/components/ui/Field';
import { useAuth } from '@/features/auth/useAuth';

export function RegisterPage() {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInfo(null);

    if (!name.trim()) {
      setError('Nama wajib diisi.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Email tidak valid.');
      return;
    }
    if (!password) {
      setError('Password wajib diisi.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Password dan konfirmasi password harus sama.');
      return;
    }
    if (password.length < 6) {
      setError('Password minimal 6 karakter.');
      return;
    }

    setSubmitting(true);
    const result = await signUp(name.trim(), email.trim(), password);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.needsEmailConfirmation) {
      setInfo('Akun berhasil dibuat. Silakan verifikasi email sebelum masuk.');
    }
  }

  return (
    <main className="page">
      <section className="auth-card">
        <header className="auth-header">
          <p className="auth-brand">Buat Akun</p>
          <p className="auth-subtitle">Daftar untuk mulai memakai KasFlow</p>
        </header>

        <form className="auth-form" onSubmit={onSubmit} noValidate>
          <Field label="Nama">
            <TextInput
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama lengkap"
              required
            />
          </Field>
          <Field label="Email">
            <TextInput
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              required
            />
          </Field>
          <Field label="Password">
            <TextInput
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              required
            />
          </Field>
          <Field label="Konfirmasi Password">
            <TextInput
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ulangi password"
              required
            />
          </Field>
          {error ? (
            <p className="auth-error" role="alert">
              {error}
            </p>
          ) : null}
          {info ? (
            <p className="auth-info" role="status">
              {info}
            </p>
          ) : null}
          <Button type="submit" block disabled={submitting}>
            {submitting ? 'Mendaftar...' : 'Daftar'}
          </Button>
        </form>

        <p className="auth-footer">
          Sudah punya akun? <Link to="/login">Masuk</Link>
        </p>
      </section>
    </main>
  );
}

export function AuthLoadingScreen() {
  return (
    <main className="page">
      <section className="auth-card auth-card--loading" aria-busy="true" aria-live="polite">
        <p className="auth-brand">KasFlow</p>
        <p className="auth-loading-text">Checking session...</p>
      </section>
    </main>
  );
}

import '@fontsource-variable/dm-sans';
import '@fontsource-variable/manrope';
import '@flowstack-ui/brick/reset.css';
import '@flowstack-ui/brick/styles.css';
import { Component, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import './landing.css';
class ErrorBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <main className="public-page">
        <h1>Let’s get Gamegift back.</h1>
        <p>Something unexpected happened. Reload to reopen Gamegift.</p>
        <button onClick={() => location.reload()}>Reload Gamegift</button>
        <button
          onClick={() => {
            localStorage.removeItem('game-gift-draft-v2');
            location.reload();
          }}
        >
          Reset local guest draft
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
async function boot() {
  const landing = location.pathname === '/';
  if (location.pathname === '/studio') {
    document.title = 'Gamegift Studio – Build Your Personalized Game';
    document.querySelector('meta[name="robots"]')?.setAttribute('content', 'noindex, nofollow');
  }
  if (!landing) {
    const { configureSupabase } = await import('./auth');
    try {
      const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
      const response = await fetch(`${apiBase}/api/config`);
      if (response.ok) {
        const config = await response.json();
        if (config.authProvider === 'supabase')
          configureSupabase(config.supabaseUrl, config.supabaseAnonKey, config.authRedirectUrl);
      }
    } catch {
      // Studio retains its offline guest-draft behavior when the API is unavailable.
    }
  }
  const [{ default: App }] = await Promise.all([
    landing ? import('./Landing') : import('./Studio'),
    landing ? Promise.resolve() : import('./studio.css'),
  ]);
  createRoot(document.getElementById('root')!).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>,
  );
}

void boot();

import '@fontsource-variable/dm-sans';
import '@fontsource-variable/manrope';
import { Component, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeAnalytics, track } from './analytics';
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
  const marketingPaths = new Set([
    '/',
    '/personalized-game-gift',
    '/birthday-game-gift',
    '/game-for-girlfriend',
    '/game-for-boyfriend',
    '/anniversary-game-gift',
    '/personalized-digital-gift',
    '/examples',
    '/about',
    '/contact',
    '/privacy',
    '/terms',
  ]);
  const normalizedPath = location.pathname.replace(/\/$/, '') || '/';
  const landing = marketingPaths.has(normalizedPath);
  void initializeAnalytics().then(() => {
    if (landing) track('seo_landing_view', { path: normalizedPath });
  });
  document.addEventListener('click', (event) => {
    const link = (event.target as Element).closest<HTMLElement>('[data-analytics]');
    const name = link?.dataset.analytics;
    if (name === 'create_game_clicked') track(name, { path: normalizedPath });
    if (name === 'example_viewed') track(name, { path: normalizedPath });
  });
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
    normalizedPath === '/'
      ? import('./Landing')
      : landing
        ? import('./MarketingPage').then(({ MarketingRoute }) => ({ default: MarketingRoute }))
        : import('./Studio'),
    landing ? Promise.resolve() : import('./studio.css'),
  ]);
  const root = document.getElementById('root')!;
  createRoot(root).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>,
  );
  requestAnimationFrame(() => root.removeAttribute('data-prerendered'));
}

void boot();

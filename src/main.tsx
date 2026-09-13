import '@fontsource-variable/dm-sans';
import '@fontsource-variable/manrope';
import { Component, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
class ErrorBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <main className="public-page">
        <h1>Let’s get your studio back.</h1>
        <p>Something unexpected happened. Reload to reopen the studio.</p>
        <button onClick={() => location.reload()}>Reload studio</button>
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
createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);

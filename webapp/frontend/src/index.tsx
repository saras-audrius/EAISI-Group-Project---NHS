import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error;
      return (
        <div style={{ padding: '2rem', fontFamily: 'Arial', background: '#FBE3E4', minHeight: '100vh' }}>
          <div style={{ background: '#003087', color: 'white', padding: '1rem 1.5rem', borderRadius: '4px', marginBottom: '1.5rem' }}>
            <strong>NHS PROMs</strong> — Application Error
          </div>
          <h2 style={{ color: '#8B0000' }}>Something went wrong</h2>
          <pre style={{ background: '#fff', padding: '1rem', borderRadius: '4px', overflow: 'auto', fontSize: '0.875rem', marginTop: '1rem' }}>
            {err.message}
            {'\n\n'}
            {err.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

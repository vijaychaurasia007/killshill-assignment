import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import SignalForm from './components/SignalForm';
import SignalTable from './components/SignalTable';
import { useSignals } from './hooks/useSignals';

export default function App() {
  const { signals, loading, error, lastRefreshed, refresh, remove } = useSignals();
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="app">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1a1a1a', color: '#e2e8f0', border: '1px solid #2d2d2d' } }} />

      {/* Header */}
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-kill">Kill</span>
            <span className="logo-shill">Shill</span>
            <span className="logo-tag">Signal Tracker</span>
          </div>
          <div className="header-right">
            {lastRefreshed && (
              <span className="refresh-hint">
                Updated {lastRefreshed.toLocaleTimeString()} · auto-refresh 15s
              </span>
            )}
            <button className="refresh-btn" onClick={() => refresh()} disabled={loading}>
              {loading ? '↻ Loading…' : '↻ Refresh'}
            </button>
            <button className="new-signal-btn" onClick={() => setShowForm((v) => !v)}>
              {showForm ? '✕ Cancel' : '+ New Signal'}
            </button>
          </div>
        </div>
      </header>

      <main className="main">
        {/* Stats bar */}
        <div className="stats-bar">
          {(['OPEN', 'TARGET_HIT', 'STOPLOSS_HIT', 'EXPIRED'] as const).map((status) => {
            const count = signals.filter((s) => s.status === status).length;
            const labels: Record<string, string> = {
              OPEN: 'Open',
              TARGET_HIT: 'Target Hit',
              STOPLOSS_HIT: 'Stop Hit',
              EXPIRED: 'Expired',
            };
            return (
              <div key={status} className={`stat-card stat-${status.toLowerCase()}`}>
                <span className="stat-count">{count}</span>
                <span className="stat-label">{labels[status]}</span>
              </div>
            );
          })}
        </div>

        {/* Form */}
        {showForm && (
          <SignalForm
            onCreated={() => {
              setShowForm(false);
              refresh();
            }}
          />
        )}

        {/* Error */}
        {error && <div className="error-banner">⚠ {error}</div>}

        {/* Table */}
        <section className="dashboard-section">
          <h2 className="section-title">
            Dashboard
            <span className="signal-count">{signals.length} signal{signals.length !== 1 ? 's' : ''}</span>
          </h2>
          {loading && signals.length === 0 ? (
            <div className="loading-state">Loading signals…</div>
          ) : (
            <SignalTable signals={signals} onDelete={remove} />
          )}
        </section>
      </main>
    </div>
  );
}

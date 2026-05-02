import { Signal } from '../types';
import toast from 'react-hot-toast';

interface Props {
  signals: Signal[];
  onDelete: (id: string) => Promise<void>;
}

function formatPrice(price: number | null): string {
  if (price === null) return '—';
  return price >= 1 ? price.toLocaleString(undefined, { maximumFractionDigits: 4 }) : price.toFixed(8);
}

function formatROI(roi: number | null): JSX.Element {
  if (roi === null) return <span className="muted">—</span>;
  const cls = roi >= 0 ? 'roi-pos' : 'roi-neg';
  return <span className={cls}>{roi >= 0 ? '+' : ''}{roi.toFixed(2)}%</span>;
}

function formatTimeRemaining(ms: number, status: string): string {
  if (status !== 'OPEN') return '—';
  if (ms <= 0) return 'Expired';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  OPEN:         { label: 'OPEN',       cls: 'badge-open' },
  TARGET_HIT:   { label: 'TARGET HIT', cls: 'badge-target' },
  STOPLOSS_HIT: { label: 'STOP HIT',   cls: 'badge-stop' },
  EXPIRED:      { label: 'EXPIRED',    cls: 'badge-expired' },
};

export default function SignalTable({ signals, onDelete }: Props) {
  const handleDelete = async (id: string, symbol: string) => {
    if (!confirm(`Delete ${symbol} signal?`)) return;
    try {
      await onDelete(id);
      toast.success('Signal deleted');
    } catch {
      toast.error('Failed to delete signal');
    }
  };

  if (signals.length === 0) {
    return (
      <div className="empty-state">
        <p>No signals yet. Create one above.</p>
      </div>
    );
  }

  return (
    <div className="table-wrapper">
      <table className="signal-table">
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Dir</th>
            <th>Entry</th>
            <th>Target</th>
            <th>Stop Loss</th>
            <th>Current</th>
            <th>Status</th>
            <th>ROI</th>
            <th>Expires In</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {signals.map((sig) => {
            const badge = STATUS_LABELS[sig.status] || STATUS_LABELS.OPEN;
            return (
              <tr key={sig._id} className={`row-${sig.status.toLowerCase()}`}>
                <td className="sym-cell">{sig.symbol}</td>
                <td>
                  <span className={`dir-badge ${sig.direction === 'BUY' ? 'dir-buy' : 'dir-sell'}`}>
                    {sig.direction}
                  </span>
                </td>
                <td className="mono">{formatPrice(sig.entry_price)}</td>
                <td className="mono">{formatPrice(sig.target_price)}</td>
                <td className="mono">{formatPrice(sig.stop_loss)}</td>
                <td className="mono current-price">
                  {sig.current_price !== null ? formatPrice(sig.current_price) : <span className="muted">fetching…</span>}
                </td>
                <td>
                  <span className={`status-badge ${badge.cls}`}>{badge.label}</span>
                </td>
                <td className="mono">{formatROI(sig.live_roi ?? sig.realized_roi)}</td>
                <td className="mono time-remaining">
                  {formatTimeRemaining(sig.time_remaining_ms, sig.status)}
                </td>
                <td>
                  <button
                    className="delete-btn"
                    onClick={() => handleDelete(sig._id, sig.symbol)}
                    title="Delete"
                  >
                    ×
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

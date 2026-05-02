import React, { useState } from 'react';
import { CreateSignalPayload, Direction } from '../types';
import { createSignal } from '../api/signals';
import toast from 'react-hot-toast';

interface Props {
  onCreated: () => void;
}

const defaultForm: CreateSignalPayload = {
  symbol: '',
  direction: 'BUY',
  entry_price: 0,
  stop_loss: 0,
  target_price: 0,
  entry_time: '',
  expiry_time: '',
};

interface FieldError {
  [key: string]: string;
}

export default function SignalForm({ onCreated }: Props) {
  const [form, setForm] = useState<CreateSignalPayload>(defaultForm);
  const [errors, setErrors] = useState<FieldError>({});
  const [submitting, setSubmitting] = useState(false);

  const set = (field: keyof CreateSignalPayload, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});

    try {
      await createSignal({
        ...form,
        entry_price: Number(form.entry_price),
        stop_loss: Number(form.stop_loss),
        target_price: Number(form.target_price),
      });
      toast.success('Signal created!');
      setForm(defaultForm);
      onCreated();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { errors?: Array<{ field: string; message: string }>; error?: string } } };
      const resp = axiosErr?.response?.data;
      if (resp?.errors) {
        const fieldErrors: FieldError = {};
        resp.errors.forEach((e) => { fieldErrors[e.field] = e.message; });
        setErrors(fieldErrors);
        toast.error('Please fix the errors below');
      } else {
        toast.error(resp?.error || 'Failed to create signal');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = (field: string) =>
    `form-input ${errors[field] ? 'input-error' : ''}`;

  // Pre-fill entry time to now for convenience
  const setNow = () => {
    const now = new Date();
    now.setSeconds(0, 0);
    set('entry_time', now.toISOString().slice(0, 16));
  };

  return (
    <form onSubmit={handleSubmit} className="signal-form">
      <h2 className="form-title">New Signal</h2>

      <div className="form-grid">
        {/* Symbol */}
        <div className="field">
          <label>Trading Pair</label>
          <input
            className={inputCls('symbol')}
            placeholder="BTCUSDT"
            value={form.symbol}
            onChange={(e) => set('symbol', e.target.value.toUpperCase())}
          />
          {errors.symbol && <span className="err-msg">{errors.symbol}</span>}
        </div>

        {/* Direction */}
        <div className="field">
          <label>Direction</label>
          <div className="direction-toggle">
            {(['BUY', 'SELL'] as Direction[]).map((dir) => (
              <button
                key={dir}
                type="button"
                className={`dir-btn ${form.direction === dir ? `active-${dir.toLowerCase()}` : ''}`}
                onClick={() => set('direction', dir)}
              >
                {dir}
              </button>
            ))}
          </div>
        </div>

        {/* Entry Price */}
        <div className="field">
          <label>Entry Price</label>
          <input
            type="number"
            step="any"
            className={inputCls('entry_price')}
            placeholder="0.00"
            value={form.entry_price || ''}
            onChange={(e) => set('entry_price', e.target.value)}
          />
          {errors.entry_price && <span className="err-msg">{errors.entry_price}</span>}
        </div>

        {/* Stop Loss */}
        <div className="field">
          <label>Stop Loss</label>
          <input
            type="number"
            step="any"
            className={inputCls('stop_loss')}
            placeholder="0.00"
            value={form.stop_loss || ''}
            onChange={(e) => set('stop_loss', e.target.value)}
          />
          {errors.stop_loss && <span className="err-msg">{errors.stop_loss}</span>}
        </div>

        {/* Target Price */}
        <div className="field">
          <label>Target Price</label>
          <input
            type="number"
            step="any"
            className={inputCls('target_price')}
            placeholder="0.00"
            value={form.target_price || ''}
            onChange={(e) => set('target_price', e.target.value)}
          />
          {errors.target_price && <span className="err-msg">{errors.target_price}</span>}
        </div>

        {/* Entry Time */}
        <div className="field">
          <label>
            Entry Time{' '}
            <button type="button" className="now-btn" onClick={setNow}>
              now
            </button>
          </label>
          <input
            type="datetime-local"
            className={inputCls('entry_time')}
            value={form.entry_time}
            onChange={(e) => set('entry_time', e.target.value)}
          />
          {errors.entry_time && <span className="err-msg">{errors.entry_time}</span>}
        </div>

        {/* Expiry Time */}
        <div className="field">
          <label>Expiry Time</label>
          <input
            type="datetime-local"
            className={inputCls('expiry_time')}
            value={form.expiry_time}
            onChange={(e) => set('expiry_time', e.target.value)}
          />
          {errors.expiry_time && <span className="err-msg">{errors.expiry_time}</span>}
        </div>
      </div>

      <button type="submit" className="submit-btn" disabled={submitting}>
        {submitting ? 'Creating…' : '+ Create Signal'}
      </button>
    </form>
  );
}

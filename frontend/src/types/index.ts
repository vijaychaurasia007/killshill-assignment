export type Direction = 'BUY' | 'SELL';
export type SignalStatus = 'OPEN' | 'TARGET_HIT' | 'STOPLOSS_HIT' | 'EXPIRED';

export interface Signal {
  _id: string;
  symbol: string;
  direction: Direction;
  entry_price: number;
  stop_loss: number;
  target_price: number;
  entry_time: string;
  expiry_time: string;
  created_at: string;
  status: SignalStatus;
  realized_roi: number | null;
  current_price: number | null;
  live_roi: number | null;
  time_remaining_ms: number;
}

export interface CreateSignalPayload {
  symbol: string;
  direction: Direction;
  entry_price: number;
  stop_loss: number;
  target_price: number;
  entry_time: string;
  expiry_time: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Array<{ field: string; message: string }>;
}

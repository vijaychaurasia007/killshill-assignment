export type Direction = 'BUY' | 'SELL';

export type SignalStatus = 'OPEN' | 'TARGET_HIT' | 'STOPLOSS_HIT' | 'EXPIRED';

export interface CreateSignalDto {
  symbol: string;
  direction: Direction;
  entry_price: number;
  stop_loss: number;
  target_price: number;
  entry_time: string; // ISO string
  expiry_time: string; // ISO string
}

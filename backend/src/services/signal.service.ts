import Signal, { ISignal } from '../models/signal.model';
import { AppError } from '../lib/AppError';
import { CreateSignalDto, Direction, SignalStatus } from '../types';
import { getLivePrice, getMultiplePrices } from './binance.service';

// ─── ROI Calculation ───────────────────────────────────────────────────────────

export function computeROI(
  direction: Direction,
  entryPrice: number,
  currentPrice: number
): number {
  if (direction === 'BUY') {
    return ((currentPrice - entryPrice) / entryPrice) * 100;
  } else {
    return ((entryPrice - currentPrice) / entryPrice) * 100;
  }
}

// ─── Status Resolution ─────────────────────────────────────────────────────────

export function resolveStatus(
  signal: ISignal,
  currentPrice: number
): SignalStatus {
  const now = new Date();

  // Expired signals are immutable — never change their status
  if (signal.status !== 'OPEN') return signal.status;

  // Check expiry first
  if (now >= signal.expiry_time) return 'EXPIRED';

  const { direction, entry_price, stop_loss, target_price } = signal;

  if (direction === 'BUY') {
    if (currentPrice >= target_price) return 'TARGET_HIT';
    if (currentPrice <= stop_loss) return 'STOPLOSS_HIT';
  } else {
    // SELL
    if (currentPrice <= target_price) return 'TARGET_HIT';
    if (currentPrice >= stop_loss) return 'STOPLOSS_HIT';
  }

  return 'OPEN';
}

// ─── Validation ────────────────────────────────────────────────────────────────

function validatePrices(
  direction: Direction,
  entryPrice: number,
  stopLoss: number,
  targetPrice: number
): void {
  if (direction === 'BUY') {
    if (stopLoss >= entryPrice)
      throw new AppError('BUY: stop_loss must be less than entry_price', 400);
    if (targetPrice <= entryPrice)
      throw new AppError('BUY: target_price must be greater than entry_price', 400);
  } else {
    if (stopLoss <= entryPrice)
      throw new AppError('SELL: stop_loss must be greater than entry_price', 400);
    if (targetPrice >= entryPrice)
      throw new AppError('SELL: target_price must be less than entry_price', 400);
  }
}

// ─── Service Methods ───────────────────────────────────────────────────────────

export async function createSignal(dto: CreateSignalDto): Promise<ISignal> {
  const entryTime = new Date(dto.entry_time);
  const expiryTime = new Date(dto.expiry_time);
  const now = new Date();

  // Entry time: allow up to 24 hrs in the past, not in the future beyond a minute
  const twentyFourHrsAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (entryTime < twentyFourHrsAgo) {
    throw new AppError('entry_time cannot be more than 24 hours in the past', 400);
  }

  if (expiryTime <= entryTime) {
    throw new AppError('expiry_time must be after entry_time', 400);
  }

  validatePrices(dto.direction, dto.entry_price, dto.stop_loss, dto.target_price);

  const signal = await Signal.create({
    symbol: dto.symbol.toUpperCase(),
    direction: dto.direction,
    entry_price: dto.entry_price,
    stop_loss: dto.stop_loss,
    target_price: dto.target_price,
    entry_time: entryTime,
    expiry_time: expiryTime,
    status: 'OPEN',
    realized_roi: null,
  });

  return signal;
}

export async function getAllSignals(): Promise<object[]> {
  const signals = await Signal.find().sort({ created_at: -1 }).lean();

  // Grab live prices for all unique symbols
  const symbols = [...new Set(signals.map((s) => s.symbol))];
  const prices = await getMultiplePrices(symbols);

  // For each signal, compute live status and ROI, and persist changes to OPEN signals
  const enriched = await Promise.all(
    signals.map(async (signal) => {
      const currentPrice = prices.get(signal.symbol) ?? null;

      if (signal.status === 'OPEN' && currentPrice !== null) {
        const newStatus = resolveStatus(signal as unknown as ISignal, currentPrice);
        const roi = computeROI(signal.direction as Direction, signal.entry_price, currentPrice);

        if (newStatus !== 'OPEN') {
          // Persist resolved status + realized ROI
          await Signal.findByIdAndUpdate(signal._id, {
            status: newStatus,
            realized_roi: parseFloat(roi.toFixed(4)),
          });
          return {
            ...signal,
            status: newStatus,
            realized_roi: parseFloat(roi.toFixed(2)),
            current_price: currentPrice,
            live_roi: parseFloat(roi.toFixed(2)),
            time_remaining_ms: 0,
          };
        }

        return {
          ...signal,
          status: newStatus,
          current_price: currentPrice,
          live_roi: parseFloat(roi.toFixed(2)),
          time_remaining_ms: Math.max(0, signal.expiry_time.getTime() - Date.now()),
        };
      }

      return {
        ...signal,
        current_price: currentPrice,
        live_roi:
          signal.realized_roi !== null
            ? parseFloat(Number(signal.realized_roi).toFixed(2))
            : currentPrice !== null
            ? parseFloat(
                computeROI(signal.direction as Direction, signal.entry_price, currentPrice).toFixed(2)
              )
            : null,
        time_remaining_ms: Math.max(0, signal.expiry_time.getTime() - Date.now()),
      };
    })
  );

  return enriched;
}

export async function getSignalById(id: string): Promise<object> {
  const signal = await Signal.findById(id).lean();
  if (!signal) throw new AppError('Signal not found', 404);

  const currentPrice = await getLivePrice(signal.symbol);

  if (signal.status === 'OPEN' && currentPrice !== null) {
    const newStatus = resolveStatus(signal as unknown as ISignal, currentPrice);
    const roi = computeROI(signal.direction as Direction, signal.entry_price, currentPrice);

    if (newStatus !== 'OPEN') {
      await Signal.findByIdAndUpdate(id, {
        status: newStatus,
        realized_roi: parseFloat(roi.toFixed(4)),
      });
      return {
        ...signal,
        status: newStatus,
        realized_roi: parseFloat(roi.toFixed(2)),
        current_price: currentPrice,
        live_roi: parseFloat(roi.toFixed(2)),
        time_remaining_ms: 0,
      };
    }

    return {
      ...signal,
      current_price: currentPrice,
      live_roi: parseFloat(roi.toFixed(2)),
      time_remaining_ms: Math.max(0, signal.expiry_time.getTime() - Date.now()),
    };
  }

  return {
    ...signal,
    current_price: currentPrice,
    live_roi:
      signal.realized_roi !== null
        ? parseFloat(Number(signal.realized_roi).toFixed(2))
        : null,
    time_remaining_ms: Math.max(0, signal.expiry_time.getTime() - Date.now()),
  };
}

export async function getLiveStatus(id: string): Promise<object> {
  const signal = await Signal.findById(id).lean();
  if (!signal) throw new AppError('Signal not found', 404);

  const currentPrice = await getLivePrice(signal.symbol);
  if (currentPrice === null) {
    return { id, status: signal.status, current_price: null, live_roi: null };
  }

  const resolvedStatus = resolveStatus(signal as unknown as ISignal, currentPrice);
  const roi = computeROI(signal.direction as Direction, signal.entry_price, currentPrice);

  return {
    id,
    symbol: signal.symbol,
    status: resolvedStatus,
    current_price: currentPrice,
    live_roi: parseFloat(roi.toFixed(2)),
    time_remaining_ms: Math.max(0, signal.expiry_time.getTime() - Date.now()),
  };
}

export async function deleteSignal(id: string): Promise<void> {
  const signal = await Signal.findByIdAndDelete(id);
  if (!signal) throw new AppError('Signal not found', 404);
}

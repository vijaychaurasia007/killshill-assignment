import mongoose, { Schema, Document, Model } from 'mongoose';
import { Direction, SignalStatus } from '../types';

export interface ISignal extends Document {
  symbol: string;
  direction: Direction;
  entry_price: number;
  stop_loss: number;
  target_price: number;
  entry_time: Date;
  expiry_time: Date;
  created_at: Date;
  status: SignalStatus;
  realized_roi: number | null;
}

const SignalSchema = new Schema<ISignal>(
  {
    symbol: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    direction: {
      type: String,
      enum: ['BUY', 'SELL'],
      required: true,
    },
    entry_price: {
      type: Number,
      required: true,
    },
    stop_loss: {
      type: Number,
      required: true,
    },
    target_price: {
      type: Number,
      required: true,
    },
    entry_time: {
      type: Date,
      required: true,
    },
    expiry_time: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['OPEN', 'TARGET_HIT', 'STOPLOSS_HIT', 'EXPIRED'],
      default: 'OPEN',
    },
    realized_roi: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
    versionKey: false,
  }
);

// Index for efficient queries on active signals
SignalSchema.index({ status: 1 });
SignalSchema.index({ symbol: 1 });
SignalSchema.index({ expiry_time: 1 });

const Signal: Model<ISignal> = mongoose.model<ISignal>('Signal', SignalSchema);
export default Signal;

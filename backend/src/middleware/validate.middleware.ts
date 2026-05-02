import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      res.status(400).json({ success: false, errors });
      return;
    }
    req.body = result.data;
    next();
  };
}

export const createSignalSchema = z.object({
  symbol: z
    .string()
    .min(1, 'symbol is required')
    .regex(/^[A-Za-z]{2,20}$/, 'symbol must be letters only, e.g. BTCUSDT'),
  direction: z.enum(['BUY', 'SELL'], {
    errorMap: () => ({ message: 'direction must be BUY or SELL' }),
  }),
  entry_price: z.number({ invalid_type_error: 'entry_price must be a number' }).positive(),
  stop_loss: z.number({ invalid_type_error: 'stop_loss must be a number' }).positive(),
  target_price: z.number({ invalid_type_error: 'target_price must be a number' }).positive(),

  // Accept any string and coerce to ISO — handles "2026-05-01T10:00" from datetime-local
  entry_time: z
    .string()
    .min(1, 'entry_time is required')
    .transform((val) => new Date(val).toISOString())
    .refine((val) => !isNaN(Date.parse(val)), { message: 'entry_time must be a valid date' }),

  expiry_time: z
    .string()
    .min(1, 'expiry_time is required')
    .transform((val) => new Date(val).toISOString())
    .refine((val) => !isNaN(Date.parse(val)), { message: 'expiry_time must be a valid date' }),
});
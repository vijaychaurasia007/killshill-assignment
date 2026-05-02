import { Request, Response, NextFunction } from 'express';
import * as signalService from '../services/signal.service';

export async function createSignal(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const signal = await signalService.createSignal(req.body);
    res.status(201).json({ success: true, data: signal });
  } catch (err) {
    next(err);
  }
}

export async function getAllSignals(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const signals = await signalService.getAllSignals();
    res.json({ success: true, data: signals });
  } catch (err) {
    next(err);
  }
}

export async function getSignalById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const signal = await signalService.getSignalById(req.params.id);
    res.json({ success: true, data: signal });
  } catch (err) {
    next(err);
  }
}

export async function getLiveStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const status = await signalService.getLiveStatus(req.params.id);
    res.json({ success: true, data: status });
  } catch (err) {
    next(err);
  }
}

export async function deleteSignal(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await signalService.deleteSignal(req.params.id);
    res.json({ success: true, message: 'Signal deleted' });
  } catch (err) {
    next(err);
  }
}

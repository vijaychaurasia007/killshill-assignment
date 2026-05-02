import axios from 'axios';
import { ApiResponse, CreateSignalPayload, Signal } from '../types';

const api = axios.create({ baseURL: '/api' });

// datetime-local gives "2026-05-01T10:00" — convert to full ISO with Z
function toISO(val: string): string {
  return new Date(val).toISOString();
}

export async function fetchSignals(): Promise<Signal[]> {
  const { data } = await api.get<ApiResponse<Signal[]>>('/signals');
  return data.data!;
}

export async function createSignal(payload: CreateSignalPayload): Promise<Signal> {
  const normalized = {
    ...payload,
    entry_time: toISO(payload.entry_time),
    expiry_time: toISO(payload.expiry_time),
  };
  const { data } = await api.post<ApiResponse<Signal>>('/signals', normalized);
  return data.data!;
}

export async function deleteSignal(id: string): Promise<void> {
  await api.delete(`/signals/${id}`);
}

export async function fetchSignalById(id: string): Promise<Signal> {
  const { data } = await api.get<ApiResponse<Signal>>(`/signals/${id}`);
  return data.data!;
}
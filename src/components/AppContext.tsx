'use client';
import { createContext, useContext } from 'react';

export interface AppState {
  user: { id: string; email: string };
  today: string;
}
export const AppCtx = createContext<AppState | null>(null);
export function useApp(): AppState {
  const v = useContext(AppCtx);
  if (!v) throw new Error('AppContext fehlt');
  return v;
}

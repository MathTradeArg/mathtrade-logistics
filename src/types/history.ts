import type { GameStatusCode } from './game';

/** Admin history endpoints: newest first, capped by `limit`. */
export interface HistoryResponse<T> { results: T[]; truncated: boolean }

/** Who made a change; never email or document. */
export interface ActorRef { id: number; name: string }

/** One status change of a game (TradeTracking). */
export interface TradeHistoryRow {
  id: number;
  status: GameStatusCode;
  status_display: string;
  actor: ActorRef | null;
  at: string; // ISO
}

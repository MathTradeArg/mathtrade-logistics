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

export type BoxAction = 'create' | 'add' | 'remove' | 'move_in' | 'move_out' | 'close' | 'reopen' | 'delete';

/** One box action (BoxEvent). trade_* and game_title are null when the action
 *  has no game or the game was deleted. */
export interface BoxEventRow {
  id: number;
  action: BoxAction;
  box_id: number;
  trade_id: number | null;
  trade_code: number | null;
  game_title: string | null;
  actor: ActorRef | null;
  at: string; // ISO
}

/** One row of a volunteer's activity: a game status change or a box action. */
export type ActivityRow =
  | (TradeHistoryRow & { kind: 'trade'; trade_id: number; trade_code: number; game_title: string | null })
  | (BoxEventRow & { kind: 'box' });

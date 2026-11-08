import { Item } from "@/types/item";
import { User } from "@/types/user";


export interface GameDetail {
  id: number,
  membership: User,
  member_to: User,
  item_to: Item,
  table_number: number | string,
  status: GameStatusCode,
  change_by: User | null,
  assigned_trade_code: number,
  // Added by the backend for "Dónde está"; missing on an older backend.
  giver_attends_event?: boolean,
  giver_location_name?: string | null,
  boxes?: GameBoxInfo[],
}

/** A box the copy travels in, as the game detail sends it. */
export interface GameBoxInfo {
  id: number,
  number: number | null,
  origin_id: number,
  origin_name: string,
  destination_id: number,
  destination_name: string,
  closed: boolean,
  has_tracking: boolean,
  /** Closed and every game in it is already at the event (status 5/6). */
  opened: boolean,
  item_count: number,
  received_count: number,
}

/** A row of GET logistics/game/search/?q= */
export interface GameSearchResult {
  assigned_trade_code: number,
  title: string,
  giver_first_name: string,
  giver_last_name: string,
  receiver_first_name: string,
  receiver_last_name: string,
  status: GameStatusCode,
  status_display: string,
}

export type GameStatusCode = 1 | 2 | 3 | 4 | 5 | 6;

export const GameStatusMap: Record<GameStatusCode, string> = {
  1: "Creado",
  2: "En viaje al evento",
  3: "En viaje de vuelta",
  4: "Pendiente",
  5: "En evento",
  6: "Entregado a Usuario",
};
export const GameStatusDisplayMap: Record<string, string> = {
  "Created": "Creado",
  "Transit to Event": "En viaje al evento",
  "Transit Back": "En viaje de vuelta",
  "Transit Direct": "Pendiente",
  "In Event": "En evento",
  "Delivered": "Entregado a Usuario",
};

export function getGameStatusText(statusCode: GameStatusCode): string {
  return GameStatusMap[statusCode] || "Desconocido";
}

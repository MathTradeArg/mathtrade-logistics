export interface Trade {
  from_member: User,
  to_member: User,
  math_item_exchanged: Item,
  result: Result,
}

export interface GameDetail {
  id: number,
  membership: User,
  member_to: User,
  item_to: Item,
  table_number: number | string,
  status: GameStatusCode,
  change_by: User | null,
  assigned_trade_code: number

}
export interface Result {
  table_number: number | string;
  assigned_trade_code: number;
  status_display: string;
  change_by: User
}

export interface User {
  id: number;
  first_name: string;
  last_name: string;
}
export interface Item {
  id: number;
  title: string;
}

export type GameStatusCode = 1 | 2 | 3 | 4 | 5 | 6;

export const GameStatusMap: Record<GameStatusCode, string> = {
  1: "Creado",
  2: "En viaje al evento",
  3: "En viaje de vuelta",
  4: "En viaje",
  5: "Recibido por Org.",
  6: "Entregado a Usuario",
};
export const GameStatusDisplayMap: Record<string, string> = {
  "Created": "Creado",
  "Transit to Event": "En viaje al evento",
  "Transit Back": "En viaje de vuelta",
  "Transit Direct": "En viaje",
  "In Event": "Recibido por Org.",
  "Delivered": "Entregado a Usuario",
};

export function getGameStatusText(statusCode: GameStatusCode): string {
  return GameStatusMap[statusCode] || "Desconocido";
}

export interface Report {
  reported_user: number | null;
  item: number | null;
  images: string | null;
  comment: string;
  created: string;
}

export interface UserData {
  id: number;
  first_name: string;
  last_name: string;
  bgg_user?: string;
  email?: string;
}

export interface ItemData {
  id: number;
  title: string;
  assigned_trade_code: number;
  first_name?: string;
  last_name?: string;
}

export interface EnrichedReport extends Report {
  reportedUserData?: UserData;
  itemData?: ItemData;
}
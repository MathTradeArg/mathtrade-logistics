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
  assigned_trade_code: number
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

import { Item } from "@/types/item";
import { User } from "@/types/user";

export interface Trade {
  from_member: User | null,
  to_member: User | null,
  math_item_exchanged: Item,
  result: Result,
}
export interface DeliverTrade extends Trade {
  from_member: User,
  math_item_exchanged: Item,
  result: Result,
}
export interface ReceiveTrade extends Trade {
  to_member: User,
  math_item_exchanged: Item,
  result: Result,
}

export interface TradeResponse<type extends Trade> {
  user: User,
  games: type[];
}

export interface Result {
  table_number: number | string;
  assigned_trade_code: number;
  status_display: string;
  change_by: User
}
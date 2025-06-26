import { Item } from "@/types/item";
import { User } from "@/types/user";

export interface Trade {
  from_member: User,
  to_member: User,
  math_item_exchanged: Item,
  result: Result,
}

export interface Result {
  table_number: number | string;
  assigned_trade_code: number;
  status_display: string;
  change_by: User
}
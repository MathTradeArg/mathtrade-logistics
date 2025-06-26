import { Item } from "@/types/item";

export interface Box {
  created_by_username: string | null;
  created_by_first_name: string | null;
  created_by_last_name: string | null;
  id: number;
  number: number | null;
  destiny: number; 
  origin: number;
  math_items: Item[];
  selectedItemIds: Set<number>;
  origin_name: string;
  destination_name: string;
}

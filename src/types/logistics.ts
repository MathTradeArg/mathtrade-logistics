export interface Item {
  id: number;
  assigned_trade_code: number;
  first_name: string;
  last_name: string;
  title: string;
  location: number;
  location_name: string;
  status: number;
  box_number?: number | null;

}

export interface Box {
  created_by_username: string | null;
  created_by_first_name: string | null;
  created_by_last_name: string | null;
  id: number;
  number: number | null;
  origin: number;
  math_items: Item[];
  selectedItemIds: Set<number>;
  origin_name: string;
  destination_name: string;
}
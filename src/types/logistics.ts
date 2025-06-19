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
  id: number;
  number: number | null;
  origin: number;
  math_items: Item[];
  selectedItemIds: Set<number>;
  origin_name: string;
  destination_name: string;
}
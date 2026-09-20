export interface Item {
  id: number;
  title: string;
  assigned_trade_code: number;
  first_name?: string;
  last_name?: string;
  location?: number;
  location_name?: string;
  status?: number;
  box_number?: number | null;
  origin_location?: number;
  origin_location_name?: string;
  receptor_first_name?: string;
  receptor_last_name?: string;
  item_id?: number;
  reported_missing?: boolean;
}
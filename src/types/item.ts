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
}
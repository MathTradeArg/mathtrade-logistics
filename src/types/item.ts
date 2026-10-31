export interface Item {
  id: number;
  title: string;
  assigned_trade_code: number;
  first_name?: string;
  last_name?: string;
  whatsapp?: string | null;
  telegram?: string | null;
  location?: number;
  location_name?: string;
  status?: number;
  box_number?: number | string | null;
  /** Origin-sequence number of the box the copy is in (`<origin_number>-<number>`). */
  box_origin_number?: number | null;
  /** The copy travels through the event (AMBA) to its city. */
  via_meeting?: boolean;
  origin_location?: number;
  origin_location_name?: string;
  receptor_first_name?: string;
  receptor_last_name?: string;
  item_id?: number;
  reported_missing?: boolean;
}
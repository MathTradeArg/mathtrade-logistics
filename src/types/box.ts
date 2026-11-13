import { Item } from "@/types/item";

export interface Box {
  created_by_username: string | null;
  created_by_first_name: string | null;
  created_by_last_name: string | null;
  id: number;
  number: number | null;
  origin_number?: number | null;
  /** `Location.code` of the box's physical destination (label `<code>-<number>` for boxes leaving AMBA). */
  destination_code?: string | null;
  tracking?: string | null;
  destiny: number;
  /** Effective destination computed by the API (the destination's send_as or itself); absent in older responses. */
  lane_destination?: number;
  origin: number;
  math_items: Item[];
  selectedItemIds?: Set<number>;
  origin_name: string;
  destination_name: string;
  closed_at?: string | null;
  comment?: string | null;
}

import { Item } from ".";
import { UserData } from "@/types/user";

export interface ReportComment {
  id: number;
  user_info: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  };
  comment: string;
  created: string;
}

export interface Report {
  id: number;
  user: {
    id: number;
    username?: string;
    first_name: string;
    last_name: string;
    avatar?: string | null;
    location?: string;
    bgg_user?: string;
  };
  reported_user: {
    id: number;
    first_name: string;
    last_name: string;
    avatar?: string | null;
    location?: string;
    bgg_user?: string;
  } | null;
  item: number | null;
  item_title?: string | null;
  assigned_trade_code?: number | null;
  box?: number | null;
  box_number?: number | null;
  box_origin_name?: string | null;
  box_destination_name?: string | null;
  found_in_box?: number | null;
  found_in_box_number?: number | null;
  images: string | null;
  comment: string;
  created: string;
  resolved_at?: string | null;
  comments: ReportComment[];
}

export interface EnrichedReport extends Report {
  reportedUserData?: UserData;
  itemData?: Item;
}

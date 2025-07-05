export interface WindowConfig {
  id: number;
  name: string;
  tables: string[];
}

export interface UserWithWindow extends ReadyUser {
  table_number?: string;
  window_id?: number | null;
  window_name?: string | null;
  status?: 'present' | 'receiving' | 'no_show' | 'completed' | null;
  marked_at?: string;
  marked_by?: string;
  ready_games_count?: number;
}

export interface ProcessedUserWithWindow extends UserWithWindow {
  status: 'present' | 'receiving' | 'no_show' | 'completed' | null;
}

export interface ReadyUser {
  id: string | number;
  first_name: string;
  last_name: string;
  username: string;
  table_number?: string;
  ready_games_count?: number;
}

export interface WindowDisplay {
  id: number | string;
  name: string;
  users: ProcessedUserWithWindow[];
  max_users: number;
  ready_count: number;
  attended_count: number;
  no_show_count: number;
}

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  comment_on_user?: string;
}

export interface UserData extends User {
  bgg_user?: string;
  email?: string;
}

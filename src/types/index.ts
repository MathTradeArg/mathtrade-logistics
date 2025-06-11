export interface User {
  id: number;
  first_name: string;
  last_name: string;
  items: Item[]
}
export interface Item {
  id: number;
  title: string;
  delivered: boolean;
  elements: Game[]
}

export interface Game {
  id: number;
  primary_name: string;
}

import { NextResponse } from 'next/server';
import type { Item } from '@/types'; 

interface UserRetrievingGamesResponse {
  id: string; 
  first_name: string;
  last_name: string;
  games_to_retrieve: Pick<Item, 'id' | 'title'>[];
}

// TODO: eliminar mock 
const usersData: Record<string, UserRetrievingGamesResponse> = {
  "guybrush": { 
    id: "111",
    first_name: "Guybrush",
    last_name: "Threepwood",
    games_to_retrieve: [
      { id: 101, title: "Azul (2017)" },
      { id: 789, title: "Wingspan (2019)" },
    ],
  },
  "elaine": { 
    id: "456",
    first_name: "Elaine",
    last_name: "Marley",
    games_to_retrieve: [],
  }
};

export async function GET(
  request: Request,
  { params }: { params: { qrId: string } }
) {

  //TODO: revertir mock
  // const qrId = params.qrId
  const qrId = parseInt(params.qrId) % 2 == 0 ? "elaine" : "guybrush";

  await new Promise(resolve => setTimeout(resolve, 20)); // Simulo delay

  if (usersData[qrId]) {
    return NextResponse.json(usersData[qrId]);
  } else {
    return NextResponse.json({ message: `Usuario no encontrado o sin juegos a retirar.` }, { status: 404 });
  }
}

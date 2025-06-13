import { NextResponse } from 'next/server';
import { GameDetails } from '@/types';

// TODO: Reemplazar mock
async function findGameInDb(gameId: number): Promise<GameDetails | null> {
  await new Promise(resolve => setTimeout(resolve, 20)); // Simulo delay

  if (gameId === 123) {
    return {
      id: 123,
      title: "Catan (2015)",
      status: "pending"
    };
  }
  if (gameId === 456) {
    return {
      id: 456,
      title: "Ticket to Ride (2004)",
      status: "delivered", 
      delivered_to_user_id: 999, 
      delivered_to_user_name: "Usuario de Prueba",
    };
  }
  return null; 
}

export async function GET(
  request: Request,
  { params }: { params: { gameId: string } }
) {
  const gameId = parseInt(params.gameId, 10);

  if (isNaN(gameId)) {
    return NextResponse.json({ message: 'ID de juego inválido.' }, { status: 400 });
  }

  try {
    //TODO: reemplazar mock
    const game = await findGameInDb(gameId);

    if (!game) {
      return NextResponse.json({ message: `Juego con ID ${gameId} no encontrado.` }, { status: 404 });
    }
    return NextResponse.json(game);
  } catch (error) {
    console.error("Error al buscar juego:", error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}

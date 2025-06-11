import { NextResponse } from 'next/server';

interface UpdateRequestBody {
  gameId: number;
  delivered: boolean;
}

export async function POST(request: Request) {
  const { gameId, delivered }: UpdateRequestBody = await request.json();
  
  console.log(`Juego ${gameId} actualizado a: 'Entregado' `);
  
  return NextResponse.json({ success: true, message: 'Estado actualizado correctamente.' });
}
import { NextResponse } from 'next/server';

type ActionStatus = "delivered" | "delivered_to_user" | "pending";
type DetailedGameStatus = "pending" | "at_org" | "delivered";

interface UpdateRequestBody {
  itemIds: number[];
  status: ActionStatus;
  deliveredByUserId: number;
  userRole: 'ADMIN' | 'VOLUNTEER' | 'USER';
}

const mockGameDatabase: Record<number, { status: DetailedGameStatus, title: string }> = {
  21: { status: 'pending', title: 'Cangazo (2020)' },
  1144: { status: 'delivered', title: 'Arkham Horror (Third Edition) (2018)' },
  1111: { status: 'pending', title: '5-Minute Dungeon Combo' },
  1010: { status: 'at_org', title: 'Wingspan + Oceania' },
  9999: { status: 'pending', title: 'Terraforming Mars (2016)' },
  1802: { status: 'pending', title: 'Gloomhaven: Jaws of the Lion (2020)' },
  1803: { status: 'pending', title: 'Everdell (2018)' },
  18034: { status: 'pending', title: 'Azul (2017)' },
  1805: { status: 'pending', title: 'Root (2018) + Root: The Riverfolk Expansion (2018)' },
  1806: { status: 'pending', title: 'Scythe (2016) + Scythe: Invaders from Afar (2017)' },
  1807: { status: 'pending', title: 'Spirit Island (2017) + Spirit Island: Branch & Claw (2017)' },
  1808: { status: 'pending', title: 'Great Western Trail (Second Edition) (2021)' },
  1809: { status: 'pending', title: 'Lost Ruins of Arnak (2020) + Lost Ruins of Arnak: Expedition Leaders (2021)' },
};

export async function POST(request: Request) {
  await new Promise(resolve => setTimeout(resolve, 20));

  const { itemIds, status, deliveredByUserId, userRole }: UpdateRequestBody = await request.json();

  if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
    return NextResponse.json({ success: false, message: 'Se requiere un array de itemIds.' }, { status: 400 });
  }
  if (!status || !["delivered", "delivered_to_user", "pending"].includes(status)) {
    return NextResponse.json({ success: false, message: 'El estado proporcionado es inválido.' }, { status: 400 });
  }
  if (typeof deliveredByUserId !== 'number') {
    return NextResponse.json({ success: false, message: 'Falta el ID del usuario que realiza la acción.' }, { status: 400 });
  }
  if (!userRole || !['ADMIN', 'VOLUNTEER'].includes(userRole)) {
    return NextResponse.json({ success: false, message: 'El rol del usuario es inválido o no fue proporcionado.' }, { status: 400 });
  }

  const updatedGamesInfo = [];


  for (const itemId of itemIds) {

    //TODO: eliminar mocks y pegarle al endpoint
    const game = mockGameDatabase[itemId];

    if (!game) {
      console.warn(`Juego con ID ${itemId} no encontrado en el mock DB.`);
      continue;
    }


    if (status === "pending") {
      if (userRole !== 'ADMIN') {
        return NextResponse.json({ success: false, message: `No tienes permiso para marcar el juego ID ${itemId} (${game.title}) como pendiente. Se requiere rol de ADMIN.` }, { status: 403 });
      }
      if (game.status === 'delivered') game.status = 'at_org';
      else if (game.status === 'at_org') game.status = 'pending';
      console.log(`ADMIN (ID: ${deliveredByUserId}) revirtió entrega del juego ID ${itemId} (${game.title}) a ${game.status}.`);
    } else if (status === "delivered") {
      if (game.status === 'pending') game.status = 'at_org';
      console.log(`Juego ID ${itemId} (${game.title}) actualizado a AT_ORG por usuario ID: ${deliveredByUserId}.`);
    } else if (status === "delivered_to_user") {
      if (game.status === 'at_org') game.status = 'delivered';
      console.log(`Juego ID ${itemId} (${game.title}) actualizado a DELIVERED_FINAL por usuario ID: ${deliveredByUserId}.`);
    }
    updatedGamesInfo.push({ id: itemId, newStatus: game.status, title: game.title });
  }

  return NextResponse.json({ success: true, message: 'Estados actualizados correctamente.', updatedGames: updatedGamesInfo });
}
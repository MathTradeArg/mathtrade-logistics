import { NextResponse } from 'next/server';

interface ReadyUser {
  id: string | number;
  name: string;
  gamesCount?: number;
}

// Mock de datos
let mockReadyUsers: ReadyUser[] = [
  { id: "1234", name: "Guybrush Threepwood"},
  { id: "5678", name: "Elaine Marley"},
  { id: "1001", name: "Carla, the Sword Master"},
  { id: "1002", name: "Otis"},
  { id: "1003", name: "Stan S. Stanman"},
  { id: "1004", name: "Herman Toothrot"},
  { id: "1005", name: "Voodoo Lady"},
  { id: "1006", name: "Meathook"},
  { id: "1007", name: "Largo LaGrande"},
  { id: "1008", name: "Wally B. Feed"},
  { id: "1009", name: "Captain Kate Capsize"},
  { id: "1010", name: "Murray the Demonic Skull"}
];

export async function GET(request: Request) {
  await new Promise(resolve => setTimeout(resolve, 20)); 

  // Simular cambios en la lista para ver el polling
  if (Math.random() > 0.7) {
     const newUserSuffix = Math.floor(Math.random() * 100);
     mockReadyUsers.push({ id: `new-user-${newUserSuffix}`, name: `Nuevo Usuario ${newUserSuffix}`, gamesCount: Math.floor(Math.random() * 3) + 1 });
   }
   if (Math.random() > 0.8 && mockReadyUsers.length > 0) {
     mockReadyUsers.shift();
   }

  try {
    //TODO: implementar llamda
    return NextResponse.json(mockReadyUsers);
  } catch (error) {
    console.error("Error al obtener usuarios listos para retirar:", error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
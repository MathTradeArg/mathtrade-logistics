import { NextResponse } from 'next/server';

interface ReadyUser {
  id: string | number;
  name: string;
}

const initialMockReadyUsers: ReadyUser[] = [
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
  { id: "1010", name: "Murray the Demonic Skull"},
  { id: "10041", name: "Herman Toothrot"},
  { id: "10051", name: "Voodoo Lady"},
  { id: "10061", name: "Meathook"},
  { id: "10071", name: "Largo LaGrande"},
  { id: "10081", name: "Wally B. Feed"},
  { id: "10091", name: "Captain Kate Capsize"},
  { id: "10101", name: "Murray the Demonic Skull"}
];

let dynamicUserCounter = 0;

export async function GET(request: Request) {
  await new Promise(resolve => setTimeout(resolve, 20)); 

  let currentResponseUsers = [...initialMockReadyUsers];

  if (Math.random() > 0.6) { 
    dynamicUserCounter++;
    const newUser: ReadyUser = { id: `dyn-user-${dynamicUserCounter}`, name: `Usuario ${dynamicUserCounter}` };
    currentResponseUsers.unshift(newUser); 
  }

  if (currentResponseUsers.length > initialMockReadyUsers.length / 2 && Math.random() > 0.7) {
    currentResponseUsers.pop(); 
  }

  try {
    return NextResponse.json(currentResponseUsers);
  } catch (error) {
    console.error("Error al obtener usuarios listos para retirar:", error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises'
import type { User as FrontendUserType } from '@/types';


interface MockGame {
  id: number;
  title: string;
  status: string; 
}

interface MockDB {
  games: MockGame[];
  users?: any[];
}

export async function GET(
  request: Request,
  { params }: { params: { qrId: string } }
) {
   const scannedQrData = params.qrId; 

  try {
    //TODO: Cambiar mock por request
    const dbPath = path.join(process.cwd(), `mock-db-${scannedQrData}.json`);
    const jsonData = await fs.readFile(dbPath, 'utf-8');
    const user: MockDB = JSON.parse(jsonData);


    return NextResponse.json(user);

  } catch (error) {
    console.error('Error leyendo mock-db.json', error);
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
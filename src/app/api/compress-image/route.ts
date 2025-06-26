import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó ningún archivo.' }, { status: 400 });
    }

    const originalBuffer = Buffer.from(await file.arrayBuffer());

    const compressedBuffer = await sharp(originalBuffer)
      .resize({ width: 1920, withoutEnlargement: true })
      .jpeg({ quality: 80, progressive: true })
      .toBuffer();

    return new NextResponse(compressedBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
      },
    });
  } catch (error) {
    console.error('Error comprimiendo la imagen con Sharp:', error);
    return NextResponse.json({ error: 'Error al procesar la imagen.' }, { status: 500 });
  }
}
/**
 * Envía una imagen a un endpoint del servidor para ser comprimida con Sharp.
 * @param file El archivo de imagen original a comprimir.
 * @returns Una promesa que se resuelve con la imagen comprimida como un nuevo objeto File.
 */
export async function compressImage(file: File): Promise<File> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('/api/compress-image', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'El servidor respondió con un error.');
    }

    const compressedBlob = await response.blob();

    console.log(`Imagen comprimida de ${(file.size / 1024).toFixed(0)}KB a ${(compressedBlob.size / 1024).toFixed(0)}KB`);

    const newFileName = file.name.replace(/\.[^/.]+$/, '.jpg');
    return new File([compressedBlob], newFileName, { type: 'image/jpeg' });
  } catch (error) {
    console.error('Error al contactar el API de compresión:', error);
    throw new Error('Error al comprimir la imagen.');
  }
}

import { getHash } from "@/utils/hash";

export const generateHashedFilename = (filename: string): string => {
  const ext = filename.substring(filename.lastIndexOf('.'));
  const name = filename.substring(0, filename.lastIndexOf('.'));
  return `${name.substring(0, 10)}_${getHash(filename)}${ext}`;
};

/** A file as a data URL (`data:image/jpeg;base64,…`), what `users/images/` takes. */
export const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Error al leer el archivo de imagen.'));
    };
    reader.onerror = (error) => reject(error);
  });

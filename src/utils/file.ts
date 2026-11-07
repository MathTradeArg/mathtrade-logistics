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

/** Saves a Blob as a file through a temporary `<a download>`. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoke on the next tick: some browsers start the download after click() returns.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

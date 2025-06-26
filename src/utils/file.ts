import { getHash } from "./hash";

export const generateHashedFilename = (filename: string): string => {
  const ext = filename.substring(filename.lastIndexOf('.'));
  const name = filename.substring(0, filename.lastIndexOf('.'));
  return `${name.substring(0, 10)}_${getHash(filename)}${ext}`;
};

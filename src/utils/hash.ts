/**
 * Generates a simple hash from a string.
 * @param str The input string.
 * @returns A short, alphanumeric hash string.
 */
export const getHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
};

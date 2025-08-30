// src/utils/textUtils.ts

/**
 * Converts a hiragana string to its katakana equivalent.
 * @param str The input string (e.g., "らーめん")
 * @returns The converted string (e.g., "ラーメン")
 */
export const toKatakana = (str: string): string => {
  return str.replace(/[\u3041-\u3096]/g, (match) => {
    const charCode = match.charCodeAt(0) + 0x60;
    return String.fromCharCode(charCode);
  });
};

export interface CleanStats {
  nbspCount: number;
  narrowNbspCount: number;
  zeroWidthCount: number;
  bomCount: number;
  bidiCount: number;
  otherInvisibleCount: number;
  totalCleaned: number;
}

/**
 * Caractères invisibles / gênants traités par le nettoyeur.
 * Chaque entrée : [regex, description].
 */
const INVISIBLE_CHARS: Array<{ regex: RegExp; key: keyof Omit<CleanStats, "totalCleaned"> }> = [
  { regex: /\u00A0/g, key: "nbspCount" },           // Espace insécable (NBSP)
  { regex: /\u202F/g, key: "narrowNbspCount" },      // Espace mince insécable (NNBSP)
  { regex: /[\u200B\u200C\u200D]/g, key: "zeroWidthCount" }, // Zero-width space, joiner, non-joiner
  { regex: /\uFEFF/g, key: "bomCount" },             // BOM (Byte Order Mark)
  { regex: /[\u200E\u200F\u061C]/g, key: "bidiCount" }, // LRM, RLM, ALM (marques directionnelles)
  { regex: /[\u00AD\u2060\u180E]/g, key: "otherInvisibleCount" }, // Soft hyphen, word joiner, mongolian vowel separator
];

/** Nettoyage des caractères invisibles. 100% local. */
export function performClean(inputText: string): { cleanedText: string; stats: CleanStats } {
  const counts: CleanStats = {
    nbspCount: 0,
    narrowNbspCount: 0,
    zeroWidthCount: 0,
    bomCount: 0,
    bidiCount: 0,
    otherInvisibleCount: 0,
    totalCleaned: 0,
  };

  let cleanedText = inputText;

  for (const { regex, key } of INVISIBLE_CHARS) {
    const matches = cleanedText.match(regex) || [];
    counts[key] = matches.length;
    cleanedText = cleanedText.replace(regex, " ");
  }

  counts.totalCleaned = Object.values(counts).reduce((a, b) => a + b, 0) - counts.totalCleaned;

  return { cleanedText, stats: counts };
}
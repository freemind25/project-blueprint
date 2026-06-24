export interface CleanStats {
  nbspCount: number;
  narrowNbspCount: number;
  totalCleaned: number;
}

/** Nettoyage des caractères invisibles. 100% local. */
export function performClean(inputText: string): { cleanedText: string; stats: CleanStats } {
  const nbsp = /\u00A0/g;
  const narrowNbsp = /\u202F/g;

  const nbspMatches = inputText.match(nbsp) || [];
  const narrowNbspMatches = inputText.match(narrowNbsp) || [];

  const cleanedText = inputText.replace(nbsp, " ").replace(narrowNbsp, " ");

  return {
    cleanedText,
    stats: {
      nbspCount: nbspMatches.length,
      narrowNbspCount: narrowNbspMatches.length,
      totalCleaned: nbspMatches.length + narrowNbspMatches.length,
    },
  };
}
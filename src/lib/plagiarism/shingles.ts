const WORD_RE = /\b[\wàâäéèêëîïôöùûüçÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ]+\b/gi;
export function tokenize(text: string): string[] { return (text.match(WORD_RE) || []).map((w) => w.toLowerCase()); }
export function extractShingles(text: string, n: number = 3): string[] {
  if (n < 1) return [];
  const tokens = tokenize(text);
  if (tokens.length < n) return [];
  const shingles: string[] = [];
  for (let i = 0; i <= tokens.length - n; i++) shingles.push(tokens.slice(i, i + n).join("\u00A0"));
  return shingles;
}
export function shingleSet(text: string, n: number = 3): Set<string> { return new Set(extractShingles(text, n)); }
export function extractShinglesWithPositions(text: string, n: number = 3): Array<{ shingle: string; startOffset: number; endOffset: number }> {
  const result: Array<{ shingle: string; startOffset: number; endOffset: number }> = [];
  const matches = text.matchAll(WORD_RE);
  const tokens: Array<{ word: string; start: number; end: number }> = [];
  for (const match of matches) tokens.push({ word: match[0].toLowerCase(), start: match.index!, end: match.index! + match[0].length });
  if (tokens.length < n) return result;
  for (let i = 0; i <= tokens.length - n; i++) {
    result.push({ shingle: tokens.slice(i, i + n).map((t) => t.word).join("\u00A0"), startOffset: tokens[i].start, endOffset: tokens[i + n - 1].end });
  }
  return result;
}
import { shingleSet, extractShinglesWithPositions } from "./shingles";
import { computeMinHashSignature, estimateJaccard, generateHashParams } from "./minhash";
import type { PlagiarismResult, PlagiarismMatch, PlagiarismConfig, ReferenceDocument, MatchingPassage } from "./types";
import { DEFAULT_CONFIG } from "./types";

let corpus: ReferenceDocument[] = [];
let cachedParams: Array<{ a: number; b: number }> | null = null;
function getHashParams(numHash: number) { if (!cachedParams || cachedParams.length !== numHash) cachedParams = generateHashParams(numHash); return cachedParams; }

export function addReference(text: string, name: string, config: PlagiarismConfig = {}): ReferenceDocument {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const shingles = shingleSet(text, cfg.ngramSize);
  const { signature } = computeMinHashSignature(shingles, cfg.numHashFunctions, getHashParams(cfg.numHashFunctions));
  const doc: ReferenceDocument = { id: crypto.randomUUID(), name, text, signature, shingleCount: shingles.size, addedAt: new Date().toISOString() };
  corpus.push(doc);
  return doc;
}
export function removeReference(id: string): boolean { const i = corpus.findIndex((d) => d.id === id); if (i === -1) return false; corpus.splice(i, 1); return true; }
export function getCorpus(): ReferenceDocument[] { return [...corpus]; }
export function clearCorpus(): void { corpus = []; }
export function getCorpusSize(): number { return corpus.length; }

export function analyzePlagiarism(text: string, config: PlagiarismConfig = {}): PlagiarismResult {
  const start = performance.now();
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const inputShingles = shingleSet(text, cfg.ngramSize);
  const { signature: inputSig } = computeMinHashSignature(inputShingles, cfg.numHashFunctions, getHashParams(cfg.numHashFunctions));
  const matches: PlagiarismMatch[] = [];
  for (const ref of corpus) {
    if (ref.shingleCount < cfg.minShingles) continue;
    const sim = estimateJaccard(inputSig, ref.signature);
    const pct = Math.round(sim * 100);
    if (pct < cfg.similarityThreshold) continue;
    const passages = findMatchingPassages(text, ref.text, cfg);
    matches.push({ reference: { id: ref.id, name: ref.name }, similarityPercent: pct, severity: pct >= 80 ? "critical" : pct >= 50 ? "high" : pct >= 30 ? "medium" : "low", matchingPassages: passages });
  }
  matches.sort((a, b) => b.similarityPercent - a.similarityPercent);
  const maxSim = matches.length > 0 ? matches[0].similarityPercent : 0;
  const overall = matches.length > 0 ? Math.round(matches.reduce((s, m, i) => s + m.similarityPercent * Math.pow(0.8, i), 0) / matches.reduce((s, _, i) => s + Math.pow(0.8, i), 0)) : 0;
  return { overallScore: overall, maxSimilarity: maxSim, referencesChecked: corpus.length, matches, analysisTimeMs: Math.round((performance.now() - start) * 100) / 100, inputShingleCount: inputShingles.size };
}

function findMatchingPassages(inputText: string, refText: string, config: Required<PlagiarismConfig>): MatchingPassage[] {
  const refShingleSet = shingleSet(refText, config.ngramSize);
  if (refShingleSet.size === 0) return [];
  const inputWithPos = extractShinglesWithPositions(inputText, config.ngramSize);
  const common = new Map<string, Array<{ start: number; end: number }>>();
  for (const { shingle, startOffset, endOffset } of inputWithPos) {
    if (refShingleSet.has(shingle)) { if (!common.has(shingle)) common.set(shingle, []); common.get(shingle)!.push({ start: startOffset, end: endOffset }); }
  }
  if (common.size === 0) return [];
  const sorted = [...common.values()].flat().sort((a, b) => a.start - b.start);
  const passages: MatchingPassage[] = [];
  let curStart = sorted[0].start, curEnd = sorted[0].end, mc = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start - curEnd <= 20) { curEnd = Math.max(curEnd, sorted[i].end); mc++; }
    else { passages.push({ text: inputText.slice(curStart, curEnd).trim(), startOffset: curStart, endOffset: curEnd, localSimilarity: Math.min(100, Math.round(mc / Math.max(1, common.size) * 100 * 3)) }); curStart = sorted[i].start; curEnd = sorted[i].end; mc = 1; }
  }
  passages.push({ text: inputText.slice(curStart, curEnd).trim(), startOffset: curStart, endOffset: curEnd, localSimilarity: Math.min(100, Math.round(mc / Math.max(1, common.size) * 100 * 3)) });
  return passages.filter((p) => p.text.split(/\s+/).length >= 3);
}
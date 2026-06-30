import {
  tokenize, shingleSet, extractShinglesWithPositions,
  charNgrams, multiGranularityShingles, STOP_WORDS,
  detectLanguage, stemmedShingleSet,
} from "./shingles";
import {
  computeMinHashSignature, estimateJaccard, generateHashParams,
  winnow, buildTfIdfVector, cosineSimilarity, computeIdf,
  computeCompositeSimilarity,
} from "./minhash";
import type {
  PlagiarismResult, PlagiarismMatch, PlagiarismConfig,
  ReferenceDocument, MatchingPassage, TfIdfVector,
} from "./types";
import { DEFAULT_CONFIG } from "./types";

let corpus: ReferenceDocument[] = [];
let cachedParams: Array<{ a: number; b: number }> | null = null;
let cachedIdf: Map<string, number> | null = null;

function getHashParams(numHash: number) {
  if (!cachedParams || cachedParams.length !== numHash) {
    cachedParams = generateHashParams(numHash);
  }
  return cachedParams;
}

/** Rebuild IDF from current corpus. Called when corpus changes. */
function rebuildIdf() {
  if (corpus.length === 0) {
    cachedIdf = null;
    return;
  }
  const allTokens = corpus.map((d) => d.tokens.filter((t) => !STOP_WORDS.has(t)));
  cachedIdf = computeIdf(allTokens);
}

export function addReference(text: string, name: string, config: PlagiarismConfig = {}): ReferenceDocument {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const tokens = tokenize(text);
  const shingles3 = shingleSet(text, cfg.ngramSize);
  const shingles4 = shingleSet(text, cfg.ngramSize + 1);
  const charN = charNgrams(text, 5);
  const { signature } = computeMinHashSignature(
    shingles3, cfg.numHashFunctions, getHashParams(cfg.numHashFunctions)
  );
  const { fingerprint } = winnow([...shingles3], cfg.winnowWindow);

  const detectedLang = detectLanguage(text);
  const stemmedShingles3 = cfg.enableStemmed
    ? stemmedShingleSet(text, cfg.ngramSize, detectedLang === "auto" ? undefined : detectedLang)
    : new Set<string>();

  const doc: ReferenceDocument = {
    id: crypto.randomUUID(),
    name,
    text,
    signature,
    winnowFingerprint: fingerprint,
    shingleCount: shingles3.size,
    shingles4: [...shingles4],
    charNgrams: [...charN],
    tokens: tokens.filter((t) => !STOP_WORDS.has(t)),
    stemmedShingles3: [...stemmedShingles3],
    lang: detectedLang,
    addedAt: new Date().toISOString(),
  };
  corpus.push(doc);
  cachedIdf = null; // invalidate IDF cache
  return doc;
}

export function removeReference(id: string): boolean {
  const i = corpus.findIndex((d) => d.id === id);
  if (i === -1) return false;
  corpus.splice(i, 1);
  cachedIdf = null;
  return true;
}

export function getCorpus(): ReferenceDocument[] {
  return [...corpus];
}

export function clearCorpus(): void {
  corpus = [];
  cachedIdf = null;
}

export function getCorpusSize(): number {
  return corpus.length;
}

export function analyzePlagiarism(text: string, config: PlagiarismConfig = {}): PlagiarismResult {
  const start = performance.now();
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Build input features
  const inputTokens = tokenize(text).filter((t) => !STOP_WORDS.has(t));
  const inputShingles3 = shingleSet(text, cfg.ngramSize);
  const inputShingles4 = shingleSet(text, cfg.ngramSize + 1);
  const inputCharN = charNgrams(text, 5);
  const { signature: inputSig } = computeMinHashSignature(
    inputShingles3, cfg.numHashFunctions, getHashParams(cfg.numHashFunctions)
  );
  const { fingerprint: inputWinnow } = winnow([...inputShingles3], cfg.winnowWindow);

  // Stemmed shingles for input
  const inputDetectedLang = detectLanguage(text);
  const inputStemmedShingles = cfg.enableStemmed
    ? stemmedShingleSet(text, cfg.ngramSize, inputDetectedLang === "auto" ? undefined : inputDetectedLang)
    : null;

  // Build TF-IDF vector for input
  if (!cachedIdf) rebuildIdf();
  const inputTfIdf = buildTfIdfVector(inputTokens, cachedIdf);

  const matches: PlagiarismMatch[] = [];

  for (const ref of corpus) {
    if (ref.shingleCount < cfg.minShingles) continue;

    // Quick MinHash pre-filter (fast rejection)
    const minhashSim = estimateJaccard(inputSig, ref.signature);
    if (Math.round(minhashSim * 100) < cfg.similarityThreshold * 0.5) continue;

    // Build reference TF-IDF
    const refTfIdf = buildTfIdfVector(ref.tokens, cachedIdf);

    // Composite similarity
    const composite = computeCompositeSimilarity(
      inputShingles3,
      inputShingles4,
      inputCharN,
      inputTokens,
      new Set(ref.shingles4.length > 0 ? ref.shingles4 : []),
      new Set(ref.charNgrams),
      ref.tokens,
      inputSig,
      inputWinnow,
      ref.signature,
      ref.winnowFingerprint,
      inputTfIdf,
      refTfIdf,
      inputStemmedShingles ?? undefined,
      new Set(ref.stemmedShingles3.length > 0 ? ref.stemmedShingles3 : []),
      cfg.enableStemmed,
    );

    const pct = composite.score;
    if (pct < cfg.similarityThreshold) continue;

    const passages = findMatchingPassages(text, ref.text, cfg);

    matches.push({
      reference: { id: ref.id, name: ref.name },
      similarityPercent: pct,
      severity: pct >= 80 ? "critical" : pct >= 50 ? "high" : pct >= 30 ? "medium" : "low",
      matchingPassages: passages,
      breakdown: {
        minhashScore: composite.minhashScore,
        winnowScore: composite.winnowScore,
        tfidfScore: composite.tfidfScore,
        ngram4Score: composite.ngram4Score,
        charNgramScore: composite.charNgramScore,
        stemmedScore: composite.stemmedScore,
      },
    });
  }

  matches.sort((a, b) => b.similarityPercent - a.similarityPercent);

  const maxSim = matches.length > 0 ? matches[0].similarityPercent : 0;
  const overall =
    matches.length > 0
      ? Math.round(
          matches.reduce((s, m, i) => s + m.similarityPercent * Math.pow(0.8, i), 0) /
            matches.reduce((s, _, i) => s + Math.pow(0.8, i), 0)
        )
      : 0;

  return {
    overallScore: overall,
    maxSimilarity: maxSim,
    referencesChecked: corpus.length,
    matches,
    analysisTimeMs: Math.round((performance.now() - start) * 100) / 100,
    inputShingleCount: inputShingles3.size,
  };
}

function findMatchingPassages(
  inputText: string,
  refText: string,
  config: Required<PlagiarismConfig>
): MatchingPassage[] {
  const refShingleSet = shingleSet(refText, config.ngramSize);
  if (refShingleSet.size === 0) return [];

  const inputWithPos = extractShinglesWithPositions(inputText, config.ngramSize);
  const common = new Map<string, Array<{ start: number; end: number }>>();

  for (const { shingle, startOffset, endOffset } of inputWithPos) {
    if (refShingleSet.has(shingle)) {
      if (!common.has(shingle)) common.set(shingle, []);
      common.get(shingle)!.push({ start: startOffset, end: endOffset });
    }
  }

  if (common.size === 0) return [];

  const sorted = [...common.values()].flat().sort((a, b) => a.start - b.start);
  const passages: MatchingPassage[] = [];
  let curStart = sorted[0].start, curEnd = sorted[0].end, mc = 1;

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start - curEnd <= 20) {
      curEnd = Math.max(curEnd, sorted[i].end);
      mc++;
    } else {
      passages.push({
        text: inputText.slice(curStart, curEnd).trim(),
        startOffset: curStart,
        endOffset: curEnd,
        localSimilarity: Math.min(100, Math.round((mc / Math.max(1, common.size)) * 100 * 3)),
      });
      curStart = sorted[i].start;
      curEnd = sorted[i].end;
      mc = 1;
    }
  }
  passages.push({
    text: inputText.slice(curStart, curEnd).trim(),
    startOffset: curStart,
    endOffset: curEnd,
    localSimilarity: Math.min(100, Math.round((mc / Math.max(1, common.size)) * 100 * 3)),
  });

  return passages.filter((p) => p.text.split(/\s+/).length >= 3);
}
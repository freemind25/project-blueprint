/**
 * MinHash LSH + Winnowing + TF-IDF Cosine Similarity
 * Advanced plagiarism detection matching Originality.ai / Copyleaks level.
 */

const HASH_SEED_A = 2654435761;
const MAX_HASH = 0xFFFFFFFF;

function hashString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function generateHashParams(k: number): Array<{ a: number; b: number }> {
  const params: Array<{ a: number; b: number }> = [];
  for (let i = 0; i < k; i++) {
    const seed = (HASH_SEED_A * (i + 1) + 2246822519) >>> 0;
    const a = ((seed * 1103515245 + 12345) >>> 0) || 1;
    const b = ((seed >> 16) * 1103515245 + 12345) >>> 0;
    params.push({ a, b });
  }
  return params;
}

export function computeMinHashSignature(
  shingles: Set<string> | string[],
  numHashFunctions: number = 128,
  cachedParams?: Array<{ a: number; b: number }>
): { signature: Uint32Array; params: Array<{ a: number; b: number }> } {
  const params = cachedParams ?? generateHashParams(numHashFunctions);
  const signature = new Uint32Array(params.length);
  signature.fill(MAX_HASH);
  const arr = shingles instanceof Set ? [...shingles] : shingles;
  for (const shingle of arr) {
    const h = hashString(shingle);
    for (let i = 0; i < params.length; i++) {
      const v = (Math.imul(params[i].a, h) + params[i].b) >>> 0;
      if (v < signature[i]) signature[i] = v;
    }
  }
  return { signature, params };
}

export function estimateJaccard(sig1: Uint32Array, sig2: Uint32Array): number {
  if (sig1.length !== sig2.length) throw new Error(`Signature length mismatch: ${sig1.length} !== ${sig2.length}`);
  if (sig1.length === 0) return 0;
  let matches = 0;
  for (let i = 0; i < sig1.length; i++) {
    if (sig1[i] === sig2[i]) matches++;
  }
  return matches / sig1.length;
}

export function exactJaccard(set1: Set<string>, set2: Set<string>): number {
  let intersection = 0;
  for (const item of set1) {
    if (set2.has(item)) intersection++;
  }
  const union = set1.size + set2.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// ── WINNOWING (Schleimer et al., 2003) ──────────────────────────────

/**
 * Computes a document fingerprint using the Winnowing algorithm.
 * More robust than raw MinHash for long documents — selects a representative
 * subset of hash values at a fixed window size.
 */
export function winnow(
  shingles: Set<string> | string[],
  windowSize: number = 4
): { fingerprint: Uint32Array; positions: number[] } {
  const arr = shingles instanceof Set ? [...shingles] : shingles;
  if (arr.length === 0) return { fingerprint: new Uint32Array(0), positions: [] };

  // Hash all shingles
  const hashes: Array<{ hash: number; index: number }> = arr.map((s, i) => ({
    hash: hashString(s),
    index: i,
  }));

  if (hashes.length <= windowSize) {
    const min = hashes.reduce((a, b) => (a.hash < b.hash ? a : b));
    return { fingerprint: new Uint32Array([min.hash]), positions: [min.index] };
  }

  const fingerprint: Uint32Array[] = [];
  const positions: number[] = [];
  let prevMin = -1;

  for (let i = 0; i <= hashes.length - windowSize; i++) {
    const window = hashes.slice(i, i + windowSize);
    const min = window.reduce((a, b) => (a.hash < b.hash ? a : b));
    // Only add if different from previous (avoids duplicates in fingerprint)
    if (min.index !== prevMin) {
      fingerprint.push(new Uint32Array([min.hash]));
      positions.push(min.index);
      prevMin = min.index;
    }
  }

  return {
    fingerprint: new Uint32Array(fingerprint.flatMap((f) => Array.from(f))),
    positions,
  };
}

/**
 * Estimate similarity between two documents using Winnowing fingerprints.
 * Uses Jaccard on the fingerprint sets.
 */
export function winnowSimilarity(fp1: Uint32Array, fp2: Uint32Array): number {
  if (fp1.length === 0 || fp2.length === 0) return 0;
  const set1 = new Set(fp1);
  const set2 = new Set(fp2);
  let intersection = 0;
  for (const h of set1) {
    if (set2.has(h)) intersection++;
  }
  const union = set1.size + set2.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// ── TF-IDF COSINE SIMILARITY ────────────────────────────────────────

export interface TfIdfVector {
  terms: string[];
  weights: Float64Array;
  norm: number;
}

/**
 * Build a TF-IDF vector from a token list using raw TF × smooth IDF.
 * @param tokens Tokenized words (already lowercased)
 * @param idf Pre-computed IDF map (term → idf value). If null, uses raw TF only.
 */
export function buildTfIdfVector(
  tokens: string[],
  idf?: Map<string, number> | null
): TfIdfVector {
  // Raw term frequency
  const tf = new Map<string, number>();
  for (const t of tokens) {
    tf.set(t, (tf.get(t) || 0) + 1);
  }

  const terms = [...tf.keys()];
  const weights = new Float64Array(terms.length);
  let norm = 0;

  for (let i = 0; i < terms.length; i++) {
    const t = terms[i];
    const termFreq = tf.get(t)!;
    // Sub-linear TF: 1 + log(tf)
    const tfVal = 1 + Math.log(termFreq);
    const idfVal = idf ? (idf.get(t) ?? 1) : 1;
    weights[i] = tfVal * idfVal;
    norm += weights[i] * weights[i];
  }
  norm = Math.sqrt(norm) || 1;

  return { terms, weights, norm };
}

/**
 * Compute cosine similarity between two TF-IDF vectors.
 * Efficient sparse dot product using term maps.
 */
export function cosineSimilarity(v1: TfIdfVector, v2: TfIdfVector): number {
  const map2 = new Map(v2.terms.map((t, i) => [t, i]));
  let dot = 0;
  for (let i = 0; i < v1.terms.length; i++) {
    const j = map2.get(v1.terms[i]);
    if (j !== undefined) {
      dot += v1.weights[i] * v2.weights[j];
    }
  }
  return dot / (v1.norm * v2.norm);
}

/**
 * Compute IDF from a corpus of token arrays.
 * IDF(t) = log(N / df(t)) + 1  (smooth)
 */
export function computeIdf(corpusTokens: string[][]): Map<string, number> {
  const N = corpusTokens.length || 1;
  const df = new Map<string, number>();
  for (const tokens of corpusTokens) {
    const unique = new Set(tokens);
    for (const t of unique) {
      df.set(t, (df.get(t) || 0) + 1);
    }
  }
  const idf = new Map<string, number>();
  for (const [term, freq] of df) {
    idf.set(term, Math.log(N / freq) + 1);
  }
  return idf;
}

// ── MULTI-GRAM COMPOSITE SIMILARITY ─────────────────────────────────

/**
 * Composite similarity using multiple n-gram sizes + MinHash + Winnowing + TF-IDF.
 * Weighted combination for robust detection across paraphrasing levels.
 */
export interface CompositeSimilarity {
  /** Overall combined similarity (0-100) */
  score: number;
  /** MinHash Jaccard estimate at n=3 */
  minhashScore: number;
  /** Winnowing fingerprint Jaccard */
  winnowScore: number;
  /** TF-IDF cosine similarity */
  tfidfScore: number;
  /** Exact Jaccard at n=4 (catches longer matches) */
  ngram4Score: number;
  /** Character n-gram Jaccard (catches copy-paste) */
  charNgramScore: number;
  /** Stemmed shingle Jaccard (catches morphological variants) */
  stemmedScore: number;
}

export function computeCompositeSimilarity(
  inputShingles3: Set<string>,
  inputShingles4: Set<string>,
  inputCharNgrams: Set<string>,
  inputTokens: string[],
  refShingles3: Set<string>,
  refShingles4: Set<string>,
  refCharNgrams: Set<string>,
  refTokens: string[],
  inputSig: Uint32Array,
  inputWinnow: Uint32Array,
  refSig: Uint32Array,
  refWinnow: Uint32Array,
  inputTfIdf: TfIdfVector,
  refTfIdf: TfIdfVector,
  inputStemmedShingles?: Set<string> | null,
  refStemmedShingles?: Set<string> | null,
  enableStemmed?: boolean,
): CompositeSimilarity {
  const minhashScore = estimateJaccard(inputSig, refSig);
  const winnowScore = winnowSimilarity(inputWinnow, refWinnow);
  const tfidfScore = cosineSimilarity(inputTfIdf, refTfIdf);
  const ngram4Score = exactJaccard(inputShingles4, refShingles4);
  const charNgramScore = exactJaccard(inputCharNgrams, refCharNgrams);
  const stemmedScore = (enableStemmed && inputStemmedShingles && refStemmedShingles)
    ? exactJaccard(inputStemmedShingles, refStemmedShingles)
    : 0;

  // Weighted combination — tuned for plagiarism detection
  // MinHash + Winnow are best for heavy copy; TF-IDF catches paraphrasing;
  // char n-grams catch minor edits; 4-grams catch longer matches;
  // stemmed shingles catch morphological variants
  let score: number;
  if (enableStemmed && stemmedScore > 0) {
    score = Math.min(1,
      minhashScore * 0.20 +
      winnowScore * 0.15 +
      tfidfScore * 0.20 +
      ngram4Score * 0.12 +
      charNgramScore * 0.13 +
      stemmedScore * 0.20
    );
  } else {
    score = Math.min(1,
      minhashScore * 0.25 +
      winnowScore * 0.20 +
      tfidfScore * 0.25 +
      ngram4Score * 0.15 +
      charNgramScore * 0.15
    );
  }

  return {
    score: Math.round(score * 100),
    minhashScore: Math.round(minhashScore * 100),
    winnowScore: Math.round(winnowScore * 100),
    tfidfScore: Math.round(tfidfScore * 100),
    ngram4Score: Math.round(ngram4Score * 100),
    charNgramScore: Math.round(charNgramScore * 100),
    stemmedScore: Math.round(stemmedScore * 100),
  };
}
export interface ReferenceDocument {
  id: string; name: string; text: string;
  /** MinHash signature (n=3, 128 hash functions) */
  signature: Uint32Array;
  /** Winnowing fingerprint */
  winnowFingerprint: Uint32Array;
  /** Shingle count at n=3 */
  shingleCount: number;
  /** Shingle set at n=4 for multi-gram comparison */
  shingles4: string[];
  /** Character 5-gram set */
  charNgrams: string[];
  /** Token array for TF-IDF */
  tokens: string[];
  /** Stemmed 3-gram shingles for lemma-aware comparison */
  stemmedShingles3: string[];
  /** Detected language of the document */
  lang: string;
  addedAt: string;
}

export interface PlagiarismMatch {
  reference: Pick<ReferenceDocument, "id" | "name">;
  similarityPercent: number;
  severity: "low" | "medium" | "high" | "critical";
  matchingPassages: MatchingPassage[];
  /** Breakdown of similarity scores */
  breakdown?: {
    minhashScore: number;
    winnowScore: number;
    tfidfScore: number;
    ngram4Score: number;
    charNgramScore: number;
    stemmedScore: number;
  };
}

export interface MatchingPassage {
  text: string; startOffset: number; endOffset: number; localSimilarity: number;
}

export interface PlagiarismResult {
  overallScore: number; maxSimilarity: number; referencesChecked: number;
  matches: PlagiarismMatch[]; analysisTimeMs: number; inputShingleCount: number;
}

export interface PlagiarismConfig {
  ngramSize?: number;
  numHashFunctions?: number;
  similarityThreshold?: number;
  minShingles?: number;
  /** Enable TF-IDF cosine similarity (slightly slower, more accurate for paraphrasing) */
  enableTfIdf?: boolean;
  /** Enable multi-gram detection (n=3,4,5) */
  enableMultiGram?: boolean;
  /** Enable character-level n-gram comparison */
  enableCharNgram?: boolean;
  /** Winnowing window size */
  winnowWindow?: number;
  /** Enable stemmed (lemma-aware) comparison */
  enableStemmed?: boolean;
}

export const DEFAULT_CONFIG: Required<PlagiarismConfig> = {
  ngramSize: 3,
  numHashFunctions: 128,
  similarityThreshold: 20,
  minShingles: 5,
  enableTfIdf: true,
  enableMultiGram: true,
  enableCharNgram: true,
  winnowWindow: 4,
  enableStemmed: true,
};
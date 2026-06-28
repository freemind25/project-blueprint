export interface ReferenceDocument {
  id: string; name: string; text: string;
  signature: Uint32Array; shingleCount: number; addedAt: string;
}
export interface PlagiarismMatch {
  reference: Pick<ReferenceDocument, "id" | "name">;
  similarityPercent: number; severity: "low" | "medium" | "high" | "critical";
  matchingPassages: MatchingPassage[];
}
export interface MatchingPassage {
  text: string; startOffset: number; endOffset: number; localSimilarity: number;
}
export interface PlagiarismResult {
  overallScore: number; maxSimilarity: number; referencesChecked: number;
  matches: PlagiarismMatch[]; analysisTimeMs: number; inputShingleCount: number;
}
export interface PlagiarismConfig {
  ngramSize?: number; numHashFunctions?: number; similarityThreshold?: number; minShingles?: number;
}
export const DEFAULT_CONFIG: Required<PlagiarismConfig> = {
  ngramSize: 3, numHashFunctions: 128, similarityThreshold: 20, minShingles: 5,
};

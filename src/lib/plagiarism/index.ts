export { type PlagiarismResult, type PlagiarismMatch, type PlagiarismConfig, type ReferenceDocument, type MatchingPassage, DEFAULT_CONFIG } from "./types";
export { tokenize, extractShingles, shingleSet, extractShinglesWithPositions } from "./shingles";
export { computeMinHashSignature, estimateJaccard, exactJaccard, generateHashParams } from "./minhash";
export { addReference, removeReference, getCorpus, clearCorpus, getCorpusSize, analyzePlagiarism } from "./engine";
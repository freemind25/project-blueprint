export type ModelState = "idle" | "loading" | "ready" | "onnx-ready" | "error";
export type ModelSource = "builtin" | "onnx" | "custom";
export interface TextFeatures {
  heuristicScores: number[]; syntaxFeatures: number[];
  lexicalFeatures: number[]; patternFeatures: number[];
  flat: Float32Array;
}
export interface MLPrediction {
  aiProbability: number; score: number; source: ModelSource;
  confidence: number; inferenceTimeMs: number;
}
export interface ModelInfo {
  source: ModelSource; name: string; version: string; size?: string; inputShape?: number[];
}
export interface HybridAnalysis {
  heuristicScore: number; mlScore: number; combinedScore: number;
  mlPrediction?: MLPrediction; modelState: ModelState;
}
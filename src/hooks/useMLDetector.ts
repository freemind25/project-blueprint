import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { initModelService, runInference, getModelState, getModelInfo, type ModelInfo, type MLPrediction, type HybridAnalysis } from "@/lib/ml";
import { analyzeText, MIN_ANALYSIS_LENGTH, type AIAnalysisResult } from "@/lib/textAnalysis";
import { loadCustomPredictor, type CustomModel, type PredictionResult } from "@/lib/transfer";
import type { ModelState, ModelSource } from "@/lib/ml/types";

interface UseMLDetectorReturn {
  modelState: ModelState; modelInfo: ModelInfo | null;
  analyzeWithML: (text: string) => Promise<HybridAnalysis>;
  lastPrediction: MLPrediction | null; isInitializing: boolean;
  customModel: CustomModel | null;
  customPredictor: ((f: Float32Array) => number) | null;
  setCustomModel: (model: CustomModel | null) => void;
}

export const useMLDetector = (): UseMLDetectorReturn => {
  const [modelState, setModelState] = useState<ModelState>("idle");
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [lastPrediction, setLastPrediction] = useState<MLPrediction | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [customModel, setCustomModelState] = useState<CustomModel | null>(null);
  const customPredictorRef = useRef<((f: Float32Array) => number) | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    setIsInitializing(true);
    initModelService().then((info) => { setModelInfo(info); setModelState(getModelState()); }).catch(() => setModelState("error")).finally(() => setIsInitializing(false));
  }, []);

  const setCustomModel = useCallback((model: CustomModel | null) => {
    setCustomModelState(model);
    if (model) {
      try {
        customPredictorRef.current = loadCustomPredictor(model);
        toast.success(`Modèle « ${model.name} » chargé (${model.valAccuracy}% précision)`);
      } catch { toast.error("Impossible de charger le modèle personnalisé"); customPredictorRef.current = null; }
    } else { customPredictorRef.current = null; }
  }, []);

  const analyzeWithML = useCallback(async (text: string): Promise<HybridAnalysis> => {
    const heuristicResult: AIAnalysisResult = text.length >= MIN_ANALYSIS_LENGTH ? analyzeText(text) : { score: 0, perplexityScore: 0, burstinessScore: 0, transitionScore: 0, perfectionScore: 0, voiceScore: 0, vocabularyScore: 0, depthScore: 0, humanizationScore: 0, sucksScore: 0, patternCount: 0, checklist: [], details: [] };
    const heuristicScores = [heuristicResult.burstinessScore, heuristicResult.transitionScore, heuristicResult.perfectionScore, heuristicResult.voiceScore, heuristicResult.perplexityScore, heuristicResult.vocabularyScore, heuristicResult.depthScore];
    let mlScore = heuristicResult.score, mlPrediction: MLPrediction | undefined;
    try {
      const prediction = await runInference(text, heuristicScores, customPredictorRef.current ?? undefined);
      mlScore = prediction.score; mlPrediction = prediction; setLastPrediction(prediction);
    } catch { /* fallback heuristique */ }
    const combinedScore = Math.round(heuristicResult.score * 0.4 + mlScore * 0.6);
    return { heuristicScore: heuristicResult.score, mlScore, combinedScore, mlPrediction, modelState: getModelState() };
  }, []);

  return { modelState, modelInfo, analyzeWithML, lastPrediction, isInitializing, customModel, customPredictor: customPredictorRef.current, setCustomModel };
};
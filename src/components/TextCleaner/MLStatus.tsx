import React from "react";
import type { ModelState, ModelInfo } from "@/lib/ml";
import { Cpu, CheckCircle, AlertCircle, Loader2, Download, Sparkles } from "lucide-react";
interface MLStatusProps { state: ModelState; info: ModelInfo | null; isInitializing: boolean; inferenceTimeMs?: number; customModelName?: string | null; }
export const MLStatus: React.FC<MLStatusProps> = ({ state, info, isInitializing, inferenceTimeMs, customModelName }) => {
  const display = (() => {
    switch (state) {
      case "idle": return { icon: <Cpu className="w-3 h-3" />, label: "ML non initialisé", color: "text-muted-foreground" };
      case "loading": return { icon: <Loader2 className="w-3 h-3 animate-spin" />, label: "Chargement...", color: "text-warning" };
      case "ready": return { icon: <CheckCircle className="w-3 h-3" />, label: "Neural built-in", color: "text-success" };
      case "onnx-ready": return { icon: <Sparkles className="w-3 h-3" />, label: "ONNX actif", color: "text-success" };
      case "error": return { icon: <AlertCircle className="w-3 h-3" />, label: "Erreur", color: "text-destructive" };
    }
  })();
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground" aria-label={`Modèle ML : ${display.label}`}>
      <span className={display.color}>{display.icon}</span>
      <span className="font-medium">{isInitializing ? "Chargement..." : display.label}</span>
      {customModelName && <span className="text-primary font-medium">+ {customModelName}</span>}
      {info && (state === "ready" || state === "onnx-ready") && <span className="hidden sm:inline opacity-70">— {info.name}</span>}
      {inferenceTimeMs !== undefined && <span className="hidden sm:inline opacity-50">({inferenceTimeMs} ms)</span>}
    </div>
  );
};
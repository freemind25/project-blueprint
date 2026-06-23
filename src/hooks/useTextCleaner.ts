import { useState, useCallback, useMemo, useEffect, useRef } from "react";

export type HumanizeIntensity = "light" | "moderate" | "aggressive";

export interface ChangeLog {
  type: string;
  original: string;
  replacement: string;
  reason: string;
}

export interface CleanStats {
  nbspCount: number;
  narrowNbspCount: number;
  totalCleaned: number;
}

export interface HumanizeStats {
  humanizedText: string;
  modificationsCount: number;
  changeLog: ChangeLog[];
}

export const useTextCleaner = () => {
  const [text, setText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isHumanizing, setIsHumanizing] = useState(false);
  const [isCleaned, setIsCleaned] = useState(false);
  const [isHumanized, setIsHumanized] = useState(false);
  const [stats, setStats] = useState<CleanStats | null>(null);
  const [humanizeStats, setHumanizeStats] = useState<HumanizeStats | null>(null);
  const [intensity, setIntensity] = useState<HumanizeIntensity>("moderate");

  // Web Worker Ref
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Initialisation du worker
    workerRef.current = new Worker(new URL("../workers/textProcessor.worker.ts", import.meta.url), { type: "module" });
    
    workerRef.current.onmessage = (e) => {
      const { action, result } = e.data;
      if (action === "clean") {
        setText(result.cleanedText);
        setStats(result.stats);
        setIsCleaned(true);
        setIsProcessing(false);
      } else if (action === "humanize") {
        setText(result.humanizedText);
        setHumanizeStats(result);
        setIsHumanized(true);
        setIsHumanizing(false);
      }
    };

    return () => workerRef.current?.terminate();
  }, []);

  // Utilisation de useCallback pour les fonctions exposées
  const performClean = useCallback(() => {
    if (!text || !workerRef.current) return;
    setIsProcessing(true);
    workerRef.current.postMessage({ action: "clean", text });
  }, [text]);

  const performHumanize = useCallback(() => {
    if (!text || !workerRef.current) return;
    setIsHumanizing(true);
    workerRef.current.postMessage({ action: "humanize", text, options: { intensity } });
  }, [text, intensity]);

  const clearAll = useCallback(() => {
    setText("");
    setIsCleaned(false);
    setIsHumanized(false);
    setStats(null);
    setHumanizeStats(null);
  }, []);

  // Memoization de valeurs dérivées
  const wordCount = useMemo(() => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  }, [text]);

  return {
    text,
    setText,
    isProcessing,
    isHumanizing,
    isCleaned,
    isHumanized,
    stats,
    humanizeStats,
    intensity,
    setIntensity,
    performClean,
    performHumanize,
    clearAll,
    wordCount
  };
};

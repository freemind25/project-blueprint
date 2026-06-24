import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type {
  HumanizeIntensity,
  HumanizeMode,
  HumanizeStats,
  ChangeLog,
} from "@/lib/humanizer";
import type { CleanStats } from "@/lib/cleaner";
import type { WriterProfile } from "@/lib/writerProfile";

export type { HumanizeIntensity, HumanizeMode, HumanizeStats, ChangeLog };
export type { CleanStats };

export const useTextCleaner = () => {
  const [text, setText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isHumanizing, setIsHumanizing] = useState(false);
  const [isCleaned, setIsCleaned] = useState(false);
  const [isHumanized, setIsHumanized] = useState(false);
  const [stats, setStats] = useState<CleanStats | null>(null);
  const [humanizeStats, setHumanizeStats] = useState<HumanizeStats | null>(null);
  const [intensity, setIntensity] = useState<HumanizeIntensity>("moderate");
  const [mode, setMode] = useState<HumanizeMode>("naturel");
  const [untilNatural, setUntilNatural] = useState(false);
  const [profile, setProfile] = useState<WriterProfile | null>(null);

  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
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

  const performClean = useCallback(() => {
    if (!text || !workerRef.current) return;
    setIsProcessing(true);
    workerRef.current.postMessage({ action: "clean", text });
  }, [text]);

  const performHumanize = useCallback(() => {
    if (!text || !workerRef.current) return;
    setIsHumanizing(true);
    workerRef.current.postMessage({
      action: "humanize",
      text,
      options: {
        intensity,
        mode,
        // "Humanize until natural" : on vise un score IA <= 30%.
        targetScore: untilNatural ? 30 : undefined,
        maxPasses: 6,
        profile,
      },
    });
  }, [text, intensity, mode, untilNatural, profile]);

  const clearAll = useCallback(() => {
    setText("");
    setIsCleaned(false);
    setIsHumanized(false);
    setStats(null);
    setHumanizeStats(null);
  }, []);

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
    mode,
    setMode,
    untilNatural,
    setUntilNatural,
    profile,
    setProfile,
    performClean,
    performHumanize,
    clearAll,
    wordCount,
  };
};

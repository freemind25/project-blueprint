import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { toast } from "sonner";
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

const STORAGE_KEY = "unrobot:draft-text";
const MAX_HISTORY = 5;
const NATURAL_SCORE_THRESHOLD = 30;
const DEFAULT_MAX_PASSES = 5;

export const useTextCleaner = () => {
  const [text, setText] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) ?? "";
    } catch {
      return "";
    }
  });
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
  // Pile d'historique (jusqu'à MAX_HISTORY versions précédentes) pour "Annuler".
  const [history, setHistory] = useState<string[]>([]);

  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    try {
      workerRef.current = new Worker(
        new URL("../workers/textProcessor.worker.ts", import.meta.url),
        { type: "module" }
      );
    } catch (err) {
      console.error("Impossible de créer le Web Worker :", err);
      toast.error("Le moteur de traitement n'a pas pu démarrer. Réessayez en rafraîchissant la page.");
      return;
    }

    workerRef.current.onmessage = (e) => {
      const { action, result } = e.data;
      if (action === "clean") {
        setText(result.cleanedText);
        setStats(result.stats);
        setIsCleaned(true);
        setIsProcessing(false);
        toast.success("Nettoyage terminé");
      } else if (action === "humanize") {
        setText(result.humanizedText);
        setHumanizeStats(result);
        setIsHumanized(true);
        setIsHumanizing(false);
        toast.success(`Humanisation terminée — ${result.modificationsCount} modification${result.modificationsCount > 1 ? "s" : ""}`);
      }
    };

    workerRef.current.onerror = (err) => {
      console.error("Worker error:", err);
      setIsProcessing(false);
      setIsHumanizing(false);
      toast.error("Une erreur est survenue pendant le traitement, veuillez réessayer.");
    };

    return () => workerRef.current?.terminate();
  }, []);

  // Persistance locale du texte en cours (debounce ~1s).
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        if (text) localStorage.setItem(STORAGE_KEY, text);
        else localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* quota / mode privé : on ignore */
      }
    }, 1000);
    return () => clearTimeout(id);
  }, [text]);

  const pushHistory = useCallback((snapshot: string) => {
    setHistory((prev) => [...prev, snapshot].slice(-MAX_HISTORY));
  }, []);

  const performClean = useCallback(() => {
    if (!text || !workerRef.current) return;
    pushHistory(text);
    setIsProcessing(true);
    workerRef.current.postMessage({ action: "clean", text });
  }, [text, pushHistory]);

  const performHumanize = useCallback(() => {
    if (!text || !workerRef.current) return;
    pushHistory(text);
    setIsHumanizing(true);
    workerRef.current.postMessage({
      action: "humanize",
      text,
      options: {
        intensity,
        mode,
        targetScore: untilNatural ? NATURAL_SCORE_THRESHOLD : undefined,
        maxPasses: DEFAULT_MAX_PASSES,
        profile,
      },
    });
  }, [text, intensity, mode, untilNatural, profile, pushHistory]);

  const historyRef = useRef<string[]>(history);
  historyRef.current = history;

  const undo = useCallback(() => {
    const prev = historyRef.current;
    if (prev.length === 0) return;
    const previous = prev[prev.length - 1];
    setHistory((h) => h.slice(0, -1));
    setText(previous);
    setIsCleaned(false);
    setIsHumanized(false);
    setStats(null);
    setHumanizeStats(null);
    toast.success("Version précédente restaurée");
  }, []);

  const clearAll = useCallback(() => {
    setText("");
    setIsCleaned(false);
    setIsHumanized(false);
    setStats(null);
    setHumanizeStats(null);
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
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
    undo,
    canUndo: history.length > 0,
    clearAll,
    wordCount,
  };
};
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
const PROFILES_KEY = "unrobot:profiles";
const ACTIVE_PROFILE_KEY = "unrobot:active-profile";
const MAX_HISTORY = 5;

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
  const [profile, setProfile] = useState<WriterProfile | null>(() => {
    try {
      const activeId = localStorage.getItem(ACTIVE_PROFILE_KEY);
      if (!activeId) return null;
      const profiles = JSON.parse(localStorage.getItem(PROFILES_KEY) || "{}");
      return profiles[activeId] ?? null;
    } catch {
      return null;
    }
  });

  // Profils multiples nommés (Phase 0.3)
  const [profiles, setProfiles] = useState<Record<string, WriterProfile>>(() => {
    try {
      return JSON.parse(localStorage.getItem(PROFILES_KEY) || "{}");
    } catch {
      return {};
    }
  });

  // Persistance des profils dans localStorage
  useEffect(() => {
    try {
      localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
      if (profile) {
        localStorage.setItem(ACTIVE_PROFILE_KEY, profile.name);
      } else {
        localStorage.removeItem(ACTIVE_PROFILE_KEY);
      }
    } catch {
      /* quota / mode privé : on ignore */
    }
  }, [profiles, profile]);

  const saveProfile = useCallback((p: WriterProfile) => {
    setProfiles((prev) => ({ ...prev, [p.name]: p }));
    setProfile(p);
  }, []);

  const deleteProfile = useCallback((name: string) => {
    setProfiles((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
    if (profile?.name === name) setProfile(null);
  }, [profile]);

  const selectProfile = useCallback((name: string | null) => {
    if (!name) {
      setProfile(null);
      return;
    }
    setProfile(profiles[name] ?? null);
  }, [profiles]);
  // Pile d'historique (jusqu'à MAX_HISTORY versions précédentes) pour "Annuler".
  const [history, setHistory] = useState<string[]>([]);

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
        // "Humanize until natural" : on vise un score IA <= 30%.
        targetScore: untilNatural ? 30 : undefined,
        maxPasses: 6,
        profile,
      },
    });
  }, [text, intensity, mode, untilNatural, profile, pushHistory]);

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const previous = prev[prev.length - 1];
      setText(previous);
      setIsCleaned(false);
      setIsHumanized(false);
      setStats(null);
      setHumanizeStats(null);
      toast.success("Version précédente restaurée");
      return prev.slice(0, -1);
    });
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
    profiles,
    saveProfile,
    deleteProfile,
    selectProfile,
    performClean,
    performHumanize,
    undo,
    canUndo: history.length > 0,
    clearAll,
    wordCount,
  };
};

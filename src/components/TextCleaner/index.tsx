import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useTextCleaner } from "@/hooks/useTextCleaner";
import { useAIDetector, AIAnalysisResult } from "@/hooks/useAIDetector";
import { Header } from "./Header";
import { TextEditor } from "./TextEditor";
import { ActionBar } from "./ActionBar";
import { IntensitySlider } from "./IntensitySlider";
import { CleaningStats } from "./CleaningStats";
import { HumanizeLog } from "./HumanizeLog";
import { AIAnalysis } from "./AIAnalysis";
import { ModeSelector } from "./ModeSelector";
import { WriterProfilePanel } from "./WriterProfilePanel";
import { EXAMPLE_TEXTS } from "@/data/exampleTexts";
import { Button } from "@/components/ui/button";
import { FileText, FileJson, FileDown } from "lucide-react";
import { downloadReportJSON, downloadReportPDF } from "@/lib/report";

export const TextCleaner: React.FC = () => {
  const {
    text,
    setText,
    performClean,
    performHumanize,
    clearAll,
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
  } = useTextCleaner();

  const { analyzeText } = useAIDetector();

  const [isCopied, setIsCopied] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);

  const hasText = text.trim().length > 0;

  const handleAnalyze = useCallback(() => {
    if (!hasText) return;
    setIsAnalyzing(true);
    // Calcul léger, on simule un court délai pour le retour visuel
    window.requestAnimationFrame(() => {
      const result = analyzeText(text);
      setAnalysis(result);
      setIsAnalyzing(false);
    });
  }, [text, hasText, analyzeText]);

  const handleCopy = useCallback(async () => {
    if (!hasText) return;
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      toast.success("Texte copié dans le presse-papiers");
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier le texte");
    }
  }, [text, hasText]);

  const handleDownload = useCallback(() => {
    if (!hasText) return;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "texte-unrobot.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Fichier téléchargé");
  }, [text, hasText]);

  const handleClear = useCallback(() => {
    clearAll();
    setAnalysis(null);
  }, [clearAll]);

  const handleReportJSON = useCallback(() => {
    if (!hasText) return;
    downloadReportJSON({ generatedAt: new Date().toISOString(), text, analysis, humanize: humanizeStats });
    toast.success("Rapport JSON téléchargé");
  }, [hasText, text, analysis, humanizeStats]);

  const handleReportPDF = useCallback(() => {
    if (!hasText) return;
    downloadReportPDF({ generatedAt: new Date().toISOString(), text, analysis, humanize: humanizeStats });
  }, [hasText, text, analysis, humanizeStats]);

  // Analyse en arrière-plan (mise à jour discrète du score)
  useEffect(() => {
    if (!text || text.length < 50) return;
    const win = window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (!win.requestIdleCallback) return;
    const handle = win.requestIdleCallback(() => {
      setAnalysis(analyzeText(text));
    }, { timeout: 2000 });
    return () => win.cancelIdleCallback?.(handle);
  }, [text, analyzeText]);

  return (
    <div className="container mx-auto max-w-4xl p-4 space-y-6">
      <Header />
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Charger un exemple :</span>
        {EXAMPLE_TEXTS.map((ex) => (
          <Button
            key={ex.id}
            variant="outline"
            size="sm"
            onClick={() => {
              setText(ex.content);
              setAnalysis(null);
            }}
          >
            <FileText className="w-3.5 h-3.5" />
            {ex.title}
          </Button>
        ))}
      </div>
      <TextEditor value={text} onChange={setText} />
      <ModeSelector
        mode={mode}
        onModeChange={setMode}
        untilNatural={untilNatural}
        onUntilNaturalChange={setUntilNatural}
      />
      <IntensitySlider value={intensity} onChange={setIntensity} />
      <WriterProfilePanel profile={profile} onProfileChange={setProfile} />
      <ActionBar
        onClean={performClean}
        onHumanize={performHumanize}
        onDownload={handleDownload}
        onClear={handleClear}
        onCopy={handleCopy}
        onAnalyze={handleAnalyze}
        hasText={hasText}
        isCleaned={isCleaned}
        isHumanized={isHumanized}
        isCopied={isCopied}
        isProcessing={isProcessing}
        isHumanizing={isHumanizing}
        isAnalyzing={isAnalyzing}
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Rapport :</span>
        <Button variant="outline" size="sm" onClick={handleReportJSON} disabled={!hasText}>
          <FileJson className="w-3.5 h-3.5" /> JSON
        </Button>
        <Button variant="outline" size="sm" onClick={handleReportPDF} disabled={!hasText}>
          <FileDown className="w-3.5 h-3.5" /> PDF
        </Button>
      </div>

      {stats && (
        <CleaningStats
          nbspCount={stats.nbspCount}
          narrowNbspCount={stats.narrowNbspCount}
          totalCleaned={stats.totalCleaned}
          isVisible={isCleaned}
        />
      )}

      <AIAnalysis result={analysis} isAnalyzing={isAnalyzing} />

      {humanizeStats && <HumanizeLog changeLog={humanizeStats.changeLog} />}
    </div>
  );
};

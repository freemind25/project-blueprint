import React, { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { toast } from "sonner";
import { useTextCleaner } from "@/hooks/useTextCleaner";
import { useAIDetector, AIAnalysisResult } from "@/hooks/useAIDetector";
import { useMLDetector } from "@/hooks/useMLDetector";
import { usePlagiarism } from "@/hooks/usePlagiarism";
import { MIN_ANALYSIS_LENGTH } from "@/lib/textAnalysis";
import { Header } from "./Header";
import { TextEditor } from "./TextEditor";
import { FileDropZone } from "./FileDropZone";
import { ActionBar } from "./ActionBar";
import { IntensitySlider } from "./IntensitySlider";
import { ModeSelector } from "./ModeSelector";
import { WriterProfilePanel } from "./WriterProfilePanel";
import { EXAMPLE_TEXTS } from "@/data/exampleTexts";
import { Button } from "@/components/ui/button";
import { FileText, FileJson, FileDown, ShieldCheck, Brain } from "lucide-react";
import { downloadBlob } from "@/lib/utils";
import type { HybridAnalysis } from "@/lib/ml/types";
import type { CustomModel } from "@/lib/transfer";

/* Code-split: composants conditionnels / lourds */
const CleaningStats = lazy(() => import("./CleaningStats").then(m => ({ default: m.CleaningStats })));
const HumanizeLog = lazy(() => import("./HumanizeLog").then(m => ({ default: m.HumanizeLog })));
const AIAnalysis = lazy(() => import("./AIAnalysis").then(m => ({ default: m.AIAnalysis })));
const PlagiarismPanel = lazy(() => import("./PlagiarismPanel").then(m => ({ default: m.PlagiarismPanel })));
const TransferLearningPanel = lazy(() => import("./TransferLearningPanel").then(m => ({ default: m.TransferLearningPanel })));
const BatchProcessor = lazy(() => import("./BatchProcessor").then(m => ({ default: m.BatchProcessor })));

/* Chargement paresseux des rapports */
let reportCache: typeof import("@/lib/report") | null = null;
async function getReport() {
  if (!reportCache) reportCache = await import("@/lib/report");
  return reportCache;
}

const PanelFallback = () => (
  <div className="p-6 rounded-lg border border-border bg-card/80 animate-pulse">
    <div className="h-4 w-48 bg-muted rounded mb-3" />
    <div className="h-2 w-full bg-muted rounded" />
  </div>
);

export const TextCleaner: React.FC = () => {
  const {
    text, setText, performClean, performHumanize, clearAll,
    isProcessing, isHumanizing, isCleaned, isHumanized,
    stats, humanizeStats, intensity, setIntensity,
    mode, setMode, untilNatural, setUntilNatural,
    profile, setProfile, undo, canUndo,
  } = useTextCleaner();

  const { analyzeText } = useAIDetector();
  const { modelState, modelInfo, analyzeWithML, isMLInitializing, customModel, setCustomModel } = useMLDetector();
  const { checkPlagiarism, addRef, removeRef, clearAllRefs, references, corpusSize, lastResult: plagiarismResult, isChecking: isCheckingPlagiarism, importFile } = usePlagiarism();

  const [isCopied, setIsCopied] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [hybrid, setHybrid] = useState<HybridAnalysis | null>(null);
  const [showPlagiarism, setShowPlagiarism] = useState(false);
  const [showTransferLearning, setShowTransferLearning] = useState(false);

  const hasText = text.trim().length > 0;

  const handleAnalyze = useCallback(() => {
    if (!hasText) return;
    setIsAnalyzing(true);
    window.requestAnimationFrame(async () => {
      const result = analyzeText(text);
      setAnalysis(result);
      try { const h = await analyzeWithML(text); setHybrid(h); } catch { setHybrid(null); }
      setIsAnalyzing(false);
    });
  }, [text, hasText, analyzeText, analyzeWithML]);

  const handleCopy = useCallback(async () => {
    if (!hasText) return;
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      toast.success("Texte copié dans le presse-papiers");
      setTimeout(() => setIsCopied(false), 2000);
    } catch { toast.error("Impossible de copier le texte"); }
  }, [text, hasText]);

  const handleDownload = useCallback(() => {
    if (!hasText) return;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    downloadBlob(blob, "texte-unrobot.txt");
    toast.success("Fichier téléchargé");
  }, [text, hasText]);

  const handleClear = useCallback(() => {
    clearAll(); setAnalysis(null); setHybrid(null); setShowPlagiarism(false);
    toast.success("Texte effacé");
  }, [clearAll]);

  const handlePlagiarismCheck = useCallback(() => {
    if (!hasText) return;
    checkPlagiarism(text);
    setShowPlagiarism(true);
  }, [text, hasText, checkPlagiarism]);

  const handleFileLoad = useCallback((content: string, fileName: string) => {
    setText(content); setAnalysis(null); setHybrid(null);
    toast.success(`Fichier « ${fileName} » importé`);
  }, [setText]);

  const handleReportJSON = useCallback(async () => {
    if (!hasText) return;
    const { downloadReportJSON } = await getReport();
    downloadReportJSON({ generatedAt: new Date().toISOString(), text, analysis, humanize: humanizeStats });
    toast.success("Rapport JSON téléchargé");
  }, [hasText, text, analysis, humanizeStats]);

  const handleReportPDF = useCallback(async () => {
    if (!hasText) return;
    const { downloadReportPDF } = await getReport();
    downloadReportPDF({ generatedAt: new Date().toISOString(), text, analysis, humanize: humanizeStats });
  }, [hasText, text, analysis, humanizeStats]);

  useEffect(() => {
    if (!text || text.length < MIN_ANALYSIS_LENGTH) return;
    const win = window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void; };
    if (!win.requestIdleCallback) return;
    const handle = win.requestIdleCallback(() => { setAnalysis(analyzeText(text)); }, { timeout: 2000 });
    return () => win.cancelIdleCallback?.(handle);
  }, [text, analyzeText]);

  return (
    <div className="container mx-auto max-w-4xl p-4 space-y-6">
      <Header />
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Charger un exemple :</span>
        {EXAMPLE_TEXTS.map((ex) => (
          <Button key={ex.id} variant="outline" size="sm" onClick={() => { setText(ex.content); setAnalysis(null); }}>
            <FileText className="w-3.5 h-3.5" />{ex.title}
          </Button>
        ))}
      </div>
      <TextEditor value={text} onChange={setText} />
      <FileDropZone onFileLoad={handleFileLoad} onError={(m) => toast.error(m)} />
      <ModeSelector mode={mode} onModeChange={setMode} untilNatural={untilNatural} onUntilNaturalChange={setUntilNatural} />
      <IntensitySlider value={intensity} onChange={setIntensity} />
      <WriterProfilePanel profile={profile} onProfileChange={setProfile} />
      <ActionBar
        onClean={performClean} onHumanize={performHumanize} onDownload={handleDownload}
        onClear={handleClear} onCopy={handleCopy} onAnalyze={handleAnalyze} onUndo={undo} onPlagiarism={handlePlagiarismCheck}
      canUndo={canUndo} hasText={hasText} isCleaned={isCleaned} isHumanized={isHumanized}
      isCopied={isCopied} isProcessing={isProcessing} isHumanizing={isHumanizing}
      isAnalyzing={isAnalyzing} isCheckingPlagiarism={isCheckingPlagiarism}
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Outils :</span>
        <Button variant="outline" size="sm" onClick={() => setShowPlagiarism(p => !p)} className={showPlagiarism ? "border-yellow-500/50 text-yellow-600" : ""}>
          <ShieldCheck className="w-3.5 h-3.5" /> Plagiat
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShowTransferLearning(p => !p)} className={showTransferLearning ? "border-primary/50 text-primary" : ""}>
          <Brain className="w-3.5 h-3.5" /> Transfer Learning
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Rapport :</span>
        <Button variant="outline" size="sm" onClick={handleReportJSON} disabled={!hasText}>
          <FileJson className="w-3.5 h-3.5" /> JSON
        </Button>
        <Button variant="outline" size="sm" onClick={handleReportPDF} disabled={!hasText}>
          <FileDown className="w-3.5 h-3.5" /> Imprimer / PDF
        </Button>
      </div>

      {stats && (
        <Suspense fallback={<PanelFallback />}>
          <CleaningStats stats={stats} isVisible={isCleaned} />
        </Suspense>
      )}

      <Suspense fallback={<PanelFallback />}>
        <AIAnalysis result={analysis} isAnalyzing={isAnalyzing} hybrid={hybrid} modelState={modelState} modelInfo={modelInfo} isMLInitializing={isMLInitializing} />
      </Suspense>

      {showTransferLearning && (
        <Suspense fallback={<PanelFallback />}>
          <TransferLearningPanel onModelLoaded={(m: CustomModel | null) => setCustomModel(m)} activeModel={customModel} />
        </Suspense>
      )}

      {showPlagiarism && (
        <Suspense fallback={<PanelFallback />}>
          <PlagiarismPanel result={plagiarismResult} isChecking={isCheckingPlagiarism} references={references} corpusSize={corpusSize} onAddRef={addRef} onRemoveRef={removeRef} onClearCorpus={clearAllRefs} onImportFile={importFile} />
        </Suspense>
      )}

      {humanizeStats && (
  <Suspense fallback={<PanelFallback />}>
    <HumanizeLog changeLog={humanizeStats.changeLog} summary={{ passes: humanizeStats.passes, scoreBefore: humanizeStats.scoreBefore, scoreAfter: humanizeStats.scoreAfter, mode: humanizeStats.mode, intensity: humanizeStats.intensity }} />
  </Suspense>
      )}

      {/* Tauri Desktop: Batch Processing (only visible in desktop mode) */}
      <Suspense fallback={null}>
        <BatchProcessor />
      </Suspense>
    </div>
  );
};

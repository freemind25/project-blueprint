import React, { useState, useCallback } from "react";
import { toast } from "sonner";
import { FolderOpen, FileUp, Play, CheckCircle, AlertCircle, Loader2, FileText, Brain, ShieldCheck, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { batchReadDocuments, scanDirectory, pickFiles, pickFolder, isTauri } from "@/lib/tauri";
import { analyzeText } from "@/lib/textAnalysis";
import { addReference, clearCorpus, analyzePlagiarism } from "@/lib/plagiarism";

interface ProcessedFile {
  path: string;     // full path for Tauri calls
  filename: string; // display name (basename)
  text: string;
  wordCount: number;
  status: "pending" | "processing" | "done" | "error";
  error?: string;
}

interface FileAnalysis {
  aiScore: number;
  plagiarismScore: number;
}

function scoreColor(score: number): string {
  if (score < 30) return "text-green-600 dark:text-green-400";
  if (score < 70) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function scoreBgColor(score: number): string {
  if (score < 30) return "bg-green-500";
  if (score < 70) return "bg-yellow-500";
  return "bg-red-500";
}

export const BatchProcessor: React.FC = () => {
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analyses, setAnalyses] = useState<Record<number, FileAnalysis>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAddFiles = useCallback(async () => {
    try {
      const paths = await pickFiles(true);
      if (paths.length === 0) return;

      const newFiles: ProcessedFile[] = paths.map((p) => ({
        path: p,
        filename: p.split(/[/\\]/).pop() || p,
        text: "",
        wordCount: 0,
        status: "pending" as const,
      }));
      setFiles((prev) => [...prev, ...newFiles]);
      toast.success(`${paths.length} fichier(s) ajouté(s)`);
    } catch {
      toast.error("Erreur lors de la sélection");
    }
  }, []);

  const handleAddFolder = useCallback(async () => {
    try {
      const folderPath = await pickFolder();
      if (!folderPath) return;

      const paths = await scanDirectory(folderPath);
      if (paths.length === 0) {
        toast.error("Aucun fichier supporté dans ce dossier");
        return;
      }

      const newFiles: ProcessedFile[] = paths.map((p) => ({
        path: p,
        filename: p.split(/[/\\]/).pop() || p,
        text: "",
        wordCount: 0,
        status: "pending" as const,
      }));
      setFiles((prev) => [...prev, ...newFiles]);
      toast.success(`${paths.length} fichier(s) trouvé(s) dans le dossier`);
    } catch {
      toast.error("Erreur lors du scan du dossier");
    }
  }, []);

  const handleProcess = useCallback(async () => {
    if (!isTauri()) {
      toast.error("Le traitement par lots nécessite l'application bureau (Tauri)");
      return;
    }
    setIsProcessing(true);
    setProgress(0);
    const pending = files.filter((f) => f.status === "pending");
    const paths = pending.map((f) => f.path);

    // Mark pending files as processing
    setFiles((prev) =>
      prev.map((f) => (f.status === "pending" ? { ...f, status: "processing" as const } : f)),
    );

    try {
      const result = await batchReadDocuments(paths);
      setProgress(100);
      const updated = files.map((f) => {
        const doc = result.documents.find((d) => d.filename === f.filename);
        if (doc) {
          return {
            ...f,
            text: doc.text,
            wordCount: doc.word_count,
            status: "done" as const,
          };
        }
        const err = result.errors.find((e) => e.filename === f.filename);
        if (err) {
          return { ...f, status: "error" as const, error: err.error };
        }
        return f;
      });
      setFiles(updated);
      // Clear any previous analyses since file list changed
      setAnalyses({});
      toast.success(`${result.documents.length} fichier(s) traité(s), ${result.total_words} mots`);
    } catch {
      toast.error("Erreur lors du traitement par lots");
      // Revert processing status back to pending on error
      setFiles((prev) =>
        prev.map((f) => (f.status === "processing" ? { ...f, status: "pending" as const } : f)),
      );
    } finally {
      setIsProcessing(false);
    }
  }, [files]);

  const handleAnalyzeAll = useCallback(async () => {
    const doneFiles = files
      .map((f, i) => ({ file: f, index: i }))
      .filter(({ file }) => file.status === "done" && file.text.trim().length >= 50);

    if (doneFiles.length === 0) {
      toast.error("Aucun fichier traité avec assez de texte à analyser");
      return;
    }

    setIsAnalyzing(true);
    const newAnalyses: Record<number, FileAnalysis> = {};

    // Build plagiarism corpus from all done files (exclude the file being checked)
    clearCorpus();
    for (const { file } of doneFiles) {
      addReference(file.text, file.filename);
    }

    for (let i = 0; i < doneFiles.length; i++) {
      const { file, index } = doneFiles[i];

      // AI detection
      const aiResult = analyzeText(file.text);

      // Plagiarism check (the file is also in the corpus, but it will have ~100% self-similarity
      // — we look at matches that are NOT self-matches for a real plagiarism score)
      const plagResult = analyzePlagiarism(file.text);
      const selfMatch = plagResult.matches.find(
        (m) => m.reference.name === file.filename,
      );
      const otherMatches = plagResult.matches.filter(
        (m) => m.reference.name !== file.filename,
      );
      const maxOtherSimilarity =
        otherMatches.length > 0
          ? Math.max(...otherMatches.map((m) => m.similarityPercent))
          : 0;

      newAnalyses[index] = {
        aiScore: aiResult.score,
        plagiarismScore: selfMatch ? maxOtherSimilarity : plagResult.overallScore,
      };
    }

    setAnalyses(newAnalyses);
    setIsAnalyzing(false);
    toast.success(`${doneFiles.length} fichier(s) analysé(s)`);
  }, [files]);

  const handleExportResults = useCallback(() => {
    const doneFiles = files
      .map((f, i) => ({ file: f, index: i }))
      .filter(({ file }) => file.status === "done");

    if (doneFiles.length === 0) {
      toast.error("Aucun résultat à exporter");
      return;
    }

    const lines: string[] = [
      "═══════════════════════════════════════════════",
      "  UnRobot — Rapport d'analyse par lots",
      `  Généré le ${new Date().toLocaleString("fr-FR")}`,
      "═══════════════════════════════════════════════",
      "",
    ];

    for (const { file, index } of doneFiles) {
      const a = analyses[index];
      lines.push(`📄 ${file.filename}`);
      lines.push(`   Mots : ${file.wordCount}`);
      if (a) {
        lines.push(`   Score IA       : ${a.aiScore.toFixed(1)}%`);
        lines.push(`   Score Plagiat  : ${a.plagiarismScore.toFixed(1)}%`);
      } else {
        lines.push(`   (non analysé)`);
      }
      if (file.error) {
        lines.push(`   Erreur : ${file.error}`);
      }
      lines.push("");
    }

    const totalAnalyzed = doneFiles.filter(({ index }) => analyses[index]).length;
    lines.push(`───────────────────────────────────────────`);
    lines.push(`  Fichiers traités  : ${doneFiles.length}`);
    lines.push(`  Fichiers analysés : ${totalAnalyzed}`);
    lines.push("═══════════════════════════════════════════════");

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `unrobot-rapport-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Rapport exporté");
  }, [files, analyses]);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setAnalyses((prev) => {
      const next = { ...prev };
      delete next[index];
      // Shift down keys that were after the removed index
      const shifted: Record<number, FileAnalysis> = {};
      for (const [k, v] of Object.entries(prev)) {
        const ki = Number(k);
        if (ki === index) continue;
        if (ki > index) {
          shifted[ki - 1] = v;
        } else {
          shifted[ki] = v;
        }
      }
      return shifted;
    });
  }, []);

  const clearAll = useCallback(() => {
    setFiles([]);
    setProgress(0);
    setAnalyses({});
  }, []);

  if (!isTauri()) return null;

  const doneCount = files.filter((f) => f.status === "done").length;
  const hasAnalyses = Object.keys(analyses).length > 0;

  return (
    <div className="space-y-4 animate-fade-in" role="region" aria-label="Traitement par lots">
      <div className="p-6 rounded-lg border border-border bg-card/80">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <FolderOpen className="w-5 h-5 text-primary" />
            <div>
              <h3 className="font-semibold">Traitement par lots</h3>
              <p className="text-xs text-muted-foreground">.docx · .odt · .txt · .md — Accès direct au système de fichiers</p>
            </div>
          </div>
          {files.length > 0 && (
            <span className="text-sm font-medium">{files.length} fichier(s)</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleAddFiles} disabled={isProcessing}>
            <FileUp className="w-3.5 h-3.5 mr-1" /> Fichiers
          </Button>
          <Button variant="outline" size="sm" onClick={handleAddFolder} disabled={isProcessing}>
            <FolderOpen className="w-3.5 h-3.5 mr-1" /> Dossier
          </Button>
          {files.length > 0 && (
            <>
              <Button variant="default" size="sm" onClick={handleProcess} disabled={isProcessing || files.every((f) => f.status !== "pending")}>
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Play className="w-3.5 h-3.5 mr-1" />}
                {isProcessing ? "Traitement..." : "Traiter"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAnalyzeAll}
                disabled={isAnalyzing || doneCount === 0}
                className="border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
              >
                {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Brain className="w-3.5 h-3.5 mr-1" />}
                {isAnalyzing ? "Analyse..." : "Analyser tout"}
              </Button>
              {hasAnalyses && (
                <Button variant="outline" size="sm" onClick={handleExportResults}>
                  <Download className="w-3.5 h-3.5 mr-1" /> Export résultats
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={clearAll} className="text-destructive">Vider</Button>
            </>
          )}
        </div>

        {isProcessing && (
          <div className="mt-3">
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {files.length > 0 && (
          <ul className="mt-3 space-y-1 max-h-96 overflow-y-auto" role="list" aria-label="Liste des fichiers">
            {files.map((f, i) => {
              const analysis = analyses[i];
              return (
                <li key={i} className="flex items-center justify-between px-3 py-2 rounded text-sm bg-background/60 border border-border/50" role="listitem">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {f.status === "done" && <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                    {f.status === "error" && <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />}
                    {f.status === "processing" && <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />}
                    {f.status === "pending" && <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                    <span className="truncate" title={f.path}>{f.filename}</span>
                    {f.status === "done" && (
                      <span className="text-xs text-muted-foreground shrink-0">{f.wordCount} mots</span>
                    )}
                    {f.error && (
                      <span className="text-xs text-destructive truncate" title={f.error}>{f.error}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {analysis && (
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-0.5 text-xs">
                          <Brain className="w-3 h-3" />
                          <span className={scoreColor(analysis.aiScore)}>{analysis.aiScore.toFixed(0)}%</span>
                        </span>
                        <span className="inline-flex items-center gap-0.5 text-xs">
                          <ShieldCheck className="w-3 h-3" />
                          <span className={scoreColor(analysis.plagiarismScore)}>{analysis.plagiarismScore.toFixed(0)}%</span>
                        </span>
                      </div>
                    )}
                    {f.status === "pending" && (
                      <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive text-xs" aria-label={`Supprimer ${f.filename}`}>✕</button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {hasAnalyses && (
          <div className="mt-3 p-3 rounded-md bg-muted/50 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground/80">Légende des scores :</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> &lt; 30% — probablement humain</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" /> 30–70% — incertain</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> &gt; 70% — probablement IA / plagiat</span>
            </div>
            <p><Brain className="w-3 h-3 inline" /> = Score IA · <ShieldCheck className="w-3 h-3 inline" /> = Score Plagiat</p>
          </div>
        )}
      </div>
    </div>
  );
};
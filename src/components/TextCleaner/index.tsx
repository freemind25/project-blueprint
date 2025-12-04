import React, { useState, useCallback } from "react";
import { toast } from "sonner";
import { Header } from "./Header";
import { FileDropZone } from "./FileDropZone";
import { TextEditor } from "./TextEditor";
import { ActionBar } from "./ActionBar";
import { CleaningStats } from "./CleaningStats";
import { IntensitySlider } from "./IntensitySlider";
import { AIAnalysis } from "./AIAnalysis";
import { useTextCleaner } from "@/hooks/useTextCleaner";
import { useAIDetector, AIAnalysisResult } from "@/hooks/useAIDetector";
import { FileText, AlertTriangle } from "lucide-react";

export const TextCleaner: React.FC = () => {
  const {
    text,
    setText,
    fileName,
    isProcessing,
    isHumanizing,
    isCleaned,
    isHumanized,
    stats,
    humanizeStats,
    humanizeIntensity,
    setHumanizeIntensity,
    loadFile,
    performClean,
    performHumanize,
    clearAll,
    downloadFile,
    copyToClipboard,
  } = useTextCleaner();

  const { analyzeText } = useAIDetector();
  const [isCopied, setIsCopied] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);

  const handleFileLoad = useCallback(
    (content: string, name: string) => {
      loadFile(content, name);
      toast.success(`Fichier "${name}" chargé avec succès`, {
        description: `${content.length.toLocaleString("fr-FR")} caractères`,
      });
    },
    [loadFile]
  );

  const handleError = useCallback((message: string) => {
    toast.error("Erreur", {
      description: message,
      icon: <AlertTriangle className="w-5 h-5" />,
    });
  }, []);

  const handleClean = useCallback(() => {
    performClean();
    setTimeout(() => {
      if (stats?.totalCleaned === 0) {
        toast.info("Aucun caractère invisible trouvé", {
          description: "Votre texte est déjà propre !",
        });
      } else {
        toast.success("Texte nettoyé avec succès !");
      }
    }, 350);
  }, [performClean, stats]);

  const handleHumanize = useCallback(() => {
    performHumanize();
    setTimeout(() => {
      toast.success("Texte humanisé", {
        description: `${humanizeStats?.modificationsCount || 0} modifications appliquées`,
      });
    }, 550);
  }, [performHumanize, humanizeStats]);

  const handleCopy = useCallback(async () => {
    const success = await copyToClipboard();
    if (success) {
      setIsCopied(true);
      toast.success("Texte copié dans le presse-papiers");
      setTimeout(() => setIsCopied(false), 2000);
    } else {
      toast.error("Impossible de copier le texte");
    }
  }, [copyToClipboard]);

  const handleClear = useCallback(() => {
    clearAll();
    setAnalysisResult(null);
    toast.info("Zone de texte effacée");
  }, [clearAll]);

  const handleAnalyze = useCallback(() => {
    if (!text) return;
    setIsAnalyzing(true);
    
    setTimeout(() => {
      const result = analyzeText(text);
      setAnalysisResult(result);
      setIsAnalyzing(false);
      
      if (result.score < 30) {
        toast.success("Texte probablement humain", {
          description: `Score de détection: ${result.score}%`,
        });
      } else if (result.score < 60) {
        toast.warning("Texte mixte / incertain", {
          description: `Score de détection: ${result.score}%`,
        });
      } else {
        toast.error("Texte probablement généré par IA", {
          description: `Score de détection: ${result.score}%`,
        });
      }
    }, 400);
  }, [text, analyzeText]);

  return (
    <div className="min-h-screen gradient-subtle">
      <div className="container max-w-4xl mx-auto px-4 py-12">
        <Header />

        <main className="space-y-8">
          {/* File info badge */}
          {fileName && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground animate-fade-in">
              <FileText className="w-4 h-4" />
              <span>Fichier actuel :</span>
              <span className="font-medium text-foreground">{fileName}</span>
            </div>
          )}

          {/* File drop zone */}
          <div className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <FileDropZone onFileLoad={handleFileLoad} onError={handleError} />
          </div>

          {/* Text editor */}
          <div className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <TextEditor
              value={text}
              onChange={(value) => {
                setText(value);
              }}
              placeholder="Collez votre texte ici ou chargez un fichier .txt..."
            />
          </div>

          {/* Intensity slider */}
          <div className="animate-fade-in" style={{ animationDelay: "0.25s" }}>
            <IntensitySlider
              value={humanizeIntensity}
              onChange={setHumanizeIntensity}
            />
          </div>

          {/* Action buttons */}
          <div className="animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <ActionBar
              onClean={handleClean}
              onHumanize={handleHumanize}
              onDownload={downloadFile}
              onClear={handleClear}
              onCopy={handleCopy}
              onAnalyze={handleAnalyze}
              hasText={text.length > 0}
              isCleaned={isCleaned}
              isHumanized={isHumanized}
              isCopied={isCopied}
              isProcessing={isProcessing}
              isHumanizing={isHumanizing}
              isAnalyzing={isAnalyzing}
            />
          </div>

          {/* AI Analysis results */}
          {(analysisResult || isAnalyzing) && (
            <div className="animate-fade-in" style={{ animationDelay: "0.35s" }}>
              <AIAnalysis result={analysisResult} isAnalyzing={isAnalyzing} />
            </div>
          )}

          {/* Cleaning statistics */}
          {stats && (
            <div className="mt-8" style={{ animationDelay: "0.4s" }}>
              <CleaningStats
                nbspCount={stats.nbspCount}
                narrowNbspCount={stats.narrowNbspCount}
                totalCleaned={stats.totalCleaned}
                isVisible={isCleaned}
              />
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-border text-center">
          <p className="text-sm text-muted-foreground">
            Traitement 100% local • Aucune donnée envoyée vers un serveur
          </p>
        </footer>
      </div>
    </div>
  );
};

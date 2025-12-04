import React from "react";
import { Sparkles, Download, Trash2, Copy, Check, UserRound, ScanSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ActionBarProps {
  onClean: () => void;
  onHumanize: () => void;
  onDownload: () => void;
  onClear: () => void;
  onCopy: () => void;
  onAnalyze: () => void;
  hasText: boolean;
  isCleaned: boolean;
  isHumanized: boolean;
  isCopied: boolean;
  isProcessing: boolean;
  isHumanizing: boolean;
  isAnalyzing: boolean;
}

export const ActionBar: React.FC<ActionBarProps> = ({
  onClean,
  onHumanize,
  onDownload,
  onClear,
  onCopy,
  onAnalyze,
  hasText,
  isCleaned,
  isHumanized,
  isCopied,
  isProcessing,
  isHumanizing,
  isAnalyzing,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        variant="hero"
        size="lg"
        onClick={onClean}
        disabled={!hasText || isProcessing || isHumanizing}
        className="relative overflow-hidden"
      >
        {isProcessing ? (
          <>
            <div className="absolute inset-0 animate-shimmer" />
            <span className="relative">Nettoyage...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            Nettoyer le texte
          </>
        )}
      </Button>

      <Button
        variant="default"
        size="lg"
        onClick={onHumanize}
        disabled={!hasText || isProcessing || isHumanizing}
        className={cn(
          "relative overflow-hidden bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white border-0",
          isHumanized && "ring-2 ring-violet-400 ring-offset-2 ring-offset-background"
        )}
      >
        {isHumanizing ? (
          <>
            <div className="absolute inset-0 animate-shimmer" />
            <span className="relative">Humanisation...</span>
          </>
        ) : (
          <>
            <UserRound className="w-5 h-5" />
            Humaniser
          </>
        )}
      </Button>

      <Button
        variant="outline"
        size="lg"
        onClick={onAnalyze}
        disabled={!hasText || isProcessing || isHumanizing || isAnalyzing}
        className="border-blue-500/50 text-blue-500 hover:bg-blue-500/10 hover:text-blue-400"
      >
        {isAnalyzing ? (
          <>
            <ScanSearch className="w-5 h-5 animate-pulse" />
            Analyse...
          </>
        ) : (
          <>
            <ScanSearch className="w-5 h-5" />
            Analyser IA
          </>
        )}
      </Button>

      <Button
        variant="success"
        size="lg"
        onClick={onDownload}
        disabled={!hasText}
      >
        <Download className="w-5 h-5" />
        Télécharger
      </Button>

      <Button
        variant="glass"
        size="lg"
        onClick={onCopy}
        disabled={!hasText}
        className={cn(isCopied && "text-success border-success/50")}
      >
        {isCopied ? (
          <>
            <Check className="w-5 h-5" />
            Copié !
          </>
        ) : (
          <>
            <Copy className="w-5 h-5" />
            Copier
          </>
        )}
      </Button>

      <Button
        variant="outline"
        size="lg"
        onClick={onClear}
        disabled={!hasText}
        className="text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
      >
        <Trash2 className="w-5 h-5" />
        Effacer
      </Button>
    </div>
  );
};

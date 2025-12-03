import React from "react";
import { Sparkles, Download, Trash2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ActionBarProps {
  onClean: () => void;
  onDownload: () => void;
  onClear: () => void;
  onCopy: () => void;
  hasText: boolean;
  isCleaned: boolean;
  isCopied: boolean;
  isProcessing: boolean;
}

export const ActionBar: React.FC<ActionBarProps> = ({
  onClean,
  onDownload,
  onClear,
  onCopy,
  hasText,
  isCleaned,
  isCopied,
  isProcessing,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        variant="hero"
        size="lg"
        onClick={onClean}
        disabled={!hasText || isProcessing}
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

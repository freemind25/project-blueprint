import React from "react";
import { Sparkles, Download, Trash2, Copy, Check, UserRound, ScanSearch, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ActionBarProps {
  onClean: () => void;
  onHumanize: () => void;
  onDownload: () => void;
  onClear: () => void;
  onCopy: () => void;
  onAnalyze: () => void;
  onUndo: () => void;
  hasText: boolean;
  isCleaned: boolean;
  isHumanized: boolean;
  isCopied: boolean;
  isProcessing: boolean;
  isHumanizing: boolean;
  isAnalyzing: boolean;
  canUndo: boolean;
}

const ToolbarButton: React.FC<{
  onClick: () => void;
  disabled: boolean;
  className?: string;
  label: string;
  children: React.ReactNode;
  variant?: "default" | "outline" | "hero" | "success" | "glass";
  size?: "default" | "sm" | "lg" | "icon";
}> = ({ onClick, disabled, className, label, children, variant = "outline", size = "lg" }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant={variant}
        size={size}
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "relative overflow-hidden",
          className
        )}
        aria-label={label}
      >
        {children}
        <span className="sr-only sm:not-sr-only sm:inline">
          {label}
        </span>
      </Button>
    </TooltipTrigger>
    <TooltipContent side="bottom" className="sm:hidden">
      <p>{label}</p>
    </TooltipContent>
  </Tooltip>
);

export const ActionBar: React.FC<ActionBarProps> = ({
  onClean,
  onHumanize,
  onDownload,
  onClear,
  onCopy,
  onAnalyze,
  onUndo,
  hasText,
  isCleaned,
  isHumanized,
  isCopied,
  isProcessing,
  isHumanizing,
  isAnalyzing,
  canUndo,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3" role="toolbar" aria-label="Actions sur le texte">
      <ToolbarButton
        onClick={onClean}
        disabled={!hasText || isProcessing || isHumanizing}
        label="Nettoyer le texte"
        variant="hero"
        size="lg"
      >
        {isProcessing ? (
          <>
            <div className="absolute inset-0 animate-shimmer" />
            <Sparkles className="w-5 h-5 sm:mr-2" />
            <span className="hidden sm:inline">Nettoyage...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5 sm:mr-2" />
            <span className="hidden sm:inline">Nettoyer le texte</span>
          </>
        )}
      </ToolbarButton>

      <ToolbarButton
        onClick={onHumanize}
        disabled={!hasText || isProcessing || isHumanizing}
        label="Humaniser"
        variant="default"
        size="lg"
        className={cn(
          isHumanized && "ring-2 ring-primary/60 ring-offset-2 ring-offset-background"
        )}
      >
        {isHumanizing ? (
          <>
            <div className="absolute inset-0 animate-shimmer" />
            <UserRound className="w-5 h-5 sm:mr-2" />
            <span className="hidden sm:inline">Humanisation...</span>
          </>
        ) : (
          <>
            <UserRound className="w-5 h-5 sm:mr-2" />
            <span className="hidden sm:inline">Humaniser</span>
          </>
        )}
      </ToolbarButton>

      <ToolbarButton
        onClick={onAnalyze}
        disabled={!hasText || isProcessing || isHumanizing || isAnalyzing}
        label="Analyser IA"
        size="lg"
        className="border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
      >
        {isAnalyzing ? (
          <>
            <ScanSearch className="w-5 h-5 sm:mr-2 animate-pulse" />
            <span className="hidden sm:inline">Analyse...</span>
          </>
        ) : (
          <>
            <ScanSearch className="w-5 h-5 sm:mr-2" />
            <span className="hidden sm:inline">Analyser IA</span>
          </>
        )}
      </ToolbarButton>

      <ToolbarButton
        onClick={onDownload}
        disabled={!hasText}
        label="Télécharger"
        variant="success"
        size="lg"
      >
        <Download className="w-5 h-5 sm:mr-2" />
        <span className="hidden sm:inline">Télécharger</span>
      </ToolbarButton>

      <ToolbarButton
        onClick={onCopy}
        disabled={!hasText}
        label={isCopied ? "Copié" : "Copier"}
        variant="glass"
        size="lg"
        className={cn(isCopied && "text-success border-success/50")}
      >
        {isCopied ? (
          <>
            <Check className="w-5 h-5 sm:mr-2" />
            <span className="hidden sm:inline">Copié !</span>
          </>
        ) : (
          <>
            <Copy className="w-5 h-5 sm:mr-2" />
            <span className="hidden sm:inline">Copier</span>
          </>
        )}
      </ToolbarButton>

      <ToolbarButton
        onClick={onClear}
        disabled={!hasText}
        label="Effacer"
        size="lg"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
      >
        <Trash2 className="w-5 h-5 sm:mr-2" />
        <span className="hidden sm:inline">Effacer</span>
      </ToolbarButton>

      <ToolbarButton
        onClick={onUndo}
        disabled={!canUndo || isProcessing || isHumanizing}
        label="Annuler"
        size="lg"
      >
        <Undo2 className="w-5 h-5 sm:mr-2" />
        <span className="hidden sm:inline">Annuler</span>
      </ToolbarButton>
    </div>
  );
};
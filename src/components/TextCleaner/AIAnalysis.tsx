import React from "react";
import { AIAnalysisResult } from "@/hooks/useAIDetector";
import { AlertTriangle, CheckCircle, XCircle, Bot, Brain, Sparkles, MessageSquare, Gauge } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface AIAnalysisProps {
  result: AIAnalysisResult | null;
  isAnalyzing: boolean;
}

const getScoreLabel = (score: number): { label: string; color: string; icon: React.ReactNode } => {
  if (score < 30) {
    return { 
      label: "Probablement humain", 
      color: "text-green-500", 
      icon: <CheckCircle className="w-5 h-5 text-green-500" /> 
    };
  }
  if (score < 60) {
    return { 
      label: "Mixte / Incertain", 
      color: "text-yellow-500", 
      icon: <AlertTriangle className="w-5 h-5 text-yellow-500" /> 
    };
  }
  return { 
    label: "Probablement IA", 
    color: "text-red-500", 
    icon: <XCircle className="w-5 h-5 text-red-500" /> 
  };
};

const getProgressColor = (score: number): string => {
  if (score < 30) return "bg-green-500";
  if (score < 60) return "bg-yellow-500";
  return "bg-red-500";
};

const getSeverityColor = (severity: "low" | "medium" | "high"): string => {
  switch (severity) {
    case "low": return "border-green-500/30 bg-green-500/10";
    case "medium": return "border-yellow-500/30 bg-yellow-500/10";
    case "high": return "border-red-500/30 bg-red-500/10";
  }
};

const ScoreBar: React.FC<{ label: string; score: number; icon: React.ReactNode }> = ({ label, score, icon }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between text-xs">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="font-medium">{score}%</span>
    </div>
    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
      <div 
        className={`h-full transition-all duration-500 ${getProgressColor(score)}`}
        style={{ width: `${score}%` }}
      />
    </div>
  </div>
);

export const AIAnalysis: React.FC<AIAnalysisProps> = ({ result, isAnalyzing }) => {
  if (isAnalyzing) {
    return (
      <div className="p-6 rounded-lg border border-border bg-card animate-pulse">
        <div className="flex items-center gap-3">
          <Bot className="w-5 h-5 text-muted-foreground animate-spin" />
          <span className="text-sm text-muted-foreground">Analyse en cours...</span>
        </div>
      </div>
    );
  }

  if (!result || result.score === 0) {
    return null;
  }

  const { label, color, icon } = getScoreLabel(result.score);

  return (
    <div className="space-y-4 p-6 rounded-lg border border-border bg-card/80 animate-fade-in">
      {/* Main score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <h3 className="font-semibold">Analyse de détection IA</h3>
            <p className={`text-sm font-medium ${color}`}>{label}</p>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-3xl font-bold ${color}`}>{result.score}%</div>
          <p className="text-xs text-muted-foreground">Score de détection</p>
        </div>
      </div>

      {/* Overall progress */}
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-700 ${getProgressColor(result.score)}`}
          style={{ width: `${result.score}%` }}
        />
      </div>

      {/* Detailed scores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <ScoreBar 
          label="Burstiness" 
          score={result.burstinessScore} 
          icon={<Gauge className="w-3 h-3" />} 
        />
        <ScoreBar 
          label="Transitions" 
          score={result.transitionScore} 
          icon={<MessageSquare className="w-3 h-3" />} 
        />
        <ScoreBar 
          label="Perfection" 
          score={result.perfectionScore} 
          icon={<Sparkles className="w-3 h-3" />} 
        />
        <ScoreBar 
          label="Voix générique" 
          score={result.voiceScore} 
          icon={<Bot className="w-3 h-3" />} 
        />
        <ScoreBar 
          label="Perplexité" 
          score={result.perplexityScore} 
          icon={<Brain className="w-3 h-3" />} 
        />
      </div>

      {/* Issues found */}
      {result.details.length > 0 && (
        <div className="space-y-2 pt-2">
          <h4 className="text-sm font-medium text-muted-foreground">Problèmes détectés</h4>
          <div className="space-y-2">
            {result.details.map((detail, index) => (
              <div 
                key={index}
                className={`p-3 rounded-md border ${getSeverityColor(detail.severity)}`}
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                    detail.severity === "high" ? "text-red-500" : 
                    detail.severity === "medium" ? "text-yellow-500" : "text-green-500"
                  }`} />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{detail.category}</p>
                    <p className="text-xs text-muted-foreground">{detail.issue}</p>
                    {detail.examples && detail.examples.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {detail.examples.map((example, i) => (
                          <span 
                            key={i}
                            className="text-xs px-1.5 py-0.5 rounded bg-background/50 text-muted-foreground"
                          >
                            {example}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

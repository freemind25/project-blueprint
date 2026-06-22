import { useCallback } from "react";

export interface AIAnalysisResult {
  score: number;
  perplexityScore: number;
  burstinessScore: number;
  transitionScore: number;
  lexicalDiversityScore: number;
  details: AnalysisDetail[];
}

interface AnalysisDetail {
  category: string;
  issue: string;
  severity: "low" | "medium" | "high";
  examples?: string[];
}

export const useAIDetector = () => {
  const analyzeText = useCallback((text: string): AIAnalysisResult => {
    if (!text || text.length < 50) {
      return { score: 0, perplexityScore: 0, burstinessScore: 0, transitionScore: 0, lexicalDiversityScore: 0, details: [] };
    }

    const details: AnalysisDetail[] = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    
    // 1. Burstiness (Variation de longueur des phrases)
    const sentenceLengths = sentences.map(s => s.trim().split(/\s+/).length);
    const avgLength = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
    const variance = sentenceLengths.reduce((a, b) => a + Math.pow(b - avgLength, 2), 0) / sentenceLengths.length;
    const stdDev = Math.sqrt(variance);
    const burstinessScore = Math.max(0, Math.min(100, (1 - (stdDev / avgLength)) * 100));

    if (burstinessScore > 70) {
      details.push({ category: "Burstiness", issue: "Structure trop uniforme", severity: "high" });
    }

    // 2. Lexical Diversity (TTR - Type-Token Ratio)
    const uniqueWords = new Set(words);
    const ttr = (uniqueWords.size / words.length) * 100;
    const lexicalDiversityScore = Math.max(0, Math.min(100, (1 - (ttr / 100)) * 100));

    if (ttr < 40) {
      details.push({ category: "Diversité", issue: "Vocabulaire répétitif", severity: "medium" });
    }

    // 3. Transitions Mécaniques
    const transitions = ["en effet", "cependant", "de plus", "par ailleurs", "en outre", "par conséquent"];
    let transCount = 0;
    transitions.forEach(t => {
      const regex = new RegExp(`\\b${t}\\b`, "gi");
      transCount += (text.match(regex) || []).length;
    });
    const transitionScore = Math.min(100, (transCount / words.length) * 500);

    // Score Global (Moyenne pondérée)
    const score = Math.round((burstinessScore * 0.4) + (lexicalDiversityScore * 0.3) + (transitionScore * 0.3));

    return {
      score,
      perplexityScore: 0, // Placeholder pour modèle futur
      burstinessScore,
      transitionScore,
      lexicalDiversityScore,
      details
    };
  }, []);

  return { analyzeText };
};

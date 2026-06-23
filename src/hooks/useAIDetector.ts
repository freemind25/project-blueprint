import { useCallback } from "react";

export interface AIAnalysisResult {
  score: number;
  perplexityScore: number;
  burstinessScore: number;
  transitionScore: number;
  perfectionScore: number;
  voiceScore: number;
  vocabularyScore: number;
  depthScore: number;
  details: AnalysisDetail[];
}

interface AnalysisDetail {
  category: string;
  issue: string;
  severity: "low" | "medium" | "high";
  examples?: string[];
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export const useAIDetector = () => {
  const analyzeText = useCallback((text: string): AIAnalysisResult => {
    if (!text || text.length < 50) {
      return {
        score: 0,
        perplexityScore: 0,
        burstinessScore: 0,
        transitionScore: 0,
        perfectionScore: 0,
        voiceScore: 0,
        vocabularyScore: 0,
        depthScore: 0,
        details: [],
      };
    }

    const details: AnalysisDetail[] = [];
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const words = text.toLowerCase().match(/\b[\wàâäéèêëîïôöùûüç]+\b/gi) || [];

    // 1. Burstiness (variation de longueur des phrases)
    const sentenceLengths = sentences.map((s) => s.trim().split(/\s+/).length);
    const avgLength = sentenceLengths.reduce((a, b) => a + b, 0) / Math.max(1, sentenceLengths.length);
    const variance = sentenceLengths.reduce((a, b) => a + Math.pow(b - avgLength, 2), 0) / Math.max(1, sentenceLengths.length);
    const stdDev = Math.sqrt(variance);
    const burstinessScore = clamp((1 - stdDev / Math.max(1, avgLength)) * 100);
    if (burstinessScore > 70) {
      details.push({ category: "Burstiness", issue: "Longueur de phrases trop uniforme (typique de l'IA)", severity: "high" });
    }

    // 2. Diversité lexicale (TTR)
    const uniqueWords = new Set(words);
    const ttr = (uniqueWords.size / Math.max(1, words.length)) * 100;
    const vocabularyScore = clamp(100 - ttr);
    if (ttr < 40) {
      details.push({ category: "Vocabulaire", issue: "Diversité lexicale faible, vocabulaire répétitif", severity: "medium" });
    }

    // 3. Transitions mécaniques
    const transitions = [
      "en effet", "cependant", "de plus", "par ailleurs", "en outre", "par conséquent",
      "néanmoins", "toutefois", "de surcroît", "however", "moreover", "furthermore",
      "therefore", "consequently",
    ];
    let transCount = 0;
    const transFound: string[] = [];
    transitions.forEach((t) => {
      const m = text.match(new RegExp(`\\b${t}\\b`, "gi")) || [];
      if (m.length) transFound.push(t);
      transCount += m.length;
    });
    const transitionScore = clamp((transCount / Math.max(1, words.length)) * 600);
    if (transitionScore > 45) {
      details.push({ category: "Transitions", issue: "Connecteurs logiques trop fréquents", severity: "medium", examples: transFound.slice(0, 6) });
    }

    // 4. Perfection (absence d'oralité / familiarités)
    const informalMarkers = (text.match(/\b(bah|ben|du coup|genre|truc|ouais|franchement|carrément)\b/gi) || []).length;
    const ellipsis = (text.match(/\.\.\.|…/g) || []).length;
    const informalDensity = (informalMarkers + ellipsis) / Math.max(1, sentences.length);
    const perfectionScore = clamp(100 - informalDensity * 220);
    if (perfectionScore > 80) {
      details.push({ category: "Perfection", issue: "Style trop lisse, aucune marque d'oralité", severity: "low" });
    }

    // 5. Voix générique (formules passe-partout des LLM)
    const genericPhrases = [
      "il est important de", "il convient de", "dans le monde de", "à l'ère du",
      "en conclusion", "pour conclure", "force est de constater", "il est essentiel",
      "in today's world", "it is important to", "plays a crucial role", "in conclusion",
      "delve into", "a testament to",
    ];
    let genericCount = 0;
    const genericFound: string[] = [];
    genericPhrases.forEach((p) => {
      const m = text.match(new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")) || [];
      if (m.length) genericFound.push(p);
      genericCount += m.length;
    });
    const voiceScore = clamp((genericCount / Math.max(1, sentences.length)) * 350);
    if (voiceScore > 40) {
      details.push({ category: "Voix générique", issue: "Formulations passe-partout caractéristiques de l'IA", severity: "high", examples: genericFound.slice(0, 6) });
    }

    // 6. Perplexité approximée (prévisibilité)
    const commonWords = new Set([
      "le", "la", "les", "de", "des", "un", "une", "et", "à", "en", "que", "qui",
      "dans", "pour", "est", "ce", "il", "elle", "the", "of", "and", "to", "in", "is", "a",
    ]);
    const commonCount = words.filter((w) => commonWords.has(w)).length;
    const commonRatio = (commonCount / Math.max(1, words.length)) * 100;
    const perplexityScore = clamp(commonRatio * 1.8);

    // 7. Profondeur (détails concrets : chiffres, noms propres)
    const digits = (text.match(/\d/g) || []).length;
    const properNouns = (text.match(/(?<=\s)[A-ZÀ-Ý][a-zà-ÿ]{2,}/g) || []).length;
    const concreteDensity = (digits + properNouns) / Math.max(1, words.length);
    const depthScore = clamp(100 - concreteDensity * 900);
    if (depthScore > 85) {
      details.push({ category: "Profondeur", issue: "Peu de détails concrets (chiffres, noms, exemples)", severity: "low" });
    }

    const score = clamp(
      burstinessScore * 0.2 +
        transitionScore * 0.15 +
        perfectionScore * 0.15 +
        voiceScore * 0.2 +
        perplexityScore * 0.1 +
        vocabularyScore * 0.1 +
        depthScore * 0.1
    );

    return {
      score,
      perplexityScore,
      burstinessScore,
      transitionScore,
      perfectionScore,
      voiceScore,
      vocabularyScore,
      depthScore,
      details,
    };
  }, []);

  return { analyzeText };
};

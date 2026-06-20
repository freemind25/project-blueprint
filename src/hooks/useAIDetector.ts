import { useCallback } from "react";

export interface AIAnalysisResult {
  score: number; // 0-100, higher = more likely AI
  perplexityScore: number;
  burstinessScore: number;
  transitionScore: number;
  perfectionScore: number;
  voiceScore: number;
  vocabularyScore: number;
  depthScore: number;
  details: AnalysisDetail[];
}

export interface AnalysisDetail {
  category: string;
  issue: string;
  severity: "low" | "medium" | "high";
  examples?: string[];
}

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
        details: [],
      };
    }

    const details: AnalysisDetail[] = [];
    
    // 1. Analyze sentence length variation (burstiness)
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const sentenceLengths = sentences.map(s => s.trim().split(/\s+/).length);
    const avgLength = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
    const variance = sentenceLengths.reduce((a, b) => a + Math.pow(b - avgLength, 2), 0) / sentenceLengths.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = stdDev / avgLength;
    
    // Low variation = more likely AI (humans vary sentence length more)
    const burstinessScore = Math.max(0, Math.min(100, (1 - coefficientOfVariation) * 150));
    
    if (coefficientOfVariation < 0.3) {
      details.push({
        category: "Burstiness",
        issue: "Longueur des phrases très uniforme",
        severity: "high",
        examples: [`Écart-type: ${stdDev.toFixed(1)} mots, moyenne: ${avgLength.toFixed(1)} mots`],
      });
    } else if (coefficientOfVariation < 0.5) {
      details.push({
        category: "Burstiness",
        issue: "Variation de longueur limitée",
        severity: "medium",
      });
    }

    // 2. Detect mechanical transitions
    const mechanicalTransitions = [
      { pattern: /\bDe plus\b/gi, label: "De plus" },
      { pattern: /\bPar ailleurs\b/gi, label: "Par ailleurs" },
      { pattern: /\bIl est important de noter\b/gi, label: "Il est important de noter" },
      { pattern: /\bEn effet\b/gi, label: "En effet" },
      { pattern: /\bCependant\b/gi, label: "Cependant" },
      { pattern: /\bNéanmoins\b/gi, label: "Néanmoins" },
      { pattern: /\bPar conséquent\b/gi, label: "Par conséquent" },
      { pattern: /\bEn outre\b/gi, label: "En outre" },
      { pattern: /\bDans le cadre de\b/gi, label: "Dans le cadre de" },
      { pattern: /\bAfin de\b/gi, label: "Afin de" },
      { pattern: /\bIl convient de\b/gi, label: "Il convient de" },
      { pattern: /\bForce est de constater\b/gi, label: "Force est de constater" },
      { pattern: /\bEn ce qui concerne\b/gi, label: "En ce qui concerne" },
      { pattern: /\bDans un premier temps\b/gi, label: "Dans un premier temps" },
      { pattern: /\bDans un second temps\b/gi, label: "Dans un second temps" },
    ];

    const foundTransitions: string[] = [];
    let transitionCount = 0;
    mechanicalTransitions.forEach(({ pattern, label }) => {
      const matches = text.match(pattern);
      if (matches) {
        transitionCount += matches.length;
        foundTransitions.push(`"${label}" (${matches.length}x)`);
      }
    });

    const wordCount = text.split(/\s+/).length;
    const transitionDensity = (transitionCount / wordCount) * 100;
    const transitionScore = Math.min(100, transitionDensity * 50);

    if (foundTransitions.length > 3) {
      details.push({
        category: "Transitions mécaniques",
        issue: "Utilisation excessive de transitions formelles typiques de l'IA",
        severity: transitionDensity > 2 ? "high" : "medium",
        examples: foundTransitions.slice(0, 5),
      });
    }

    // 3. Detect excessive syntactic perfection
    let perfectionIndicators = 0;
    
    // Check for lack of ellipsis or informal punctuation
    const hasEllipsis = /\.{3}|…/.test(text);
    const hasDashes = /—|–/.test(text);
    const hasExclamations = /!/.test(text);
    const hasQuestions = /\?/.test(text);
    
    if (!hasEllipsis) perfectionIndicators++;
    if (!hasDashes) perfectionIndicators++;
    if (!hasExclamations && text.length > 500) perfectionIndicators++;
    if (!hasQuestions && text.length > 500) perfectionIndicators++;
    
    // Check for parenthetical asides (humans use these more)
    const parentheticals = (text.match(/\([^)]+\)/g) || []).length;
    if (parentheticals < 1 && text.length > 300) perfectionIndicators++;
    
    // Check for contractions/informal language
    const informalPatterns = /\by'a\b|\bp'têt\b|\bquelqu'un\b|\bquoi\b[.!?,]|\bbref\b|\bdu coup\b|\bgenre\b/gi;
    const hasInformal = informalPatterns.test(text);
    if (!hasInformal && text.length > 200) perfectionIndicators++;
    
    const perfectionScore = Math.min(100, perfectionIndicators * 18);
    
    if (perfectionIndicators >= 4) {
      details.push({
        category: "Perfection syntaxique",
        issue: "Texte trop \"propre\" - absence de variations naturelles",
        severity: "high",
        examples: [
          !hasEllipsis ? "Aucun point de suspension" : null,
          !hasDashes ? "Aucun tiret long" : null,
          !hasInformal ? "Langage trop formel" : null,
        ].filter(Boolean) as string[],
      });
    }

    // 4. Detect generic/neutral voice
    const genericPhrases = [
      /\bil est essentiel de\b/gi,
      /\bil est crucial de\b/gi,
      /\bjouent un rôle important\b/gi,
      /\bdans le contexte actuel\b/gi,
      /\bfait partie intégrante\b/gi,
      /\bpermettre de mieux comprendre\b/gi,
      /\bforce est de constater que\b/gi,
      /\bil va sans dire que\b/gi,
      /\bà cet égard\b/gi,
      /\ben définitive\b/gi,
      /\bsans conteste\b/gi,
      /\bà bien des égards\b/gi,
    ];

    const foundGeneric: string[] = [];
    genericPhrases.forEach(pattern => {
      const match = text.match(pattern);
      if (match) {
        foundGeneric.push(`"${match[0]}"`);
      }
    });

    const voiceScore = Math.min(100, foundGeneric.length * 20);

    if (foundGeneric.length > 2) {
      details.push({
        category: "Voix générique",
        issue: "Expressions impersonnelles typiques de l'IA",
        severity: foundGeneric.length > 4 ? "high" : "medium",
        examples: foundGeneric.slice(0, 4),
      });
    }

    // 5. Perplexity simulation (word repetition patterns)
    const words = text.toLowerCase().match(/\b[a-zàâäéèêëïîôùûüç]+\b/g) || [];
    const wordFreq: Record<string, number> = {};
    words.forEach(word => {
      if (word.length > 4) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });
    
    const repeatedWords = Object.entries(wordFreq)
      .filter(([_, count]) => count > 3)
      .sort((a, b) => b[1] - a[1]);
    
    const repetitionRate = repeatedWords.length / Object.keys(wordFreq).length;
    const perplexityScore = Math.min(100, repetitionRate * 400);
    
    if (repeatedWords.length > 5) {
      details.push({
        category: "Perplexité",
        issue: "Vocabulaire répétitif et prévisible",
        severity: repetitionRate > 0.2 ? "high" : "medium",
        examples: repeatedWords.slice(0, 5).map(([word, count]) => `"${word}" (${count}x)`),
      });
    }

    // Calculate overall score
    const overallScore = Math.round(
      (burstinessScore * 0.25) +
      (transitionScore * 0.25) +
      (perfectionScore * 0.2) +
      (voiceScore * 0.15) +
      (perplexityScore * 0.15)
    );

    return {
      score: Math.min(100, overallScore),
      perplexityScore: Math.round(perplexityScore),
      burstinessScore: Math.round(burstinessScore),
      transitionScore: Math.round(transitionScore),
      perfectionScore: Math.round(perfectionScore),
      voiceScore: Math.round(voiceScore),
      details,
    };
  }, []);

  return { analyzeText };
};

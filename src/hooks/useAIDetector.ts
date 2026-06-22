import { useCallback, useMemo } from "react";

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

// Pre-compiled patterns for better performance
const SENTENCE_PATTERN = /[.!?]+/;
const WORD_PATTERN = /\b[a-zàâäéèêëïîôùûüç]+\b/g;
const LONG_WORD_PATTERN = /\b[a-zàâäéèêëïîôùûüç]{4,}\b/g;
const ELLIPSIS_PATTERN = /\.{3}|…/;
const DASHES_PATTERN = /—|–/;
const EXCLAMATIONS_PATTERN = /!/;
const QUESTIONS_PATTERN = /\?/;
const PARENTHETICAL_PATTERN = /\([^)]+\)/g;
const INFORMAL_PATTERN =
  /\by'a\b|\bp'têt\b|\bquelqu'un\b|\bquoi\b[.!?,]|\bbref\b|\bdu coup\b|\bgenre\b/gi;
const NUANCE_MARKERS =
  /\bpar exemple\b|\bjuste\b|\bvraiment\b|\bplutôt\b|\bun peu\b|\bcarrément\b|\bfranchement\b|—|\(/gi;

// Memoized pattern definitions
const MECHANICAL_TRANSITIONS = [
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

const GENERIC_PHRASES = [
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

const FILLER_PHRASES = [
  /\bil est important de (considérer|tenir compte|souligner|rappeler)\b/gi,
  /\bil convient de (souligner|noter|rappeler)\b/gi,
  /\bcela soulève des questions importantes\b/gi,
  /\bdans un monde (en constante évolution|de plus en plus)\b/gi,
  /\bjoue un rôle (clé|crucial|central|essentiel)\b/gi,
  /\bde nombreux (facteurs|aspects|éléments)\b/gi,
  /\bil est essentiel de comprendre\b/gi,
  /\bà l'ère (du numérique|moderne)\b/gi,
  /\bun enjeu majeur\b/gi,
  /\bouvre la voie à\b/gi,
  /\bil ne fait aucun doute que\b/gi,
  /\bprendre en compte (tous les|différents) (aspects|points de vue)\b/gi,
];

export const useAIDetector = () => {
  // Memoize pattern compilation
  const patterns = useMemo(
    () => ({
      mechanicalTransitions: MECHANICAL_TRANSITIONS,
      genericPhrases: GENERIC_PHRASES,
      fillerPhrases: FILLER_PHRASES,
    }),
    []
  );

  const analyzeText = useCallback(
    (text: string): AIAnalysisResult => {
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

      // 1. Analyze sentence length variation (burstiness) - single pass
      const sentences = text.split(SENTENCE_PATTERN).filter((s) => s.trim().length > 0);
      const sentenceLengths = sentences.map((s) =>
        s.trim().split(/\s+/).length
      );
      const avgLength =
        sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
      const variance =
        sentenceLengths.reduce((a, b) => a + Math.pow(b - avgLength, 2), 0) /
        sentenceLengths.length;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = stdDev / avgLength;

      const burstinessScore = Math.max(
        0,
        Math.min(100, (1 - coefficientOfVariation) * 150)
      );

      if (coefficientOfVariation < 0.3) {
        details.push({
          category: "Burstiness",
          issue: "Longueur des phrases très uniforme",
          severity: "high",
          examples: [
            `Écart-type: ${stdDev.toFixed(1)} mots, moyenne: ${avgLength.toFixed(1)} mots`,
          ],
        });
      } else if (coefficientOfVariation < 0.5) {
        details.push({
          category: "Burstiness",
          issue: "Variation de longueur limitée",
          severity: "medium",
        });
      }

      // 2. Detect mechanical transitions - optimized with single pass
      const foundTransitions: string[] = [];
      let transitionCount = 0;

      patterns.mechanicalTransitions.forEach(({ pattern, label }) => {
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
          issue:
            "Utilisation excessive de transitions formelles typiques de l'IA",
          severity: transitionDensity > 2 ? "high" : "medium",
          examples: foundTransitions.slice(0, 5),
        });
      }

      // 3. Detect excessive syntactic perfection - combined checks
      let perfectionIndicators = 0;

      const hasEllipsis = ELLIPSIS_PATTERN.test(text);
      const hasDashes = DASHES_PATTERN.test(text);
      const hasExclamations = EXCLAMATIONS_PATTERN.test(text);
      const hasQuestions = QUESTIONS_PATTERN.test(text);

      if (!hasEllipsis) perfectionIndicators++;
      if (!hasDashes) perfectionIndicators++;
      if (!hasExclamations && text.length > 500) perfectionIndicators++;
      if (!hasQuestions && text.length > 500) perfectionIndicators++;

      const parentheticals = (text.match(PARENTHETICAL_PATTERN) || []).length;
      if (parentheticals < 1 && text.length > 300) perfectionIndicators++;

      const hasInformal = INFORMAL_PATTERN.test(text);
      if (!hasInformal && text.length > 200) perfectionIndicators++;

      const perfectionScore = Math.min(100, perfectionIndicators * 18);

      if (perfectionIndicators >= 4) {
        details.push({
          category: "Perfection syntaxique",
          issue: 'Texte trop "propre" - absence de variations naturelles',
          severity: "high",
          examples: [
            !hasEllipsis ? "Aucun point de suspension" : null,
            !hasDashes ? "Aucun tiret long" : null,
            !hasInformal ? "Langage trop formel" : null,
          ].filter(Boolean) as string[],
        });
      }

      // 4. Detect generic/neutral voice - single pass
      const foundGeneric: string[] = [];
      patterns.genericPhrases.forEach((pattern) => {
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

      // 5. Perplexity simulation (word repetition patterns) - optimized
      const words = text.toLowerCase().match(LONG_WORD_PATTERN) || [];
      const wordFreq: Record<string, number> = {};

      // Single pass to build frequency map
      words.forEach((word) => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      });

      const repeatedWords = Object.entries(wordFreq)
        .filter(([_, count]) => count > 3)
        .sort((a, b) => b[1] - a[1]);

      const repetitionRate =
        repeatedWords.length / Object.keys(wordFreq).length;
      const perplexityScore = Math.min(100, repetitionRate * 400);

      if (repeatedWords.length > 5) {
        details.push({
          category: "Perplexité",
          issue: "Vocabulaire répétitif et prévisible",
          severity: repetitionRate > 0.2 ? "high" : "medium",
          examples: repeatedWords
            .slice(0, 5)
            .map(([word, count]) => `"${word}" (${count}x)`),
        });
      }

      // 6. Generic vocabulary & lack of nuance - combined single pass
      const allWords = text.toLowerCase().match(WORD_PATTERN) || [];
      const lexicalSet = new Set(allWords.filter((w) => w.length > 3));
      const lexicalDiversity =
        allWords.length > 0 ? lexicalSet.size / allWords.length : 1;

      const nuanceCount = (text.match(NUANCE_MARKERS) || []).length;

      let vocabularyScore = Math.round(
        Math.max(0, Math.min(100, (1 - lexicalDiversity) * 120))
      );
      if (nuanceCount < 2 && text.length > 300)
        vocabularyScore = Math.min(100, vocabularyScore + 25);

      if (
        lexicalDiversity < 0.45 ||
        (nuanceCount < 2 && text.length > 300)
      ) {
        details.push({
          category: "Vocabulaire générique",
          issue:
            "Vocabulaire « sûr » et conventionnel, manque de jargon, de métaphores ou de nuances personnelles",
          severity: lexicalDiversity < 0.35 ? "high" : "medium",
          examples: [
            `Diversité lexicale: ${(lexicalDiversity * 100).toFixed(0)}%`,
            `Marqueurs de nuance: ${nuanceCount}`,
          ],
        });
      }

      // 7. Surface-level coherence / superficial depth (filler sentences)
      const foundFiller: string[] = [];
      patterns.fillerPhrases.forEach((pattern) => {
        const match = text.match(pattern);
        if (match) foundFiller.push(`"${match[0]}"`);
      });

      const sentenceCount = sentences.length || 1;
      const fillerDensity = (foundFiller.length / sentenceCount) * 100;
      const depthScore = Math.min(100, foundFiller.length * 22 + fillerDensity);

      if (foundFiller.length > 1) {
        details.push({
          category: "Profondeur superficielle",
          issue:
            "Phrases de remplissage cohérentes en surface mais sans contenu substantiel",
          severity: foundFiller.length > 3 ? "high" : "medium",
          examples: foundFiller.slice(0, 4),
        });
      }

      // Calculate overall score
      const overallScore = Math.round(
        burstinessScore * 0.2 +
          transitionScore * 0.2 +
          perfectionScore * 0.15 +
          voiceScore * 0.12 +
          perplexityScore * 0.11 +
          vocabularyScore * 0.1 +
          depthScore * 0.12
      );

      return {
        score: Math.min(100, overallScore),
        perplexityScore: Math.round(perplexityScore),
        burstinessScore: Math.round(burstinessScore),
        transitionScore: Math.round(transitionScore),
        perfectionScore: Math.round(perfectionScore),
        voiceScore: Math.round(voiceScore),
        vocabularyScore: Math.round(vocabularyScore),
        depthScore: Math.round(depthScore),
        details,
      };
    },
    [patterns]
  );

  return { analyzeText };
};

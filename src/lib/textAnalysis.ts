/**
 * Moteur d'analyse IA — 100% local, sans dépendance React ni réseau.
 * Source unique de vérité partagée entre le hook UI, le worker et les tests.
 */

export interface AIAnalysisResult {
  score: number;
  perplexityScore: number;
  burstinessScore: number;
  transitionScore: number;
  perfectionScore: number;
  voiceScore: number;
  vocabularyScore: number;
  depthScore: number;
  humanizationScore: number;
  sucksScore: number;
  patternCount: number;
  checklist: ChecklistItem[];
  details: AnalysisDetail[];
}

export interface AnalysisDetail {
  category: string;
  issue: string;
  severity: Severity;
  examples?: string[];
  suggestions?: string[];
}

export interface ChecklistItem {
  label: string;
  passed: boolean;
}

export type Severity = "low" | "medium" | "high";

interface PatternDef {
  category: string;
  severity: Severity;
  points: number;
  regex: RegExp;
  issue: string;
  suggestion: string;
}

// Anti-AI Writing Engine : motifs textuels typiques de l'IA (FR + EN), 100% local.
export const AI_PATTERNS: PatternDef[] = [
  {
    category: "Construction corrélative",
    severity: "high",
    points: 10,
    regex: /(?:aren't|isn't|wasn't|weren't|n'est pas|ne sont pas)\s+just\s+.+?\s*[-–—]\s*(?:they're|it's|they were|c'est|ce sont)/gi,
    issue: "Structure « X n'est pas juste Y - c'est Z », tic d'écriture IA très courant.",
    suggestion: "Affirmez l'idée directement, sans l'opposition « pas juste... mais ».",
  },
  {
    category: "Langage hésitant",
    severity: "medium",
    points: 3,
    regex: /\b(might|could|perhaps|possibly|maybe|somewhat|peut-être|sans doute|il semblerait)\b/gi,
    issue: "Formulations qui hésitent alors que l'auteur est sûr de lui.",
    suggestion: "Supprimez les atténuateurs quand l'affirmation est certaine.",
  },
  {
    category: "Adoucisseurs",
    severity: "low",
    points: 2,
    regex: /\b(just|actually|en fait|tout simplement)\b/gi,
    issue: "Usage répété de « just » / « actually » qui affaiblit le propos.",
    suggestion: "Retirez l'adoucisseur sauf s'il signifie réellement « seulement ».",
  },
  {
    category: "Voix passive",
    severity: "medium",
    points: 4,
    regex: /\b(was|were|been|being)\s+\w+ed\b/gi,
    issue: "Voix passive qui masque qui fait l'action.",
    suggestion: "Réécrivez avec un sujet explicite qui agit.",
  },
  {
    category: "Phrases rhétoriques interdites",
    severity: "high",
    points: 8,
    regex: /\b(let that sink in|now more than ever|the best part\??|the secret\??|here's the thing|let's be honest|at the end of the day|soyons honnêtes|au final)\b/gi,
    issue: "Tournures rhétoriques passe-partout caractéristiques de l'IA.",
    suggestion: "Supprimez la formule et entrez directement dans le vif du sujet.",
  },
  {
    category: "Ouvertures interdites",
    severity: "high",
    points: 7,
    regex: /(in the ever-evolving|in today's fast-paced|gone are the days|this underscores|in an era where|dans un monde en constante évolution|à l'ère du)/gi,
    issue: "Phrase d'accroche générique typique des textes générés.",
    suggestion: "Commencez par un fait concret ou une idée spécifique.",
  },
  {
    category: "Jargon corporate",
    severity: "low",
    points: 2,
    regex: /\b(leveraging|synergies|stakeholder|ecosystem|synergie|optimiser l'engagement)\b/gi,
    issue: "Jargon d'entreprise vide de sens concret.",
    suggestion: "Remplacez par des mots simples et concrets.",
  },
  {
    category: "Langage vague",
    severity: "low",
    points: 3,
    regex: /(many people think|various studies show|significant improvements|beaucoup de gens pensent|de nombreuses études|améliorations significatives)/gi,
    issue: "Affirmations vagues sans chiffres ni source.",
    suggestion: "Remplacez par des données précises (chiffres, exemples, sources).",
  },
];

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

// Détection de phrasé staccato : 3+ phrases consécutives de moins de 5 mots.
const detectStaccato = (sentences: string[]): number => {
  let run = 0;
  let hits = 0;
  sentences.forEach((s) => {
    const len = s.trim().split(/\s+/).filter(Boolean).length;
    if (len > 0 && len < 5) {
      run += 1;
      if (run === 3) hits += 1;
    } else {
      run = 0;
    }
  });
  return hits;
};

/** Analyse complète d'un texte. Pure, déterministe (hors aléatoire : aucun). */
export function analyzeText(text: string): AIAnalysisResult {
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
      humanizationScore: 0,
      sucksScore: 0,
      patternCount: 0,
      checklist: [],
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

  // 8. Anti-AI Writing Engine : motifs explicites + suggestions de réécriture
  let patternCount = 0;
  let patternPoints = 0;
  const patternHits: Record<string, boolean> = {};
  AI_PATTERNS.forEach((p) => {
    const matches = text.match(p.regex) || [];
    if (matches.length === 0) return;
    patternHits[p.category] = true;
    patternCount += matches.length;
    patternPoints += matches.length * p.points;
    const examples = Array.from(new Set(matches.map((m) => m.trim()))).slice(0, 5);
    details.push({
      category: p.category,
      issue: p.issue,
      severity: p.severity,
      examples,
      suggestions: [p.suggestion],
    });
  });

  const staccatoHits = detectStaccato(sentences);
  if (staccatoHits > 0) {
    patternCount += staccatoHits;
    patternPoints += staccatoHits * 5;
    patternHits["Phrasé staccato"] = true;
    details.push({
      category: "Phrasé staccato",
      issue: "Suite de fragments courts et dramatiques (« No fluff. No filler. »).",
      severity: "medium",
      suggestions: ["Combinez les fragments en phrases complètes."],
    });
  }

  const score = clamp(
    burstinessScore * 0.2 +
      transitionScore * 0.15 +
      perfectionScore * 0.15 +
      voiceScore * 0.2 +
      perplexityScore * 0.1 +
      vocabularyScore * 0.1 +
      depthScore * 0.1 +
      Math.min(40, patternPoints)
  );

  const humanizationScore = clamp(100 - score);

  // Score SUCKS (Specific, Unique, Clear, Simple, Sticky) — heuristique locale 0-100.
  const specific = clamp(100 - depthScore * 0.6 + (digits + properNouns > 3 ? 20 : 0));
  const unique = clamp(100 - voiceScore * 0.7 - (patternHits["Langage vague"] ? 25 : 0));
  const clear = clamp(100 - transitionScore * 0.5 - (patternHits["Jargon corporate"] ? 25 : 0));
  const simple = clamp(100 - vocabularyScore * 0.4 - (avgLength > 25 ? 25 : 0));
  const sticky = clamp(100 - perfectionScore * 0.5 - (patternHits["Phrases rhétoriques interdites"] ? 20 : 0));
  const sucksScore = clamp((specific + unique + clear + simple + sticky) / 5);

  const checklist: ChecklistItem[] = [
    { label: "Aucune construction corrélative", passed: !patternHits["Construction corrélative"] },
    { label: "Pas de langage hésitant", passed: !patternHits["Langage hésitant"] },
    { label: "Pas de voix passive", passed: !patternHits["Voix passive"] },
    { label: "Pas de phrases rhétoriques interdites", passed: !patternHits["Phrases rhétoriques interdites"] },
    { label: "Score SUCKS > 70", passed: sucksScore > 70 },
    { label: "Variété de longueur des phrases", passed: burstinessScore < 70 },
  ];

  return {
    score,
    perplexityScore,
    burstinessScore,
    transitionScore,
    perfectionScore,
    voiceScore,
    vocabularyScore,
    depthScore,
    humanizationScore,
    sucksScore,
    patternCount,
    checklist,
    details,
  };
}
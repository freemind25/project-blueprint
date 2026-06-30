/**
 * Moteur d'analyse IA — 100% local, sans dépendance React ni réseau.
 * Source unique de vérité partagée entre le hook UI, le worker et les tests.
 */
import { splitSentences } from "./utils";

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

/** Longueur minimale (caractères) pour lancer une analyse significative. */
export const MIN_ANALYSIS_LENGTH = 50;

/** Pondérations des sous-scores dans le score global. */
const SCORE_WEIGHTS = {
  burstiness: 0.2,
  transition: 0.15,
  perfection: 0.15,
  voice: 0.2,
  perplexity: 0.1,
  vocabulary: 0.1,
  depth: 0.1,
  maxPatternPoints: 40,
} as const;

/** Multiplicateurs de normalisation pour chaque sous-score. */
const MULTIPLIERS = {
  transition: 600,
  perfection: 220,
  voice: 350,
  perplexity: 1.8,
  depth: 900,
} as const;

/** Pondérations et seuils du score SUCKS. */
const SUCKS_CONFIG = {
  specific:   { weight: 0.6, bonus: 25, threshold: 3, field: "depth" as const },
  unique:     { weight: 0.7, penalty: 25, flag: "Langage vague" as const, field: "voice" as const },
  clear:      { weight: 0.5, penalty: 25, flag: "Jargon corporate" as const, field: "transition" as const },
  simple:     { weight: 0.4, penalty: 25, avgLengthThreshold: 25, field: "vocabulary" as const },
  sticky:     { weight: 0.5, penalty: 20, flag: "Phrases rhétoriques interdites" as const, field: "perfection" as const },
} as const;

// Anti-AI Writing Engine : motifs textuels typiques de l'IA (FR + EN), 100% local.
// Basé sur le guide Wikipedia « Signs of AI writing » + extensions locales.
export const AI_PATTERNS: PatternDef[] = [
  // ── MOTIFS DE CONTENU ──────────────────────────────────────────────

  // #1 Emphase indue sur l'importance
  {
    category: "Emphase artificielle",
    severity: "high",
    points: 8,
    regex: /\b(constitue un témoignage|joue un rôle (vital|significatif|cruciel|déterminant)|met en lumière son importance|reflète une tendance plus large|ouvrant la voie à|marquant un tournant|façonnant le|point central|marque indélébile|profondément ancré|contribuant à)\b/gi,
    issue: "L'importance est gonflée artificiellement avec des formules vides.",
    suggestion: "Énoncez les faits directement, sans affirmer leur importance.",
  },

  // #2 Emphase sur la notoriété
  {
    category: "Notoriété excessive",
    severity: "medium",
    points: 5,
    regex: /\b(couverture (indépendante|média)|rédigé par un expert reconnu|présence active sur les réseaux| largement cité)\b/gi,
    issue: "L'IA assomme le lecteur avec des affirmations de notoriété sans contexte.",
    suggestion: "Citez la source, le média et la date précisément, ou supprimez.",
  },

  // #3 Analyses superficielles en « -ant »
  {
    category: "Gérondifs superficiels",
    severity: "high",
    points: 7,
    regex: /\b(soulignant|mettant en (évidence|avant)|reflétant|symbolisant|contribuant à|cultivant|favorisant|englobant|illustrant)\s+/gi,
    issue: "Participes présents accrochés en fin de phrase pour donner une fausse profondeur.",
    suggestion: "Réécrivez avec un verbe conjugué ou supprimez la proposition.",
  },

  // #4 Langage promotionnel
  {
    category: "Langage promotionnel",
    severity: "high",
    points: 7,
    regex: /\b(vibrant|au riche patrimoine|beauté naturelle|somptueux|à couper le souffle|incontournable|révolutionnaire|réputé|niché|au cœur de|illustre parfaitement)\b/gi,
    issue: "Ton promotionnel et publicitaire incompatible avec un texte neutre ou informatif.",
    suggestion: "Remplacez par des descriptions factuelles.",
  },

  // #5 Attributions vagues
  {
    category: "Attributions vagues",
    severity: "medium",
    points: 5,
    regex: /\b(des (rapports sectoriels|observateurs ont relevé|experts estiment|critiques avancent|sources|publications))\b/gi,
    issue: "Opinions attribuées à des autorités vagues sans source précise.",
    suggestion: "Nommez l'auteur, l'étude ou le média précisément.",
  },

  // #6 Section « Défis et perspectives »
  {
    category: "Squelette formulaique",
    severity: "high",
    points: 8,
    regex: /(?:malgré (son|sa|ces|les)\s+\w+.*(?:fait face à|rencontre|doit faire face à)\s+(?:plusieurs\s+)?défis|(?:défis et|perspectives d'avenir|malgré ces défis))/gi,
    issue: "Section « Défis » formulaique typique des textes IA.",
    suggestion: "Remplacez par des faits précis : quels problèmes, quelles dates, quelles réponses.",
  },

  // ── MOTIFS DE LANGUE ET GRAMMAIRE ──────────────────────────────────

  // #8 Équilibre forcé
  {
    category: "Équilibre forcé",
    severity: "high",
    points: 8,
    regex: /\bd'un côté[^.]+de l'autre côté/gi,
    issue: "Fausse symétrie « d'un côté... de l'autre » imposée même quand unjustifiée.",
    suggestion: "Prenez position au lieu de tout équilibrer artificiellement.",
  },

  // #9 Vocabulaire typique IA
  {
    category: "Vocabulaire IA",
    severity: "high",
    points: 6,
    regex: /\b(par ailleurs|s'aligner sur|explorer en profondeur|durable|pérenne|renforcer|favoriser|susciter|mettre en lumière|déterminant|tapisserie|témoignage|souligner|précieux|vibrant|paysage (en constante évolution|technologique|numérique))\b/gi,
    issue: "Mots qui apparaissent bien plus fréquemment dans les textes post-2023.",
    suggestion: "Utilisez des synonymes courants ou reformulez.",
  },

  // #10 Vocabulaire trop soutenu
  {
    category: "Vocabulaire soutenu",
    severity: "medium",
    points: 4,
    regex: /\b(s'avérer nécessaire|s'efforcer de|à proximité immédiate de|préalablement à|postérieurement à|procéder au commencement de)\b/gi,
    issue: "Tournures multi-syllabiques là où un mot court dirait la même chose.",
    suggestion: "Utilisez : falloir, essayer, près de, avant, après, démarrer.",
  },

  // #11 Évitement du verbe « être »
  {
    category: "Contournement de « être »",
    severity: "medium",
    points: 4,
    regex: /\b(se présente comme|constitue (un|une)|représente (un|une)|offre un(e?)\s)/gi,
    issue: "L'IA remplace « être » par des tournures élaborées.",
    suggestion: "Utilisez simplement « est » ou « sont ».",
  },

  // #12 Parallélismes négatifs
  {
    category: "Parallélisme négatif",
    severity: "high",
    points: 9,
    regex: /(?:il ne s'agit pas (seulement|juste) de[^.,;]+?[-–—,]\s*(c'est|il s'agit)|n'est pas (seulement|juste) un[^.,;]+?[-–—,]\s*(c'est|c'est une)|isn't just[^.,;]+?[-–—,]\s*(it's|they're))/gi,
    issue: "Structure « Il ne s'agit pas seulement de X — c'est Y » surutilisée par l'IA.",
    suggestion: "Affirmez l'idée directement.",
  },

  // #13 Formule du trois
  {
    category: "Formule du trois",
    severity: "medium",
    points: 5,
    regex: /(?:\w+(?:e|ent|ons|ez),\s*\w+(?:e|ent|ons|ez)\s+et\s+\w+(?:e|ent|ons|ez)){2,}/gi,
    issue: "Regroupements artificiels en trois pour paraître exhaustif.",
    suggestion: "Ne listez que ce qui est nécessaire.",
  },

  // #14 Variation élégante (cycle de synonymes)
  // (détecté via le voiceScore et la TTR, pas de regex simple)

  // #15 Fausses échelles
  {
    category: "Fausse échelle",
    severity: "medium",
    points: 5,
    regex: /de\s+.+?\s+à\s+.+?,\s*de\s+.+?\s+à\s+/gi,
    issue: "Construction « de X à Y, de A à B » où les éléments ne forment pas une échelle cohérente.",
    suggestion: "Énumérez directement les éléments sans forcer une progression.",
  },

  // ── MOTIFS DE STYLE ────────────────────────────────────────────────

  // #16 Abus des tirets cadratins
  {
    category: "Tirets cadratins abusifs",
    severity: "medium",
    points: 3,
    regex: /[^—\n]*—[^—\n]*—/g,
    issue: "Plusieurs tirets cadratins dans une même phrase, imitant un style « percutant ».",
    suggestion: "Remplacez par des virgules ou séparez en deux phrases.",
  },

  // #17 Abus du gras
  {
    category: "Gras abusif",
    severity: "low",
    points: 2,
    regex: /\*\*[^*]+\*\*/g,
    issue: "Mise en gras mécanique de passages entiers.",
    suggestion: "Ne mettez en gras que les termes vraiment essentiels.",
  },

  // #19 Title Case en français
  {
    category: "Title Case",
    severity: "medium",
    points: 4,
    regex: /##?\s+[A-ZÀÂÉÈÊÏÔÙÛÜŒ][a-zàâéèêëîïôöùûüçÿ]+(?:\s+[A-ZÀÂÉÈÊÏÔÙÛÜŒ][a-zàâéèêëîïôöùûüçÿ]+){2,}/g,
    issue: "Tous les mots importants capitalisés (calque de l'anglais « Title Case »).",
    suggestion: "En français, seul le premier mot et les noms propres prennent une majuscule dans les titres.",
  },

  // #20 Émojis décoratifs
  {
    category: "Émojis décoratifs",
    severity: "low",
    points: 2,
    regex: /(?:^|\n|\s)[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]\s*\*\*/u,
    issue: "Émojis utilisés comme puces décoratives, caractéristiques de l'IA.",
    suggestion: "Supprimez les émojis et utilisez des puces simples.",
  },

  // #21 Squelette de document rigide
  {
    category: "Squelette rigide",
    severity: "high",
    points: 8,
    regex: /##\s*(Introduction|Points clés|Avantages|Inconvénients|Défis|Conclusion)\b/gi,
    issue: "Structure en sections génériques (Intro/Points clés/Avantages/Défis/Conclusion).",
    suggestion: "Laissez le contenu dicter la structure, pas l'inverse.",
  },

  // ── MOTIFS DE COMMUNICATION ────────────────────────────────────────

  // #23 Artefacts de chatbot
  {
    category: "Artefacts de chatbot",
    severity: "high",
    points: 10,
    regex: /\b(j'?espère que (ça|cela) (vous )?aide|bien sûr !?|certainement !?|vous avez tout à fait raison|souhaitez-vous|n'?hésitez pas (à me le faire savoir|à me dire)|voici (un|une))\b/gi,
    issue: "Phrases d'interaction chatbot collées dans le contenu final.",
    suggestion: "Supprimez tous les artefacts de conversation avec l'IA.",
  },

  // #24 Avertissements date limite
  {
    category: "Avertissements temporels",
    severity: "medium",
    points: 4,
    regex: /\b(à la date de|jusqu'à (ma|la )?(dernière mise à jour|mes connaissances)|les informations (spécifiques|disponibles) sont (limitées|rares)|d'?après les informations disponibles)\b/gi,
    issue: "Avertissements de l'IA sur ses limites temporelles, collés dans le texte.",
    suggestion: "Supprimez ou remplacez par une vérification factuelle.",
  },

  // #25 Ton servile
  {
    category: "Ton servile",
    severity: "medium",
    points: 5,
    regex: /\b(excellente question|remarquable|point (très )?intéressant|vous avez (tout à fait )?raison (de|de dire que))\b/gi,
    issue: "Langage excessivement positif et complaisant envers le lecteur.",
    suggestion: "Répondez directement sans flatter.",
  },

  // #28 Conclusions positives génériques
  {
    category: "Conclusion générique",
    severity: "high",
    points: 8,
    regex: /\b(l'?avenir s'?annonce (radieux|prometteur)|des temps passionnants nous attendent|chemin vers l'?excellence|avancée majeure dans la bonne direction|poursuit (sa|son) chemin|continu(?:e|era) de (prospérer|croître|s'?améliorer))\b/gi,
    issue: "Fin vague et enjouée, typique des textes générés.",
    suggestion: "Terminez par un fait concret ou une action spécifique.",
  },

  // #29 Mots composés avec trait d'union excessif
  {
    category: "Traits d'union abusifs",
    severity: "low",
    points: 3,
    regex: /\b(multi-fonctionnel|en temps-réel|à long-terme|de bout-en-bout|bien-connu|haute-qualité|orienté-détail|axé-sur)\b/gi,
    issue: "Traits d'union réguliers là où les humains sont inconsistants ou n'en mettent pas.",
    suggestion: "Écrivez sans trait d'union : pluridisciplinaire, en temps réel, à long terme, etc.",
  },

  // ── MOTIFS EXISTANTS (conservés) ───────────────────────────────────

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
    regex: /\b(leveraging|synergies?|stakeholder|ecosystem|synergie|optimiser l'engagement)\b/gi,
    issue: "Jargon d'entreprise vide de sens concret.",
    suggestion: "Remplacez par des mots simples et concrets.",
  },
  {
    category: "Langage vague",
    severity: "low",
    points: 3,
    regex: /(many people think|various studies show|significant improvements|beaucoup de gens pensent|de nombreuses études|améliorations significatives)\b/gi,
    issue: "Affirmations vagues sans chiffres ni source.",
    suggestion: "Remplacez par des données précises (chiffres, exemples, sources).",
  },
  // #27 Atténuation excessive
  {
    category: "Atténuation excessive",
    severity: "medium",
    points: 5,
    regex: /\b(potentiellement\s+avancer|pourrait\s+éventuellement|il\s+est\s+possible\s+que|on\s+pourrait\s+penser\s+que)\b/gi,
    issue: "Sur-qualification permanente des affirmations.",
    suggestion: "Affirmez directement ou dites que vous ne savez pas.",
  },
  // #26 Locutions de remplissage
  {
    category: "Locutions de remplissage",
    severity: "medium",
    points: 4,
    regex: /\b(afin d'atteindre cet objectif|à l'heure actuelle|dans l'éventualité où|il convient de noter que|il est (important|essentiel) de (souligner|noter|retenir)|au (cœur|sein) du sujet)\b/gi,
    issue: "Locutions qui allongent les phrases sans apporter d'information.",
    suggestion: "Supprimez ou remplacez par une formulation directe.",
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
  if (!text || text.length < MIN_ANALYSIS_LENGTH) {
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
  const sentences = splitSentences(text);
  // Inclut les majuscules accentuées (À, É, È, Ô, etc.)
  const words = text.toLowerCase().match(/\b[\wàâäéèêëîïôöùûüçÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ]+\b/gi) || [];

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
  const transitionScore = clamp((transCount / Math.max(1, words.length)) * MULTIPLIERS.transition);
  if (transitionScore > 45) {
    details.push({ category: "Transitions", issue: "Connecteurs logiques trop fréquents", severity: "medium", examples: transFound.slice(0, 6) });
  }

  // 4. Perfection (absence d'oralité / familiarités)
  const informalMarkers = (text.match(/\b(bah|ben|du coup|genre|truc|ouais|franchement|carrément)\b/gi) || []).length;
  const ellipsis = (text.match(/\.\.\.|…/g) || []).length;
  const informalDensity = (informalMarkers + ellipsis) / Math.max(1, sentences.length);
  const perfectionScore = clamp(100 - informalDensity * MULTIPLIERS.perfection);
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
  const voiceScore = clamp((genericCount / Math.max(1, sentences.length)) * MULTIPLIERS.voice);
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
  const perplexityScore = clamp(commonRatio * MULTIPLIERS.perplexity);

  // 7. Profondeur (détails concrets : chiffres, noms propres)
  const digits = (text.match(/\d/g) || []).length;
  const properNouns = (text.match(/(?<=\s)[A-ZÀ-Ý][a-zà-ÿ]{2,}/g) || []).length;
  const concreteDensity = (digits + properNouns) / Math.max(1, words.length);
  const depthScore = clamp(100 - concreteDensity * MULTIPLIERS.depth);
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

  const W = SCORE_WEIGHTS;
  const score = clamp(
    burstinessScore * W.burstiness +
      transitionScore * W.transition +
      perfectionScore * W.perfection +
      voiceScore * W.voice +
      perplexityScore * W.perplexity +
      vocabularyScore * W.vocabulary +
      depthScore * W.depth +
      Math.min(W.maxPatternPoints, patternPoints)
  );

  const humanizationScore = clamp(100 - score);

  // Score SUCKS (Specific, Unique, Clear, Simple, Sticky) — heuristique locale 0-100.
  const S = SUCKS_CONFIG;
  const specific = clamp(100 - depthScore * S.specific.weight + (digits + properNouns > S.specific.threshold ? S.specific.bonus : 0));
  const unique = clamp(100 - voiceScore * S.unique.weight - (patternHits[S.unique.flag] ? S.unique.penalty : 0));
  const clear = clamp(100 - transitionScore * S.clear.weight - (patternHits[S.clear.flag] ? S.clear.penalty : 0));
  const simple = clamp(100 - vocabularyScore * S.simple.weight - (avgLength > S.simple.avgLengthThreshold ? S.simple.penalty : 0));
  const sticky = clamp(100 - perfectionScore * S.sticky.weight - (patternHits[S.sticky.flag] ? S.sticky.penalty : 0));
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
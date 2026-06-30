/**
 * Moteur d'analyse IA — 100% local, sans dépendance React ni réseau.
 * Source unique de vérité partagée entre le hook UI, le worker et les tests.
 */
import { splitSentences } from "./utils";

export interface StyleFingerprint {
  sentenceLength: number;
  vocabularyDensity: number;
  connectorRate: number;
  repetitionRate: number;
  complexity: number;
  personalMarkers: number;
}

export interface AIAnalysisResult {
  score: number;
  perplexityScore: number;
  burstinessScore: number;
  transitionScore: number;
  perfectionScore: number;
  voiceScore: number;
  vocabularyScore: number;
  depthScore: number;
  structureScore: number;
  semanticRepetitionScore: number;
  personalizationScore: number;
  paraphraseScore: number;
  styleScore: number;
  humanizationScore: number;
  sucksScore: number;
  patternCount: number;
  checklist: ChecklistItem[];
  details: AnalysisDetail[];
  styleFingerprint: StyleFingerprint;
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

/**
 * AI_SCORE = (Perplexity + Burstiness + Style + Structure + Lexical + Semantic) / N
 * Formule multi-signaux conforme au module AWPA.
 */
const SCORE_WEIGHTS = {
  burstiness: 0.15,
  transition: 0.10,
  perfection: 0.05,
  voice: 0.10,
  perplexity: 0.15,
  vocabulary: 0.10,
  depth: 0.05,
  structure: 0.10,
  semanticRepetition: 0.05,
  personalization: 0.05,
  paraphrase: 0.05,
  style: 0.05,
  maxPatternPoints: 30,
} as const;

/** Multiplicateurs de normalisation pour chaque sous-score. */
const MULTIPLIERS = {
  transition: 600,
  perfection: 220,
  voice: 350,
  perplexity: 1.8,
  depth: 900,
 structure: 800,
  semanticRepetition: 500,
  personalization: 300,
  paraphrase: 400,
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

  // ── ENGLISH-SPECIFIC AI PATTERNS (Originality.ai / Copyleaks level) ─

  // EN-1: "Delve into" — the #1 most overused AI phrase
  {
    category: "EN: Overused AI Phrases",
    severity: "high",
    points: 8,
    regex: /\b(delve (into|deeper)|delving (into|deeper))\b/gi,
    issue: "\"Delve into\" is the single most overused phrase in AI-generated text.",
    suggestion: "Use: explore, examine, look at, dig into, analyze.",
  },
  // EN-2: "It's worth noting" / "It is important to note"
  {
    category: "EN: Filler Phrases",
    severity: "medium",
    points: 5,
    regex: /\b(it'?s? worth (noting|mentioning|pointing out)|it is worth (noting|mentioning))\b/gi,
    issue: "Filler phrase that adds no information — classic AI padding.",
    suggestion: "Delete it. State the fact directly.",
  },
  // EN-3: "Tapestry" metaphor
  {
    category: "EN: Overblown Metaphors",
    severity: "high",
    points: 7,
    regex: /\b(a rich tapestry|tapestry of|a symphony of)\b/gi,
    issue: "Overblown metaphor AI uses to sound poetic.",
    suggestion: "Describe what you mean literally.",
  },
  // EN-4: "Testament to"
  {
    category: "EN: Overblown Metaphors",
    severity: "medium",
    points: 5,
    regex: /\b(a testament to|serves? as a testament|stands? as a testament)\b/gi,
    issue: "AI loves calling things \"a testament to\" something.",
    suggestion: "Use: shows, proves, demonstrates, reflects.",
  },
  // EN-5: "Navigating the landscape/complexities"
  {
    category: "EN: Corporate Jargon",
    severity: "high",
    points: 7,
    regex: /\b(navigat(?:e|ing) (the|a|our|their) (?:complexities?|landscape|terrain|world)|navigat(?:e|ing) (?:through|across|these))\b/gi,
    issue: "Overused AI metaphor for dealing with something complex.",
    suggestion: "Use: handling, dealing with, addressing, managing.",
  },
  // EN-6: "A myriad of" / "myriad"
  {
    category: "EN: Filler Phrases",
    severity: "low",
    points: 3,
    regex: /\b(a myriad of|an array of|a multitude of|a plethora of)\b/gi,
    issue: "AI overuses these to sound sophisticated when \"many\" or \"lots of\" would work.",
    suggestion: "Use: many, various, dozens of, or just list them.",
  },
  // EN-7: "Sheds light on" / "sheds insight"
  {
    category: "EN: Overused AI Phrases",
    severity: "medium",
    points: 5,
    regex: /\b(sheds? (?:light|insight|clarity) on)\b/gi,
    issue: "AI cliché for explaining or revealing something.",
    suggestion: "Use: explains, reveals, shows, clarifies.",
  },
  // EN-8: "Paramount" / "Paramount importance"
  {
    category: "EN: Vocab IA EN",
    severity: "medium",
    points: 5,
    regex: /\b(paramount (?:importance|concern)|of paramount)\b/gi,
    issue: "AI consistently overuses \"paramount\" instead of \"important\" or \"critical\".",
    suggestion: "Use: crucial, essential, vital, or simply important.",
  },
  // EN-9: "Foster" / "Cultivate" / "Nurture"
  {
    category: "EN: Vocab IA EN",
    severity: "medium",
    points: 5,
    regex: /\b(fostering?|cultivating?|nurturing?)\s+\w+(?:\s+\w+){0,3}\b/gi,
    issue: "AI loves these verbs for \"encouraging/growing\" something abstract.",
    suggestion: "Use: support, build, grow, help, encourage.",
  },
  // EN-10: "In an era where" / "In a world where"
  {
    category: "EN: Cliché Openings",
    severity: "high",
    points: 8,
    regex: /\b(in (?:an|this) (?:era|age|world|landscape) (?:where|of|characterized by))\b/gi,
    issue: "One of the most clichéd AI opening formulas.",
    suggestion: "Start with a specific fact, not a vague era description.",
  },
  // EN-11: "Underscores" / "Highlights" used as verbs excessively
  {
    category: "EN: Overused AI Phrases",
    severity: "medium",
    points: 4,
    regex: /\b(underscores?|highlights?|brings? to the forefront)\b/gi,
    issue: "AI overuses these verbs for \"shows\" or \"emphasizes\".",
    suggestion: "Use: shows, emphasizes, proves, makes clear.",
  },
  // EN-12: "Transformative" / "Revolutionary" / "Groundbreaking"
  {
    category: "EN: Promotional Language",
    severity: "high",
    points: 7,
    regex: /\b(transformative|revolutionary|groundbreaking|game-changing|paradigm-shift(?:ing)?)\b/gi,
    issue: "Hyperbolic adjectives AI inserts to make things sound impressive.",
    suggestion: "Use: new, significant, important, or cite specific improvements.",
  },
  // EN-13: "Holistic approach" / "Comprehensive solution"
  {
    category: "EN: Corporate Jargon",
    severity: "medium",
    points: 5,
    regex: /\b((?:a\s+)?holistic (?:approach|view|perspective|strategy)|comprehensive (?:solution|approach|framework|strategy))\b/gi,
    issue: "Buzzwords that sound professional but mean nothing specific.",
    suggestion: "Describe what the approach actually does.",
  },
  // EN-14: "Seamless" / "Seamlessly"
  {
    category: "EN: Corporate Jargon",
    severity: "medium",
    points: 4,
    regex: /\b(seamless(?:ly)?)\b/gi,
    issue: "AI's favorite adjective for anything that works smoothly.",
    suggestion: "Use: smooth, easy, integrated, or describe what actually happens.",
  },
  // EN-15: "Demystify" / "Unpack"
  {
    category: "EN: Overused AI Phrases",
    severity: "low",
    points: 3,
    regex: /\b(demystif(?:y|ying)|unpack(?:ing|s)?)\b/gi,
    issue: "AI uses these meta-verbs to announce it's about to explain something.",
    suggestion: "Just explain it directly without the announcement.",
  },
  // EN-16: "It goes without saying" / "Needless to say"
  {
    category: "EN: Filler Phrases",
    severity: "medium",
    points: 4,
    regex: /\b(it goes without saying|needless to say|as one might expect|it stands to reason)\b/gi,
    issue: "If it goes without saying, don't say it.",
    suggestion: "Delete the phrase entirely.",
  },
  // EN-17: "Resonate" / "Strikes a chord"
  {
    category: "EN: Overblown Metaphors",
    severity: "low",
    points: 3,
    regex: /\b(resonat(?:es?|ing)|strikes? a chord (?:with)?)\b/gi,
    issue: "AI uses emotional metaphors to add false depth.",
    suggestion: "Use: appeals to, connects with, or describe the actual effect.",
  },
  // EN-18: "Paving the way" / "Charting a course"
  {
    category: "EN: Cliché Metaphors",
    severity: "medium",
    points: 5,
    regex: /\b(paving? the way (?:for|forward|to)|charting? (?:a|its|the) (?:course|path|way))\b/gi,
    issue: "AI's go-to metaphor for any kind of progress.",
    suggestion: "Describe the specific progress being made.",
  },
  // EN-19: "Stark contrast" / "Stark reminder"
  {
    category: "EN: Overused AI Phrases",
    severity: "low",
    points: 3,
    regex: /\b(stark (?:contrast|reminder|difference|reality))\b/gi,
    issue: "AI loves \"stark\" as an intensifier.",
    suggestion: "Use: sharp, clear, strong, or drop the intensifier.",
  },
  // EN-20: "In conclusion" / "To sum up" / "Wrapping up"
  {
    category: "EN: Formulaic Endings",
    severity: "high",
    points: 6,
    regex: /\b(in conclusion|to sum up|to summarize|wrapping up|bringing it all together|as we've (?:seen|explored|discussed))\b/gi,
    issue: "AI insists on formally announcing the end of its text.",
    suggestion: "End with your final point. No announcement needed.",
  },
  // EN-21: "Both X and Y" overuse
  {
    category: "EN: Structural Patterns",
    severity: "medium",
    points: 4,
    regex: /(?:both)\s+\w+\s+and\s+\w+\s+(?:and|are|is|have|can|will).*(?:both)\s+\w+\s+and\s+\w+/gi,
    issue: "AI overuses the \"both X and Y\" parallel structure.",
    suggestion: "Vary your sentence structure. Not everything needs to be \"both...and\".",
  },
  // EN-22: "In essence" / "At its core" / "Fundamentally"
  {
    category: "EN: Filler Phrases",
    severity: "medium",
    points: 4,
    regex: /\b(in essence|at its (?:core|heart)|fundamentally|ultimately)\b/gi,
    issue: "AI pads summaries and transitions with these empty intensifiers.",
    suggestion: "State the point directly without the preface.",
  },
  // EN-23: "Key takeaway" / "Takeaway"
  {
    category: "EN: Corporate Jargon",
    severity: "low",
    points: 3,
    regex: /\b(key takeaways?|the (?:main|primary|key) takeaway)\b/gi,
    issue: "Corporate speak that AI inserts before lists.",
    suggestion: "Use: main points, important points, or just list them.",
  },
  // EN-24: "Elevate" / "Elevating"
  {
    category: "EN: Corporate Jargon",
    severity: "low",
    points: 3,
    regex: /\belevat(?:e|es|ed|ing)\s/gi,
    issue: "AI uses \"elevate\" as a fancy verb for \"improve\".",
    suggestion: "Use: improve, enhance, upgrade, or be specific.",
  },
  // EN-25: "Space" / "Realm" used metaphorically
  {
    category: "EN: Corporate Jargon",
    severity: "medium",
    points: 4,
    regex: /\b(in (?:this|the|that) (?:space|realm)|the \w+ space)\b/gi,
    issue: "Vague \"space\" and \"realm\" instead of naming the actual field.",
    suggestion: "Name the specific field: industry, market, domain, area.",
  },
  // EN-26: "Drive" used as causative verb excessively
  {
    category: "EN: Corporate Jargon",
    severity: "medium",
    points: 4,
    regex: /\b(driv(?:e|es|en|ing)\s+(?:innovation|growth|engagement|success|results|change|value|adoption|efficiency|impact))\b/gi,
    issue: "AI overuses \"drive X\" as a verb-noun collocation.",
    suggestion: "Use: cause, lead to, produce, create, or rephrase.",
  },
  // EN-27: "Leverage" / "Utilize"
  {
    category: "EN: Corporate Jargon",
    severity: "medium",
    points: 4,
    regex: /\b(leverage|utilize|utilise)\b/gi,
    issue: "Fancy words for \"use\" that AI inserts to sound professional.",
    suggestion: "Use: use, apply, work with.",
  },
  // EN-28: "Robust" / "Scalable" / "Extensible"
  {
    category: "EN: Corporate Jargon",
    severity: "low",
    points: 2,
    regex: /\b(robust|scalable|extensible)\b/gi,
    issue: "Technical buzzwords used outside of technical contexts.",
    suggestion: "Use: strong, reliable, expandable, or be specific.",
  },
  // EN-29: "Embody" / "Embodies"
  {
    category: "EN: Overblown Metaphors",
    severity: "low",
    points: 3,
    regex: /\b(embod(?:y|ies|ied|ying))\b/gi,
    issue: "AI uses \"embody\" to make things sound more profound than they are.",
    suggestion: "Use: represent, show, express, or describe concretely.",
  },
  // EN-30: "Not only... but also" overuse
  {
    category: "EN: Structural Patterns",
    severity: "medium",
    points: 5,
    regex: /\bnot only\s+.{5,50}?\s+but\s+(also\s+|even\s+|it\s+)/gi,
    issue: "AI overuses this correlative conjunction to add emphasis.",
    suggestion: "Use separate sentences or simpler constructions.",
  },

  // ── MODULE 3 : DÉTECTION DE STRUCTURE IA ──────────────────────────

  // STRUCT-1: Énumération ordonnée artificielle
  {
    category: "Structure énumérative",
    severity: "high",
    points: 8,
    regex: /\b(premièr(?:ement|ement)|deuxièmement|troisièmement|quatrièmement|cinquièmement|ensuite|enfin)\b/gi,
    issue: "Énumération ordonnée rigide (premièrement, deuxièmement...), typique des textes IA.",
    suggestion: "Utilisez des transitions naturelles ou supprimez les marqueurs d'ordre.",
  },
  // STRUCT-2: Symétrie paragraphe (paragraphes de taille quasi-identique)
  // Détecté par calcul dans analyzeText, pas par regex.

  // ── MODULE 5 : VOCABULAIRE GÉNÉRIQUE (AI_PHRASES) ────────────────

  {
    category: "Phrases génériques IA",
    severity: "high",
    points: 6,
    regex: /\b(approche innovante|solution pertinente|enjeux majeurs|impact significatif|contexte en constante évolution|perspectives prometteuses|avancée majeure|potentiel considérable|défis (majeurs|importants)|progrès (significatifs|remarquables))\b/gi,
    issue: "Formulation générique vide de sens concret, caractéristique des textes IA.",
    suggestion: "Remplacez par des descriptions factuelles avec des chiffres ou exemples précis.",
  },
  // PHRASES-2: Connecteurs à fort risque (Module 4)
  {
    category: "Connecteurs à fort risque",
    severity: "medium",
    points: 5,
    regex: /\b(en outre|cette approche permet|il convient de noter que)\b/gi,
    issue: "Connecteur logique fortement associé aux textes générés par IA.",
    suggestion: "Supprimez ou remplacez par une transition plus naturelle.",
  },

  // ── MODULE 8 : DÉTECTION PARAPHRASE IA ───────────────────────────

  {
    category: "Paraphrase IA",
    severity: "medium",
    points: 5,
    regex: /\b(contribue(?:nt)? à optimiser|permet(?:tent)? d'améliorer|vise(?:nt)? à renforcer|aident à maximiser|facilite(?:nt)? la mise en œuvre)\b/gi,
    issue: "Reformulation artificielle : phrase complexe sans gain d'information par rapport au verbe simple.",
    suggestion: "Utilisez un verbe direct : améliorer, renforcer, maximiser, appliquer.",
  },
  {
    category: "Paraphrase IA",
    severity: "medium",
    points: 4,
    regex: /\b(le système robotisé|la solution proposée|le dispositif mis en place|l'outil développé)\s+(contribue à|permet d'|vise à|aide à)\s+(optimiser|améliorer|renforcer)\s+(les performances?|les résultats?|la productivité|l'efficacité)\b/gi,
    issue: "Paraphrase typique IA : nominalisation + verbe faible + complément abstrait.",
    suggestion: "Exemple : « Le robot améliore la production. » au lieu de « Le système robotisé contribue à optimiser les performances productives. »",
  },

  // ── MODULE 7 : ABSENCE DE PERSONNALISATION ───────────────────────

  {
    category: "Absence de personnalisation",
    severity: "medium",
    points: 5,
    regex: /\b(cette technologie (améliore|transforme|révolutionne)|ces outils (permettent|aident)|cette méthode (améliore|optimise))\s+(les entreprises|les organisations|les processus|les résultats)\b/gi,
    issue: "Formulation impersonnelle sans exemple concret, contexte ni référence précise.",
    suggestion: "Ajoutez un contexte spécifique : « Dans notre étude du laboratoire X, cette technologie a réduit le temps de traitement de 40%. »",
  },

  // ── MODULE 1 : FORMULATIONS COMMUNES (prévisibilité) ─────────────

  {
    category: "Formulations prévisibles",
    severity: "medium",
    points: 5,
    regex: /\b(l'intelligence artificielle joue un rôle (important|croissant|majeur)|dans le monde actuel|à l'ère (du|de la) (numérique|intelligence artificielle)|les avancées technologiques (permettent|offrent|ouvrent))\b/gi,
    issue: "Phrase trop prévisible et attendue, signe d'un texte généré.",
    suggestion: "Commencez par un fait précis ou une observation spécifique plutôt qu'une généralité.",
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

// ── MODULE 3 : Dictionnaire AI_PHRASES (Module 5 étendu) ────────────

/** Phrases génériques typiques de l'IA, avec poids de risque. */
export const AI_PHRASES: Array<{ phrase: string; weight: number }> = [
  // Fort risque
  { phrase: "en outre", weight: 3 },
  { phrase: "de plus", weight: 2 },
  { phrase: "par ailleurs", weight: 3 },
  { phrase: "en conclusion", weight: 3 },
  { phrase: "il convient de noter", weight: 3 },
  { phrase: "cette approche permet", weight: 3 },
  { phrase: "approche innovante", weight: 3 },
  { phrase: "solution pertinente", weight: 3 },
  { phrase: "enjeux majeurs", weight: 3 },
  { phrase: "impact significatif", weight: 3 },
  { phrase: "contexte en constante évolution", weight: 3 },
  { phrase: "perspectives prometteuses", weight: 3 },
  // Moyen risque
  { phrase: "il est important de", weight: 2 },
  { phrase: "il est essentiel de", weight: 2 },
  { phrase: "dans le monde actuel", weight: 2 },
  { phrase: "à l'ère du", weight: 2 },
  { phrase: "force est de constater", weight: 2 },
  { phrase: "pour conclure", weight: 2 },
  { phrase: "avancée majeure", weight: 2 },
  { phrase: "potentiel considérable", weight: 2 },
  { phrase: "défis majeurs", weight: 2 },
  { phrase: "progrès significatifs", weight: 2 },
  { phrase: "in today's world", weight: 2 },
  { phrase: "it is important to", weight: 2 },
  { phrase: "plays a crucial role", weight: 2 },
  { phrase: "delve into", weight: 3 },
  { phrase: "a testament to", weight: 2 },
  { phrase: "in conclusion", weight: 3 },
  { phrase: "however", weight: 1 },
  { phrase: "moreover", weight: 1 },
  { phrase: "furthermore", weight: 1 },
  { phrase: "therefore", weight: 1 },
  { phrase: "consequently", weight: 1 },
];

// ── MODULE 4 : Connecteurs pondérés ─────────────────────────────────

/** Connecteurs logiques avec poids de risque IA. */
export const WEIGHTED_CONNECTORS: Array<{ connector: string; weight: number }> = [
  // Fort risque
  { connector: "en outre", weight: 3 },
  { connector: "il convient de noter que", weight: 3 },
  { connector: "cette approche permet de", weight: 3 },
  { connector: "il est important de souligner", weight: 2 },
  { connector: "par conséquent", weight: 2 },
  // Risque moyen
  { connector: "en effet", weight: 1 },
  { connector: "cependant", weight: 1 },
  { connector: "de plus", weight: 2 },
  { connector: "par ailleurs", weight: 2 },
  { connector: "néanmoins", weight: 1 },
  { connector: "toutefois", weight: 1 },
  { connector: "de surcroît", weight: 2 },
  { connector: "en conclusion", weight: 3 },
  // EN
  { connector: "however", weight: 1 },
  { connector: "moreover", weight: 1 },
  { connector: "furthermore", weight: 1 },
  { connector: "therefore", weight: 1 },
  { connector: "consequently", weight: 1 },
  { connector: "in conclusion", weight: 3 },
];

// ── MODULE 6 : Répétition sémantique (n-gram overlap proxy) ────────

/**
 * Détecte la répétition sémantique entre phrases consécutives.
 * Utilise le chevauchement de bigrammes comme proxy local (pas d'embeddings).
 * Retourne un ratio 0-1 et les paires suspectes.
 */
function detectSemanticRepetition(sentences: string[]): { ratio: number; pairs: number } {
  if (sentences.length < 2) return { ratio: 0, pairs: 0 };
  const WORD_RE = /\b[\wàâäéèêëîïôöùûüç]+\b/gi;
  let suspiciousPairs = 0;

  for (let i = 1; i < sentences.length; i++) {
    const a = (sentences[i - 1].toLowerCase().match(WORD_RE) || []);
    const b = (sentences[i].toLowerCase().match(WORD_RE) || []);
    if (a.length < 3 || b.length < 3) continue;

    const bigramsA = new Set<string>();
    const bigramsB = new Set<string>();
    for (let j = 0; j < a.length - 1; j++) bigramsA.add(`${a[j]}|${a[j + 1]}`);
    for (let j = 0; j < b.length - 1; j++) bigramsB.add(`${b[j]}|${b[j + 1]}`);

    const intersection = [...bigramsA].filter((bg) => bigramsB.has(bg)).length;
    const union = new Set([...bigramsA, ...bigramsB]).size;
    const similarity = union > 0 ? intersection / union : 0;

    // Seuil : si deux phrases consécutives partagent >40% de bigrammes
    if (similarity > 0.4) suspiciousPairs++;
  }

  return { ratio: sentences.length > 1 ? suspiciousPairs / (sentences.length - 1) : 0, pairs: suspiciousPairs };
}

// ── MODULE 7 : Score de personnalisation ────────────────────────────

/**
 * Mesure la présence de marques de personnalisation :
 * exemples précis, contexte, expérience, références concrètes.
 */
function computePersonalizationScore(text: string, sentences: string[]): number {
  const markers = [
    // Références concrètes (noms propres, lieux, organisations)
    /(?<=\s)[A-ZÀ-Ý][a-zà-ÿ]{2,}/g,
    // Chiffres et pourcentages
    /\d+(?:\s*%|\s*(?:euros|dollars|€|\$|ans|mois|jours|heures|personnes|étudiants|employés|utilisateurs))/gi,
    // Marques d'expérience personnelle
    /\b(nous avons|j'ai|notre (équipe|équipe|étude|analyse|laboratoire|expérience|recherche)|dans (notre|mon|ma) (cas|étude|analyse|expérience|travail))\b/gi,
    // Exemples introduits par « par exemple », « comme »
    /\b(par exemple|tel que|notamment|parmi (lesquel|lesquell)les?|comme (le|la|l'|les))\b/gi,
    // Citations ou références
    /(?:selon|d'après|comme le (dit|montre|souligne))\s+[\wÀ-Ý]/gi,
  ];

  let totalHits = 0;
  for (const marker of markers) {
    totalHits += (text.match(marker) || []).length;
  }

  // Ratio : hits par phrase. Plus c'est élevé, plus c'est personnalisé.
  const density = sentences.length > 0 ? totalHits / sentences.length : 0;
  // Score inversé : peu de personnalisation = score IA élevé
  return clamp(100 - density * 25);
}

// ── MODULE 8 : Score de paraphrase IA ───────────────────────────────

/**
 * Détecte les paraphrases artificielles :
 * synonymes forcés, changements de registre inutiles,
 * phrases plus complexes sans gain d'information.
 */
function computeParaphraseScore(text: string, sentences: string[]): number {
  if (sentences.length === 0) return 0;

  // Signaux de paraphrase IA
  const paraphraseSignals = [
    // Nominalisations (verbe → nom abstrait)
    /\b(la mise en œuvre|la mise en place|la prise en charge|la mise en œuvre|la gestion de|le traitement de|l'optimisation de|l'amélioration de)\b/gi,
    // Verbes faibles + compléments abstraits
    /\b(contribuer à|permettre de|viser à|tendre à|avoir pour (but|objectif|vocation))\s+(l'|la|le|les|une|un|d'|des)\b/gi,
    // Formules de reformulation
    /\b(autrement dit|en d'autres termes|c'est-à-dire|en d'autres mots|pour le dire autrement)\b/gi,
    // Complexité artificielle : phrases très longues avec peu de contenu concret
  ];

  let signalCount = 0;
  for (const sig of paraphraseSignals) {
    signalCount += (text.match(sig) || []).length;
  }

  // Ratio par phrase
  const density = signalCount / sentences.length;
  return clamp(density * 250);
}

// ── MODULE 3 : Score de structure IA ────────────────────────────────

/**
 * Détecte les structures trop parfaites :
 * - Plans rigides (premièrement, deuxièmement...)
 * - Symétrie excessive des paragraphes
 * - Transitions artificielles systématiques
 */
function computeStructureScore(text: string, sentences: string[]): number {
  let structPoints = 0;

  // 1. Énumération ordonnée
  const enumerations = text.match(/\b(premièr(?:ement|ement)|deuxièmement|troisièmement|ensuite|enfin)\b/gi) || [];
  structPoints += enumerations.length * 8;

  // 2. Symétrie des paragraphes : variance des longueurs de paragraphes
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  if (paragraphs.length >= 3) {
    const paraLengths = paragraphs.map((p) => p.trim().split(/\s+/).length);
    const avgPara = paraLengths.reduce((a, b) => a + b, 0) / paraLengths.length;
    const paraVariance = paraLengths.reduce((a, b) => a + Math.pow(b - avgPara, 2), 0) / paraLengths.length;
    const paraCV = avgPara > 0 ? Math.sqrt(paraVariance) / avgPara : 0;
    // Coefficient de variation faible = symétrie excessive
    if (paraCV < 0.2) structPoints += 15;
    else if (paraCV < 0.3) structPoints += 8;
  }

  // 3. Headers génériques (Introduction, Développement, Conclusion)
  const genericHeaders = text.match(/^##\s*(Introduction|Points clés|Avantages|Inconvénients|Défis|Conclusion|Développement|Résumé|Summary|Conclusion)$/gim) || [];
  structPoints += genericHeaders.length * 8;

  // 4. Connecteurs en début de phrase (transitions systématiques)
  const sentencesWithConnector = sentences.filter((s) =>
    /^\s*(en effet|cependant|de plus|par ailleurs|en outre|par conséquent|néanmoins|toutefois|however|moreover|furthermore|therefore|firstly|secondly|finally|ensuite)/i.test(s.trim())
  ).length;
  const connectorStartRatio = sentences.length > 0 ? sentencesWithConnector / sentences.length : 0;
  if (connectorStartRatio > 0.4) structPoints += 12;
  else if (connectorStartRatio > 0.25) structPoints += 6;

  return clamp(structPoints);
}

// ── MODULE 9 : Style Fingerprint ────────────────────────────────────

/**
 * Crée une empreinte de style multidimensionnelle.
 * Permet de comparer le style du texte analysé à des profils humains vs LLM.
 */
function computeStyleFingerprint(
  text: string,
  sentences: string[],
  words: string[],
  transitionDensity: number,
): StyleFingerprint {
  const wc = words.length;
  const sc = sentences.length;

  // sentenceLength : longueur moyenne des phrases
  const avgSentLen = sc > 0 ? words.length / sc : 0;

  // vocabularyDensity : TTR (type-token ratio)
  const uniqueWords = new Set(words.map((w) => w.toLowerCase()));
  const ttr = wc > 0 ? uniqueWords.size / wc : 0;

  // connectorRate : densité de connecteurs
  const connectorRate = transitionDensity;

  // repetitionRate : ratio de mots hapax (qui n'apparaissent qu'une fois)
  const freq = new Map<string, number>();
  words.forEach((w) => {
    const lw = w.toLowerCase();
    freq.set(lw, (freq.get(lw) || 0) + 1);
  });
  const hapaxCount = [...freq.values()].filter((v) => v === 1).length;
  const repetitionRate = wc > 0 ? 1 - hapaxCount / wc : 0;

  // complexity : longueur moyenne des mots
  const avgWordLen = wc > 0 ? words.reduce((s, w) => s + w.length, 0) / wc : 0;

  // personalMarkers : présence de marques personnelles (je, nous, notre, mon, ma)
  const personalPronouns = (text.match(/\b(je|nous|notre|nos|mon|ma|mes|moi)\b/gi) || []).length;
  const personalMarkers = sc > 0 ? personalPronouns / sc : 0;

  return {
    sentenceLength: Math.round(avgSentLen * 10) / 10,
    vocabularyDensity: Math.round(ttr * 1000) / 1000,
    connectorRate: Math.round(connectorRate * 1000) / 1000,
    repetitionRate: Math.round(repetitionRate * 1000) / 1000,
    complexity: Math.round(avgWordLen * 10) / 10,
    personalMarkers: Math.round(personalMarkers * 1000) / 1000,
  };
}

/** Analyse complète d'un texte. Pure, déterministe (hors aléatoire : aucun). */
export function analyzeText(text: string): AIAnalysisResult {
  if (!text || text.length < MIN_ANALYSIS_LENGTH) {
    const emptyFingerprint: StyleFingerprint = { sentenceLength: 0, vocabularyDensity: 0, connectorRate: 0, repetitionRate: 0, complexity: 0, personalMarkers: 0 };
    return {
      score: 0,
      perplexityScore: 0,
      burstinessScore: 0,
      transitionScore: 0,
      perfectionScore: 0,
      voiceScore: 0,
      vocabularyScore: 0,
      depthScore: 0,
      structureScore: 0,
      semanticRepetitionScore: 0,
      personalizationScore: 0,
      paraphraseScore: 0,
      styleScore: 0,
      humanizationScore: 100,
      sucksScore: 0,
      patternCount: 0,
      checklist: [],
      details: [],
      styleFingerprint: emptyFingerprint,
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

  // 3. Transitions mécaniques — Module 4 : connecteurs pondérés (WEIGHTED_CONNECTORS)
  let transCount = 0;
  let transWeightedCount = 0;
  const transFound: string[] = [];
  WEIGHTED_CONNECTORS.forEach(({ connector, weight }) => {
    const m = text.match(new RegExp(connector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")) || [];
    if (m.length) {
      transFound.push(connector);
      transCount += m.length;
      transWeightedCount += m.length * weight;
    }
  });
  const connectorDensity = sentences.length > 0 ? transWeightedCount / sentences.length : 0;
  const transitionScore = clamp(connectorDensity * 150);
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

  // ── NOUVEAUX MODULES AWPA ──────────────────────────────────────

  // Module 3 : Score de structure IA (STRUCTURE_AI_SCORE)
  const structureScore = computeStructureScore(text, sentences);
  if (structureScore > 50) {
    details.push({ category: "Structure IA", issue: "Structure trop parfaite, symétrie excessive ou énumération rigide", severity: "high" });
  } else if (structureScore > 25) {
    details.push({ category: "Structure IA", issue: "Certaines marques de structure artificielle détectées", severity: "medium" });
  }

  // Module 6 : Répétition sémantique
  const { ratio: semRepetitionRatio, pairs: semRepetitionPairs } = detectSemanticRepetition(sentences);
  const semanticRepetitionScore = clamp(semRepetitionRatio * MULTIPLIERS.semanticRepetition);
  if (semRepetitionPairs > 0) {
    details.push({ category: "Répétition sémantique", issue: `${semRepetitionPairs} paire(s) de phrases consécutives avec contenu trop similaire (REPETITION_AI_PATTERN)`, severity: semRepetitionPairs > 2 ? "high" : "medium" });
  }

  // Module 7 : Personnalisation (PERSONALIZATION_SCORE)
  const personalizationScore = computePersonalizationScore(text, sentences);
  if (personalizationScore > 80) {
    details.push({ category: "Personnalisation", issue: "Absence de marques de personnalisation : pas d'exemples précis, de contexte, ni de références concrètes", severity: "high" });
  } else if (personalizationScore > 60) {
    details.push({ category: "Personnalisation", issue: "Peu de marques de personnalisation détectées", severity: "medium" });
  }

  // Module 8 : Paraphrase IA
  const paraphraseScore = computeParaphraseScore(text, sentences);
  if (paraphraseScore > 50) {
    details.push({ category: "Paraphrase IA", issue: "Reformulations artificielles détectées : synonymes forcés ou complexité sans gain d'information", severity: "high" });
  } else if (paraphraseScore > 25) {
    details.push({ category: "Paraphrase IA", issue: "Quelques signaux de paraphrase artificielle", severity: "low" });
  }

  // Module 9 : Style Fingerprint + Style Score
  const transDensity = words.length > 0 ? transCount / words.length : 0;
  const styleFingerprint = computeStyleFingerprint(text, sentences, words, transDensity);

  // Style score : compare le fingerprint à un profil LLM typique
  // LLM : sentenceLength ~20, vocabularyDensity ~0.5-0.6, connectorRate élevé, repetitionRate faible, personalMarkers ~0
  const styleScore = clamp(
    (styleFingerprint.sentenceLength > 15 && styleFingerprint.sentenceLength < 30 ? 30 : 0) +
    (styleFingerprint.connectorRate > 0.01 ? 25 : 0) +
    (styleFingerprint.personalMarkers < 0.05 ? 25 : 0) +
    (styleFingerprint.vocabularyDensity < 0.65 ? 20 : 0)
  );

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
  // AI_SCORE = moyenne multi-signaux conformément au module AWPA
  // (Perplexity + Burstiness + Style + Structure + Lexical + Semantic) / N
  const weightedSubScores =
    burstinessScore * W.burstiness +
    transitionScore * W.transition +
    perfectionScore * W.perfection +
    voiceScore * W.voice +
    perplexityScore * W.perplexity +
    vocabularyScore * W.vocabulary +
    depthScore * W.depth +
    structureScore * W.structure +
    semanticRepetitionScore * W.semanticRepetition +
    personalizationScore * W.personalization +
    paraphraseScore * W.paraphrase +
    styleScore * W.style;

  const score = clamp(weightedSubScores + Math.min(W.maxPatternPoints, patternPoints));

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
    { label: "Pas de répétition sémantique", passed: semanticRepetitionScore < 30 },
    { label: "Personnalisation présente", passed: personalizationScore < 70 },
    { label: "Structure naturelle", passed: structureScore < 40 },
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
    structureScore,
    semanticRepetitionScore,
    personalizationScore,
    paraphraseScore,
    styleScore,
    humanizationScore,
    sucksScore,
    patternCount,
    checklist,
    details,
    styleFingerprint,
  };
}
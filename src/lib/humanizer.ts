import { analyzeText } from "./textAnalysis";
import type { WriterProfile } from "./writerProfile";
import { applyProfile } from "./writerProfile";

export type HumanizeIntensity = "light" | "moderate" | "aggressive";
export type HumanizeMode = "naturel" | "professionnel" | "academique" | "expert" | "personnel";

export interface ChangeLog {
  type: string;
  original: string;
  replacement: string;
  reason: string;
}

export interface HumanizeOptions {
  intensity?: HumanizeIntensity;
  mode?: HumanizeMode;
  /** Boucle "humanize until natural" : score IA cible (0-100). undefined = un seul passage. */
  targetScore?: number;
  /** Sécurité de la boucle. */
  maxPasses?: number;
  /** Profil stylistique optionnel à appliquer (réécriture selon le style de l'utilisateur). */
  profile?: WriterProfile | null;
}

export interface HumanizeStats {
  humanizedText: string;
  modificationsCount: number;
  changeLog: ChangeLog[];
  passes: number;
  scoreBefore: number;
  scoreAfter: number;
  mode: HumanizeMode;
  intensity: HumanizeIntensity;
}

interface Rule {
  type: string;
  reason: string;
  regex: RegExp;
  /** chaîne de remplacement ou liste (choisie aléatoirement) ou fonction */
  to: string | string[] | ((m: string) => string);
  /** intensité minimale requise pour appliquer la règle */
  minIntensity?: HumanizeIntensity;
  /** modes pour lesquels la règle s'applique (par défaut : tous) */
  modes?: HumanizeMode[];
}

const INTENSITY_RANK: Record<HumanizeIntensity, number> = {
  light: 1,
  moderate: 2,
  aggressive: 3,
};

const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

/**
 * Règles de réécriture locales (FR + EN). Chaque règle cible un tic d'IA.
 * Les variantes par mode permettent d'ajuster le registre.
 */
const RULES: Rule[] = [
  // ── MOTIFS DE CONTENU (skill #1-7) ───────────────────────────────

  // #1 Emphase artificielle
  {
    type: "emphase",
    reason: "Suppression d'une formule d'emphase artificielle (#1)",
    regex: /\b(joue un rôle (vital|significatif|crucial|déterminant))\b[^.]*/gi,
    to: "",
    minIntensity: "light",
  },
  {
    type: "emphase",
    reason: "Suppression « marquant un tournant » (#1)",
    regex: /,?\s*marquant un tournant (majeur|dans l'évolution[^.]*)/gi,
    to: ".",
    minIntensity: "light",
  },
  {
    type: "emphase",
    reason: "Suppression « façonnant le / ouvrant la voie » (#1)",
    regex: /,?\s*(façonnant le|ouvrant la voie à|contribuant à)[^.]*/gi,
    to: ".",
    minIntensity: "light",
  },

  // #2 Notoriété
  {
    type: "notoriete",
    reason: "Suppression d'une affirmation de notoriété sans source (#2)",
    regex: /\b(elle|il) maintien(?:t|ent)? une présence active sur les réseaux sociaux[^.]*/gi,
    to: "",
    minIntensity: "moderate",
  },

  // #3 Gérondifs superficiels
  {
    type: "gerondif",
    reason: "Remplacement d'un gérondif superficiel par une formulation directe (#3)",
    regex: /\b(soulignant|mettant en (?:évidence|avant)|reflétant|symbolisant|illustrant)\s+(?:son|leur|sa|la|le|des?|les?|un|une)\s+\S+/gi,
    to: (m) => {
      const verb = m.replace(/^(soulignant|mettant en (?:évidence|avant)|reflétant|symbolisant|illustrant)\s+/i, "");
      return verb.charAt(0).toUpperCase() + verb.slice(1);
    },
    minIntensity: "light",
  },

  // #4 Langage promotionnel
  {
    type: "promo",
    reason: "Suppression d'un qualificatif promotionnel (#4)",
    regex: /\b(vibrant|somptueux|à couper le souffle|incontournable)\b/gi,
    to: ["reconnu", "connu", "célèbre", "apprécié"],
    minIntensity: "light",
  },
  {
    type: "promo",
    reason: "Suppression « illustre parfaitement » (#4)",
    regex: /\billustre parfaitement /gi,
    to: "montre ",
    minIntensity: "light",
  },

  // #5 Attributions vagues
  {
    type: "attribution",
    reason: "Remplacement d'une attribution vague par une formulation plus honnête (#5)",
    regex: /\b(des experts estiment|des observateurs ont relevé|des rapports sectoriels|plusieurs sources)\b/gi,
    to: "selon des travaux récents",
    minIntensity: "moderate",
  },

  // #6 Section « Défis et perspectives »
  {
    type: "squelette",
    reason: "Suppression d'une section formulaique « défis » (#6)",
    regex: /Malgré (ces défis|son|sa|les)\s+\w+[^.]*(?:prospérer|croître|poursuivre)/gi,
    to: "",
    minIntensity: "light",
  },

  // ── MOTIFS DE LANGUE (#8-15) ──────────────────────────────────────

  // #8 Équilibre forcé
  {
    type: "equilibre",
    reason: "Suppression de la fausse symétrie « d'un côté... de l'autre » (#8)",
    regex: /\bD'un côté[^.]+,\s*de l'autre côté[^.]*\./gi,
    to: (m) => {
      const parts = m.split(/de l'autre côté/i);
      return parts[1] ? parts[1].trim().replace(/^\s*,\s*/, "") : m;
    },
    minIntensity: "moderate",
  },

  // #9 Vocabulaire typique IA
  {
    type: "vocab-ia",
    reason: "Remplacement d'un mot typique IA (#9)",
    regex: /\bpar ailleurs\b/gi,
    to: ["En plus, ", "Aussi, ", "De plus, "],
    minIntensity: "light",
    modes: ["naturel", "personnel"],
  },
  {
    type: "vocab-ia",
    reason: "Suppression « renforcer » (#9)",
    regex: /\brenforcer\b/gi,
    to: ["améliorer", "consolider", "soutenir"],
    minIntensity: "moderate",
  },
  {
    type: "vocab-ia",
    reason: "Suppression « favoriser » (#9)",
    regex: /\bfavoriser\b/gi,
    to: ["aider", "permettre", "encourager"],
    minIntensity: "moderate",
  },
  {
    type: "vocab-ia",
    reason: "Suppression « pérenne » (#9)",
    regex: /\bpérenn(?:e|es)\b/gi,
    to: "durable",
    minIntensity: "light",
  },

  // #10 Vocabulaire soutenu
  {
    type: "soutenu",
    reason: "Remplacement d'une tournure soutenue par un mot simple (#10)",
    regex: /\bs'avérer nécessaire\b/gi,
    to: ["faut", "il faut"],
    minIntensity: "light",
  },
  {
    type: "soutenu",
    reason: "Remplacement d'une tournure soutenue (#10)",
    regex: /\bs'efforcer de\b/gi,
    to: "essayer de",
    minIntensity: "light",
  },
  {
    type: "soutenu",
    reason: "Remplacement d'une tournure soutenue (#10)",
    regex: /\bpréalablement à\b/gi,
    to: "avant",
    minIntensity: "light",
  },
  {
    type: "soutenu",
    reason: "Remplacement d'une tournure soutenue (#10)",
    regex: /\bpostérieurement à\b/gi,
    to: "après",
    minIntensity: "light",
  },
  {
    type: "soutenu",
    reason: "Remplacement d'une tournure soutenue (#10)",
    regex: /\bà proximité immédiate de\b/gi,
    to: "près de",
    minIntensity: "light",
  },

  // #11 Contournement de « être »
  {
    type: "etre",
    reason: "Remplacement de « se présente comme » par « est » (#11)",
    regex: /\bse présente comme\b/gi,
    to: "est",
    minIntensity: "light",
  },
  {
    type: "etre",
    reason: "Remplacement de « constitue un(e) » par « est un(e) » (#11)",
    regex: /\bconstitue (un|une)\b/gi,
    to: (m) => `est ${m.split(" ").pop()}`,
    minIntensity: "light",
  },

  // #12 Parallélisme négatif
  {
    type: "parallele",
    reason: "Suppression du parallélisme négatif (#12)",
    regex: /\bIl ne s'agit pas (seulement|juste) de\s+[^,.\-–—]+?\s*[-–—,]\s*(c'est|il s'agit)/gi,
    to: (m) => {
      const after = m.match(/[-–—,]\s*(?:c'est|il s'agit)\s+(.+)/i);
      return after ? after[1].trim() : m;
    },
    minIntensity: "light",
  },

  // #26 Locutions de remplissage
  {
    type: "remplissage",
    reason: "Suppression d'une locution de remplissage (#26)",
    regex: /\bAfin d'atteindre cet objectif\b/gi,
    to: "Pour y arriver",
    minIntensity: "light",
  },
  {
    type: "remplissage",
    reason: "Suppression d'une locution de remplissage (#26)",
    regex: /\bÀ l'heure actuelle\b/gi,
    to: "Maintenant",
    minIntensity: "light",
  },
  {
    type: "remplissage",
    reason: "Suppression d'une locution de remplissage (#26)",
    regex: /\bDans l'éventualité où\b/gi,
    to: "Si",
    minIntensity: "light",
  },
  {
    type: "remplissage",
    reason: "Suppression d'une locution de remplissage (#26)",
    regex: /\bil convient de noter que\b/gi,
    to: "",
    minIntensity: "light",
    modes: ["professionnel", "expert", "academique"],
  },
  {
    type: "remplissage",
    reason: "Suppression d'une locution de remplissage (#26)",
    regex: /\bil est (important|essentiel) de (souligner|noter|retenir) que?\s*/gi,
    to: "",
    minIntensity: "light",
    modes: ["professionnel", "expert", "academique"],
  },
  {
    type: "remplissage",
    reason: "Suppression « au cœur/sein du sujet » (#26)",
    regex: /\bAu (cœur|sein) du sujet\b/gi,
    to: "",
    minIntensity: "light",
  },

  // #27 Atténuation excessive
  {
    type: "attenuation",
    reason: "Réduction de l'atténuation excessive (#27)",
    regex: /\b(potentiellement\s+avancer que|pourrait\s+éventuellement)\b/gi,
    to: "pourrait",
    minIntensity: "moderate",
  },
  {
    type: "attenuation",
    reason: "Réduction de l'atténuation excessive (#27)",
    regex: /\bon pourrait (potentiellement\s+)?penser que\b/gi,
    to: "on pense que",
    minIntensity: "moderate",
  },

  // #28 Conclusion générique
  {
    type: "conclusion",
    reason: "Suppression d'une conclusion générique (#28)",
    regex: /\bL'avenir s'annonce (radieux|prometteur)\b[^.]*\./gi,
    to: "",
    minIntensity: "light",
  },
  {
    type: "conclusion",
    reason: "Suppression d'une conclusion générique (#28)",
    regex: /\bDes temps passionnants nous attendent\b[^.]*\./gi,
    to: "",
    minIntensity: "light",
  },
  {
    type: "conclusion",
    reason: "Suppression d'une conclusion générique (#28)",
    regex: /\bpoursuit (sa|son) chemin vers l'excellence\b[^.]*\./gi,
    to: "",
    minIntensity: "light",
  },

  // #29 Traits d'union abusifs
  {
    type: "traits-union",
    reason: "Correction d'un mot composé mal hyphéné (#29)",
    regex: /\bmulti-fonctionnel(le)?\b/gi,
    to: (m) => m.includes("le") ? "pluridisciplinaire" : "pluridisciplinaire",
    minIntensity: "light",
  },
  {
    type: "traits-union",
    reason: "Correction d'un mot composé mal hyphéné (#29)",
    regex: /\ben temps-réel\b/gi,
    to: "en temps réel",
    minIntensity: "light",
  },
  {
    type: "traits-union",
    reason: "Correction d'un mot composé mal hyphéné (#29)",
    regex: /\bà long-terme\b/gi,
    to: "à long terme",
    minIntensity: "light",
  },
  {
    type: "traits-union",
    reason: "Correction d'un mot composé mal hyphéné (#29)",
    regex: /\bde bout-en-bout\b/gi,
    to: "de bout en bout",
    minIntensity: "light",
  },
  {
    type: "traits-union",
    reason: "Correction d'un mot composé mal hyphéné (#29)",
    regex: /\bhaute-qualité\b/gi,
    to: "haute qualité",
    minIntensity: "light",
  },

  // ── MOTIFS DE COMMUNICATION (#23-25) ──────────────────────────────

  // #23 Artefacts de chatbot
  {
    type: "chatbot",
    reason: "Suppression d'un artefact de conversation chatbot (#23)",
    regex: /\bJ'?espère que (ça|cela) (vous )?aide\s*!?\s*/gi,
    to: "",
    minIntensity: "light",
  },
  {
    type: "chatbot",
    reason: "Suppression d'un artefact de conversation chatbot (#23)",
    regex: /\bN'?hésitez pas (à me (le faire savoir|dire)|à me contacter)\s*!?\s*/gi,
    to: "",
    minIntensity: "light",
  },
  {
    type: "chatbot",
    reason: "Suppression d'un artefact de conversation chatbot (#23)",
    regex: /\b(Voici (un|une)\s)/gi,
    to: "",
    minIntensity: "light",
  },
  {
    type: "chatbot",
    reason: "Suppression « bien sûr ! » (#23)",
    regex: /\bBien sûr\s*!?\s*/gi,
    to: "",
    minIntensity: "light",
  },
  {
    type: "chatbot",
    reason: "Suppression « certainement ! » (#23)",
    regex: /\bCertinement\s*!?\s*/gi,
    to: "",
    minIntensity: "light",
  },
  {
    type: "chatbot",
    reason: "Suppression « vous avez tout à fait raison » (#23)",
    regex: /\bVous avez tout à fait raison[^.]*\.\s*/gi,
    to: "",
    minIntensity: "light",
  },

  // #24 Avertissements temporels
  {
    type: "temporel",
    reason: "Suppression d'un avertissement temporel de l'IA (#24)",
    regex: /\b(?:À|à) la date de\s+[^.]*\.\s*/gi,
    to: "",
    minIntensity: "light",
  },
  {
    type: "temporel",
    reason: "Suppression d'un avertissement temporel de l'IA (#24)",
    regex: /\bLes informations (spécifiques|disponibles) sont (limitées|rares)[^.]*\.\s*/gi,
    to: "",
    minIntensity: "light",
  },
  {
    type: "temporel",
    reason: "Suppression d'un avertissement temporel de l'IA (#24)",
    regex: /\bD'après les informations disponibles[^.]*\.\s*/gi,
    to: "",
    minIntensity: "light",
  },

  // #25 Ton servile
  {
    type: "servile",
    reason: "Suppression d'une flatterie servile (#25)",
    regex: /\bExcellente question\s*!?\s*/gi,
    to: "",
    minIntensity: "light",
  },
  {
    type: "servile",
    reason: "Suppression d'une flatterie servile (#25)",
    regex: /\bVous avez (tout à fait )?raison (de dire que|de souligner que)\s*/gi,
    to: "",
    minIntensity: "light",
  },

  // ── RÈGLES EXISTANTES (conservées) ────────────────────────────────

  {
    type: "ouverture",
    reason: "Suppression d'une ouverture générique d'IA",
    regex: /\b(in today's fast-paced world|in the ever-evolving world of [\w\s]+|dans un monde en constante évolution|à l'ère du numérique),?\s*/gi,
    to: "",
    minIntensity: "light",
  },
  {
    type: "rhetorique",
    reason: "Suppression d'une phrase rhétorique interdite",
    regex: /\b(let that sink in|here's the thing|let's be honest|at the end of the day|the secret\??|the best part\??|soyons honnêtes|au final)[.:!]?\s*/gi,
    to: "",
    minIntensity: "light",
  },
  {
    type: "correlatif",
    reason: "Réécriture de la construction corrélative « pas juste... mais »",
    regex: /\b(isn't|aren't|wasn't|weren't)\s+just\s+([^,.\-–—]+?)\s*[-–—,]\s*(it's|they're|it was)\s+/gi,
    to: (m) => m.replace(/\b(isn't|aren't|wasn't|weren't)\s+just\s+/i, "is about ").replace(/\s*[-–—,]\s*(it's|they're|it was)\s+/i, " and "),
    minIntensity: "light",
  },
  {
    type: "hesitation",
    reason: "Suppression d'un atténuateur inutile",
    regex: /\b(perhaps|possibly|peut-être|sans doute)\s+/gi,
    to: "",
    minIntensity: "light",
    modes: ["naturel", "professionnel", "expert", "personnel"],
  },
  {
    type: "adoucisseur",
    reason: "Suppression d'un adoucisseur (« just » / « en fait »)",
    regex: /\b(just|actually|en fait|tout simplement)\s+/gi,
    to: "",
    minIntensity: "moderate",
  },

  // Jargon corporate
  {
    type: "jargon",
    reason: "Remplacement de jargon corporate par un mot concret",
    regex: /\bleveraging\b/gi,
    to: "using",
    minIntensity: "moderate",
  },
  {
    type: "jargon",
    reason: "Remplacement de jargon corporate par un mot concret",
    regex: /\boptimize engagement metrics\b/gi,
    to: "get people paying attention",
    minIntensity: "moderate",
  },

  // Transitions
  {
    type: "transition",
    reason: "Variation d'une transition mécanique",
    regex: /\bEn effet,\s*/gi,
    to: ["D'ailleurs, ", "En fait, ", "À vrai dire, "],
    minIntensity: "light",
    modes: ["naturel", "personnel"],
  },
  {
    type: "transition",
    reason: "Variation d'une transition mécanique",
    regex: /\bCependant,\s*/gi,
    to: ["Mais ", "Par contre, ", "Pourtant, "],
    minIntensity: "light",
    modes: ["naturel", "personnel"],
  },
  {
    type: "transition",
    reason: "Variation d'une transition mécanique",
    regex: /\bDe plus,\s*/gi,
    to: ["Aussi, ", "Et puis, ", "En plus, "],
    minIntensity: "light",
    modes: ["naturel", "personnel"],
  },

  // Mode personnel : oralité
  {
    type: "oralite",
    reason: "Ajout d'une marque d'oralité (mode personnel)",
    regex: /\bIl est important de\b/gi,
    to: ["Franchement, il faut", "Honnêtement, il faut"],
    minIntensity: "moderate",
    modes: ["personnel"],
  },

  // Mode professionnel / expert : concision
  {
    type: "concision",
    reason: "Suppression d'une formule passe-partout (registre pro)",
    regex: /\b(il convient de noter que|il est essentiel de noter que|it is important to note that)\s*/gi,
    to: "",
    minIntensity: "light",
    modes: ["professionnel", "expert", "academique"],
  },

  // #16 Tirets cadratins abusifs
  {
    type: "tirets",
    reason: "Remplacement du deuxième tiret cadratin par une virgule (#16)",
    regex: /—\s*/g,
    to: ", ",
    minIntensity: "aggressive",
  },

  // #20 Émojis décoratifs
  {
    type: "emoji",
    reason: "Suppression des émojis décoratifs (#20)",
    regex: /(?:^|\n|\s)[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]\s*/gu,
    to: "",
    minIntensity: "light",
  },

  // #19 Title Case
  {
    type: "titlecase",
    reason: "Correction du Title Case en français (#19)",
    regex: /(##?\s+)([A-ZÀÂÉÈÊÏÔÙÛÜŒ][a-zàâéèêëîïôöùûüçÿ]+)\s+([A-ZÀÂÉÈÊÏÔÙÛÜŒ][a-zàâéèêëîïôöùûüçÿ]+)/g,
    to: (m, p1, w1, w2) => p1 + w1 + " " + w2.toLowerCase(),
    minIntensity: "light",
  },
];

/** Un seul passage de réécriture. Retourne le texte + le journal. */
function rewritePass(text: string, intensity: HumanizeIntensity, mode: HumanizeMode): { text: string; changeLog: ChangeLog[] } {
  let result = text;
  const changeLog: ChangeLog[] = [];
  const rank = INTENSITY_RANK[intensity];

  for (const rule of RULES) {
    if (rule.minIntensity && INTENSITY_RANK[rule.minIntensity] > rank) continue;
    if (rule.modes && !rule.modes.includes(mode)) continue;

    result = result.replace(rule.regex, (match) => {
      let replacement: string;
      if (typeof rule.to === "function") replacement = rule.to(match);
      else if (Array.isArray(rule.to)) replacement = pick(rule.to);
      else replacement = rule.to;
      if (replacement === match) return match;
      changeLog.push({ type: rule.type, original: match.trim(), replacement: replacement.trim(), reason: rule.reason });
      return replacement;
    });
  }

  // Nettoyage des espaces résiduels après suppressions.
  result = result.replace(/\s{2,}/g, " ").replace(/\s+([.,;:!?])/g, "$1");
  // Recapitalisation en début de phrase et après un saut de paragraphe.
  result = result.replace(/([.!?]\s+)([a-zà-ÿÀ-Ý])/g, (_m, p1, p2) => p1 + p2.toUpperCase());
  result = result.replace(/(\n\n+\s*)([a-zà-ÿÀ-Ý])/g, (_m, p1, p2) => p1 + p2.toUpperCase());
  result = result.replace(/^([a-zà-ÿÀ-Ý])/, (_m, c) => c.toUpperCase());

  return { text: result, changeLog };
}

/**
 * Pipeline complet : Analyse → Réécriture → Vérification → Correction (boucle).
 * 100% local, sans réseau.
 */
export function performHumanize(inputText: string, options: HumanizeOptions = {}): HumanizeStats {
  const intensity = options.intensity ?? "moderate";
  const mode = options.mode ?? "naturel";
  const maxPasses = options.maxPasses ?? 5;

  // 1. Analyse initiale
  const scoreBefore = analyzeText(inputText).score;

  let current = inputText;
  const changeLog: ChangeLog[] = [];
  let passes = 0;

  // Application optionnelle du profil stylistique avant la réécriture.
  if (options.profile) {
    const applied = applyProfile(current, options.profile);
    current = applied.text;
    changeLog.push(...applied.changeLog);
  }

  // 2-4. Boucle Réécriture → Vérification → Correction
  const target = options.targetScore;
  const loopLimit = target !== undefined ? maxPasses : 1;

  for (let i = 0; i < loopLimit; i++) {
    const { text, changeLog: passLog } = rewritePass(current, intensity, mode);
    passes++;
    current = text;
    changeLog.push(...passLog);

    if (target === undefined) break;

    const verify = analyzeText(current).score;
    if (verify <= target) break;
    // Correction : si pas de modification ce tour, on arrête (pas de progrès possible).
    if (passLog.length === 0) break;
  }

  const scoreAfter = analyzeText(current).score;

  return {
    humanizedText: current,
    modificationsCount: changeLog.length,
    changeLog,
    passes,
    scoreBefore,
    scoreAfter,
    mode,
    intensity,
  };
}
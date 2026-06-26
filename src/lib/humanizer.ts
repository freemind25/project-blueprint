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
  // --- Suppression des AI tells (tous modes, dès "light") ---
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

  // --- Jargon corporate -> mots concrets (moderate+) ---
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
  {
    type: "vague",
    reason: "Affirmation vague signalée",
    regex: /\b(many people think|beaucoup de gens pensent)\b/gi,
    to: (m) => m,
    minIntensity: "moderate",
  },

  // --- Transitions : variation selon le mode ---
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

  // --- Mode personnel : oralité ---
  {
    type: "oralite",
    reason: "Ajout d'une marque d'oralité (mode personnel)",
    regex: /\bIl est important de\b/gi,
    to: ["Franchement, il faut", "Honnêtement, il faut"],
    minIntensity: "moderate",
    modes: ["personnel"],
  },

  // --- Mode professionnel / expert : concision ---
  {
    type: "concision",
    reason: "Suppression d'une formule passe-partout (registre pro)",
    regex: /\b(il convient de noter que|il est essentiel de noter que|it is important to note that)\s*/gi,
    to: "",
    minIntensity: "light",
    modes: ["professionnel", "expert", "academique"],
  },

  // ═══════════════════════════════════════
  // PHASE 0.4 — Variations lexicales/syntaxiques (bruit stylistique)
  // ═══════════════════════════════════════

  // --- Synonymes courants (FR) ---
  {
    type: "synonyme",
    reason: "Variation lexicale : synonyme courant",
    regex: /\bpermettre\b/gi,
    to: ["autoriser", "rendre possible", "offrir la possibilité de"],
    minIntensity: "moderate",
  },
  {
    type: "synonyme",
    reason: "Variation lexicale : synonyme courant",
    regex: /\butiliser\b/gi,
    to: ["employer", "se servir de", "recourir à"],
    minIntensity: "moderate",
  },
  {
    type: "synonyme",
    reason: "Variation lexicale : synonyme courant",
    regex: /\bimportant\b/gi,
    to: ["essentiel", "majeur", "déterminant", "clé"],
    minIntensity: "moderate",
  },
  {
    type: "synonyme",
    reason: "Variation lexicale : synonyme courant",
    regex: /\baméliorer\b/gi,
    to: ["optimiser", "perfectionner", "renforcer"],
    minIntensity: "moderate",
  },
  {
    type: "synonyme",
    reason: "Variation lexicale : synonyme courant",
    regex: /\bproblème\b/gi,
    to: ["difficulté", "enjeu", "obstacle", "défi"],
    minIntensity: "moderate",
  },
  {
    type: "synonyme",
    reason: "Variation lexicale : synonyme courant",
    regex: /\bsolution\b/gi,
    to: ["réponse", "approche", "remède", "piste"],
    minIntensity: "moderate",
  },
  {
    type: "synonyme",
    reason: "Variation lexicale : synonyme courant",
    regex: /\beffectuer\b/gi,
    to: ["réaliser", "mener", "accomplir"],
    minIntensity: "moderate",
  },
  {
    type: "synonyme",
    reason: "Variation lexicale : synonyme courant",
    regex: /\bconcernant\b/gi,
    to: ["au sujet de", "quant à", "pour ce qui est de"],
    minIntensity: "moderate",
  },

  // --- Synonymes courants (EN) ---
  {
    type: "synonyme",
    reason: "Lexical variation: common synonym",
    regex: /\butilize\b/gi,
    to: ["use", "employ", "apply"],
    minIntensity: "moderate",
  },
  {
    type: "synonyme",
    reason: "Lexical variation: common synonym",
    regex: /\bimplement\b/gi,
    to: ["put in place", "set up", "introduce"],
    minIntensity: "moderate",
  },
  {
    type: "synonyme",
    reason: "Lexical variation: common synonym",
    regex: /\bsignificant\b/gi,
    to: ["notable", "substantial", "meaningful"],
    minIntensity: "moderate",
  },
  {
    type: "synonyme",
    reason: "Lexical variation: common synonym",
    regex: /\bfacilitate\b/gi,
    to: ["help", "enable", "make easier"],
    minIntensity: "moderate",
  },

  // --- Transitions supplémentaires (FR) ---
  {
    type: "transition",
    reason: "Variation d'une transition mécanique",
    regex: /\bPar conséquent,\s*/gi,
    to: ["Du coup, ", "Résultat : ", "Ce qui fait que "],
    minIntensity: "light",
    modes: ["naturel", "personnel"],
  },
  {
    type: "transition",
    reason: "Variation d'une transition mécanique",
    regex: /\bNéanmoins,\s*/gi,
    to: ["Mais ", "Cela dit, ", "Malgré tout, "],
    minIntensity: "light",
    modes: ["naturel", "personnel"],
  },
  {
    type: "transition",
    reason: "Variation d'une transition mécanique",
    regex: /\bEn outre,\s*/gi,
    to: ["Et aussi, ", "Sans oublier que ", "Par ailleurs, "],
    minIntensity: "light",
    modes: ["naturel", "personnel"],
  },
  {
    type: "transition",
    reason: "Variation d'une transition mécanique (registre académique)",
    regex: /\bPar conséquent,\s*/gi,
    to: ["Il s'ensuit que ", "Cela implique que ", "On en déduit que "],
    minIntensity: "light",
    modes: ["academique", "expert"],
  },

  // --- Incises et variation de longueur (aggressive uniquement) ---
  {
    type: "incise",
    reason: "Ajout d'une incise pour varier le rythme",
    regex: /\. (Cette|Cette|Ce|Cet) /gi,
    to: (m: string) => {
      const incises = [
        ". Et ça, c'est clé. ",
        ". Point important : ",
        ". À noter : ",
        ". Autrement dit, ",
      ];
      // 30% de chance d'insérer une incise
      if (Math.random() > 0.3) return m;
      return incises[Math.floor(Math.random() * incises.length)] + m.slice(2).toLowerCase();
    },
    minIntensity: "aggressive",
    modes: ["naturel", "personnel"],
  },
  {
    type: "variation-longueur",
    reason: "Fusion de deux phrases courtes pour varier le rythme",
    regex: /([^.!?]{10,40})\. ([A-ZÀ-Ý][^.!?]{10,40})\./g,
    to: (m: string) => {
      // 25% de chance de fusionner
      if (Math.random() > 0.25) return m;
      const parts = m.match(/([^.!?]{10,40})\. ([A-ZÀ-Ý][^.!?]{10,40})\./);
      if (!parts) return m;
      const connectors = [", et ", ", ce qui ", " — "];
      const connector = connectors[Math.floor(Math.random() * connectors.length)];
      return parts[1] + connector + parts[2].charAt(0).toLowerCase() + parts[2].slice(1) + ".";
    },
    minIntensity: "aggressive",
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
  result = result.replace(/\s{2,}/g, " ").replace(/\s+([.,;:!?])/g, "$1").replace(/^\s+/gm, (m) => m);
  // Recapitalisation en début de phrase.
  result = result.replace(/([.!?]\s+)([a-zà-ÿ])/g, (_m, p1, p2) => p1 + p2.toUpperCase());
  result = result.replace(/^([a-zà-ÿ])/, (_m, c) => c.toUpperCase());

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
/**
 * Writer Profile — module local d'analyse stylistique.
 * Analyse des textes de l'utilisateur, produit un profil JSON, et permet
 * une réécriture légère pour rapprocher un texte du style appris. 100% local.
 */

export interface WriterProfile {
  name: string;
  createdAt: string;
  language: "fr" | "en" | "mixte";
  metrics: {
    avgSentenceLength: number;
    sentenceLengthStdDev: number;
    lexicalDiversity: number; // 0-1 (TTR)
    contractionRate: number; // FR : "c'est", "j'ai"... par phrase
    commaRate: number; // virgules par phrase
    exclamationRate: number;
    questionRate: number;
    firstPersonRate: number; // "je", "j'", "nous"
  };
  signaturePhrases: string[]; // bigrammes/trigrammes fréquents
  favoriteTransitions: string[];
}

export interface ProfileChange {
  type: string;
  original: string;
  replacement: string;
  reason: string;
}

const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

function splitSentences(text: string): string[] {
  return text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
}

function words(text: string): string[] {
  return (text.toLowerCase().match(/\b[\wàâäéèêëîïôöùûüç']+\b/gi) || []);
}

function topNgrams(toks: string[], n: number, top: number): string[] {
  const counts = new Map<string, number>();
  for (let i = 0; i + n <= toks.length; i++) {
    const g = toks.slice(i, i + n).join(" ");
    if (g.length < 6) continue;
    counts.set(g, (counts.get(g) || 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, c]) => c > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([g]) => g);
}

/** Analyse un (ou plusieurs) texte(s) et construit un profil stylistique. */
export function buildProfile(text: string, name = "Mon style"): WriterProfile {
  const sentences = splitSentences(text);
  const toks = words(text);
  const sCount = Math.max(1, sentences.length);

  const lengths = sentences.map((s) => s.split(/\s+/).filter(Boolean).length);
  const avg = lengths.reduce((a, b) => a + b, 0) / sCount;
  const variance = lengths.reduce((a, b) => a + (b - avg) ** 2, 0) / sCount;
  const stdDev = Math.sqrt(variance);

  const unique = new Set(toks).size;
  const lexicalDiversity = unique / Math.max(1, toks.length);

  const contractions = (text.match(/\b\w+['’](?=\w)/g) || []).length;
  const commas = (text.match(/,/g) || []).length;
  const exclam = (text.match(/!/g) || []).length;
  const quest = (text.match(/\?/g) || []).length;
  const firstPerson = (text.match(/\b(je|j['’]|nous|on)\b/gi) || []).length;

  const frHits = (text.match(/\b(le|la|les|une|des|est|dans|que|qui)\b/gi) || []).length;
  const enHits = (text.match(/\b(the|and|of|to|is|in|that|it)\b/gi) || []).length;
  const language: WriterProfile["language"] =
    frHits > enHits * 1.5 ? "fr" : enHits > frHits * 1.5 ? "en" : "mixte";

  const transitionCandidates = [
    "d'ailleurs", "en fait", "du coup", "par contre", "cependant", "donc",
    "ensuite", "puis", "however", "so", "then", "also",
  ];
  const favoriteTransitions = transitionCandidates.filter((t) =>
    new RegExp(`\\b${t.replace("'", "['’]")}\\b`, "i").test(text)
  );

  return {
    name,
    createdAt: new Date().toISOString(),
    language,
    metrics: {
      avgSentenceLength: round(avg, 1),
      sentenceLengthStdDev: round(stdDev, 1),
      lexicalDiversity: round(lexicalDiversity, 3),
      contractionRate: round(contractions / sCount, 2),
      commaRate: round(commas / sCount, 2),
      exclamationRate: round(exclam / sCount, 2),
      questionRate: round(quest / sCount, 2),
      firstPersonRate: round(firstPerson / sCount, 2),
    },
    signaturePhrases: [...topNgrams(toks, 3, 4), ...topNgrams(toks, 2, 4)].slice(0, 6),
    favoriteTransitions,
  };
}

/**
 * Réécriture légère pour rapprocher un texte du profil.
 * Reste conservatrice (substitutions sûres) pour préserver le sens.
 */
export function applyProfile(text: string, profile: WriterProfile): { text: string; changeLog: ProfileChange[] } {
  let result = text;
  const changeLog: ProfileChange[] = [];

  // Si l'auteur utilise beaucoup la 1re personne, adoucir les formules impersonnelles.
  if (profile.metrics.firstPersonRate >= 0.3) {
    result = result.replace(/\bIl est important de\b/gi, (m) => {
      changeLog.push({ type: "profil", original: m, replacement: "Je pense qu'il faut", reason: "Adaptation au style personnel (1re personne)" });
      return "Je pense qu'il faut";
    });
  }

  // Si l'auteur privilégie certaines transitions, harmoniser les transitions neutres.
  const fav = profile.favoriteTransitions[0];
  if (fav) {
    result = result.replace(/\bDe plus,\s*/gi, () => {
      const rep = fav.charAt(0).toUpperCase() + fav.slice(1) + ", ";
      changeLog.push({ type: "profil", original: "De plus,", replacement: rep.trim(), reason: "Transition adaptée au style appris" });
      return rep;
    });
  }

  return { text: result, changeLog };
}

/** Sérialise le profil pour export/import JSON. */
export function serializeProfile(profile: WriterProfile): string {
  return JSON.stringify(profile, null, 2);
}

export function parseProfile(json: string): WriterProfile {
  const p = JSON.parse(json);
  if (!p || typeof p !== "object" || !p.metrics) throw new Error("Profil invalide");
  return p as WriterProfile;
}
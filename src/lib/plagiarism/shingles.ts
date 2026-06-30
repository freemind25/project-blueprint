/**
 * Multi-lingual tokenizer & shingle extractor (FR + EN + ES + DE + ...)
 * Supports: accented Latin, Cyrillic, Greek, Arabic, CJK, digits.
 */
const WORD_RE = /\b[\wàâäéèêëîïôöùûüÿçÀÂÄÉÈÊËÎÏÔÖÙÛÜŸÇœŒæÆßñÑüÜáÁíÍóÓúÚěĚšŠčČřŘžŽďĎťŤňŇăĂîÎâÂşŞţŢа-яА-ЯёЁα-ωΑ-Ω]+\b/gu;

export function tokenize(text: string): string[] {
  return (text.match(WORD_RE) || []).map((w) => w.toLowerCase());
}

/** Stop words for TF-IDF (FR + EN) — common words to ignore. */
export const STOP_WORDS = new Set([
  // FR
  "le","la","les","de","des","un","une","et","à","en","que","qui","dans","pour","est",
  "ce","il","elle","on","ne","pas","plus","par","je","avec","tout","se","son","au",
  "aux","ou","mais","si","leur","y","nous","vous","ils","elles","cette","ces","sur",
  "été","etre","sont","aussi","comme","entre","tout","ses","sa","mon","ma","mes","ton",
  "ta","tes","notre","votre","leur","du","dont","peut","très","bien","fait","alors",
  // EN
  "the","of","and","to","in","is","it","that","for","was","on","are","with","as",
  "this","be","at","have","from","or","by","not","but","what","all","were","when",
  "we","there","can","an","your","which","their","has","will","each","about","how",
  "up","out","them","than","its","over","such","after","just","those","also","would",
  "into","could","than","more","other","may","should","been","some","these","any",
  "very","even","most","only","own","same","so","too","did","than","then","where",
  "why","here","because","does","make","made","much","way","many","still","use",
  // ES basic
  "el","los","las","del","una","unos","unas","por","con","para","como","pero","sus",
  "más","también","ese","esta","eso","esto","ya","muy","hay","yo","mi","tu",
  // DE basic
  "der","die","das","ein","eine","und","ist","von","den","dem","des","auf","mit",
  "nicht","sich","auch","als","nach","wie","kann","hat","sind","wird","oder","aber",
  "für","zum","zur","durch","über","aus","nur","noch","sehr","wird",
]);

export function extractShingles(text: string, n: number = 3): string[] {
  if (n < 1) return [];
  const tokens = tokenize(text);
  if (tokens.length < n) return [];
  const shingles: string[] = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    shingles.push(tokens.slice(i, i + n).join("\u00A0"));
  }
  return shingles;
}

export function shingleSet(text: string, n: number = 3): Set<string> {
  return new Set(extractShingles(text, n));
}

export function extractShinglesWithPositions(
  text: string, n: number = 3
): Array<{ shingle: string; startOffset: number; endOffset: number }> {
  const result: Array<{ shingle: string; startOffset: number; endOffset: number }> = [];
  const matches = text.matchAll(WORD_RE);
  const tokens: Array<{ word: string; start: number; end: number }> = [];
  for (const match of matches) {
    tokens.push({ word: match[0].toLowerCase(), start: match.index!, end: match.index! + match[0].length });
  }
  if (tokens.length < n) return result;
  for (let i = 0; i <= tokens.length - n; i++) {
    result.push({
      shingle: tokens.slice(i, i + n).map((t) => t.word).join("\u00A0"),
      startOffset: tokens[i].start,
      endOffset: tokens[i + n - 1].end,
    });
  }
  return result;
}

/**
 * Multi-granularity shingles: extracts n-grams at sizes [n, n+1, n+2].
 * Returns a flat set with prefixed keys "3:shingle", "4:shingle", etc.
 * This improves detection across paraphrased text (different n-gram sizes).
 */
export function multiGranularityShingles(text: string, baseN: number = 3, levels: number = 3): Map<number, Set<string>> {
  const result = new Map<number, Set<string>>();
  for (let n = baseN; n < baseN + levels; n++) {
    result.set(n, shingleSet(text, n));
  }
  return result;
}

/**
 * Character-level n-grams for catching copy-paste with minor edits.
 * Useful for detecting paraphrased plagiarism that word-level n-grams miss.
 */
export function charNgrams(text: string, n: number = 5): Set<string> {
  const cleaned = text.toLowerCase().replace(/\s+/g, " ");
  if (cleaned.length < n) return new Set();
  const set = new Set<string>();
  for (let i = 0; i <= cleaned.length - n; i++) {
    set.add(cleaned.slice(i, i + n));
  }
  return set;
}

// ── LANGUAGE DETECTION ──────────────────────────────────────────────

/** Language-specific stop word subsets for detection heuristics. */
const EN_STOP = new Set([
  "the","of","and","to","in","is","it","that","for","was","on","are","with","as",
  "this","be","at","have","from","or","by","not","but","what","all","were","when",
  "we","there","can","an","your","which","their","has","will","each","about","how",
  "up","out","them","its","over","such","after","just","those","also","would",
  "into","could","more","other","may","should","been","some","these","any",
  "very","even","most","only","own","same","so","too","did","than","then","where",
  "why","here","because","does","make","made","much","way","many","still","use",
]);

const FR_STOP = new Set([
  "le","la","les","de","des","un","une","et","à","en","que","qui","dans","pour","est",
  "ce","il","elle","on","ne","pas","plus","par","je","avec","tout","se","son","au",
  "aux","ou","mais","si","leur","y","nous","vous","ils","elles","cette","ces","sur",
  "été","etre","sont","aussi","comme","entre","ses","sa","mon","ma","mes","ton",
  "ta","tes","notre","votre","du","dont","peut","très","bien","fait","alors",
]);

const ES_STOP = new Set([
  "el","los","las","del","una","unos","unas","por","con","para","como","pero","sus",
  "más","también","ese","esta","eso","esto","ya","muy","hay","yo","mi","tu",
]);

const DE_STOP = new Set([
  "der","die","das","ein","eine","und","ist","von","den","dem","des","auf","mit",
  "nicht","sich","auch","als","nach","wie","kann","hat","sind","wird","oder","aber",
  "für","zum","zur","durch","über","aus","nur","noch","sehr",
]);

/**
 * Detect language using stop word frequency heuristics.
 * Returns "auto" if text is too short to detect.
 */
export function detectLanguage(text: string): "fr" | "en" | "es" | "de" | "auto" {
  const words = (text.match(WORD_RE) || []).map((w) => w.toLowerCase());
  if (words.length < 5) return "auto";

  let enHits = 0, frHits = 0, esHits = 0, deHits = 0;
  for (const w of words) {
    if (EN_STOP.has(w)) enHits++;
    if (FR_STOP.has(w)) frHits++;
    if (ES_STOP.has(w)) esHits++;
    if (DE_STOP.has(w)) deHits++;
  }

  const total = words.length;
  const scores: Array<{ lang: "fr" | "en" | "es" | "de" | "auto"; score: number }> = [
    { lang: "en", score: enHits / total },
    { lang: "fr", score: frHits / total },
    { lang: "es", score: esHits / total },
    { lang: "de", score: deHits / total },
  ];
  scores.sort((a, b) => b.score - a.score);
  return scores[0].score > 0.1 ? scores[0].lang : "auto";
}

// ── STEMMING ────────────────────────────────────────────────────────

/**
 * Simple suffix-stripping stemmer for EN and FR.
 * Falls back to returning the word unchanged for unsupported languages.
 */
export function stem(word: string, lang: string): string {
  if (word.length <= 3) return word;
  if (lang === "en") return stemEN(word);
  if (lang === "fr") return stemFR(word);
  return word;
}

function stemEN(w: string): string {
  // English suffix rules (Porter-lite)
  const replacements: Array<[string, string, number]> = [
    ["ational", "ate", 0],
    ["tional", "tion", 0],
    ["enci", "ence", 0],
    ["anci", "ance", 0],
    ["izer", "ize", 0],
    ["isation", "ize", 0],
    ["ization", "ize", 0],
    ["fulness", "ful", 0],
    ["ousness", "ous", 0],
    ["iveness", "ive", 0],
    ["ment", "", 0],
    ["ness", "", 0],
    ["tion", "", 0],
    ["sion", "", 0],
    ["ally", "al", 0],
    ["ing", "", 5],    // min length after removal
    ["ed", "", 4],
    ["ly", "", 4],
    ["er", "", 4],
    ["est", "", 4],
    ["s", "", 0],      // handled specially below
  ];

  for (const [suffix, replacement, minLenAfter] of replacements) {
    if (w.endsWith(suffix)) {
      const base = w.slice(0, w.length - suffix.length) + replacement;
      if (minLenAfter > 0 && base.length < minLenAfter) continue;
      if (suffix === "s" && w.endsWith("ss")) continue;
      if (base.length >= 2) return base;
    }
  }
  return w;
}

function stemFR(w: string): string {
  // French suffix rules (lite)
  // Order matters: longer / more specific suffixes first
  const rules: Array<[string, string, number]> = [
    ["issement", "", 0],
    ["isation", "iser", 0],
    ["ement", "", 0],
    ["ment", "", 5],
    ["ations", "er", 0],
    ["ation", "", 5],
    ["tion", "", 0],
    ["euses", "", 0],
    ["euse", "", 0],
    ["teur", "", 0],
    ["trice", "", 0],
    ["elle", "", 5],
    ["ique", "", 5],
    ["aison", "", 5],
    ["eux", "", 4],
    ["aux", "al", 0],
    ["aux", "", 4],
    ["el", "", 4],
    ["al", "", 5],
    ["oir", "", 5],
  ];

  for (const [suffix, replacement, minLenAfter] of rules) {
    if (w.endsWith(suffix)) {
      const base = w.slice(0, w.length - suffix.length) + replacement;
      if (minLenAfter > 0 && base.length < minLenAfter) continue;
      if (base.length >= 2) return base;
    }
  }
  return w;
}

/**
 * Tokenize text with stemming applied. Auto-detects language if not provided.
 * Returns stemmed tokens with stop words filtered out.
 */
export function stemmedTokenize(text: string, lang?: string): string[] {
  const detected = lang ?? (() => {
    const d = detectLanguage(text);
    return d === "auto" ? "en" : d;
  })();
  const tokens = tokenize(text);
  return tokens
    .map((t) => stem(t, detected))
    .filter((t) => !STOP_WORDS.has(t) && t.length > 1);
}

/**
 * Extract stemmed shingles (n-grams of stemmed tokens).
 */
export function stemmedShingleSet(text: string, n: number = 3, lang?: string): Set<string> {
  const tokens = stemmedTokenize(text, lang);
  if (tokens.length < n) return new Set();
  const shingles = new Set<string>();
  for (let i = 0; i <= tokens.length - n; i++) {
    shingles.add(tokens.slice(i, i + n).join("\u00A0"));
  }
  return shingles;
}
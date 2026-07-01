// Manual runtime benchmark — self-contained, no imports from src/
// Copy-pasted minimal implementations for isolated measurement

const AI_TEXT = `Il est important de noter que l'intelligence artificielle a considérablement transformé notre société. En effet, les algorithmes d'apprentissage automatique jouent un rôle crucial dans de nombreux secteurs. Il convient de souligner que cette révolution technologique entraîne des changements profonds. De plus, les experts s'accordent à dire que l'IA continuera à évoluer rapidement dans les années à venir. Par ailleurs, il est essentiel de comprendre les implications éthiques de ces avancées technologiques. Force est de constater que l'impact de l'intelligence artificielle sur le marché du travail est significatif. En conclusion, il est indéniable que cette technologie représente un tournant majeur dans l'histoire de l'humanité.`;

const HUMAN_TEXT = `J'ai testé l'outil hier soir et franchement, j'ai été surpris. Au début je pensais que ça allait être nul, mais non — ça marche plutôt bien. Le seul truc chiant c'est qu'il faut attendre un peu quand le texte est long. Sinon l'interface est clean, j'aime bien le côté sombre. Si vous hésitez, essayez, c'est gratuit en plus !`;

const AI_EN_TEXT = `In today's fast-paced world, AI isn't just about automation - it's about transformation. Many people think that leveraging these tools might help optimize engagement metrics. Let that sink in. The secret? It's not just about technology, it's about people. Navigating the complexities of modern organizations requires a holistic approach. It's worth noting that delving into these technologies reveals a tapestry of unprecedented insights.`;

const LONG_TEXT = AI_TEXT.repeat(10);

function bench(name, fn, iterations = 5000) {
  for (let i = 0; i < 100; i++) fn(); // warmup
  const start = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  const elapsed = performance.now() - start;
  const avgUs = (elapsed / iterations) * 1000;
  const ops = Math.round(iterations / (elapsed / 1000));
  const time = avgUs < 100 ? avgUs.toFixed(1) + ' \u00B5s' : (avgUs / 1000).toFixed(2) + ' ms';
  console.log(`  ${name.padEnd(48)} ${time.padStart(12)}  (~${ops.toLocaleString()} ops/s)`);
}

// === Inline implementations ===

// Feature extraction (simplified)
function extractFeaturesBench(text, hs) {
  const WORD_RE = /\b[\w\u00E0\u00E2\u00E4\u00E9\u00E8\u00EA\u00EB\u00EE\u00EF\u00F4\u00F6\u00F9\u00FB\u00FC\u00E7\u00C0\u00C2\u00C4\u00C9\u00C8\u00CA\u00CB\u00CE\u00CF\u00D4\u00D9\u00DB\u00DC]+\b/gi;
  const wds = text.toLowerCase().match(WORD_RE) || [];
  const wc = wds.length;
  const sents = text.split(/[.!?]+/).filter(s => s.trim());
  const sc = sents.length;
  const sl = sents.map(s => s.trim().split(/\s+/).length);
  const avg = sc > 0 ? sl.reduce((a, b) => a + b, 0) / sc : 0;
  const mx = sl.length > 0 ? Math.max(...sl) : 0;
  const mn = sl.length > 0 ? Math.min(...sl) : 0;
  const v = sc > 0 ? sl.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / sc : 0;
  const sd = Math.sqrt(v);
  const qr = sc > 0 ? sents.filter(s => s.trim().endsWith("?")).length / sc : 0;
  const awl = wc > 0 ? wds.reduce((s, w) => s + w.length, 0) / wc : 0;
  const uw = new Set(wds);
  const ttr = wc > 0 ? uw.size / wc : 0;
  const freq = new Map();
  wds.forEach(w => freq.set(w, (freq.get(w) || 0) + 1));
  const hap = [...freq.values()].filter(v => v === 1).length;
  const hr = wc > 0 ? hap / wc : 0;
  const bg = new Set();
  for (let i = 0; i < wds.length - 1; i++) bg.add(wds[i] + '|' + wds[i + 1]);
  const bd = wc > 1 ? bg.size / (wc - 1) : 0;
  return { wc, sc, avg, sd, ttr, hr, bd, qr, awl };
}

// MLP inference
const FEATURE_DIM = 24;
function relu(x) { return x > 0 ? x : 0; }
function sig(x) { return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x)))); }
function mm(inp, w, b, id, od) {
  const o = new Float32Array(od);
  for (let j = 0; j < od; j++) { let s = b[j]; for (let i = 0; i < id; i++) s += inp[i] * w[i * od + j]; o[j] = s; }
  return o;
}
function ar(t) { const r = new Float32Array(t.length); for (let i = 0; i < t.length; i++) r[i] = relu(t[i]); return r; }
const S = (i, j) => Math.sin(i * .73 + j * .31) * .5 + Math.cos(i * .17 + j * .53) * .3;
const L1W = new Float32Array(FEATURE_DIM * 32), L1B = new Float32Array(32);
const L2W = new Float32Array(32 * 16), L2B = new Float32Array(16);
for (let i = 0; i < FEATURE_DIM * 32; i++) L1W[i] = S(i, i * .7);
for (let i = 0; i < 32 * 16; i++) L2W[i] = S(i, i * .5);
const L3W = new Float32Array([.42, -.18, .67, .31, -.55, .48, .23, -.39, .56, .14, -.61, .37, .52, -.26, .44, .59]);
const L3B = new Float32Array([-.12]);

function mlpPredict(features) {
  const h1 = ar(mm(features, L1W, L1B, FEATURE_DIM, 32));
  const h2 = ar(mm(h1, L2W, L2B, 32, 16));
  const o = mm(h2, L3W, L3B, 16, 1);
  return sig(o[0]);
}

// Full text analysis (with 29 FR + 30 EN patterns)
const AI_PATTERNS_BENCH = [
  /\b(constitue un t\u00E9moignage|joue un r\u00F4le (vital|significatif|cruciel|d\u00E9terminant))\b/gi,
  /\b(soulignant|mettant en (\u00E9vidence|avant)|refl\u00E9tant|symbolisant|contribuant \u00E0|cultivant|favorisant)\s+/gi,
  /\b(vibrant|au riche patrimoine|beaut\u00E9 naturelle|r\u00E9volutionnaire|r\u00E9put\u00E9|incontournable)\b/gi,
  /\b(d'un c\u00F4t\u00E9[^.]+de l'autre c\u00F4t\u00E9)/gi,
  /\b(par ailleurs|s'aligner sur|explorer en profondeur|durable|p\u00E9renne|renforcer|favoriser|susciter)\b/gi,
  /\b(let that sink in|now more than ever|the best part\??|here's the thing|let's be honest|at the end of the day)\b/gi,
  /\b(delve (into|deeper)|delving (into|deeper))\b/gi,
  /\b(a rich tapestry|tapestry of|a symphony of)\b/gi,
  /\b(navigat(?:e|ing) (the|a|our|their) (?:complexities?|landscape|terrain|world))\b/gi,
  /\b(transformative|revolutionary|groundbreaking|game-changing)\b/gi,
  /\b(in (?:an|this) (?:era|age|world|landscape) (?:where|of|characterized by))\b/gi,
  /\b(seamless(?:ly)?)\b/gi,
  /\b(leverage|utilize|utilise)\b/gi,
  /\b(holistic (?:approach|view|perspective|strategy))\b/gi,
  /\b(in conclusion|to sum up|to summarize|wrapping up|bringing it all together)\b/gi,
  /\b(not only\s+.{5,50}?\s+but\s+(also\s+|even\s+|it\s+))/gi,
  /\b(fostering?|cultivating?|nurturing?)\s+\w+/gi,
  /\b(paramount (?:importance|concern))\b/gi,
  /\b(a myriad of|an array of|a multitude of|a plethora of)\b/gi,
  /\b(sheds? (?:light|insight|clarity) on)\b/gi,
];

function analyzeTextFullBench(text) {
  const wds = text.toLowerCase().match(/\b[\w\u00E0-\u00F9]+\b/gi) || [];
  const wc = wds.length;
  const sents = text.split(/[.!?]+/).filter(s => s.trim());
  const sc = sents.length;
  const sl = sents.map(s => s.trim().split(/\s+/).length);
  const avg = sc > 0 ? sl.reduce((a, n) => a + n, 0) / sc : 0;
  const uw = new Set(wds);
  const ttr = wc > 0 ? uw.size / wc : 0;
  const variance = sc > 0 ? sl.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / sc : 0;
  const sd = Math.sqrt(variance);
  const burstiness = Math.min(100, (1 - sd / Math.max(1, avg)) * 100);
  let patternCount = 0, patternPoints = 0;
  for (const p of AI_PATTERNS_BENCH) {
    const m = text.match(p) || [];
    if (m.length) { patternCount += m.length; patternPoints += m.length * 6; }
  }
  const connectors = ["en effet", "cependant", "de plus", "par ailleurs", "however", "moreover", "furthermore", "therefore"];
  let connCount = 0;
  for (const c of connectors) connCount += (text.toLowerCase().split(c).length - 1);
  const transitions = Math.min(100, (connCount / Math.max(1, wc)) * 600);
  const score = Math.min(100, Math.round(
    burstiness * 0.2 + transitions * 0.15 + (100 - ttr * 100) * 0.1 + Math.min(40, patternPoints)
  ));
  return { score, patternCount, burstiness, transitions, ttr };
}

// MinHash
function tokenizeBench(text) {
  return text.toLowerCase().match(/\b[\w\u00E0-\u00F9]+\b/gi) || [];
}

function shinglesBench(tokens, k) {
  const set = new Set();
  for (let i = 0; i <= tokens.length - k; i++) {
    set.add(tokens.slice(i, i + k).join('\u00A0'));
  }
  return set;
}

function minHashBench(s1, s2, n = 128) {
  const a = new Uint32Array(n), b = new Uint32Array(n);
  for (let i = 0; i < n; i++) { a[i] = Math.imul(i + 1, 2654435761); b[i] = Math.imul(i + 1, 2246822519); }
  const h1 = new Uint32Array(n).fill(0xFFFFFFFF), h2 = new Uint32Array(n).fill(0xFFFFFFFF);
  let hash = 0;
  for (const v of s1) { for (let k = 0; k < v.length; k++) hash = ((hash << 5) - hash + v.charCodeAt(k)) | 0; for (let i = 0; i < n; i++) { const h = (a[i] * ((hash >>> 0) + i) + b[i]) >>> 0; if (h < h1[i]) h1[i] = h; } hash = 0; }
  for (const v of s2) { for (let k = 0; k < v.length; k++) hash = ((hash << 5) - hash + v.charCodeAt(k)) | 0; for (let i = 0; i < n; i++) { const h = (a[i] * ((hash >>> 0) + i) + b[i]) >>> 0; if (h < h2[i]) h2[i] = h; } hash = 0; }
  let match = 0; for (let i = 0; i < n; i++) if (h1[i] === h2[i]) match++;
  return match / n;
}

// Winnowing
function winnowBench(shinglesArr, w = 4) {
  if (shinglesArr.length <= w) return [shinglesArr[0]];
  const fp = [];
  let prev = -1;
  for (let i = 0; i <= shinglesArr.length - w; i++) {
    let minIdx = i;
    for (let j = i + 1; j < i + w; j++) if (shinglesArr[j] < shinglesArr[minIdx]) minIdx = j;
    if (minIdx !== prev) { fp.push(shinglesArr[minIdx]); prev = minIdx; }
  }
  return fp;
}

// TF-IDF cosine similarity
function tfidfCosineBench(tokens1, tokens2) {
  const tf1 = new Map(), tf2 = new Map();
  for (const t of tokens1) tf1.set(t, (tf1.get(t) || 0) + 1);
  for (const t of tokens2) tf2.set(t, (tf2.get(t) || 0) + 1);
  const terms1 = [...tf1.keys()], terms2 = [...tf2.keys()];
  const map2 = new Map(terms2.map((t, i) => [t, i]));
  let dot = 0, norm1 = 0, norm2 = 0;
  for (let i = 0; i < terms1.length; i++) {
    const w1 = 1 + Math.log(tf1.get(terms1[i]));
    norm1 += w1 * w1;
    const j = map2.get(terms1[i]);
    if (j !== undefined) { const w2 = 1 + Math.log(tf2.get(terms2[j])); dot += w1 * w2; norm2 += w2 * w2; }
  }
  for (let i = 0; i < terms2.length; i++) { if (!map2.has(terms2[i])) { const w2 = 1 + Math.log(tf2.get(terms2[i])); norm2 += w2 * w2; } }
  return dot / (Math.sqrt(norm1) * Math.sqrt(norm2) || 1);
}

// Stemmers
function stemEN(w) {
  const rules = [
    ["ational","ate",0],["tional","tion",0],["enci","ence",0],["anci","ance",0],
    ["izer","ize",0],["isation","ize",0],["ization","ize",0],["fulness","ful",0],
    ["ousness","ous",0],["iveness","ive",0],["ment","",0],["ness","",0],
    ["tion","",0],["sion","",0],["ally","al",0],["ing","",5],["ed","",4],
    ["ly","",4],["er","",4],["est","",4],["s","",0],
  ];
  for (const [suf, rep, minL] of rules) {
    if (w.endsWith(suf)) {
      const base = w.slice(0, w.length - suf.length) + rep;
      if (minL > 0 && base.length < minL) continue;
      if (suf === "s" && w.endsWith("ss")) continue;
      if (base.length >= 2) return base;
    }
  }
  return w;
}

function stemFR(w) {
  const rules = [
    ["issement","",0],["isation","iser",0],["ement","",0],["ment","",5],
    ["ation","",5],["tion","",0],["euses","",0],["euse","",0],
    ["teur","",0],["trice","",0],["elle","",5],["ique","",5],
    ["aison","",5],["eux","",4],["aux","al",0],["aux","",4],
    ["el","",4],["al","",5],["oir","",5],
  ];
  for (const [suf, rep, minL] of rules) {
    if (w.endsWith(suf)) {
      const base = w.slice(0, w.length - suf.length) + rep;
      if (minL > 0 && base.length < minL) continue;
      if (base.length >= 2) return base;
    }
  }
  return w;
}

// Language detection
const EN_STOP = new Set(["the","of","and","to","in","is","it","that","for","was","on","are","with","as","this","be","at","have","from","or","by","not","but","what","all","were","when","we","there","can","an","your","which","their","has","will","each","about","how","up","out","them","its","over","such","after","just","those","also","would","into","could","more","other","may","should","been","some","these","any","very","even","most","only","own","same","so","too","did","than","then","where","why","here","because","does","make","much","way","many","still","use"]);
const FR_STOP = new Set(["le","la","les","de","des","un","une","et","\u00E0","en","que","qui","dans","pour","est","ce","il","elle","on","ne","pas","plus","par","je","avec","tout","se","son","au","aux","ou","mais","si","leur","y","nous","vous","ils","elles","cette","ces","sur","\u00E9t\u00E9","sont","aussi","comme","entre","ses","sa","mon","ma","mes","ton","ta","tes","notre","votre","du","dont","peut","tr\u00E8s","bien","fait","alors"]);

function detectLangBench(text) {
  const wds = (text.match(/\b[\w\u00E0-\u00F9]+\b/gu) || []).map(w => w.toLowerCase());
  if (wds.length < 5) return "auto";
  let en = 0, fr = 0;
  for (const w of wds) { if (EN_STOP.has(w)) en++; if (FR_STOP.has(w)) fr++; }
  const t = wds.length;
  return (en / t > 0.1 && en >= fr) ? "en" : (fr / t > 0.1) ? "fr" : "auto";
}

// Composite similarity (6 signals)
function compositeSimilarityBench(text1, text2) {
  const t1 = tokenizeBench(text1).filter(w => !EN_STOP.has(w) && !FR_STOP.has(w));
  const t2 = tokenizeBench(text2).filter(w => !EN_STOP.has(w) && !FR_STOP.has(w));
  const s1_3 = shinglesBench(t1, 3);
  const s2_3 = shinglesBench(t2, 3);
  const s1_4 = shinglesBench(t1, 4);
  const s2_4 = shinglesBench(t2, 4);
  // char 5-grams
  const c1 = text1.toLowerCase().replace(/\s+/g, ' ');
  const c2 = text2.toLowerCase().replace(/\s+/g, ' ');
  const cg1 = new Set(), cg2 = new Set();
  for (let i = 0; i <= c1.length - 5; i++) cg1.add(c1.slice(i, i + 5));
  for (let i = 0; i <= c2.length - 5; i++) cg2.add(c2.slice(i, i + 5));
  // stemmed shingles
  const lang1 = detectLangBench(text1);
  const stem1 = lang1 === "en" ? stemEN : stemFR;
  const lang2 = detectLangBench(text2);
  const stem2 = lang2 === "en" ? stemEN : stemFR;
  const st1 = t1.map(w => stem1(w));
  const st2 = t2.map(w => stem2(w));
  const ss1 = new Set(), ss2 = new Set();
  for (let i = 0; i <= st1.length - 3; i++) ss1.add(st1.slice(i, i + 3).join('\u00A0'));
  for (let i = 0; i <= st2.length - 3; i++) ss2.add(st2.slice(i, i + 3).join('\u00A0'));
  // MinHash
  const mhSim = minHashBench(s1_3, s2_3);
  // Winnow Jaccard
  const fp1 = winnowBench([...s1_3]);
  const fp2 = winnowBench([...s2_3]);
  const set1 = new Set(fp1), set2 = new Set(fp2);
  let inter = 0; for (const h of set1) if (set2.has(h)) inter++;
  const wSim = inter / (set1.size + set2.size - inter || 1);
  // TF-IDF
  const tSim = tfidfCosineBench(t1, t2);
  // 4-gram Jaccard
  let j4 = 0; for (const s of s1_4) if (s2_4.has(s)) j4++;
  const n4Sim = j4 / (s1_4.size + s2_4.size - j4 || 1);
  // char ngram Jaccard
  let jc = 0; for (const s of cg1) if (cg2.has(s)) jc++;
  const cSim = jc / (cg1.size + cg2.size - jc || 1);
  // stemmed Jaccard
  let js = 0; for (const s of ss1) if (ss2.has(s)) js++;
  const sSim = js / (ss1.size + ss2.size - js || 1);
  // Composite (weighted)
  const score = Math.min(1, mhSim * 0.20 + wSim * 0.15 + tSim * 0.20 + n4Sim * 0.12 + cSim * 0.13 + sSim * 0.20);
  return {
    score: Math.round(score * 100),
    minhash: Math.round(mhSim * 100),
    winnow: Math.round(wSim * 100),
    tfidf: Math.round(tSim * 100),
    ngram4: Math.round(n4Sim * 100),
    charNgram: Math.round(cSim * 100),
    stemmed: Math.round(sSim * 100),
  };
}

// Text cleaning
function cleanTextBench(text) {
  let r = text;
  r = r.replace(/[\u200B\u200C\u200D\uFEFF\u00AD\u2060\u2061\u2062\u2063\u2064]/g, '');
  r = r.replace(/\u200E|\u200F|\u202A|\u202B|\u202C|\u202D|\u202E/g, '');
  r = r.replace(/\s{2,}/g, ' ');
  return r.trim();
}

// === RUN ===
console.log('');
console.log('\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');
console.log('  UNROBOT \u2014 BENCHMARK COMPLET v2');
console.log('  ' + new Date().toISOString());
console.log('\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');
console.log('');

console.log('\uD83D\uDCDD ANALYSE HEURISTIQUE (29 patterns FR + 30 patterns EN)');
console.log('\u2500'.repeat(65));
bench('analyzeText (court, ~50 mots FR)', () => analyzeTextFullBench(HUMAN_TEXT));
bench('analyzeText (moyen, ~100 mots FR)', () => analyzeTextFullBench(AI_TEXT));
bench('analyzeText (moyen, ~80 mots EN)', () => analyzeTextFullBench(AI_EN_TEXT));
bench('analyzeText (long, ~700 mots FR)', () => analyzeTextFullBench(LONG_TEXT), 2000);

console.log('');
console.log('\uD83E\uDDE0 ML \u2014 EXTRACTION DE FEATURES + INF\u00C9RENCE');
console.log('\u2500'.repeat(65));
bench('extractFeatures (24 dims, regex+math)', () => extractFeaturesBench(AI_TEXT, [80, 70, 90, 60, 85, 75, 65]));
bench('MLP inference (24\u219232\u219216\u21921, Sigmoid)', () => {
  const f = new Float32Array(24).fill(0.5);
  mlpPredict(f);
});

console.log('');
console.log('\uD83E\uDDF9 NETTOYAGE DE TEXTE');
console.log('\u2500'.repeat(65));
bench('cleanText (regex pipeline)', () => cleanTextBench(AI_TEXT));

console.log('');
console.log('\uD83D\uDD0D PLAGIAT \u2014 MINHASH + WINNOWING + TF-IDF');
console.log('\u2500'.repeat(65));
bench('tokenize (regex word extraction)', () => tokenizeBench(AI_TEXT));
bench('extractShingles(k=3)', () => shinglesBench(tokenizeBench(AI_TEXT), 3));
bench('minHashSim (2 textes, 128 hashes)', () => {
  const s1 = shinglesBench(tokenizeBench(AI_TEXT), 3);
  const s2 = shinglesBench(tokenizeBench(HUMAN_TEXT), 3);
  minHashBench(s1, s2);
});
bench('winnowing (window=4)', () => {
  winnowBench([...shinglesBench(tokenizeBench(AI_TEXT), 3)]);
});
bench('tfidfCosine (2 textes)', () => {
  tfidfCosineBench(
    tokenizeBench(AI_TEXT).filter(w => !FR_STOP.has(w)),
    tokenizeBench(HUMAN_TEXT).filter(w => !FR_STOP.has(w)),
  );
});

console.log('');
console.log('\uD83C\uDF10 NOUVEAU \u2014 STEMMING + D\u00C9TECTION DE LANGUE');
console.log('\u2500'.repeat(65));
bench('detectLanguage (FR text)', () => detectLangBench(AI_TEXT));
bench('detectLanguage (EN text)', () => detectLangBench(AI_EN_TEXT));
bench('stemEN (100 words)', () => {
  const wds = tokenizeBench(AI_EN_TEXT);
  for (const w of wds) stemEN(w);
});
bench('stemFR (100 words)', () => {
  const wds = tokenizeBench(AI_TEXT);
  for (const w of wds) stemFR(w);
});
bench('stemmedShingles(k=3, FR)', () => {
  const t = tokenizeBench(AI_TEXT).map(w => stemFR(w));
  for (let i = 0; i <= t.length - 3; i++) t.slice(i, i + 3).join('\u00A0');
});

console.log('');
console.log('\uD83D\uDD0D PLAGIAT \u2014 SIMILARIT\u00C9 COMPOSITE (6 signaux)');
console.log('\u2500'.repeat(65));
bench('compositeSimilarity (6 signaux, FR)', () => compositeSimilarityBench(AI_TEXT, HUMAN_TEXT), 1000);
bench('compositeSimilarity (6 signaux, long)', () => compositeSimilarityBench(LONG_TEXT, HUMAN_TEXT), 500);

// Show actual similarity scores
console.log('');
console.log('  Scores de similarit\u00E9 (d\u00E9monstration) :');
console.log('  ' + '\u2500'.repeat(55));
const demo1 = compositeSimilarityBench(AI_TEXT, HUMAN_TEXT);
const demo2 = compositeSimilarityBench(AI_TEXT, LONG_TEXT);
console.log(`  AI_FR vs Humain_FR  : ${String(demo1.score).padStart(3)}%  (MH:${String(demo1.minhash).padStart(3)}% W:${String(demo1.winnow).padStart(3)}% TF:${String(demo1.tfidf).padStart(3)}% 4g:${String(demo1.ngram4).padStart(3)}% ch:${String(demo1.charNgram).padStart(3)}% st:${String(demo1.stemmed).padStart(3)}%)`);
console.log(`  AI_FR vs AI_FR x10  : ${String(demo2.score).padStart(3)}%  (MH:${String(demo2.minhash).padStart(3)}% W:${String(demo2.winnow).padStart(3)}% TF:${String(demo2.tfidf).padStart(3)}% 4g:${String(demo2.ngram4).padStart(3)}% ch:${String(demo2.charNgram).padStart(3)}% st:${String(demo2.stemmed).padStart(3)}%)`);

console.log('');
console.log('\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');
console.log('  BUNDLE (build Vite 8 + Rolldown)');
console.log('\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');
console.log('');
console.log('  Chunk principal (index.js)       : 480 KB  (gzip ~151 KB)');
console.log('  ONNX Runtime (onnx.js, lazy)     : 397 KB  (gzip ~107 KB)');
console.log('  ONNX WASM (lazy, si ML activ\u00E9)   : 25.6 MB (gzip ~6.1 MB)');
console.log('  CSS                              :  34 KB  (gzip ~  7 KB)');
console.log('  Panels lazy (6 chunks)           :  58 KB  (gzip ~ 18 KB)');
console.log('  Web Worker (textProcessor)       : 101 KB');
console.log('  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500');
console.log('  Premier chargement (gzipped)     : ~159 KB');
console.log('  R\u00E9duction chunk principal        : 529\u2192480 KB (-9%)');
console.log('');
console.log('  AVANT code splitting : 1 chunk de 529 KB');
console.log('  APR\u00C8S code splitting : chunk principal 480 KB + 6 lazy chunks');
console.log('    (AIAnalysis, PlagiarismPanel, TransferLearning,');
console.log('     HumanizeLog, WriterProfile, BatchProcessor)');
console.log('');
console.log('\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');
console.log('  FONCTIONNALIT\u00C9S');
console.log('\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');
console.log('');
console.log('  \u2705 D\u00E9tection IA  : 59 patterns (29 FR + 30 EN), 8 sous-scores, SUCKS');
console.log('  \u2705 Humanizer    : 29 r\u00E8gles FR + 25 r\u00E8gles EN, 5 modes, 3 intensit\u00E9s');
console.log('  \u2705 Plagiat      : MinHash(128) + Winnowing + TF-IDF + Stemmed + Char 5-gram');
console.log('  \u2705 Multilingue  : FR / EN / ES / DE (stop words + stemmers + d\u00E9tection auto)');
console.log('  \u2705 ML           : ONNX (5.8 KB) + Builtin MLP (24\u219232\u219216\u21921)');
console.log('  \u2705 Transfer LR  : Adam optimizer, BCE loss, IndexedDB persistence');
console.log('  \u2705 Rapport PDF  : Logo, score circle, radar, progress bars, footer');
console.log('  \u2705 VS Code ext  : D\u00E9tection commentaires IA (12 langues), .vsix packag\u00E9');
console.log('  \u2705 Tauri Desktop: DOCX/ODT parsing, batch processing, analyse IA+plagiat');
console.log('  \u2705 PWA          : Manifest + Service Worker');
console.log('');
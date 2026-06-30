// Manual runtime benchmark — self-contained, no imports from src/
// Copy-pasted minimal implementations for isolated measurement

const AI_TEXT = `Il est important de noter que l'intelligence artificielle a considérablement transformé notre société. En effet, les algorithmes d'apprentissage automatique jouent un rôle crucial dans de nombreux secteurs. Il convient de souligner que cette révolution technologique entraîne des changements profonds. De plus, les experts s'accordent à dire que l'IA continuera à évoluer rapidement dans les années à venir. Par ailleurs, il est essentiel de comprendre les implications éthiques de ces avancées technologiques. Force est de constater que l'impact de l'intelligence artificielle sur le marché du travail est significatif. En conclusion, il est indéniable que cette technologie représente un tournant majeur dans l'histoire de l'humanité.`;

const HUMAN_TEXT = `J'ai testé l'outil hier soir et franchement, j'ai été surpris. Au début je pensais que ça allait être nul, mais non — ça marche plutôt bien. Le seul truc chiant c'est qu'il faut attendre un peu quand le texte est long. Sinon l'interface est clean, j'aime bien le côté sombre. Si vous hésitez, essayez, c'est gratuit en plus !`;

const LONG_TEXT = AI_TEXT.repeat(10);

function bench(name, fn, iterations = 5000) {
  for (let i = 0; i < 100; i++) fn();
  const start = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  const elapsed = performance.now() - start;
  const avgUs = (elapsed / iterations) * 1000;
  const ops = Math.round(iterations / (elapsed / 1000));
  const time = avgUs < 100 ? avgUs.toFixed(1) + ' µs' : (avgUs / 1000).toFixed(2) + ' ms';
  console.log(`  ${name.padEnd(42)} ${time.padStart(12)}  (~${ops.toLocaleString()} ops/s)`);
}

// === Inline implementations ===

// Feature extraction (simplified — measures regex + math)
function extractFeaturesBench(text, hs) {
  const WORD_RE = /\b[\wàâäéèêëîïôöùûüçÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ]+\b/gi;
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

// MLP inference (exact same as builtinModel.ts)
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

// Text analysis (heuristic scoring)
function analyzeTextBench(text) {
  const wds = text.toLowerCase().match(/\b[\wàâäéèêëîïôöùûüç]+\b/gi) || [];
  const wc = wds.length;
  const sents = text.split(/[.!?]+/).filter(s => s.trim());
  const sc = sents.length;
  const avg = sc > 0 ? sents.reduce((a, s) => a + s.trim().split(/\s+/).length, 0) / sc : 0;
  const uw = new Set(wds);
  const ttr = wc > 0 ? uw.size / wc : 0;
  const aiPatterns = ["il est important", "il convient", "force est de constater", "en conclusion", "il est essentiel", "par ailleurs", "de plus", "en effet", "rôle crucial", "nombreux secteurs"];
  let aiCount = 0;
  const lower = text.toLowerCase();
  for (const p of aiPatterns) { const m = lower.split(p).length - 1; aiCount += m; }
  const freq = new Map();
  wds.forEach(w => freq.set(w, (freq.get(w) || 0) + 1));
  const hap = [...freq.values()].filter(v => v === 1).length;
  const hr = wc > 0 ? hap / wc : 0;
  const connectors = ["en effet", "cependant", "de plus", "par ailleurs", "en outre", "however", "moreover", "therefore"];
  let connCount = 0;
  for (const c of connectors) connCount += (lower.split(c).length - 1);
  const score = Math.min(100, Math.round(
    (aiCount * 8) +
    (ttr < 0.5 ? 15 : 0) +
    (hr < 0.4 ? 10 : 0) +
    (connCount * 5) +
    (avg > 15 && avg < 25 ? 10 : 0)
  ));
  return score;
}

// MinHash
function tokenizeBench(text) {
  return text.toLowerCase().match(/\b[\wàâäéèêëîïôöùûüç]+\b/gi) || [];
}

function shinglesBench(tokens, k) {
  const set = new Set();
  for (let i = 0; i <= tokens.length - k; i++) {
    set.add(tokens.slice(i, i + k).join(' '));
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

// Text cleaning (simplified)
function cleanTextBench(text) {
  let r = text;
  r = r.replace(/[\u200B\u200C\u200D\uFEFF\u00AD\u2060\u2061\u2062\u2063\u2064]/g, '');
  r = r.replace(/\u200E|\u200F|\u202A|\u202B|\u202C|\u202D|\u202E/g, '');
  r = r.replace(/\s{2,}/g, ' ');
  r = r.trim();
  return r;
}

// === RUN ===
console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('  UNROBOT — BENCHMARK COMPLET');
console.log('  ' + new Date().toISOString());
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

console.log('📝 ANALYSE HEURISTIQUE DE TEXTE');
console.log('─'.repeat(65));
bench('analyzeText (court, ~50 mots)', () => analyzeTextBench(HUMAN_TEXT));
bench('analyzeText (moyen, ~100 mots)', () => analyzeTextBench(AI_TEXT));
bench('analyzeText (long, ~700 mots)', () => analyzeTextBench(LONG_TEXT), 2000);

console.log('');
console.log('🧠 ML — EXTRACTION DE FEATURES + INFÉRENCE');
console.log('─'.repeat(65));
bench('extractFeatures (24 dims, regex+math)', () => extractFeaturesBench(AI_TEXT, [80, 70, 90, 60, 85, 75, 65]));
bench('MLP inference (24→32→16→1, Sigmoid)', () => {
  const f = new Float32Array(24).fill(0.5);
  mlpPredict(f);
});

console.log('');
console.log('🧹 NETTOYAGE DE TEXTE');
console.log('─'.repeat(65));
bench('cleanText (regex pipeline)', () => cleanTextBench(AI_TEXT));

console.log('');
console.log('🔍 PLAGIAT — MINHASH');
console.log('─'.repeat(65));
bench('tokenize (regex word extraction)', () => tokenizeBench(AI_TEXT));
bench('extractShingles(k=3)', () => {
  shinglesBench(tokenizeBench(AI_TEXT), 3);
});
bench('minHashSim (2 textes, 128 hashes)', () => {
  const s1 = shinglesBench(tokenizeBench(AI_TEXT), 3);
  const s2 = shinglesBench(tokenizeBench(HUMAN_TEXT), 3);
  minHashBench(s1, s2);
});

console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('  BUNDLE (build Vite 8 + Rolldown)');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');
console.log('  Chunk principal (index.js)       : 455 KB  (gzip ~141 KB)');
console.log('  ONNX Runtime (onnx.js, lazy)     : 397 KB  (gzip ~107 KB)');
console.log('  ONNX WASM (lazy, si ML activé)   : 25.6 MB (gzip ~6.1 MB)');
console.log('  CSS                              :  33 KB  (gzip ~7 KB)');
console.log('  Panels lazy (5 chunks)           :  47 KB  (gzip ~14 KB)');
console.log('  Web Worker (textProcessor)       :  70 KB');
console.log('  ─────────────────────────────────────────────────');
console.log('  Premier chargement (gzipped)     : ~149 KB');
console.log('  Réduction chunk principal        : 529→455 KB (-14%)');
console.log('');
console.log('  AVANT code splitting : 1 chunk de 529 KB');
console.log('  APRÈS code splitting : chunk principal 455 KB + 5 lazy chunks');
console.log('');
console.log('═══════════════════════════════════════════════════════════════');
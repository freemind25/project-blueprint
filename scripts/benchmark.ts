// Manual runtime benchmark
import { analyzeText } from '../textAnalysis';
import { extractFeatures, FEATURE_DIM } from '../ml/featureExtractor';
import { builtinPredict } from '../ml/builtinModel';
import { cleanText } from '../cleaner';
import { tokenize, extractShingles, minHashSim } from '../plagiarism/shingles';
import { PlagiarismEngine } from '../plagiarism/engine';

const AI_TEXT = `Il est important de noter que l'intelligence artificielle a considérablement transformé notre société. En effet, les algorithmes d'apprentissage automatique jouent un rôle crucial dans de nombreux secteurs. Il convient de souligner que cette révolution technologique entraîne des changements profonds. De plus, les experts s'accordent à dire que l'IA continuera à évoluer rapidement dans les années à venir. Par ailleurs, il est essentiel de comprendre les implications éthiques de ces avancées technologiques. Force est de constater que l'impact de l'intelligence artificielle sur le marché du travail est significatif. En conclusion, il est indéniable que cette technologie représente un tournant majeur dans l'histoire de l'humanité.`;

const HUMAN_TEXT = `J'ai testé l'outil hier soir et franchement, j'ai été surpris. Au début je pensais que ça allait être nul, mais non — ça marche plutôt bien. Le seul truc chiant c'est qu'il faut attendre un peu quand le texte est long. Sinon l'interface est clean, j'aime bien le côté sombre. Si vous hésitez, essayez, c'est gratuit en plus !`;

const LONG_TEXT = AI_TEXT.repeat(10); // ~700 words

function bench(name: string, fn: () => void, iterations = 5000) {
  // Warmup
  for (let i = 0; i < 100; i++) fn();
  
  const start = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  const elapsed = performance.now() - start;
  
  const avgUs = (elapsed / iterations) * 1000;
  const opsPerSec = Math.round(iterations / (elapsed / 1000));
  
  console.log(`  ${name.padEnd(38)} ${avgUs < 100 ? avgUs.toFixed(1) + ' µs' : (avgUs / 1000).toFixed(2) + ' ms'}  (~${opsPerSec.toLocaleString()} ops/s)`);
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('  UNROBOT — RUNTIME BENCHMARK');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

console.log('📝 ANALYSE DE TEXTE');
console.log('─'.repeat(60));
bench('analyzeText (court, ~50 mots)', () => analyzeText(HUMAN_TEXT));
bench('analyzeText (moyen, ~100 mots)', () => analyzeText(AI_TEXT));
bench('analyzeText (long, ~700 mots)', () => analyzeText(LONG_TEXT), 1000);

console.log('');
console.log('🧠 ML / NEURAL NETWORK');
console.log('─'.repeat(60));
bench('extractFeatures (24 dimensions)', () => extractFeatures(AI_TEXT, [80, 70, 90, 60, 85, 75, 65]));
bench('builtinPredict (MLP 24→32→16→1)', () => {
  const f = extractFeatures(AI_TEXT, [80, 70, 90, 60, 85, 75, 65]);
  builtinPredict(f);
});

console.log('');
console.log('🧹 NETTOYAGE DE TEXTE');
console.log('─'.repeat(60));
bench('cleanText (mode: light)', () => cleanText(AI_TEXT, { intensity: 0.5, mode: 'light' }));
bench('cleanText (mode: medium)', () => cleanText(AI_TEXT, { intensity: 0.7, mode: 'medium' }), 2000);

console.log('');
console.log('🔍 PLAGIAT (MINHASH)');
console.log('─'.repeat(60));
bench('tokenize', () => tokenize(AI_TEXT));
bench('tokenize + extractShingles(3)', () => {
  const t = tokenize(AI_TEXT);
  extractShingles(t, 3);
});
bench('minHashSim (2 texts)', () => {
  const s1 = extractShingles(tokenize(AI_TEXT), 3);
  const s2 = extractShingles(tokenize(HUMAN_TEXT), 3);
  minHashSim(s1, s2);
});

console.log('');
console.log('📊 PlagiarismEngine (addRef + check)', () => {
  const engine = new PlagiarismEngine();
  engine.addReference('ref1', AI_TEXT);
  engine.check(HUMAN_TEXT);
}, 2000);

console.log('');
console.log('═══════════════════════════════════════════════════════════════');
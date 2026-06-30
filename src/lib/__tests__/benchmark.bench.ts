import { describe, bench } from 'vitest';
import { analyzeText } from '../textAnalysis';
import { extractFeatures, FEATURE_DIM } from '../ml/featureExtractor';
import { builtinPredict } from '../ml/builtinModel';
import { cleanText } from '../cleaner';
import { tokenize, extractShingles, minHashSim } from '../plagiarism/shingles';

const AI_TEXT = `Il est important de noter que l'intelligence artificielle a considérablement transformé notre société. En effet, les algorithmes d'apprentissage automatique jouent un rôle crucial dans de nombreux secteurs. Il convient de souligner que cette révolution technologique entraîne des changements profonds. De plus, les experts s'accordent à dire que l'IA continuera à évoluer rapidement dans les années à venir. Par ailleurs, il est essentiel de comprendre les implications éthiques de ces avancées technologiques. Force est de constater que l'impact de l'intelligence artificielle sur le marché du travail est significatif. En conclusion, il est indéniable que cette technologie représente un tournant majeur dans l'histoire de l'humanité.`;

const HUMAN_TEXT = `J'ai testé l'outil hier soir et franchement, j'ai été surpris. Au début je pensais que ça allait être nul, mais non — ça marche plutôt bien. Le seul truc chiant c'est qu'il faut attendre un peu quand le texte est long. Sinon l'interface est clean, j'aime bien le côté sombre. Si vous hésitez, essayez, c'est gratuit en plus !`;

describe('Benchmark runtime', () => {
  bench('analyzeText (AI text)', () => {
    analyzeText(AI_TEXT);
  });

  bench('analyzeText (human text)', () => {
    analyzeText(HUMAN_TEXT);
  });

  bench('extractFeatures (24 dims)', () => {
    extractFeatures(AI_TEXT, [80, 70, 90, 60, 85, 75, 65]);
  });

  bench('builtinPredict (MLP inference)', () => {
    const f = extractFeatures(AI_TEXT, [80, 70, 90, 60, 85, 75, 65]);
    builtinPredict(f);
  });

  bench('cleanText (full pipeline)', () => {
    cleanText(AI_TEXT, { intensity: 0.5, mode: 'light' });
  });

  bench('tokenize + shingles', () => {
    const tokens = tokenize(AI_TEXT);
    extractShingles(tokens, 3);
  });

  bench('MinHash similarity', () => {
    const t1 = tokenize(AI_TEXT);
    const t2 = tokenize(HUMAN_TEXT);
    const s1 = extractShingles(t1, 3);
    const s2 = extractShingles(t2, 3);
    minHashSim(s1, s2);
  });
});
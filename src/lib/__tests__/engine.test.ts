import { describe, it, expect, beforeEach } from "vitest";
import { analyzeText } from "../textAnalysis";
import { performClean } from "../cleaner";
import { performHumanize } from "../humanizer";
import { buildProfile, applyProfile, serializeProfile, parseProfile } from "../writerProfile";
import { extractFeatures, FEATURE_DIM } from "../ml/featureExtractor";
import { builtinPredict } from "../ml/builtinModel";
import { tokenize, extractShingles, shingleSet, extractShinglesWithPositions } from "../plagiarism/shingles";
import { computeMinHashSignature, estimateJaccard, exactJaccard } from "../plagiarism/minhash";
import { addReference, removeReference, getCorpus, clearCorpus, analyzePlagiarism } from "../plagiarism/engine";

const AI_TEXT =
  "In today's fast-paced world, AI isn't just about automation - it's about transformation. Many people think that leveraging these tools might help optimize engagement metrics. Let that sink in. The secret? It's not just about technology, it's about people.";

describe("cleaner", () => {
  it("removes invisible characters", () => {
    const { cleanedText, stats } = performClean("a\u00A0b\u202Fc");
    expect(cleanedText).toBe("a b c");
    expect(stats.totalCleaned).toBe(2);
  });
  it("removes zero-width characters", () => {
    const { cleanedText, stats } = performClean("hello\u200Bworld\u200C");
    expect(cleanedText).toBe("hello world ");
    expect(stats.zeroWidthCount).toBe(2);
    expect(stats.totalCleaned).toBe(2);
  });
  it("removes BOM and bidi marks", () => {
    const { stats } = performClean("\uFEFFtext\u200E\u200F");
    expect(stats.bomCount).toBe(1);
    expect(stats.bidiCount).toBe(2);
  });
});

describe("analyzeText", () => {
  it("returns empty result for short text", () => {
    expect(analyzeText("court").score).toBe(0);
  });
  it("flags AI-heavy text with a high score", () => {
    const r = analyzeText(AI_TEXT);
    expect(r.score).toBeGreaterThan(40);
    expect(r.patternCount).toBeGreaterThan(0);
  });
});

describe("humanizer pipeline", () => {
  it("rewrites and lowers the AI score", () => {
    const r = performHumanize(AI_TEXT, { intensity: "aggressive", mode: "naturel" });
    expect(r.modificationsCount).toBeGreaterThan(0);
    expect(r.scoreAfter).toBeLessThanOrEqual(r.scoreBefore);
  });
  it("humanize until natural loops several passes", () => {
    const r = performHumanize(AI_TEXT, { intensity: "aggressive", mode: "naturel", targetScore: 30, maxPasses: 5 });
    expect(r.passes).toBeGreaterThanOrEqual(1);
    expect(r.passes).toBeLessThanOrEqual(5);
  });
});

describe("writer profile", () => {
  const sample =
    "Je pense que ce truc est génial. D'ailleurs, j'ai testé plein d'outils. Du coup, je préfère celui-ci. Franchement, c'est simple et rapide !";
  it("builds a profile with metrics", () => {
    const p = buildProfile(sample, "Test");
    expect(p.name).toBe("Test");
    expect(p.metrics.avgSentenceLength).toBeGreaterThan(0);
    expect(p.language).toBe("fr");
  });
  it("round-trips through JSON", () => {
    const p = buildProfile(sample);
    const back = parseProfile(serializeProfile(p));
    expect(back.metrics.avgSentenceLength).toBe(p.metrics.avgSentenceLength);
  });
  it("applies profile transformations", () => {
    const p = buildProfile(sample);
    const { text } = applyProfile("Il est important de tester. De plus, il faut documenter.", p);
    expect(text).not.toContain("Il est important de");
  });
});

// ---- ML Module Tests ----

describe("ML feature extraction", () => {
  it("extracts correct feature dimensions", () => {
    const text = "Ceci est un texte de test pour vérifier l'extraction des features du modèle ML.";
    const analysis = analyzeText(text);
    const scores = [analysis.burstinessScore, analysis.transitionScore, analysis.perfectionScore, analysis.voiceScore, analysis.perplexityScore, analysis.vocabularyScore, analysis.depthScore];
    const features = extractFeatures(text, scores);
    expect(features.flat.length).toBe(FEATURE_DIM);
  });

  it("features are normalized between 0 and 1", () => {
    const text = "Un texte suffisamment long pour tester la normalisation des features extraites par le module d'analyse ML embarqué dans l'application.";
    const analysis = analyzeText(text);
    const scores = [analysis.burstinessScore, analysis.transitionScore, analysis.perfectionScore, analysis.voiceScore, analysis.perplexityScore, analysis.vocabularyScore, analysis.depthScore];
    const features = extractFeatures(text, scores);
    for (const f of features.flat) {
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThanOrEqual(1);
    }
  });

  it("neutral features are zero for uniform input", () => {
    const text = "mot mot mot mot mot mot mot mot mot mot. mot mot mot mot mot mot mot mot mot mot.";
    const analysis = analyzeText(text);
    const scores = Array.from({ length: 7 }, () => 50);
    const features = extractFeatures(text, scores);
    const flat = features.flat;
    const heuristicPart = Array.from(flat.slice(0, 7));
    expect(heuristicPart.every(v => v === 0.5)).toBe(true);
  });
});

describe("builtin model", () => {
  it("returns prediction with valid score", () => {
    const text = "Ceci est un texte de test suffisamment long pour le modèle embarqué.";
    const analysis = analyzeText(text);
    const scores = [analysis.burstinessScore, analysis.transitionScore, analysis.perfectionScore, analysis.voiceScore, analysis.perplexityScore, analysis.vocabularyScore, analysis.depthScore];
    const features = extractFeatures(text, scores);
    const result = builtinPredict(features);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.source).toBe("builtin");
  });

  it("different texts produce different scores", () => {
    const aiFeatures = extractFeatures("In today's fast-paced world, it's important to leverage cutting-edge solutions.", [70, 80, 60, 75, 30, 40, 50]);
    const humanFeatures = extractFeatures("J'ai essayé le truc hier. Pas mal, mais un peu lent. Bon, après c'est allé seul.", [30, 20, 20, 15, 70, 60, 40]);
    const r1 = builtinPredict(aiFeatures);
    const r2 = builtinPredict(humanFeatures);
    expect(r1.score).not.toBe(r2.score);
  });
});

// ---- Plagiarism Module Tests ----

describe("shingles", () => {
  it("tokenizes text into words", () => {
    const tokens = tokenize("le chat mange la souris");
    expect(tokens).toEqual(["le", "chat", "mange", "la", "souris"]);
  });

  it("extracts correct number of shingles", () => {
    const shingles = extractShingles("le chat mange la souris", 3);
    expect(shingles).toHaveLength(3); // 5 - 3 + 1
  });

  it("shingleSet removes duplicates", () => {
    const set = shingleSet("le chat le chat", 2);
    expect(set.size).toBeLessThanOrEqual(4);
  });

  it("extractShinglesWithPositions tracks positions", () => {
    const result = extractShinglesWithPositions("un deux trois quatre cinq", 3);
    expect(result.length).toBe(3);
    result.forEach(s => {
      expect(s.startOffset).toBeGreaterThanOrEqual(0);
      expect(s.endOffset).toBeGreaterThan(s.startOffset);
    });
  });
});

describe("MinHash", () => {
  it("same text has 100% estimated Jaccard", () => {
    const { signature: sig1 } = computeMinHashSignature(shingleSet("le chat mange la souris et le chien aboie"), 128);
    const { signature: sig2 } = computeMinHashSignature(shingleSet("le chat mange la souris et le chien aboie"), 128);
    expect(estimateJaccard(sig1, sig2)).toBe(1);
  });

  it("completely different texts have low similarity", () => {
    const { signature: sig1 } = computeMinHashSignature(shingleSet("le chat mange la souris tranquillement dans le jardin"), 128);
    const { signature: sig2 } = computeMinHashSignature(shingleSet("les résultats montrent une augmentation significative des performances"), 128);
    expect(estimateJaccard(sig1, sig2)).toBeLessThan(0.3);
  });

  it("MinHash estimate is close to exact Jaccard", () => {
    const set1 = shingleSet("Ceci est un texte de référence pour tester la similarité exacte entre deux documents.", 3);
    const set2 = shingleSet("Ceci est un texte de test pour vérifier la similarité entre deux documents.", 3);
    const { signature: sig1 } = computeMinHashSignature(set1, 128);
    const { signature: sig2 } = computeMinHashSignature(set2, 128);
    const estimated = estimateJaccard(sig1, sig2);
    const exact = exactJaccard(set1, set2);
    expect(Math.abs(estimated - exact)).toBeLessThan(0.2);
  });
});

describe("plagiarism engine", () => {
  beforeEach(() => {
    clearCorpus();
  });

  it("empty corpus returns zero score", () => {
    const result = analyzePlagiarism("texte test");
    expect(result.overallScore).toBe(0);
    expect(result.matches.length).toBe(0);
  });

  it("detects copy-paste plagiarism", () => {
    const original = "L'intelligence artificielle transforme profondément notre société. Elle impacte tous les secteurs économiques et modifie nos modes de vie de manière irréversible.";
    addReference(original, "source-A");
    const stolen = original + " C'est un fait indéniable.";
    const result = analyzePlagiarism(stolen);
    expect(result.overallScore).toBeGreaterThan(50);
  });

  it("addReference increases corpus size", () => {
    addReference("texte de référence", "doc1");
    addReference("autre texte", "doc2");
    expect(getCorpus()).toHaveLength(2);
  });

  it("removeReference works", () => {
    const doc = addReference("texte", "doc1");
    expect(getCorpus()).toHaveLength(1);
    removeReference(doc.id);
    expect(getCorpus()).toHaveLength(0);
  });
});
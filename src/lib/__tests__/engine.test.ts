import { describe, it, expect } from "vitest";
import { analyzeText } from "../textAnalysis";
import { performClean } from "../cleaner";
import { performHumanize } from "../humanizer";
import { buildProfile, applyProfile, serializeProfile, parseProfile } from "../writerProfile";

const AI_TEXT =
  "In today's fast-paced world, AI isn't just about automation - it's about transformation. Many people think that leveraging these tools might help optimize engagement metrics. Let that sink in. The secret? It's not just about technology, it's about people.";

describe("cleaner", () => {
  it("removes invisible characters", () => {
    const { cleanedText, stats } = performClean("a\u00A0b\u202Fc");
    expect(cleanedText).toBe("a b c");
    expect(stats.totalCleaned).toBe(2);
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
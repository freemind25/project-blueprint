export interface ExampleText {
  id: string;
  title: string;
  content: string;
}

/**
 * Exemples pour tester rapidement la détection (texte très IA vs humanisé).
 */
export const EXAMPLE_TEXTS: ExampleText[] = [
  {
    id: "aiHeavy",
    title: "Texte très IA",
    content:
      "In today's fast-paced world, AI isn't just about automation - it's about transformation. Many people think that leveraging these tools might help optimize engagement metrics. Let that sink in. The secret? It's not just about technology, it's about people. The solution was implemented by the team and significant improvements were observed.",
  },
  {
    id: "humanized",
    title: "Texte humanisé",
    content:
      "AI changes how we work. A recent survey found that 73% of teams using AI tools finish projects faster. These tools help people collaborate and ship more. The real advantage? Teams focus on creative work instead of repetitive tasks.",
  },
];
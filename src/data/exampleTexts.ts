export interface ExampleText {
  id: string;
  title: string;
  content: string;
  /** Catégorie du dataset de test AWPA : 'human', 'gpt-like', 'humanized' */
  category?: "human" | "gpt-like" | "humanized";
}

/**
 * Exemples pour tester rapidement la détection.
 * Dataset structuré conformément au module AWPA :
 * A) textes humains, B) textes GPT-like, C) textes humanisés.
 */
export const EXAMPLE_TEXTS: ExampleText[] = [
  // ── A) TEXTES HUMAINS ──────────────────────────────────────────
  {
    id: "humanFR1",
    title: "Texte humain français",
    category: "human",
    content:
      "J'ai testé trois outils d'IA ce mois-ci pour notre équipe de 12 personnes. Le premier, Claude, nous a fait gagner environ 3 heures par semaine sur les comptes rendus. Le deuxième était trop lent pour nos besoins. Le troisième, en revanche, s'intègre bien dans notre workflow Notion.\n\nRésultat ? On a gardé le troisième. Le premier reste utile pour les brouillons rapides.",
  },
  {
    id: "humanEN1",
    title: "Human English Text",
    category: "human",
    content:
      "AI changes how we work. A recent survey found that 73% of teams using AI tools finish projects faster. These tools help people collaborate and ship more. The real advantage? Teams focus on creative work instead of repetitive tasks.",
  },
  {
    id: "humanFR2",
    title: "Texte humain — analyse personnelle",
    category: "human",
    content:
      "Dans notre étude du laboratoire de neurosciences de l'Université de Bordeaux, cette technologie a réduit le temps de traitement des IRM de 40%. Ça ne paraît pas énorme dit comme ça, mais quand on traite 200 patients par mois, ça fait 80 heures gagnées. Le Dr. Martin, qui dirige le projet, est plutôt enthousiaste — bien que sceptique au départ.",
  },

  // ── B) TEXTES GPT-LIKE ──────────────────────────────────────────
  {
    id: "aiHeavy",
    title: "Texte très IA",
    category: "gpt-like",
    content:
      "In today's fast-paced world, AI isn't just about automation - it's about transformation. Many people think that leveraging these tools might help optimize engagement metrics. Let that sink in. The secret? It's not just about technology, it's about people. The solution was implemented by the team and significant improvements were observed.",
  },
  {
    id: "gptLikeFR1",
    title: "Texte GPT-like français",
    category: "gpt-like",
    content:
      "Dans le monde actuel, l'intelligence artificielle joue un rôle important dans de nombreux secteurs. Cette approche innovante permet d'optimiser les processus et de renforcer la productivité. Il convient de noter que les enjeux majeurs incluent l'éthique et la sécurité des données.\n\nPremièrement, il est essentiel de comprendre les fondements technologiques. Deuxièmement, il faut considérer les implications sociétales. Enfin, les perspectives prometteuses de ce domaine méritent une attention particulière.",
  },
  {
    id: "plagiarismFR",
    title: "Plagiat français",
    category: "gpt-like",
    content: "L'intelligence artificielle transforme profondément le paysage technologique contemporain. Elle permet d'automatiser des tâches complexes et d'améliorer la prise de décision dans de nombreux secteurs. Les entreprises qui adoptent ces technologies constatent des gains de productivité significatifs.",
  },
  {
    id: "plagiarismEN",
    title: "English Plagiarism Sample",
    category: "gpt-like",
    content: "Artificial intelligence is revolutionizing the way we approach complex problem-solving in modern society. By leveraging advanced machine learning algorithms, organizations can unlock unprecedented insights from their data. The transformative potential of AI continues to reshape industries across the globe.",
  },

  // ── C) TEXTES HUMANISÉS ─────────────────────────────────────────
  {
    id: "humanized",
    title: "Texte humanisé",
    category: "humanized",
    content:
      "AI changes how we work. A recent survey found that 73% of teams using AI tools finish projects faster. These tools help people collaborate and ship more. The real advantage? Teams focus on creative work instead of repetitive tasks.",
  },
  {
    id: "humanizedFR1",
    title: "Texte humanisé français",
    category: "humanized",
    content:
      "L'IA change notre façon de travailler. D'après une étude de l'INSEE parue en mars 2025, 73% des équipes qui utilisent des outils d'IA terminent leurs projets plus vite. Ces outils aident les gens à collaborer et à produire plus.\n\nL'avantage réel ? Les équipes se concentrent sur le travail créatif au lieu des tâches répétitives. Notre équipe, par exemple, a divisé par deux le temps passé sur les comptes rendus hebdomadaires.",
  },
  {
    id: "originalEN",
    title: "Original English Text",
    category: "human",
    content: "AI changes how we work. A recent survey found that 73% of teams using AI tools finish projects faster. These tools help people collaborate and ship more. The real advantage? Teams focus on creative work instead of repetitive tasks.",
  },
];
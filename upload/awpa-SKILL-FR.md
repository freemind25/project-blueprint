---
name: awpa
version: 1.0.0
description: |
  AI Writing Pattern Analyzer — Moteur local d'analyse de texte capable d'identifier
  les caractéristiques typiques d'un texte généré par IA et de mesurer son niveau de
  naturalité humaine. Produit des scores probabilistes, des indicateurs explicables,
  des zones suspectes et des recommandations d'amélioration. Fonctionne en mode
  standalone, sans dépendance obligatoire à une API externe.
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - AskUserQuestion
related-skills:
  - humanizer
---

# Skill : AI Writing Pattern Analyzer (AWPA)

## Nom
AI Writing Pattern Analyzer (AWPA)

## Objectif

Créer un moteur local d'analyse de texte capable d'identifier les caractéristiques typiques d'un texte généré par IA et de mesurer son niveau de naturalité humaine.

Le module doit fonctionner en mode standalone, sans dépendance obligatoire à une API externe.

Le système ne doit jamais déclarer :
"Ce texte est écrit par une IA"

Il doit produire :
- des scores probabilistes
- des indicateurs explicables
- des zones suspectes
- des recommandations d'amélioration

---

# Principes fondamentaux

## Règle 1 : Analyse multi-signaux

Ne jamais utiliser un seul indicateur.

Le score final doit être basé sur plusieurs dimensions :

AI_SCORE =
(
Perplexity Score +
Burstiness Score +
Style Score +
Structure Score +
Lexical Score +
Semantic Score
) / Nombre de facteurs

---

# Module 1 : Analyse de prévisibilité linguistique (Perplexity)

## Objectif

Détecter les textes trop prévisibles.

## Indicateurs

Calculer :

- probabilité moyenne des séquences
- diversité des choix lexicaux
- fréquence des formulations communes

## Détection

Signaux suspects :

- phrases trop attendues
- formulations génériques
- faible surprise lexicale

## Exemples

Suspect :

"Dans le monde actuel, l'intelligence artificielle joue un rôle important."

Moins suspect :

"Dans mon analyse du projet, l'IA apparaît surtout utile pour automatiser les tâches répétitives."

### Implémentation

Voir `src/lib/textAnalysis.ts` — score `perplexityScore` calculé via TTR (Type-Token Ratio), diversité lexicale et fréquence des n-grammes courants.

---

# Module 2 : Analyse Burstiness (variation humaine)

## Objectif

Mesurer les variations naturelles du style humain.

Analyser :

- longueur des phrases
- longueur des paragraphes
- rythme
- ponctuation

Calcul :

sentence_variance = écart-type(longueur phrases)

Risque élevé : Variance faible

## Exemple IA

Phrase 1 : 22 mots
Phrase 2 : 23 mots
Phrase 3 : 21 mots

## Exemple humain

Phrase 1 : 8 mots
Phrase 2 : 35 mots
Phrase 3 : 14 mots

### Implémentation

Voir `src/lib/textAnalysis.ts` — score `burstinessScore` calculé via l'écart-type des longueurs de phrases. Une variance faible indique un rythme uniforme, caractéristique de l'IA.

---

# Module 3 : Détection de structure IA

## Objectif

Identifier les structures trop régulières et les plans trop parfaits.

Identifier :

- plans trop parfaits
- symétrie excessive
- transitions artificielles

## Patterns

- Premièrement / Deuxièmement / Enfin
- Introduction / Développement / Conclusion

Attribuer un score : STRUCTURE_AI_SCORE

### Implémentation

Voir `src/lib/textAnalysis.ts` — score `structureScore` et patterns dans `AI_PATTERNS` :

- Catégorie "Squelette rigide" : détecte les sections génériques (Introduction, Points clés, Avantages, Inconvénients, Défis, Conclusion)
- Catégorie "Formule du trois" : détecte les regroupements artificiels en trois éléments
- Catégorie "Équilibre forcé" : détecte les fausses symétries "d'un côté... de l'autre"

---

# Module 4 : Analyse des connecteurs

## Objectif

Détecter une densité anormale de connecteurs logiques, signe d'un texte généré.

Créer une liste pondérée :

### Fort risque

| Connecteur | Poids |
|:---|:---:|
| En outre | 3 |
| De plus | 2 |
| Par ailleurs | 2 |
| En conclusion | 3 |
| Il convient de noter que | 3 |
| Cette approche permet de | 3 |

### Risque moyen

| Connecteur | Poids |
|:---|:---:|
| Cependant | 1 |
| Néanmoins | 1 |
| Toutefois | 1 |
| De surcroît | 2 |
| Par conséquent | 2 |

## Calcul

connector_density = nombre connecteurs / nombre phrases

Si trop élevé : augmenter AI_SCORE

### Implémentation

Voir `src/lib/textAnalysis.ts` — tableau `WEIGHTED_CONNECTORS` avec 18 entrées (FR + EN).

---

# Module 5 : Analyse vocabulaire générique (AI_PHRASES)

## Objectif

Détecter les expressions passe-partout typiques de l'IA.

Créer un dictionnaire : AI_PHRASES

## Exemples — Fort risque (poids 3)

- approche innovante
- solution pertinente
- enjeux majeurs
- impact significatif
- contexte en constante évolution
- perspectives prometteuses
- en outre
- par ailleurs
- en conclusion
- il convient de noter
- cette approche permet

## Exemples — Moyen risque (poids 2)

- il est important de
- il est essentiel de
- dans le monde actuel
- à l'ère du
- force est de constater
- avancée majeure
- potentiel considérable

## Calcul

generic_phrase_ratio = nombre d'occurrences AI_PHRASES / nombre total de phrases

### Implémentation

Voir `src/lib/textAnalysis.ts` — tableau `AI_PHRASES` avec 36 entrées (FR + EN), pondérées de 1 à 3.

---

# Module 6 : Détection de répétition sémantique

## Objectif

Trouver les phrases qui répètent la même idée.

## Méthode

Utiliser des embeddings locaux (ou un proxy basé sur les bigrammes en mode offline).

Comparer :

similarité phrase précédente / phrase actuelle

Si similarité > seuil : marquer REPETITION_AI_PATTERN

### Implémentation

Voir `src/lib/textAnalysis.ts` — fonction `detectSemanticRepetition()` utilisant le chevauchement de bigrammes comme proxy local. Score `semanticRepetitionScore`.

---

# Module 7 : Analyse absence de personnalisation

## Objectif

Détecter l'absence de marqueurs personnels et de contexte concret.

Chercher la présence de :

- exemples précis
- contexte
- expérience
- références concrètes

Score : PERSONALIZATION_SCORE

## Texte faible

"Cette technologie améliore les entreprises."

## Texte fort

"Dans notre étude du laboratoire X, cette technologie a réduit le temps de traitement."

### Implémentation

Voir `src/lib/textAnalysis.ts` — score `personalizationScore` calculé via la détection de pronoms personnels, références temporelles/spatiales, noms propres et exemples concrets.

---

# Module 8 : Détection paraphrase IA

## Objectif

Identifier les reformulations artificielles.

## Signaux

- synonymes forcés
- changement inutile de registre
- phrases plus complexes sans gain d'information

## Exemple

Original : "Le robot améliore la production."

IA : "Le système robotisé contribue à optimiser les performances productives."

### Implémentation

Voir `src/lib/textAnalysis.ts` — score `paraphraseScore` détectant l'inflation verbale et les contournements de verbes simples.

---

# Module 9 : Style Fingerprint

## Objectif

Créer une empreinte stylistique multidimensionnelle du texte.

## Vecteur

STYLE_VECTOR = {
  sentenceLength,
  vocabularyDensity,
  connectorRate,
  repetitionRate,
  complexity,
  personalMarkers
}

## Comparaison

Comparer le style naturel humain vs le style LLM sur chaque dimension.

### Implémentation

Voir `src/lib/textAnalysis.ts` — interface `StyleFingerprint` avec 6 dimensions, calculée dans la fonction `analyzeText()` et retournée dans `AIAnalysisResult.styleFingerprint`.

---

# Module 10 : Rapport explicable

## Objectif

Ne jamais retourner uniquement un score. Toujours fournir des explications détaillées.

## Format de sortie

```json
{
  "aiProbability": 72,
  "explanations": [
    {
      "section": "Paragraphe 3",
      "issue": "structure trop régulière",
      "impact": "élevé"
    },
    {
      "section": "Paragraphe 5",
      "issue": "vocabulaire générique",
      "impact": "moyen"
    }
  ]
}
```

## Règle fondamentale

Le système doit agir comme un assistant d'analyse linguistique. Il ne doit pas être un juge automatique.

La sortie doit toujours être :

"Ce texte présente des caractéristiques compatibles avec une génération IA"

et jamais :

"Ce texte est généré par IA".

### Implémentation

Voir `src/lib/textAnalysis.ts` — le champ `details` de `AIAnalysisResult` contient un tableau d'objets `{ category, issue, severity, examples?, suggestions? }` pour chaque motif détecté.

---

# Module Humanization Engine

## Objectif

Transformer un texte trop artificiel en texte plus naturel.

## Actions

### Réduction des formulations génériques

Avant : "Cette solution représente une avancée majeure."
Après : "Cette solution apporte surtout une amélioration sur..."

### Variation syntaxique

Appliquer :
- phrases courtes
- phrases longues
- ruptures naturelles

### Ajout contexte

Avant : "Cette méthode améliore les résultats."
Après : "Dans ce cas précis, cette méthode améliore surtout..."

### Implémentation

Voir `src/lib/humanizer.ts` — tableau `RULES` avec 80+ règles de transformation regex, 5 modes (naturel, professionnel, académique, expert, personnel) et 3 niveaux d'intensité (light, moderate, aggressive).

---

# Architecture recommandée

## Pipeline

```
INPUT TEXT
    ↓
Text Parser
    ↓
Feature Extractor
    ↓
AI Pattern Detector
    ↓
Naturalness Scoring Engine
    ↓
Humanization Suggestions
    ↓
OUTPUT REPORT
```

### Mapping vers le code UnRobot

| Étape pipeline | Implémentation |
|:---|:---|
| Text Parser | `splitSentences()` dans `utils.ts` |
| Feature Extractor | `analyzeText()` dans `textAnalysis.ts` (tous les modules 1-9) |
| AI Pattern Detector | `AI_PATTERNS` + `AI_PHRASES` + `WEIGHTED_CONNECTORS` dans `textAnalysis.ts` |
| Naturalness Scoring Engine | `AIAnalysisResult.score` (moyenne pondérée) dans `textAnalysis.ts` |
| Humanization Suggestions | `humanizeText()` dans `humanizer.ts` |
| OUTPUT REPORT | `AIAnalysisResult.details` + `report.ts` |

---

# Contraintes techniques

Le module doit :

- fonctionner offline
- être modulaire
- permettre le remplacement du modèle NLP
- exposer une API interne simple
- produire des résultats reproductibles

### Statut d'implémentation

| Contrainte | Statut |
|:---|:---|
| Fonctionner offline | ✅ Implémenté — 100% client-side, aucun appel réseau |
| Être modulaire | ✅ Implémenté — modules séparés dans `src/lib/` |
| Remplacement du modèle NLP | ✅ Implémenté — ML model swappable via `ml/modelService.ts` (builtin MLP ou ONNX) |
| API interne simple | ✅ Implémenté — `analyzeText()` + `humanizeText()` |
| Résultats reproductibles | ✅ Implémenté — déterministe, pas de randomisation dans le scoring |

---

# Tests obligatoires

## Dataset de test

Voir `src/data/exampleTexts.ts` — 10 textes de référence :

A) Textes humains (4 exemples)
B) Textes GPT-like (4 exemples)
C) Textes humanisés (2 exemples)

## Mesures

- Précision
- Faux positifs
- Faux négatifs

### Implémentation

Voir `src/lib/__tests__/engine.test.ts` et `scripts/benchmark.ts`.

---

# Références croisées

- Skill **humanizer** (`upload/humanizer-SKILL-FR.md`) — Règles de réécriture et motifs IA (v2.4.0)
- Moteur d'analyse (`src/lib/textAnalysis.ts`) — Implémentation runtime des 10 modules AWPA
- Règles d'humanisation (`src/lib/humanizer.ts`) — 80+ règles de transformation
- Dataset de test (`src/data/exampleTexts.ts`) — Corpus de référence humain/GPT/humanisé
- Feature extractor ML (`src/lib/ml/featureExtractor.ts`) — 38 dimensions de features
- Modèle ONNX (`public/models/ai-detector.onnx`) — Modèle de détection neuronal
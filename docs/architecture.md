# Architecture du projet UnRobot

UnRobot est une application React + Vite + TypeScript, 100% cote client.

## Couches
- **Presentation** : `src/components/TextCleaner/*` (UI), `src/components/ui/*` (shadcn).
- **Application / etat** : hooks `src/hooks/useTextCleaner.ts` et `src/hooks/useAIDetector.ts`.
- **Traitement (domaine)** : `src/workers/textProcessor.worker.ts` execute le nettoyage
  et l'humanisation dans un Web Worker pour ne jamais bloquer l'UI.

## Flux de donnees
1. L'utilisateur saisit ou depose du texte (`TextEditor`).
2. `useTextCleaner` envoie un message au Web Worker (`clean` ou `humanize`).
3. Le worker renvoie le texte transforme + des statistiques / un journal de modifications.
4. `useAIDetector` calcule un score de detection IA local affiche par `AIAnalysis`.

## Theme
Le theme clair/sombre est gere par `next-themes` (`ThemeProvider`) avec un
basculement via `ThemeToggle`. Mode sombre par defaut.

## Mise à jour — Moteur modulaire AWPA (lib/)

La logique métier est désormais 100% locale et découplée de React/UI, dans `src/lib/` :

- `textAnalysis.ts` — moteur d'analyse IA multi-signaux (10 modules AWPA) :
  - **Module 1** : Analyse de prévisibilité linguistique (Perplexity Score)
  - **Module 2** : Analyse Burstiness (variation de longueur des phrases)
  - **Module 3** : Détection de structure IA (STRUCTURE_AI_SCORE)
  - **Module 4** : Analyse des connecteurs pondérés (connector_density)
  - **Module 5** : Analyse vocabulaire générique (AI_PHRASES, generic_phrase_ratio)
  - **Module 6** : Détection de répétition sémantique (bigram overlap proxy)
  - **Module 7** : Analyse absence de personnalisation (PERSONALIZATION_SCORE)
  - **Module 8** : Détection paraphrase IA (nominalisations, verbes faibles)
  - **Module 9** : Style Fingerprint (empreinte multidimensionnelle)
  - **Module 10** : Rapport explicable (section/impact/format JSON+PDF)
  - Base de données `AI_PATTERNS` (~45 motifs FR+EN), `AI_PHRASES` (dictionnaire pondéré), `WEIGHTED_CONNECTORS` (18 connecteurs avec poids)
  - Formule : `AI_SCORE = somme(poids_i × score_i) + pattern_points`
  - Règle finale : jamais "Ce texte est généré par IA", toujours "Ce texte présente des caractéristiques compatibles avec une génération IA"
- `cleaner.ts` — nettoyage des caractères invisibles (U+00A0, U+202F, zero-width, BOM, bidi).
- `humanizer.ts` — pipeline **Analyse → Réécriture → Vérification → Correction**, avec
  modes (`naturel`, `professionnel`, `academique`, `expert`, `personnel`), intensités,
  et système « humanize until natural » (boucle jusqu'à un score IA cible).
  - 80+ règles couvrant : emphase, notoriété, gérondifs, vocabulaire IA, connecteurs,
    phrases génériques (Module 5), paraphrase (Module 8), structure (Module 3),
    personnalisation (Module 7).
- `writerProfile.ts` — module Writer Profile local : `buildProfile` (texte → profil JSON),
  `applyProfile` (réécriture selon le style), import/export JSON.
- `report.ts` — génération de rapport local JSON et PDF (impression navigateur, sans dépendance).
  - 12 sous-scores affichés, radar chart 7 axes, Style Fingerprint, détails par catégorie.
- `ml/featureExtractor.ts` — extraction de 38 features normalisées pour le modèle ML.
- `ml/builtinModel.ts` — MLP embarqué (38→32→16→1), weights déterministes.
- `ml/modelService.ts` — service ML unifié (builtin + ONNX + custom).
- `plagiarism/` — moteur de détection de plagiat (shingles + MinHash).
- `transfer/pipeline.ts` — transfer learning in-browser (architecture 38→32→16→1, Adam optimizer).

`src/workers/textProcessor.worker.ts` orchestre `cleaner` + `humanizer` hors du thread UI.
`src/hooks/useAIDetector.ts` est un simple wrapper de `textAnalysis`.
Tests : `src/lib/__tests__/engine.test.ts` (`npm run test`).

## Pipeline AWPA
```
INPUT TEXT
    ↓
Text Parser (splitSentences + nettoyage)
    ↓
Feature Extractor (38 dimensions)
    ↓
AI Pattern Detector (AI_PATTERNS + AI_PHRASES + WEIGHTED_CONNECTORS)
    ↓
Naturalness Scoring Engine (10 modules multi-signaux)
    ↓
Style Fingerprint (6D vector)
    ↓
Humanization Suggestions (règles de réécriture)
    ↓
OUTPUT REPORT (JSON + PDF avec explications)
```
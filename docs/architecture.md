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

## Mise à jour — Moteur modulaire (lib/)

La logique métier est désormais 100% locale et découplée de React/UI, dans `src/lib/` :

- `textAnalysis.ts` — moteur d'analyse IA (signaux : structure de phrase, répétition,
  variation syntaxique, style, patterns LLM). Source unique de vérité.
- `cleaner.ts` — nettoyage des caractères invisibles (U+00A0, U+202F).
- `humanizer.ts` — pipeline **Analyse → Réécriture → Vérification → Correction**, avec
  modes (`naturel`, `professionnel`, `academique`, `expert`, `personnel`), intensités, et
  système « humanize until natural » (boucle jusqu'à un score IA cible).
- `writerProfile.ts` — module Writer Profile local : `buildProfile` (texte → profil JSON),
  `applyProfile` (réécriture selon le style), import/export JSON.
- `report.ts` — génération de rapport local JSON et PDF (impression navigateur, sans dépendance).

`src/workers/textProcessor.worker.ts` orchestre `cleaner` + `humanizer` hors du thread UI.
`src/hooks/useAIDetector.ts` est un simple wrapper de `textAnalysis`.
Tests : `src/lib/__tests__/engine.test.ts` (`npm run test`).

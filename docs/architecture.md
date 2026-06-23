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

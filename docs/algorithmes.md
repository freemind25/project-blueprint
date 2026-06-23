# Algorithmes cles

## 1. Nettoyage (`textProcessor.worker.ts` - performClean)
Supprime les caracteres invisibles herites de copier-coller :
- U+00A0 (espace insecable) -> espace normal
- U+202F (espace fine insecable) -> espace normal

Retourne le nombre d'occurrences de chaque type et le total remplace.

## 2. Humanisation (`textProcessor.worker.ts` - performHumanize)
Transformations locales pilotees par un niveau d'intensite
(`light`, `moderate`, `aggressive`) :
- Variation des transitions mecaniques (En effet, Cependant, De plus...).
- Conversion ponctuelle de chiffres en lettres.

Chaque modification est tracee dans un `changeLog`
(type, original, remplacement, raison) exportable en JSON ou PDF.

## 3. Detection IA (`useAIDetector.ts`)
Score global pondere a partir de 7 heuristiques locales :
| Heuristique | Mesure |
| :--- | :--- |
| Burstiness | Uniformite de longueur des phrases |
| Transitions | Densite de connecteurs logiques |
| Perfection | Absence de marques d'oralite |
| Voix generique | Formules passe-partout typiques des LLM |
| Perplexite | Predictibilite (ratio de mots tres courants) |
| Vocabulaire | Diversite lexicale (TTR inverse) |
| Profondeur | Densite de details concrets (chiffres, noms propres) |

Toutes les analyses sont effectuees dans le navigateur, sans appel reseau.

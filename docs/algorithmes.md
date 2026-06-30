# Algorithmes cles

## 1. Nettoyage (`cleaner.ts` - performClean)
Supprime les caracteres invisibles herites de copier-coller :
- U+00A0 (espace insecable) -> espace normal
- U+202F (espace fine insecable) -> espace normal
- Zero-width space/joiner/non-joiner (U+200B, U+200C, U+200D)
- BOM (U+FEFF)
- Marques directionnelles (U+200E, U+200F, U+061C)
- Soft hyphen, word joiner (U+00AD, U+2060, U+180E)

Retourne le nombre d'occurrences de chaque type et le total remplace.

## 2. Humanisation (`humanizer.ts` - performHumanize)
Transformations locales pilotees par un niveau d'intensite
(`light`, `moderate`, `aggressive`) et un mode (`naturel`, `professionnel`, `academique`, `expert`, `personnel`) :

- Variation des transitions mecaniques (En effet, Cependant, De plus...)
- Suppression des artefacts de chatbot
- Remplacement du vocabulaire IA typique
- **Module 3** : Variation structurelle (remplacement des eumerations rigides : premierement, deuxiemement...)
- **Module 4** : Suppression des connecteurs a fort risque (En outre, Il convient de noter que...)
- **Module 5** : Remplacement des phrases generiques IA (approche innovante, solution pertinente, enjeux majeurs...)
- **Module 7** : Ajout de contexte concret pour les formulations impersonnelles
- **Module 8** : Simplification des paraphrases artificielles (nominalisations, verbes faibles)
- Conversion ponctuelle de chiffres en lettres.

Chaque modification est tracee dans un `changeLog`
(type, original, remplacement, raison) exportable en JSON ou PDF.

Pipeline : Analyse -> Reecriture -> Verification -> Correction (boucle).

## 3. Detection IA (`textAnalysis.ts` - analyzeText)
Score global pondere multi-signaux (conforme AWPA) :

| Module | Score | Mesure |
| :--- | :--- | :--- |
| **1. Previsibilite** | `perplexityScore` | Ratio de mots tres courants (proxy de perplexite) |
| **2. Burstiness** | `burstinessScore` | Uniformite de longueur des phrases (ecart-type) |
| **3. Structure IA** | `structureScore` | Enumeration rigide, symetrie des paragraphes, headers generiques, transitions systematiques |
| **4. Connecteurs** | `transitionScore` | Densite de connecteurs ponderes (`WEIGHTED_CONNECTORS`) |
| **5. Vocabulaire generique** | `voiceScore` + patterns | Dictionnaire `AI_PHRASES` avec poids de risque |
| **6. Repetition semantique** | `semanticRepetitionScore` | Chevauchement de bigrammes entre phrases consecutives (proxy embeddings locaux) |
| **7. Personnalisation** | `personalizationScore` | Presence de references concretes, experiences, exemples, chiffres |
| **8. Paraphrase IA** | `paraphraseScore` | Nominalisations artificielles, verbes faibles, reformulations inutiles |
| **9. Style Fingerprint** | `styleScore` + `styleFingerprint` | Empreinte multidimensionnelle comparee aux profils LLM vs humain |

Formule multi-signaux :
```
AI_SCORE = somme(poids_i * score_i) + min(maxPatternPoints, patternPoints)
```

Le score final est un probabilite, jamais un jugement.
Le rapport produit : "Ce texte presente des caracteristiques compatibles avec une generation IA".

## 4. Anti-AI Writing Engine (AI_PATTERNS)
Base de donnees de ~45 motifs textuels (FR + EN) detectes par regex :
- Emphase artificielle, notoriete excessive, gerondifs superficiels
- Langage promotionnel, attributions vagues, squelette formularique
- Equilibre force, vocabulaire IA, titre Case, emojis decoratifs
- Artefacts chatbot, conclusions generiques, paralleles negatifs
- Phrases generiques IA (Module 5), paraphrase IA (Module 8), absence de personnalisation (Module 7)

Chaque motif a : categorie, severite (low/medium/high), points, regex, issue, suggestion.

## 5. Style Fingerprint (Module 9)
Vecteur multidimensionnel :
```
STYLE_VECTOR = {
  sentenceLength,        // longueur moyenne des phrases
  vocabularyDensity,     // TTR (type-token ratio)
  connectorRate,         // densite de connecteurs
  repetitionRate,        // 1 - ratio hapax
  complexity,            // longueur moyenne des mots
  personalMarkers        // pronoms personnels / phrase
}
```

## 6. ML Feature Extraction (`featureExtractor.ts`)
38 dimensions normalisees [0,1] :
- 7 scores heuristiques
- 7 features syntaxiques (longueur phrases, questions, voix passive...)
- 6 features lexicales (TTR, hapax, stopwords, bigrammes, chiffres)
- 4 features de patterns (connecteurs ponderes, phrases generiques, certitudes, enumerations)
- 4 features de structure (CV paragraphes, ratio connecteurs debut, enumerations, nb paragraphes)
- 3 features semantiques (repetition semantique bigrammes)
- 3 features de personnalisation (densite references, pronoms, exemples)
- 2 features de paraphrase (nominalisations, verbes faibles)
- 2 features de style (repetition, TTR)

Toutes les analyses sont effectuees dans le navigateur, sans appel reseau.
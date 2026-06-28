# 🤖 UnRobot — Nettoyeur & Humaniseur de Texte

**UnRobot** est une application web de nettoyage et d'humanisation de texte, conçue pour supprimer les artefacts invisibles et réduire la détectabilité IA de vos contenus. Tout le traitement s'effectue **100% localement** dans votre navigateur — aucune donnée ne quitte jamais votre machine.

---

## ✨ Fonctionnalités

| Fonctionnalité | Description |
| :--- | :--- |
| **Nettoyage technique** | Suppression des caractères invisibles (espaces insécables U+00A0, espaces minces U+202F, etc.) hérités de copier-coller. |
| **Humanisation de texte** | Transformation du texte pour réduire sa probabilité d'être détecté comme généré par IA. Trois niveaux d'intensité : léger, modéré, agressif. |
| **Analyse de détection IA** | Score basé sur la burstiness, la diversité lexicale et la densité de transitions mécaniques. |
| **Traitement local** | Aucun serveur, aucune API externe. Vos données restent sur votre machine. |
| **Performance optimisée** | Web Workers pour un traitement fluide, même sur de longs textes. |

---

## 🚀 Démarrage rapide

### Prérequis

- [Node.js](https://nodejs.org/) (v18 ou supérieur)
- npm (inclus avec Node.js)

### Installation

```bash
# Cloner le dépôt
git clone https://github.com/freemind25/project-blueprint.git

# Accéder au dossier
cd project-blueprint

# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev
```

L'application sera accessible à l'adresse `http://localhost:5173`.

### Build de production

```bash
npm run build
```

Les fichiers de production seront générés dans le dossier `dist/`.

---

## 🏗️ Architecture du projet

```
project-blueprint/
├── .github/workflows/     # CI/CD GitHub Actions
├── public/                # Assets statiques
├── src/
│   ├── components/
│   │   └── TextCleaner/   # Composants UI de l'application
│   │       ├── index.tsx          # Composant principal
│   │       ├── TextEditor.tsx     # Éditeur de texte
│   │       ├── ActionBar.tsx      # Barre d'actions
│   │       ├── AIAnalysis.tsx     # Affichage de l'analyse IA
│   │       ├── CleaningStats.tsx  # Statistiques de nettoyage
│   │       ├── HumanizeLog.tsx    # Journal des modifications
│   │       ├── IntensitySlider.tsx # Sélecteur d'intensité
│   │       └── Header.tsx         # En-tête
│   ├── hooks/
│   │   ├── useTextCleaner.ts     # Logique de nettoyage et humanisation
│   │   └── useAIDetector.ts      # Logique de détection IA
│   ├── workers/
│   │   └── textProcessor.worker.ts  # Web Worker (traitement hors thread principal)
│   ├── lib/               # Utilitaires partagés
│   └── pages/             # Pages de l'application
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## 🛠️ Technologies

| Catégorie | Technologie |
| :--- | :--- |
| **Framework** | React 18 |
| **Langage** | TypeScript |
| **Build** | Vite |
| **Styling** | Tailwind CSS |
| **Composants UI** | shadcn/ui (Radix UI) |
| **Icônes** | Lucide React |
| **Notifications** | Sonner |
| **Requêtes** | TanStack Query |
| **Formulaires** | React Hook Form + Zod |

---

## 🧠 Comment fonctionne la détection IA ?

L'analyse repose sur trois métriques heuristiques calculées localement :

1. **Burstiness** — Mesure la variation de longueur entre les phrases. Un texte IA tend à produire des phrases de longueur uniforme.
2. **Diversité lexicale (TTR)** — Ratio types/tokens. Un vocabulaire répétitif est un signal de génération automatique.
3. **Densité de transitions** — Fréquence des connecteurs mécaniques ("En effet", "Cependant", "De plus"...) souvent surreprésentés dans les textes IA.

Le score global est une moyenne pondérée de ces trois indicateurs (0-100).

---

## 🔧 Comment fonctionne l'humanisation ?

Le moteur d'humanisation applique des transformations progressives :

- **Remplacement de transitions** : substitution aléatoire des connecteurs mécaniques par des variantes naturelles.
- **Conversion nombres/lettres** : transformation contextuelle de chiffres en mots ("5" → "cinq").
- **Variation stylistique** : modification de la casse et de la structure pour briser les patterns prévisibles.

Trois niveaux d'intensité permettent de contrôler l'ampleur des modifications.

---

## ⚡ Optimisations de performance

- **Web Workers** : les traitements lourds (nettoyage, humanisation) sont déportés hors du thread principal pour garantir une interface fluide.
- **requestIdleCallback** : l'analyse IA s'exécute en arrière-plan sans bloquer la saisie.
- **Memoization** : `useMemo` et `useCallback` évitent les recalculs et re-rendus inutiles.

---

## 🧪 Tests

```bash
# Lancer les tests
npm test

# Lancer le linting
npm run lint
```

---

## 📦 Déploiement

L'application est une SPA statique. Elle peut être déployée sur n'importe quelle plateforme d'hébergement statique :

- [Vercel](https://vercel.com/)
- [Netlify](https://www.netlify.com/)
- [Cloudflare Pages](https://pages.cloudflare.com/)
- [GitHub Pages](https://pages.github.com/)

---

## 🤝 Contribuer

Les contributions sont les bienvenues ! Voici comment procéder :

1. Forkez le dépôt
2. Créez une branche (`git checkout -b feat/ma-fonctionnalite`)
3. Committez vos changements (`git commit -m "feat: description"`)
4. Poussez la branche (`git push origin feat/ma-fonctionnalite`)
5. Ouvrez une Pull Request

### Conventions

- Commits : format [Conventional Commits](https://www.conventionalcommits.org/)
- Code : TypeScript strict, formaté avec Prettier
- Linting : ESLint avec les règles du projet

---

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

---

## 🔒 Confidentialité

**UnRobot ne collecte aucune donnée.** Tout le traitement s'effectue dans votre navigateur. Aucun texte n'est envoyé à un serveur externe. C'est notre engagement fondamental.

---

> *UnRobot — Votre texte reste le vôtre.*

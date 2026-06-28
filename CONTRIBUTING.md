# Guide de contribution - UnRobot

Merci de vouloir contribuer a UnRobot. Ce document decrit comment configurer
l'environnement et soumettre vos changements.

## Prerequis
- Node.js 20+
- npm (gestionnaire de paquets du projet, voir `package-lock.json`)

## Installation
```bash
git clone <url-du-depot>
cd project
npm install
npm run dev
```

## Scripts utiles
| Commande | Description |
| :--- | :--- |
| `npm run dev` | Lance le serveur de developpement Vite |
| `npm run build` | Build de production |
| `npm run lint` | Verifie le code avec ESLint |
| `npm run preview` | Previsualise le build de production |

## Conventions de code
- TypeScript strict, composants React fonctionnels.
- Toute couleur passe par les tokens semantiques de `src/index.css` (pas de couleurs en dur).
- Le traitement de texte reste 100% local (aucune API externe).
- Pas de tiret cadratin dans l'UI, utiliser le trait d'union simple.

## Pull requests
1. Creez une branche dediee (`feat/...`, `fix/...`).
2. Assurez-vous que `npm run lint` et `npm run build` passent.
3. Decrivez clairement le changement et son impact.

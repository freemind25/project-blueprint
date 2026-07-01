# Notice d'utilisation — Transfer Learning

## Qu'est-ce que le Transfer Learning ?

Le **Transfer Learning** (apprentissage par transfert) permet d'entraîner un **modèle de détection IA personnalisé** directement dans votre navigateur. Contrairement au modèle intégré qui utilise des règles générales, votre modèle personnalisé apprend à partir de **vos propres exemples** de textes humains et de textes générés par IA, ce qui améliore significativement la précision de détection pour votre domaine spécifique (académique, professionnel, littéraire, etc.).

**Points clés :**
- 100 % côté client — aucun texte n'est envoyé sur un serveur
- Entraînement instantané (moins de 5 secondes pour 200 échantillons)
- Le modèle est sauvegardé localement dans votre navigateur (IndexedDB)
- Architecture : réseau de neurones 38 → 32 → 16 → 1 (ReLU + Sigmoid), optimiseur Adam

---

## Comment accéder au panneau

Cliquez sur le bouton **« Transfer Learning »** (icône cerveau 🧠) dans la barre d'outils principale d'UnRobot. Le panneau s'ouvre et affiche l'interface de gestion de dataset et d'entraînement.

---

## Étape 1 — Préparer votre dataset

Le dataset est un ensemble de textes étiquetés. Chaque texte est classé soit comme **« Humain »** soit comme **« IA »**.

### Exigences minimales
| Critère | Valeur |
|---|---|
| Texte minimum par échantillon | **50 caractères** |
| Nombre minimum d'échantillons IA | **2** |
| Nombre minimum d'échantillons humains | **2** |
| Total minimum | **4 échantillons** |

### Recommandations pour un bon modèle
- **10 à 50 échantillons** par classe (IA et humain) pour un résultat fiable
- Variez les sources IA : ChatGPT, Claude, Gemini, Mistral, etc.
- Variez les textes humains : différents auteurs, styles et longueurs
- Utilisez des textes de **200 à 1 000 caractères** pour de meilleurs résultats
- Évitez les textes trop courts (< 50 caractères) ou trop similaires entre eux

### Ajouter un échantillon manuellement
1. **Collez ou saisissez** un texte dans la zone de texte (minimum 50 caractères)
2. **Sélectionnez l'étiquette** à l'aide du commutateur :
   - Position gauche (vert) = **Texte humain**
   - Position droite (rouge) = **Texte IA**
3. Cliquez sur **« Ajouter »**
4. L'échantillon apparaît dans les statistiques et dans l'aperçu en bas du panneau

### Importer un dataset JSON
Vous pouvez importer un fichier JSON contenant un tableau d'échantillons pré-étiquetés. Le format attendu est :

```json
[
  { "text": "Votre texte humain ici...", "label": "human", "addedAt": "2025-01-01T00:00:00.000Z" },
  { "text": "Votre texte généré par IA ici...", "label": "ai", "addedAt": "2025-01-01T00:00:00.000Z" }
]
```

Cliquez sur **« Importer JSON »** et sélectionnez votre fichier. Les échantillons valides seront ajoutés à votre dataset actuel.

### Exporter votre dataset
Cliquez sur **« Exporter dataset »** pour télécharger votre dataset au format JSON. Utile pour :
- Sauvegarder votre travail
- Partager votre dataset avec un collaborateur
- Réutiliser le même dataset dans une autre session

---

## Étape 2 — Configurer l'entraînement

Avant de lancer l'entraînement, choisissez le nombre d'**époques** (passes complètes sur le dataset) :

| Option | Époques | Cas d'usage |
|---|---|---|
| **Rapide** | 10 | Test rapide, proof of concept |
| **Recommandé** | 30 | Bon équilibre vitesse/précision |
| **Précis** | 50 | Dataset volumineux (> 30 échantillons) |
| **Exhaustif** | 100 | Dataset très volumineux (> 50 échantillons) |

Les autres hyperparamètres (taux d'apprentissage : 0,001, split de validation : 20 %) sont préréglés et optimisés pour la plupart des cas d'usage.

---

## Étape 3 — Lancer l'entraînement

1. Vérifiez que vous avez au moins **2 échantillons IA + 2 échantillons humains**
2. Cliquez sur le bouton **« Entraîner »**
3. La barre de progression affiche en temps réel :
   - **L'époque** en cours (ex : 15/30)
   - **La loss** (erreur d'entraînement — plus elle baisse, mieux c'est)
   - **La précision de validation** (pourcentage de bonnes prédictions sur le jeu de validation)
4. À la fin de l'entraînement, un message indique la précision du modèle (ex : « Précision : 87 % »)
5. Le modèle est **automatiquement sauvegardé** et **activé** pour les analyses futures

---

## Étape 4 — Utiliser votre modèle personnalisé

Une fois entraîné et activé, votre modèle est utilisé automatiquement par le détecteur IA :

- Le score affiché combine les **heuristiques AWPA (40 %)** et votre **modèle ML (60 %)**
- Un indicateur vert « Modèle personnalisé » apparaît en haut du panneau Transfer Learning avec le nom et la précision du modèle actif
- Le modèle reste actif même après rechargement de la page (sauvegardé dans IndexedDB)

---

## Gestion des modèles sauvegardés

Cliquez sur **« Modèles sauvegardés (N) »** en bas du panneau pour :

| Action | Description |
|---|---|
| ▶ **Activer** | Charge le modèle pour les analyses futures (icône Play) |
| ✕ **Supprimer** | Supprime définitivement le modèle de votre navigateur (icône X) |
| ✓ **Modèle actif** | Indiqué par une coche verte et une bordure bleue |

Vous pouvez entraîner et sauvegarder **plusieurs modèles** (par exemple, un pour les textes académiques, un autre pour les articles de blog) et basculer entre eux.

---

## Que se passe-t-il techniquement ?

1. **Extraction de features** — Chaque texte est analysé par le moteur AWPA (38 dimensions : perplexité, burstiness, connecteurs, vocabulaire, etc.)
2. **Entraînement** — Un réseau de neurones pur JavaScript (38 → 32 → 16 → 1) apprend à distinguer les patterns humains des patterns IA à partir de vos features
3. **Inférence** — Lors d'une analyse, le texte est d'abord passé par l'extracteur de features, puis par votre modèle entraîné qui retourne une probabilité IA

**Aucune dépendance externe** : pas de TensorFlow.js, pas de PyTorch, pas d'appel API. Tout s'exécute en JavaScript pur dans votre navigateur.

---

## Dépannage

| Problème | Solution |
|---|---|
| « Le texte doit faire au moins 50 caractères » | Ajoutez plus de contenu à votre échantillon |
| « Minimum 2 échantillons IA + 2 humains requis » | Ajoutez au moins 2 textes de chaque classe avant d'entraîner |
| « Entraînement échoué : Minimum 4 échantillons requis » | Le dataset total est insuffisant après le split de validation |
| La précision est faible (< 60 %) | Ajoutez plus d'échantillons variés et vérifiez l'étiquetage |
| Le modèle ne semble pas être utilisé | Vérifiez qu'il est bien activé (coche verte dans la liste des modèles) |
| Les modèles ont disparu | Les modèles sont stockés dans IndexedDB du navigateur. Effacer les données du site les supprime. Exportez vos datasets pour les sauvegarder |
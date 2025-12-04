# Grapheur - Calculatrice Graphique

**Statut**: Production
**Dernière mise à jour**: 2025-12-04
**Version**: 1.3.0

## Table des matières

- [Vue d'ensemble](#vue-densemble)
- [Guide utilisateur](#guide-utilisateur)
  - [Accès](#accès)
  - [Interface principale](#interface-principale)
  - [Tracer une fonction](#tracer-une-fonction)
  - [Interactions avec le graphique](#interactions-avec-le-graphique)
  - [Gestion des fonctions](#gestion-des-fonctions)
  - [Personnalisation](#personnalisation)
- [Analyse automatique](#analyse-automatique)
  - [Racines (zéros)](#racines-zéros)
  - [Extrema (min/max)](#extrema-minmax)
  - [Asymptotes](#asymptotes)
- [Export du graphique](#export-du-graphique)
- [Fonctions supportées](#fonctions-supportées)
- [Conseils et bonnes pratiques](#conseils-et-bonnes-pratiques)
- [Dépannage](#dépannage)

---

## Vue d'ensemble

Le **Grapheur** est une calculatrice graphique interactive qui permet de tracer et d'analyser des fonctions mathématiques en temps réel. Cet outil est conçu pour les élèves et les enseignants de mathématiques.

### Caractéristiques principales

- ✅ **Traçage en temps réel** - Les courbes s'affichent instantanément au fur et à mesure de la saisie
- ✅ **Éditeur LaTeX intégré** - Écrivez les fonctions en notation mathématique naturelle
- ✅ **Exploration interactive** - Déplacez et zoomez pour explorer différentes régions du graphique
- ✅ **Scaling par axe** - Modifiez l'échelle de l'axe X ou Y indépendamment
- ✅ **Suivi des coordonnées** - Survolez le graphique pour voir les coordonnées en temps réel
- ✅ **Snap vers points particuliers** - Le curseur s'aimante automatiquement aux racines, extrema et intersections
- ✅ **Multiples fonctions** - Tracez jusqu'à 20 fonctions simultanément avec des couleurs distinctes
- ✅ **Personnalisation des courbes** - Couleurs, épaisseurs (1-5px) et styles de trait (continu, tirets, pointillé, tiret-point)
- ✅ **Sauvegarde automatique** - Vos graphiques sont sauvegardés dans le navigateur
- ✅ **Analyse automatique** - Détection des racines, extrema et asymptotes en temps réel
- ✅ **Export d'images** - Exportez vos graphiques en SVG ou PNG (haute résolution)

---

## Guide utilisateur

### Accès

Le Grapheur est accessible via l'URL `/grapheur` pour:

- **Élèves** - Accès complet
- **Enseignants** - Accès complet
- **Autres utilisateurs** - Accès refusé (authentification requise)

### Interface principale

L'interface du Grapheur est composée de deux zones principales:

**Zone gauche - Panneau de contrôle**:

- Liste des fonctions tracées
- Éditeur pour ajouter/modifier des fonctions
- Sélecteur de couleurs
- Boutons de visibilité et de suppression

**Zone centrale/droite - Graphique**:

- Grille de coordonnées
- Axes X et Y avec étiquettes
- Courbes des fonctions
- Affichage des coordonnées du curseur

### Tracer une fonction

#### Ajouter votre première fonction

1. Accédez à `/grapheur`
2. Une fonction par défaut `x^2` est déjà tracée pour commencer
3. Pour ajouter une nouvelle fonction, cliquez sur le bouton **"+ Ajouter une fonction"**

#### Écrire une expression LaTeX

L'éditeur accepte les expressions LaTeX standards pour les fonctions mathématiques:

**Exemples de base**:

```
x^2              → parabole
x^3 - 2*x        → polynôme cubique
sin(x)           → sinus
\sin(x)          → sinus (notation LaTeX)
2*x + 1          → fonction linéaire
```

**Notation LaTeX complète**:

```
\sin(x)          → sinus
\cos(x)          → cosinus
\tan(x)          → tangente
\sqrt{x}         → racine carrée
\log(x)          → logarithme base 10
\ln(x)           → logarithme naturel
\exp(x) ou e^x   → exponentielle
\abs{x}          → valeur absolue
```

#### Mise à jour automatique

- Les courbes se mettent à jour **automatiquement** en temps réel
- Attendez 300ms après avoir arrêté de taper pour voir la courbe mise à jour
- Si votre expression contient une erreur, un message d'erreur rouge s'affiche

### Interactions avec le graphique

#### Déplacer (Pan)

**À la souris** (desktop):

1. Cliquez et maintenez sur le graphique
2. Glissez-déposez vers la direction souhaitée
3. Relâchez pour arrêter

**À la main** (mobile/tablette):

1. Placez deux doigts sur le graphique
2. Glissez-déposez

#### Zoomer

**Molette** (desktop):

1. Pointez votre souris où vous voulez zoomer
2. Tournez la molette vers le haut pour zoomer (plus proche)
3. Tournez vers le bas pour dézoomer (plus éloigné)

**Pinch** (mobile/tablette):

1. Placez deux doigts sur le graphique
2. Écartez-les pour zoomer avant
3. Rapprochez-les pour dézoomer

#### Modifier l'échelle d'un seul axe

Pour ajuster l'échelle de l'axe X ou Y indépendamment:

1. Approchez votre curseur de l'axe X (horizontal) ou Y (vertical)
2. Le curseur change pour indiquer le mode de scaling (↔ ou ↕)
3. Cliquez et glissez pour modifier l'échelle de cet axe uniquement

**Astuce** : Cette fonctionnalité est utile pour visualiser des fonctions avec des amplitudes très différentes sur les deux axes.

#### Suivre les coordonnées

Survolez le graphique avec votre souris (desktop) pour voir:

- Les coordonnées X, Y en temps réel
- Les valeurs des points sur les courbes

#### Snap vers les points particuliers

Quand vous survolez le graphique près d'un point particulier, le curseur s'y "aimante" automatiquement :

- **Racines** : le label affiche "Racine : x = ..."
- **Maximum** : le label affiche "Max : (x, y)"
- **Minimum** : le label affiche "Min : (x, y)"
- **Intersections** : le label affiche "Inter : (x, y)"

Le marker prend la forme appropriée (losange pour les racines, triangle pour les extrema, cercle pour les intersections).

**Priorité** : Si plusieurs points sont proches, les intersections ont la priorité, puis les racines, puis les extrema, puis les points sur la courbe.

### Gestion des fonctions

#### Modifier une fonction

1. Cliquez dans l'éditeur LaTeX de la fonction
2. Modifiez l'expression mathématique
3. La courbe se met à jour automatiquement

#### Changer la couleur

1. Cliquez sur le carré de couleur à côté de la fonction
2. Sélectionnez une nouvelle couleur dans le popup de la palette
3. La courbe change instantanément de couleur

#### Changer l'épaisseur du trait

1. Cliquez sur l'icône d'épaisseur de ligne (à côté de la couleur)
2. Sélectionnez une épaisseur parmi 5 options (1px à 5px)
3. La courbe se met à jour instantanément

#### Changer le style du trait

1. Cliquez sur l'icône de style de ligne
2. Choisissez parmi 4 styles :
   - **Continu** : trait plein
   - **Tirets** : - - - -
   - **Pointillé** : . . . .
   - **Tiret-point** : -.-.-

#### Masquer/Afficher une fonction

1. Cliquez sur l'icône **Œil** (Eye icon) à côté de la fonction
2. L'icône devient grisée quand la fonction est masquée
3. Cliquez à nouveau pour réafficher

#### Supprimer une fonction

1. Cliquez sur l'icône **Poubelle** (Trash icon) à côté de la fonction
2. La fonction est immédiatement supprimée du graphique

### Personnalisation

#### Réinitialiser le graphique

Un bouton **"Réinitialiser la vue"** dans les contrôles:

- Remet le viewport à [-10, 10] sur les deux axes
- Conserve toutes vos fonctions

#### Ajouter des fonctions

Vous pouvez tracer jusqu'à **20 fonctions simultanément**. Chacune a sa propre couleur automatiquement sélectionnée.

---

## Analyse automatique

Le Grapheur détecte et affiche automatiquement les points remarquables de vos fonctions en temps réel.

### Racines (zéros)

Les **racines** sont les points où la fonction coupe l'axe des x, c'est-à-dire où f(x) = 0.

**Affichage** : Marqueurs en forme de **losange** (◇) sur l'axe x

**Caractéristiques** :

- Détection automatique par changement de signe
- Raffinement par méthode de bisection pour une précision optimale
- Tooltip affichant la coordonnée x exacte au survol

**Exemples** :

- `x^2 - 4` → racines à x = -2 et x = 2
- `\sin(x)` → racines à x = 0, ±π, ±2π, ...

### Extrema (min/max)

Les **extrema** sont les points où la fonction atteint un minimum ou maximum local.

**Affichage** :

- **Maximum local** : Triangle pointant vers le haut (△)
- **Minimum local** : Triangle pointant vers le bas (▽)

**Caractéristiques** :

- Détection par analyse de la dérivée numérique
- Affiche les coordonnées (x, y) complètes au survol
- Couleur correspondant à la fonction associée

**Exemples** :

- `x^2` → minimum à (0, 0)
- `-x^2 + 4` → maximum à (0, 4)
- `\sin(x)` → maxima à x = π/2 + 2nπ, minima à x = -π/2 + 2nπ

### Asymptotes

Les **asymptotes** sont des droites que la courbe approche à l'infini.

#### Asymptotes verticales

Lignes verticales où la fonction tend vers l'infini.

**Affichage** : Ligne pointillée verticale `- - -`

**Exemples** :

- `1/x` → asymptote verticale à x = 0
- `\tan(x)` → asymptotes verticales à x = ±π/2, ±3π/2, ...

#### Asymptotes horizontales

Lignes horizontales que la fonction approche quand x → ±∞.

**Affichage** : Ligne pointillée horizontale `— — —`

**Exemples** :

- `1/x` → asymptote horizontale y = 0
- `(2x+1)/(x+1)` → asymptote horizontale y = 2

#### Asymptotes obliques

Lignes diagonales (y = mx + b) que la fonction approche à l'infini.

**Affichage** : Ligne pointillée diagonale `—·—·—`

**Exemples** :

- `x + 1/x` → asymptote oblique y = x
- `(x^2 + 2x + 1)/x` → asymptote oblique y = x + 2

**Note** : L'analyse est désactivée pendant les interactions (pan/zoom) pour maintenir des performances fluides.

---

## Export du graphique

Exportez vos graphiques pour les utiliser dans des documents, présentations ou les partager.

### Formats disponibles

#### SVG (Scalable Vector Graphics)

**Avantages** :

- Qualité parfaite à toute échelle (vectoriel)
- Taille de fichier légère
- Éditable dans des logiciels comme Inkscape ou Illustrator
- Idéal pour l'impression haute qualité

**Usage recommandé** : Documents professionnels, présentations, impression

#### PNG (Portable Network Graphics)

**Options de résolution** :

- **1x** : Résolution standard (taille du graphique à l'écran)
- **2x** : Haute résolution (idéal pour écrans Retina et impression)

**Avantages** :

- Compatible partout (navigateurs, logiciels, réseaux sociaux)
- Fond transparent
- Bon pour le partage rapide

**Usage recommandé** : Partage en ligne, intégration dans des documents Word/Google Docs

### Comment exporter

1. Créez votre graphique avec les fonctions souhaitées
2. Ajustez la vue (zoom, position) pour cadrer parfaitement
3. Cliquez sur le bouton **"Exporter"** dans les contrôles
4. Sélectionnez le format souhaité :
   - **Exporter en SVG** pour le vectoriel
   - **Exporter en PNG (1x)** pour la résolution standard
   - **Exporter en PNG (2x)** pour la haute résolution
5. Le fichier se télécharge automatiquement

**Nom du fichier** : `grapheur-export-YYYYMMDD-HHMMSS.svg` ou `.png`

---

## Fonctions supportées

### Polynômes

```
x^2              → x au carré
x^3              → x au cube
2*x + 1          → linéaire
x^4 - 2*x^2 + 1  → biquadratique
```

### Fonctions trigonométriques

```
\sin(x)          → sinus
\cos(x)          → cosinus
\tan(x)          → tangente
2*\sin(x)        → sinus multiplié par 2
\sin(2*x)        → sinus avec fréquence doublée
```

### Fonctions exponentielles et logarithmiques

```
\exp(x)          → e^x (exponentielle)
e^x              → e^x (exponentielle alternative)
2^x              → 2 puissance x
\log(x)          → logarithme base 10
\ln(x)           → logarithme naturel (base e)
```

### Racines et racines

```
\sqrt{x}         → racine carrée
x^{1/3}          → racine cubique
\sqrt[4]{x}      → racine quatrième
```

### Valeur absolue

```
\abs{x}          → valeur absolue de x
\abs{\sin(x)}    → valeur absolue du sinus
```

### Expressions composées

```
\sin(x) + x^2              → composition additive
x^2 * \cos(x)              → composition multiplicative
\sqrt{x^2 + 1}             → composition dans une fonction
\frac{x}{x^2 + 1}          → fraction
\sin(x) + \cos(2*x) - x    → combinaison complexe
```

### Constantes mathématiques

```
pi ou \pi        → π (pi)
e                → e (nombre d'Euler)
```

---

## Conseils et bonnes pratiques

### Pour les élèves

1. **Explorez les transformations** - Modifiez les coefficients (ex: `a*sin(b*x)`) pour voir comment les paramètres affectent la forme
2. **Comparez les fonctions** - Tracez plusieurs fonctions pour comparer leur comportement
3. **Zoomez sur les détails** - Utilisez le zoom pour explorer les intersections et les points intéressants
4. **Masquez pour clarifier** - Masquez temporairement des courbes pour mieux voir d'autres

### Pour les enseignants

1. **Démonstrations en classe** - Projetez le Grapheur pour montrer les concepts mathématiques
2. **Tâches interactives** - Demandez aux élèves de tracer des fonctions spécifiques
3. **Analyse comparative** - Faites explorer les familles de fonctions (ex: polynômes de différents degrés)
4. **Enquête sur les propriétés** - Utilisez le suivi des coordonnées pour examiner des valeurs spécifiques

### Optimisation du rendu

- Les courbes lisses utilisent l'interpolation Catmull-Rom pour 60fps
- Les sauts de continuité (asymptotes, domaines) sont détectés automatiquement
- Le rendu adaptatif optimise les performances même avec 20 fonctions

---

## Dépannage

### Erreur : "Expression est vide"

**Cause** : L'éditeur LaTeX est vide
**Solution** : Entrez une expression mathématique (ex: `x^2`)

### Erreur : "Erreur d'analyse"

**Cause** : Syntaxe LaTeX invalide
**Exemples** :

- `sin(x)` → Utilisez `\sin(x)` ou `sin(x)`
- `sqrt(x)` → Utilisez `\sqrt{x}`
- `(x^2` → Parenthèse manquante

**Solution** : Vérifiez la syntaxe LaTeX standard

### La courbe ne s'affiche pas

**Causes possibles** :

1. La fonction est en dehors de la plage de vue actuelle
2. La fonction a une erreur de domaine (ex: `\sqrt{-1}`)
3. La fonction est masquée (cliquez sur l'icône Œil)

**Solutions** :

- Zoomez ou déplacez la vue
- Réinitialisez le viewport
- Vérifiez que la fonction est visible

### La sauvegarde ne fonctionne pas

**Cause** : localStorage du navigateur est désactivé ou plein
**Solution** :

- Vérifiez les paramètres de confidentialité du navigateur
- Libérez de l'espace de stockage
- Essayez dans un navigateur différent

### Performance lente avec plusieurs fonctions

**Cause** : Trop de fonctions tracées (le maximum recommandé est 10)
**Solution** :

- Masquez les fonctions non pertinentes
- Supprimez les fonctions inutiles
- Zoomez sur une région plus petite

---

## Foire aux questions (FAQ)

**Q: Puis-je sauvegarder mes graphiques?**
A: Oui! Vos graphiques sont automatiquement sauvegardés dans le stockage local de votre navigateur quand vous naviguez ou fermez la page.

**Q: Comment puis-je importer des graphiques d'un autre appareil?**
A: Actuellement, la sauvegarde est locale au navigateur. Utilisez la même navigateur ou même appareil pour retrouver vos graphiques.

**Q: Quelles sont les limites du Grapheur?**
A:

- Maximum 20 fonctions par session
- Plage de viewport: ±1e10 (très large)
- Précision: jusqu'à ~300 points d'échantillonnage par courbe

**Q: Puis-je utiliser des variables en plus de x?**
A: Pas encore. Les variables supplémentaires (sliders) sont prévues pour une future version.

**Q: Comment réinitialiser le graphique?**
A: Utilisez le bouton "Réinitialiser la vue" dans les contrôles pour restaurer le viewport par défaut.

---

**Besoin d'aide?** Contactez votre enseignant ou consultez la documentation technique: [docs/claude/architecture.md#grapheur-graphing-calculator](../claude/architecture.md#grapheur-graphing-calculator)

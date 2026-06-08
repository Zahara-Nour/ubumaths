# Référentiel Mathématiques — 6ᵉ — **Famille A : Connaissances et savoir-faire**

> **Niveau scolaire** : 6ᵉ (cycle 3 — dernière année)
> **Famille** : A (contenus disciplinaires). La famille B (6 compétences mathématiques transversales) est dans `college-competences.md`.
> **Source de référence** : **BO 2026 cycle 3** + inspiration du référentiel personnel 2016 de David
> **Modèle** : B — chaque objectif a **exactement 4 capacités** ordonnées par difficulté (rang 1 → 4), chacune binaire
> **Statut** : structure validée 2026-06-08 ; libellés et variations à affiner

---

## Convention de lecture

### Structure (modèle B, cf. design doc §1 et §10 décision 57)

```
Thème (BO 2026) → Objectif (= item, ce que l'élève voit) → 4 capacités ordonnées
```

- **Rang 1** : base / pré-requis
- **Rang 2** : approfondissement intermédiaire
- **Rang 3 ⭐** : « objectif pour tous » (attendu BO 6ᵉ standard)
- **Rang 4** : expert / approfondissement

**Niveau atteint sur un objectif** = rang maximal des capacités acquises (0 si aucune).

### Rubriques BO 2026

Chaque capacité porte une **rubrique** qui détermine sa règle d'acquisition :

- **`automatisme`** : geste rapide, fluence. Acquise si ≥ 5 réussites et ≥ 3 sur les 5 dernières tentatives.
- **`capacite_attendue`** : compétence réfléchie. Acquise si ≥ 1 réussite sur ≥ 2 templates distincts, sans échec dans les 3 dernières tentatives.

### Variations canoniques

Sous chaque capacité, une liste de **variations canoniques** précise les cas de figure que le pool de templates de questions doit couvrir. Ces variations ne sont **pas des entrées DB séparées** : elles guident la création des templates. Cible : ≥ 2-3 variations distinctes par capacité dans le pool.

### Items « automatismes » ⚡

Les items marqués ⚡ ont une dominante `automatisme` (calcul mental, lexique géométrique de base, etc.). Les capacités peuvent être de rubrique mixte au sein d'un même item (rubrique portée par la capacité, pas par l'item).

---

## Synthèse des 18 items

| #   | Thème BO 2026        | Item                                          |
| --- | -------------------- | --------------------------------------------- |
| 1   | Nombres et calcul    | Nombres entiers                               |
| 2   | Nombres et calcul    | Nombres décimaux                              |
| 3   | Nombres et calcul    | Fractions                                     |
| 5   | Nombres et calcul    | Calcul (sens des opérations + calcul posé)    |
| 6   | Nombres et calcul    | Algèbre                                       |
| 7   | OGD et probabilités  | Organiser et lire des données                 |
| 8   | OGD et probabilités  | Probabilités                                  |
| 9   | Proportionnalité     | Proportionnalité et pourcentages              |
| 10  | Espace et géométrie  | Figures usuelles (lexique, reconnaissance) ⚡ |
| 11  | Espace et géométrie  | Constructions                                 |
| 12  | Espace et géométrie  | Symétrie axiale                               |
| 13  | Espace et géométrie  | Espace (vision 3D, patrons)                   |
| 14  | Grandeurs et mesures | Longueurs (périmètres)                        |
| 15  | Grandeurs et mesures | Aires                                         |
| 16  | Grandeurs et mesures | Volumes                                       |
| 17  | Grandeurs et mesures | Angles (mesure)                               |
| 18  | Grandeurs et mesures | Durées et repérage dans le temps              |
| 19  | Pensée informatique  | Programmer                                    |

**Total** : 18 items × 4 capacités = **72 capacités**.

> **Note sur la numérotation** : le numéro 4 (Calcul mental) a été supprimé du référentiel. Les contenus calcul mental sont logés dans les items adjacents (5 Calcul, 2 Décimaux, 3 Fractions, 14 Longueurs, 18 Durées) — cf. note méthodologique en fin de document. Les numéros 5 à 19 sont conservés pour préserver l'identité des items déjà validés.

---

## Thème 1 — Nombres et calcul

### Item 1 — Nombres entiers

| Rang | Capacité                                                                                      | Rubrique            |
| ---- | --------------------------------------------------------------------------------------------- | ------------------- |
| 1    | Comprendre la valeur d'un chiffre selon sa position dans un nombre entier                     | `capacite_attendue` |
| 2    | Lire et écrire un grand nombre entier (jusqu'au milliard) en chiffres et en lettres           | `capacite_attendue` |
| 3 ⭐ | Comparer et ordonner des nombres entiers, les placer sur une demi-droite graduée              | `capacite_attendue` |
| 4    | Estimer et interpréter de très grands nombres dans un contexte réel (démographie, astronomie) | `capacite_attendue` |

**Variations canoniques** :

_Rang 1_ — V1.a Valeur d'un chiffre selon son rang • V1.b Identifier le chiffre à un rang nommé • V1.c Décomposer selon les rangs • V1.d Recomposer à partir d'une décomposition

_Rang 2_ — V2.a Écrire en lettres un nombre en chiffres • V2.b Écrire en chiffres un nombre en lettres • V2.c Placer les espaces de groupement • V2.d Choisir la bonne écriture parmi distracteurs

_Rang 3 ⭐_ — V3.a Comparer deux entiers tailles différentes • V3.b Comparer rang par rang (même longueur) • V3.c Ordonner une liste de 4-5 nombres • V3.d Placer sur une demi-droite graduée • V3.e Encadrer entre deux multiples de 10ⁿ consécutifs

_Rang 4_ — V4.a Convertir mots ↔ chiffres • V4.b Estimer un ordre de grandeur • V4.c Comparer deux grandes valeurs en contexte • V4.d Lire/interpréter dans un graphique ou un texte

---

### Item 2 — Nombres décimaux

| Rang | Capacité                                                                                                                               | Rubrique            |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| 1    | Reconnaître un nombre décimal et passer entre ses différentes écritures (virgule ↔ fraction décimale ↔ somme de fractions décimales) | `capacite_attendue` |
| 2    | Placer un nombre décimal sur une demi-droite graduée et le repérer                                                                     | `capacite_attendue` |
| 3 ⭐ | Comparer et ordonner des nombres décimaux, encadrer, intercaler                                                                        | `capacite_attendue` |
| 4    | Arrondir un nombre décimal à l'unité, au dixième, au centième                                                                          | `capacite_attendue` |

**Variations canoniques** :

_Rang 1_ — V1.a Écriture à virgule ↔ fraction décimale • V1.b Somme de fractions décimales ↔ virgule • V1.c Identifier parties entière et décimale, chiffres des dixièmes/centièmes/millièmes • V1.d Reconnaître un décimal parmi distracteurs

_Rang 2_ — V2.a Placer sur demi-droite déjà graduée • V2.b Lire l'abscisse d'un point • V2.c Choisir l'écriture parmi distracteurs • V2.d Compléter une graduation

_Rang 3 ⭐_ — V3.a Comparer mêmes parties entières, longueurs différentes (piège _2,5 vs 2,15_) • V3.b Comparer rang par rang (longueurs égales) • V3.c Ordonner une liste de 4-5 décimaux • V3.d Encadrer entre deux unités/dixièmes/centièmes • V3.e Intercaler entre deux décimaux

_Rang 4_ — V4.a Arrondir à l'unité • V4.b Arrondir à un rang précisé • V4.c Arrondi pertinent en contexte • V4.d Arrondi d'un nombre non décimal

---

### Item 3 — Fractions

| Rang | Capacité                                                                                                                                                    | Rubrique            |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| 1    | Reconnaître et représenter une fraction (sens partage : 3/4 = 3 quarts d'une unité ; sens quotient : 3/4 = quart de 3) ; placer sur une demi-droite graduée | `capacite_attendue` |
| 2    | Établir des égalités de fractions et comparer des fractions (y compris encadrer entre deux entiers)                                                         | `capacite_attendue` |
| 3 ⭐ | Calculer une fraction d'une quantité ou d'un nombre (opérateur multiplicatif)                                                                               | `capacite_attendue` |
| 4    | Effectuer des opérations sur les fractions : additionner, soustraire (cas simples), multiplier une fraction par un entier                                   | `capacite_attendue` |

**Variations canoniques** :

_Rang 1_ — V1.a Lire une fraction représentée par un schéma • V1.b Représenter une fraction par un schéma • V1.c Comprendre le sens quotient (partage en parts égales) • V1.d Compléter quotient ↔ fraction • V1.e Placer une fraction sur demi-droite • V1.f Reconnaître fraction = entier/décimal/ni-l'un-ni-l'autre

_Rang 2_ — V2.a Égalité par schéma (2/4 = 1/2) • V2.b Compléter une égalité (3/4 = ?/12) • V2.c Comparer même dénominateur • V2.d Comparer même numérateur • V2.e Comparer à 1 ou à 1/2 • V2.f Encadrer par deux entiers consécutifs

_Rang 3 ⭐_ — V3.a Fraction d'une quantité concrète (2/3 de 12 œufs) • V3.b Fraction d'une grandeur (3/4 de 10 m) • V3.c Fraction d'un nombre entier (2/5 de 25) • V3.d Problème inverse (1/4 de quoi vaut 5 ?)

_Rang 4_ — V4.a Additionner même dénominateur • V4.b Soustraire même dénominateur • V4.c Multiplier fraction × entier (7 × 1/4) • V4.d Somme partie entière + fraction (1 + 3/4) • V4.e Égalité à trous (1/4 + ? = 1)

---

### Item 5 — Calcul (sens des opérations + calcul posé)

| Rang | Capacité                                                                                                                                    | Rubrique            |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| 1    | Comprendre le sens des 4 opérations et choisir l'opération pertinente dans un problème                                                      | `capacite_attendue` |
| 2    | Additionner et soustraire des nombres entiers et des nombres décimaux (calcul posé)                                                         | `capacite_attendue` |
| 3 ⭐ | Multiplier (posé) entiers et entier × décimal ; effectuer une division euclidienne (diviseur ≤ 100) ; diviser un décimal par un entier < 10 | `capacite_attendue` |
| 4    | Multiplier deux nombres décimaux et calculer avec parenthèses, en contrôlant par un ordre de grandeur                                       | `capacite_attendue` |

**Variations canoniques** :

_Rang 1_ — V1.a Choisir l'opération pour un problème simple • V1.b Inventer un problème pour une opération donnée • V1.c Reconnaître commutativité • V1.d Reconnaître rapports + ↔ −, × ↔ ÷

_Rang 2_ — V2.a Addition posée entiers • V2.b Soustraction posée entiers avec retenues • V2.c Addition décimaux (alignement virgule) • V2.d Soustraction décimaux

_Rang 3 ⭐_ — V3.a Multiplication entier × entier (2-3 chiffres) • V3.b Multiplication entier × décimal • V3.c Division euclidienne (b ≤ 100) • V3.d Division décimale par entier < 10 • V3.e Problème mettant en jeu mult/div (choix de la technique)

_Rang 4_ — V4.a Multiplication deux décimaux • V4.b Positionnement virgule via ordre de grandeur • V4.c Expression avec parenthèses ((15−3)×4) • V4.d Estimer l'ordre de grandeur avant calcul • V4.e Détecter une erreur via ordre de grandeur

---

### Item 6 — Algèbre

| Rang | Capacité                                                                                            | Rubrique            |
| ---- | --------------------------------------------------------------------------------------------------- | ------------------- |
| 1    | Compléter une égalité à trous (en utilisant l'opération inverse)                                    | `capacite_attendue` |
| 2    | Résoudre un problème avec un nombre inconnu (schéma en barre ou représentation visuelle)            | `capacite_attendue` |
| 3 ⭐ | Identifier et poursuivre une régularité dans une suite de nombres ou un motif évolutif              | `capacite_attendue` |
| 4    | Exécuter et produire un programme de calcul ; identifier la structure générique d'un motif évolutif | `capacite_attendue` |

**Variations canoniques** :

_Rang 1_ — V1.a Égalité à trous additive (7 + ? = 15) • V1.b Soustractive (23 − ? = 17) • V1.c Multiplicative (5 × ? = 35) • V1.d Divisive (? ÷ 4 = 7) • V1.e Composée (178 − ? = 6 × 8)

_Rang 2_ — V2.a Partage avec inconnu (schéma en barre) • V2.b Problème additif avec inconnu • V2.c Multiplicatif simple • V2.d Combiné (2 paires de ciseaux + 3 stylos = 20 €) • V2.e Représenter par schéma avant de résoudre

_Rang 3 ⭐_ — V3.a Suite arithmétique simple (+5, +10) • V3.b Suite multiplicative (×2, ×3) • V3.c Compléter un trou au milieu • V3.d Poursuivre un motif évolutif (figures) • V3.e Décrire la régularité en mots

_Rang 4_ — V4.a Exécuter un programme de calcul sur plusieurs entrées • V4.b Produire un programme pour une situation • V4.c Trouver l'élément à l'étape n d'un motif • V4.d Comparer deux programmes • V4.e Détecter une erreur dans un programme

**Note** : pas de calcul littéral en 6ᵉ (les lettres formelles arrivent au cycle 4 — explicite BO 2026).

---

## Thème 2 — Organisation, gestion de données et probabilités

### Item 7 — Organiser et lire des données

| Rang | Capacité                                                                                              | Rubrique            |
| ---- | ----------------------------------------------------------------------------------------------------- | ------------------- |
| 1    | Lire un tableau, un diagramme en barres, un diagramme circulaire ou une courbe (lecture immédiate)    | `automatisme`       |
| 2    | Construire un tableau pour présenter des données et y filtrer une information selon un critère        | `capacite_attendue` |
| 3 ⭐ | Tracer un diagramme (en barres ou circulaire) pour représenter un ensemble de données                 | `capacite_attendue` |
| 4    | Mener une enquête statistique : planifier, recueillir, organiser, choisir la représentation, analyser | `capacite_attendue` |

**Variations canoniques** :

_Rang 1_ — V1.a Lire une valeur dans un tableau à double entrée • V1.b Hauteur sur diagramme en barres • V1.c Catégorie majoritaire sur diagramme circulaire • V1.d Coordonnée/tendance sur courbe • V1.e Comparer deux valeurs

_Rang 2_ — V2.a Construire un tableau à partir d'observations • V2.b Filtrer selon un critère • V2.c Trier selon un ordre • V2.d Compter les occurrences • V2.e Identifier les caractères d'une enquête

_Rang 3 ⭐_ — V3.a Tracer diagramme en barres • V3.b Tracer diagramme circulaire (parts proportionnelles) • V3.c Choisir l'échelle adaptée • V3.d Légender (titre, axes, légende, unités)

_Rang 4_ — V4.a Formuler une question d'enquête • V4.b Planifier le recueil • V4.c Organiser les données dans un tableau • V4.d Choisir la représentation pertinente • V4.e Analyser et commenter (esprit critique sur source, échantillon)

**Contextes recommandés BO 2026** : sujets d'actualité (climat, biodiversité, pollution).

---

### Item 8 — Probabilités

| Rang | Capacité                                                                                                                                | Rubrique            |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| 1    | Reconnaître si une situation est certaine, impossible, peu probable ou très probable ; situer une probabilité sur une échelle 0 → 1     | `capacite_attendue` |
| 2    | Dénombrer les issues possibles d'une expérience aléatoire et celles qui correspondent à un événement (« a chances sur b »)              | `capacite_attendue` |
| 3 ⭐ | Calculer une probabilité dans une situation simple d'équiprobabilité et l'exprimer sous forme de fraction, de décimal ou de pourcentage | `capacite_attendue` |
| 4    | Comparer une fréquence observée et une probabilité calculée sur une expérience aléatoire répétée (approche fréquentiste)                | `capacite_attendue` |

**Variations canoniques** :

_Rang 1_ — V1.a Événement certain • V1.b Événement impossible • V1.c Classer du moins au plus probable • V1.d Situer sur échelle 0 → 1 • V1.e Reconnaître qu'une probabilité est entre 0 et 1

_Rang 2_ — V2.a Dénombrer issues d'expérience simple (dé) • V2.b Identifier issues favorables • V2.c Exprimer « a chances sur b » • V2.d Expérience à deux étapes (arbre/tableau) • V2.e Reconnaître l'équiprobabilité

_Rang 3 ⭐_ — V3.a Calculer dans une situation simple • V3.b Sous forme de fraction (a/b) • V3.c En décimal • V3.d En pourcentage • V3.e Vérifier que c'est dans [0, 1]

_Rang 4_ — V4.a Calculer la fréquence d'un événement répété • V4.b Comparer à la probabilité théorique • V4.c Discuter écart selon nombre de répétitions • V4.d Interpréter une simulation • V4.e Détecter une situation non équiprobable

**Note BO 2026** : vocabulaire spécifique (« événement », « issue », « univers ») non attendu en autonomie de l'élève — utilisé par le professeur.

---

## Thème 3 — Proportionnalité

### Item 9 — Proportionnalité et pourcentages

| Rang | Capacité                                                                                                                                                       | Rubrique            |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| 1    | Identifier une situation de proportionnalité et la distinguer d'une situation non proportionnelle                                                              | `capacite_attendue` |
| 2    | Résoudre un problème de proportionnalité par linéarité (multiplicative ou additive) ou par retour à l'unité ; représenter par un tableau (avec noms et unités) | `capacite_attendue` |
| 3 ⭐ | Comprendre, calculer et appliquer un pourcentage                                                                                                               | `capacite_attendue` |
| 4    | Résoudre un problème d'échelle (carte, plan) en mobilisant la proportionnalité                                                                                 | `capacite_attendue` |

**Variations canoniques** :

_Rang 1_ — V1.a Reconnaître proportionnalité dans un énoncé quotidien • V1.b Distinguer proportionnel vs non • V1.c Identifier grandeurs en jeu et unités • V1.d Reconnaître expressions « prix au kilo », « vitesse moyenne »

_Rang 2_ — V2.a Linéarité multiplicative • V2.b Linéarité additive • V2.c Retour à l'unité • V2.d Choisir la procédure selon les nombres • V2.e Compléter un tableau (avec noms + unités) • V2.f Représenter par flèches ou parenthèses • V2.g Verbaliser (2 fois plus, 3 fois moins)

_Rang 3 ⭐_ — V3.a Sens d'un pourcentage (20 % = 20 sur 100) • V3.b Équivalences % / fraction / décimal • V3.c Appliquer un pourcentage à une quantité • V3.d Calculer une proportion partie/tout en % • V3.e Pourcentage de réduction/augmentation

_Rang 4_ — V4.a Lire une échelle de plan/carte • V4.b Calculer distance réelle ↔ mesure carte • V4.c Calculer mesure carte ↔ distance réelle • V4.d Choisir une échelle pertinente • V4.e Convertir échelle numérique ↔ graphique

**Interdit BO 2026 6ᵉ** : le **produit en croix** n'est pas enseigné en 6ᵉ.

---

## Thème 4 — Espace et géométrie

### Item 10 — Figures usuelles (lexique, reconnaissance) ⚡

| Rang | Capacité                                                                                                                                                   | Rubrique            |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| 1    | Reconnaître et nommer les figures planes usuelles : carré, rectangle, triangle, cercle                                                                     | `automatisme`       |
| 2    | Connaître et utiliser le lexique géométrique : sommet, côté, segment, droite, demi-droite, angle, perpendiculaire, parallèle, rayon, diamètre              | `automatisme`       |
| 3 ⭐ | Coder et lire un codage d'une figure : angles droits, longueurs égales, points alignés, axes de symétrie                                                   | `automatisme`       |
| 4    | Reconnaître les figures particulières à partir de leurs propriétés : triangles (isocèle, équilatéral, rectangle), quadrilatères (losange, parallélogramme) | `capacite_attendue` |

**Variations canoniques** :

_Rang 1_ — V1.a Nommer une figure à partir d'un dessin • V1.b Dessiner à main levée • V1.c Identifier dans un environnement réel • V1.d Compter côtés et sommets

_Rang 2_ — V2.a Identifier sommet, côté, segment • V2.b Reconnaître droites parallèles/perpendiculaires • V2.c Identifier angle, angle droit • V2.d Identifier rayon, diamètre, corde, centre • V2.e Distinguer droite, demi-droite, segment

_Rang 3 ⭐_ — V3.a Coder un angle droit • V3.b Coder des longueurs égales • V3.c Lire les codages pour énoncer les propriétés • V3.d Compter les axes de symétrie d'une figure usuelle • V3.e Tracer (à main levée) l'axe de symétrie

_Rang 4_ — V4.a Losange à partir de 4 côtés égaux • V4.b Triangle isocèle (2 côtés ou 2 angles égaux) • V4.c Triangle équilatéral (3 côtés ou 3 angles) • V4.d Triangle rectangle (un angle droit) • V4.e Justifier la nature en citant les propriétés

---

### Item 11 — Constructions

| Rang | Capacité                                                                                                                                          | Rubrique            |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| 1    | Tracer un schéma à main levée d'une figure (avec codages)                                                                                         | `capacite_attendue` |
| 2    | Tracer aux instruments une figure usuelle de dimensions données : cercle, triangle, rectangle, carré, losange                                     | `capacite_attendue` |
| 3 ⭐ | Réaliser une construction à partir d'un programme ou d'un schéma : perpendiculaire, parallèle, médiatrice, bissectrice, triangle sous contraintes | `capacite_attendue` |
| 4    | Écrire un programme de construction pour qu'un autre puisse reproduire la figure                                                                  | `capacite_attendue` |

**Variations canoniques** :

_Rang 1_ — V1.a Schéma de triangle codé (longueurs, angles droits) • V1.b Schéma de quadrilatère codé • V1.c Configuration complexe (figure + cercle) • V1.d Compléter un schéma avec codages

_Rang 2_ — V2.a Cercle de rayon donné (compas) • V2.b Triangle de 3 longueurs (compas + règle) • V2.c Rectangle de dimensions (règle + équerre) • V2.d Carré de côté • V2.e Losange de côtés égaux

_Rang 3 ⭐_ — V3.a Perpendiculaire à une droite (équerre) • V3.b Parallèle à une droite (équerre + règle) • V3.c Médiatrice d'un segment au compas • V3.d Bissectrice d'un angle au compas • V3.e Triangle à partir de 2 longueurs + 1 angle • V3.f Cercle circonscrit à un triangle • V3.g Construction multi-étapes à partir d'un programme

_Rang 4_ — V4.a Décrire en langage naturel les étapes • V4.b Écrire un programme pour un camarade • V4.c Corriger un programme imprécis • V4.d Comparer deux programmes équivalents ou détecter une erreur

---

### Item 12 — Symétrie axiale

| Rang | Capacité                                                                                                                            | Rubrique            |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| 1    | Reconnaître un axe de symétrie d'une figure et reconnaître si deux figures sont symétriques par rapport à un axe                    | `capacite_attendue` |
| 2    | Compléter une figure par symétrie sur un quadrillage ou sur papier pointé                                                           | `capacite_attendue` |
| 3 ⭐ | Construire le symétrique d'un point ou d'une figure par rapport à une droite sur papier uni (aux instruments)                       | `capacite_attendue` |
| 4    | Utiliser les propriétés de conservation (longueurs, angles, alignements) pour effectuer des constructions ou résoudre des problèmes | `capacite_attendue` |

**Variations canoniques** :

_Rang 1_ — V1.a Axes de symétrie d'une figure usuelle • V1.b Figure possédant un axe donné • V1.c Deux figures symétriques par rapport à un axe • V1.d Tracer (à main levée) l'axe de symétrie • V1.e Compter les axes (cross-tagging item 10 V3.d)

_Rang 2_ — V2.a Sur quadrillage, axe vertical • V2.b Sur quadrillage, axe horizontal • V2.c Sur quadrillage, axe diagonal • V2.d Sur papier pointé (sans grille)

_Rang 3 ⭐_ — V3.a Symétrique d'un point (perpendiculaire + report compas) • V3.b Symétrique d'un segment • V3.c Symétrique d'un triangle • V3.d Symétrique d'une figure quelconque

_Rang 4_ — V4.a Conservation des longueurs pour déduire une mesure • V4.b Conservation des angles • V4.c Conservation des alignements • V4.d Propriété caractéristique de l'axe (équidistance) • V4.e Problème mêlant symétrie et autres notions

---

### Item 13 — Espace (vision 3D, patrons)

| Rang | Capacité                                                                                                          | Rubrique            |
| ---- | ----------------------------------------------------------------------------------------------------------------- | ------------------- |
| 1    | Identifier (nommer) les solides usuels : pavé, cube, cylindre, cône, boule, pyramide, prisme droit                | `automatisme`       |
| 2    | Connaître le lexique des solides : faces, arêtes, sommets ; reconnaître les caractéristiques d'un solide          | `capacite_attendue` |
| 3 ⭐ | Voir dans l'espace : passer entre un assemblage 3D et ses représentations 2D (vues, dénombrement de cubes cachés) | `capacite_attendue` |
| 4    | Construire un patron d'un cube ou d'un pavé droit (réactivation/prolongement CM2)                                 | `capacite_attendue` |

**Variations canoniques** :

_Rang 1_ — V1.a Nommer à partir d'une photo/dessin • V1.b Identifier dans un environnement réel • V1.c Choisir parmi distracteurs • V1.d Trier selon critères (faces planes/courbes, polyèdres/non)

_Rang 2_ — V2.a Compter faces, arêtes, sommets • V2.b Identifier arêtes parallèles d'un pavé • V2.c Reconnaître caractéristiques (6 faces carrées → cube) • V2.d Distinguer pyramide vs prisme

_Rang 3 ⭐_ — V3.a Vue de face/dessus/côté d'un assemblage • V3.b Reconstituer un assemblage à partir de ses vues • V3.c Dénombrer cubes (même cachés) • V3.d Perspective ↔ vues • V3.e Deux représentations 2D du même 3D ?

_Rang 4_ — V4.a Patron d'un cube • V4.b Patron d'un pavé droit de dimensions données • V4.c Patron donné — peut-il être plié en cube ? • V4.d Représentation en perspective (initiation, optionnelle) • V4.e Maquette d'un solide simple

---

## Thème 5 — Grandeurs et mesures

### Item 14 — Longueurs (périmètres)

| Rang | Capacité                                                                                        | Rubrique            |
| ---- | ----------------------------------------------------------------------------------------------- | ------------------- |
| 1    | Connaître les unités de longueur (du kilomètre au millimètre) et leurs relations                | `automatisme`       |
| 2    | Convertir entre unités de longueur (cas usuels)                                                 | `automatisme`       |
| 3 ⭐ | Calculer le périmètre d'un polygone (carré, rectangle, triangle) et d'un disque (formule π × d) | `capacite_attendue` |
| 4    | Calculer le périmètre d'une figure composée ; résoudre un problème impliquant des longueurs     | `capacite_attendue` |

**Variations canoniques** :

_Rang 1_ — V1.a Choisir l'unité adaptée • V1.b Lister les unités du km au mm • V1.c Reconnaître préfixes (kilo, hecto, déca, déci, centi, milli) • V1.d Signification de « 1 cm = 1/100 m »

_Rang 2_ — V2.a Convertir en mètres • V2.b Convertir entre deux unités usuelles • V2.c Comparer dans des unités différentes • V2.d Utiliser le tableau de conversion

_Rang 3 ⭐_ — V3.a Périmètre d'un carré (4 × c) • V3.b Rectangle (2 × (L + l)) • V3.c Triangle/polygone quelconque • V3.d Disque (π × d ou 2 × π × r) • V3.e Proportionnalité périmètre disque ↔ diamètre

_Rang 4_ — V4.a Décomposer une figure composée • V4.b Périmètre d'une figure composée (avec arcs) • V4.c Problème impliquant un périmètre (clôture, encadrement) • V4.d Compas comme outil de report de longueurs

---

### Item 15 — Aires

| Rang | Capacité                                                                                                                 | Rubrique            |
| ---- | ------------------------------------------------------------------------------------------------------------------------ | ------------------- |
| 1    | Connaître les unités d'aire (cm², dm², m²) et leurs relations                                                            | `automatisme`       |
| 2    | Comparer des aires sans recours à la mesure (superposition, découpage/recollement) ; déterminer une aire par quadrillage | `automatisme`       |
| 3 ⭐ | Calculer l'aire d'un carré ou d'un rectangle (formules, première sensibilisation au calcul littéral)                     | `capacite_attendue` |
| 4    | Effectuer des conversions d'aire ; résoudre un problème d'aire (figures composées de rectangles)                         | `capacite_attendue` |

**Variations canoniques** :

_Rang 1_ — V1.a Choisir l'unité (cm² feuille, m² pièce, km² terrain) • V1.b 1 cm² = aire d'un carré de 1 cm • V1.c 1 m² = 100 dm² ; 1 dm² = 100 cm² • V1.d 1 cm² = 0,01 dm² ; 1 dm² = 0,01 m²

_Rang 2_ — V2.a Comparer par superposition • V2.b Comparer par découpage et recollement • V2.c Aire sur quadrillage cm² • V2.d Estimer l'aire d'une figure irrégulière

_Rang 3 ⭐_ — V3.a Aire d'un carré (c × c) • V3.b Aire d'un rectangle (L × l) • V3.c Substituer une valeur dans formule littérale (A = L × l) • V3.d Trouver une dimension à partir de l'aire et de l'autre dimension

_Rang 4_ — V4.a Convertir entre cm² ↔ dm² ↔ m² • V4.b Figure composée de rectangles (par découpage) • V4.c Figure avec « trou » rectangulaire (par soustraction) • V4.d Problème (peinture, surface utile)

**Note** : pas de triangle quelconque, polygone ou disque en 6ᵉ (cycle 4 selon BO 2026).

---

### Item 16 — Volumes

| Rang | Capacité                                                                                                | Rubrique            |
| ---- | ------------------------------------------------------------------------------------------------------- | ------------------- |
| 1    | Connaître l'unité cm³ et reconnaître que 1 cm³ = volume d'un cube de 1 cm d'arête                       | `automatisme`       |
| 2    | Comparer des volumes (par superposition mentale, transvasement, dénombrement) ; estimer un volume usuel | `capacite_attendue` |
| 3 ⭐ | Déterminer un volume par dénombrement de cubes (assemblages avec cubes cachés)                          | `capacite_attendue` |
| 4    | Calculer le volume d'un pavé droit (formule L × l × h) ; résoudre un problème de volume composé         | `capacite_attendue` |

**Variations canoniques** :

_Rang 1_ — V1.a 1 cm³ = cube de 1 cm d'arête • V1.b Unité adaptée (cm³, m³, L) • V1.c Distinguer volume et capacité • V1.d 1 L = 1 dm³

_Rang 2_ — V2.a Comparer par superposition mentale • V2.b Par transvasement (eau, sable) • V2.c Comparer deux assemblages par dénombrement • V2.d Estimer un volume usuel

_Rang 3 ⭐_ — V3.a Compter cubes unités visibles • V3.b Dénombrer cubes cachés en perspective • V3.c Déterminer le volume en cm³ • V3.d Construire un assemblage de volume donné

_Rang 4_ — V4.a Volume d'un pavé (L × l × h) • V4.b Trouver une dimension à partir du volume • V4.c Solide composé de plusieurs pavés • V4.d Problème (citerne, réservoir, contenance)

**Lien** : rang 3 ⭐ se travaille en cohérence avec l'item 13 (Espace, V3.c). Tagging cross-item possible.

---

### Item 17 — Angles (mesure)

| Rang | Capacité                                                                                                                                          | Rubrique            |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| 1    | Connaître le lexique des angles (droit, plat, plein, nul, aigu, obtus) ; reconnaître les angles opposés par le sommet, adjacents, supplémentaires | `automatisme`       |
| 2    | Mesurer un angle avec un rapporteur ; tracer un angle de mesure donnée                                                                            | `capacite_attendue` |
| 3 ⭐ | Utiliser la somme des angles d'un triangle (180°) pour calculer un angle manquant                                                                 | `capacite_attendue` |
| 4    | Utiliser les propriétés des angles (opposés, supplémentaires, triangles particuliers) pour calculer ou justifier dans une configuration plane     | `capacite_attendue` |

**Variations canoniques** :

_Rang 1_ — V1.a Angle droit (90°), plat (180°), nul (0°), plein (360°) • V1.b Aigu (< 90°) vs obtus (> 90°) • V1.c Opposés par le sommet • V1.d Adjacents • V1.e Supplémentaires (somme 180°)

_Rang 2_ — V2.a Mesurer (rapporteur, zéro à droite) • V2.b Mesurer (zéro à gauche) • V2.c Tracer un angle de mesure donnée • V2.d Estimer avant mesure (aigu/obtus ?) • V2.e Comparer par mesure ou superposition

_Rang 3 ⭐_ — V3.a Connaître somme angles triangle = 180° • V3.b Calculer l'angle manquant (2 connus) • V3.c Angles d'un triangle isocèle • V3.d Triangle équilatéral (60° × 3) • V3.e Triangle rectangle (90° + 2 complémentaires)

_Rang 4_ — V4.a Angles opposés par le sommet pour déduire • V4.b Angles supplémentaires (alignement) • V4.c Justifier nature d'un triangle par angles • V4.d Problème de calcul d'angles dans configuration combinée • V4.e Reproduire un angle au compas (technique du report)

**Lien** : construction de la bissectrice traitée dans l'item 11 (Constructions, V3.d).

---

### Item 18 — Durées et repérage dans le temps

| Rang | Capacité                                                                                                                      | Rubrique            |
| ---- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| 1    | Lire l'heure (cadran à aiguilles, digital) et connaître les unités de durée (jour, heure, minute, seconde) et leurs relations | `automatisme`       |
| 2    | Convertir entre unités de durée (système sexagésimal : heures, minutes, secondes)                                             | `capacite_attendue` |
| 3 ⭐ | Calculer la durée entre deux horaires ou un horaire à partir d'une durée                                                      | `capacite_attendue` |
| 4    | Résoudre un problème impliquant horaires et durées (avec conversions sexagésimal ↔ décimal)                                  | `capacite_attendue` |

**Variations canoniques** :

_Rang 1_ — V1.a Lire sur cadran à aiguilles • V1.b Sur affichage digital (12h/24h) • V1.c Placer les aiguilles pour une heure donnée • V1.d 1 h = 60 min ; 1 min = 60 s ; 1 jour = 24 h • V1.e Durées usuelles (demi-heure, quart d'heure, année, siècle, millénaire) • V1.f Jours d'une année (365 ou 366 bissextile)

_Rang 2_ — V2.a Heures ↔ minutes • V2.b Minutes ↔ secondes • V2.c Durée mixte (1 h 30 min ↔ 90 min) • V2.d Décimal ↔ sexagésimal (1,5 h ↔ 1 h 30 min) • V2.e Jours/heures/minutes/secondes d'une durée totale

_Rang 3 ⭐_ — V3.a Durée entre deux horaires • V3.b Horaire d'arrivée (départ + durée) • V3.c Horaire de départ (arrivée − durée) • V3.d Durée totale d'une chaîne d'événements • V3.e Passage minuit / changement de jour

_Rang 4_ — V4.a Problème d'emploi du temps (durées en chaîne) • V4.b Conversion décimal ↔ sexagésimal (fluence, vitesse moyenne) • V4.c Comparer des durées en formats différents • V4.d Estimer une durée (vol, traversée) • V4.e Lier durées et autres grandeurs

---

## Thème 6 — Initiation à la pensée informatique

### Item 19 — Programmer

| Rang | Capacité                                                                                   | Rubrique            |
| ---- | ------------------------------------------------------------------------------------------ | ------------------- |
| 1    | Identifier une instruction, une séquence d'instructions, une répétition dans un programme  | `capacite_attendue` |
| 2    | Exécuter une séquence d'instructions à la main ou à l'aide d'un outil (Scratch, robot)     | `capacite_attendue` |
| 3 ⭐ | Produire une séquence d'instructions pour accomplir une tâche imposée (déplacement, tracé) | `capacite_attendue` |
| 4    | Programmer la construction d'un chemin en utilisant entrées, sorties et répétitions        | `capacite_attendue` |

**Variations canoniques** :

_Rang 1_ — V1.a Reconnaître une instruction unique • V1.b Reconnaître une séquence (ordre) • V1.c Identifier entrée et sortie • V1.d Identifier une répétition (« faire 4 fois ») • V1.e Lire un programme Scratch ou pseudo-code

_Rang 2_ — V2.a Exécuter à la main une courte séquence • V2.b À la main avec répétition • V2.c Suivre un programme Scratch et prédire le résultat • V2.d Tracer le résultat sur quadrillage (déplacement) • V2.e Détecter une erreur dans une exécution

_Rang 3 ⭐_ — V3.a Déplacer un robot A → B sans obstacles • V3.b Réaliser une figure simple sur quadrillage • V3.c Compléter un programme à trous • V3.d Corriger un programme erroné • V3.e Traduire un énoncé en séquence d'instructions

_Rang 4_ — V4.a Chemin avec répétitions (boucle « faire N fois ») • V4.b Parcours avec contraintes (obstacles, passages obligés) • V4.c Construction géométrique sur Scratch • V4.d Optimiser un programme (moins d'instructions) • V4.e Comparer deux programmes équivalents

**Outils possibles** : Scratch (programmation par blocs), robots éducatifs, tableur (pour les suites évolutives en lien avec l'item 6 Algèbre).

---

## Métadonnées

```yaml
niveau_scolaire: 6e
cycle: cycle-3
themes_count: 6
items_count: 18 # item 4 (Calcul mental) supprimé — voir note méthodologique
items_numerotation: '1-3, 5-19' # numéro 4 non utilisé (conservation des numéros existants)
capacites_total: 72 # 18 items × 4 capacités
source_principale: BO 2026 cycle 3
source_inspiration: PDF 2016 David ("échelles descriptives connaissance 6")
modele: B
date_structure_validee: 2026-06-08
```

## Documents liés

- **Design doc** : `docs/wip/skills-referentiel-design.md` — architecture du système de compétences (modèle B = décision 57)
- **Progress doc** : `docs/wip/referentiel/6e-savoirs-progress.md` — points en discussion par item, justifications détaillées des choix vs PDF 2016
- **Famille B** : `docs/wip/referentiel/college-competences.md` — référentiel des 6 compétences mathématiques transversales (cadre canonique)
- **Cadre famille B** : `docs/wip/referentiel/cadre_evaluation_six_competences_mathematiques.md`

## Notes

- Tous les libellés sont à affiner en relecture. La validation a porté sur la **structure** (4 capacités ordonnées par item, rubrique, rang ⭐) et les **choix pédagogiques majeurs** (alignement BO 2026, écarts par rapport au PDF 2016).
- Les **variations canoniques** servent de **checklist pour la création des templates de questions**. Pas de stockage DB séparé : la diversité du pool de templates incarne ces variations. Cible : ≥ 2-3 variations distinctes par capacité dans le pool, pour permettre la règle d'acquisition `capacite_attendue` (≥ 2 templates distincts réussis).
- Les **rubriques mixtes** au sein d'un item (typiquement rangs 1-3 en `automatisme`, rang 4 en `capacite_attendue`) sont assumées et conformes au design doc (rubrique portée par la capacité, pas par l'item).
- **Calcul mental — décision 2026-06-08** : l'item 4 « Calcul mental » a été **supprimé du référentiel**. Justifications :
  1. Le BO 2026 6ᵉ ne fait pas du calcul mental un sous-domaine séparé — les automatismes calculatoires sont dispersés dans les sections « Automatismes » de chaque sous-domaine.
  2. La règle d'acquisition `automatisme` du système (≥ 5 réussites + ≥ 3 sur les 5 dernières) **mesure la réussite binaire, pas la fluence** (vitesse, automaticité, charge cognitive réduite) qui définit le calcul mental.
  3. Les contenus calcul mental sont déjà couverts par les items adjacents — créer un item dédié dupliquerait.
  - **Approche retenue** : le calcul mental devient une **modalité d'évaluation timée** (mode test à la « Course aux nombres » déjà existant), applicable à n'importe quelle question d'item, sans constituer un item à part. La conception du mode timed et l'éventuel suivi fluence dédié sont reportés (V2).
- Les **points en discussion** (à reprendre lors d'une relecture critique) sont consignés dans `6e-savoirs-progress.md`.

---
status: en cours
---

# Chantier `points-repere` — placer des points dans un repère (le geste « placer » en 2D)

## Reprendre ici

_Mis à jour le 2026-11-01, phase 0 proposée._

- **État** : relevé fait, phase 0 écrite (§ 3-5), rien de codé.
- **Prochaine action** : réponses de David aux questions du § 5, puis lot 1 (tests rouges d'abord).
- **En attente de David** : Q1 à Q7 (§ 5).
- **Pièges en cours** : un geste ne doit jamais donner la réponse (ni à l'écran, ni dans un attribut lu) ;
  la CI « Client Tests » peut tomber pour l'infra (`wrapDynamicImport`) : lire le log, puis relancer.
- **Worktree / branche** : `ubumaths-wt-points-repere` · `feat/points-repere`.

---

## 1. Origine

Ce chantier suit `solides` (choix de David, 2026-11-01). C'est l'outil manquant que les sessions « questions »
citent le plus : `questions-cm1` (C5 → 136), `questions-cm2` (C5 → 122), `questions-5` (C1 → 128, 095, 114, 089 :
« il sert aussi la 4e et la 3e »), `questions-2de` (Q5 : 316, 445, « placer en 2D plus tard, après
`reponses-a-placer` »). Le geste existe déjà en 1D : la **droite à placer** (` ```line ` + `placer:`, chantier
`reponses-a-placer`, `utils/number-line-placer.ts`, `NumberLinePlacer.svelte`). Ce chantier en fait la version
plan.

**Ce chantier livre le geste** ; les modèles de questions restent aux sessions « questions ».

## 2. Points du programme visés (prod, 2026-11-01)

| Point   | Libellé                                                                                    | Geste                         |
| ------- | ------------------------------------------------------------------------------------------ | ----------------------------- |
| CM1-136 | Recueillir des données et produire un ensemble de points dans un repère pour les présenter | placer (d'après un tableau)   |
| CM2-122 | idem, CM2                                                                                  | placer                        |
| 5-128   | Placer un point de coordonnées données dans un repère orthogonal                           | placer                        |
| 5-095   | Placer dans un repère orthogonal donné des points correspondant à un tableau de valeurs    | placer                        |
| 5-114   | Représenter des données sous la forme d'un graphique cartésien                             | placer                        |
| 5-089   | Représenter une situation de proportionnalité par un tableau ou un graphique               | placer                        |
| 4-063   | Représenter l'expression d'une grandeur en fonction d'une autre par un graphique           | placer                        |
| 3-039   | Utiliser les représentations d'une fonction : formule, graphique, tableau de valeurs       | placer                        |
| 2-316   | Tracer une droite connaissant son équation réduite                                         | tracer une droite (lot 2)     |
| 2-445   | Tracer une droite connaissant son équation cartésienne                                     | tracer une droite (lot 2)     |
| 2-298   | Représenter un vecteur dont on connaît les coordonnées                                     | tracer un vecteur (lot 3, Q5) |

Lire des coordonnées (5-047, 5-096, 2-299) : déjà possible (` ```courbe ` ou ` ```figure ` + case).
Hors chantier : 2-297 (somme de deux vecteurs), 2-324 (parties du plan), CM2-097 (symétrique sur quadrillage).

## 3. Ce que je propose

### Support : `placer:` dans un ` ```courbe ` _(Q1)_

Le bloc ` ```courbe ` a déjà tout le repère : fenêtre `x:` / `y:` indépendantes (repère orthogonal), `grille:`
(pas par axe), `taille:`, des points donnés (`points:`), des courbes. Un repère sans courbe est déjà accepté.
Le geste s'y ajoute comme `placer:` s'est ajouté à ` ```line `, ` ```horloge ` et ` ```barres ` :

```courbe
x: -5 ; 5
y: -4 ; 4
placer: A=(2 ; 3) ; B=(-1 ; 2) ; C=(0 ; -3)
```

### Lot 1 — placer des points

- **`placer:`** : 1 à 6 points nommés `A=(x ; y)` (virgule décimale ou point, variables `{{a}}`) ; un point seul
  peut rester sans nom (`placer: (2 ; 3)`). Mêmes règles de nom que la droite à placer (lettre majuscule, sans
  doublon).
- **Aimant** : le point se pose sur le **nœud de grille le plus proche** (pas de `grille:`, sinon le pas
  automatique). Une cible hors de la fenêtre ou **hors d'un nœud** → erreur au prof (comme une valeur « entre deux
  graduations ») _(Q2)_.
- **Écran** : on touche le repère, le point actif s'y pose ; il se glisse ; toucher un point posé le reprend.
  Avec plusieurs points, une étiquette par point sous le repère (A active au départ, poser un point active le
  suivant non placé), comme la droite à placer. Clavier : flèches = un cran de grille sur chaque axe, Début
  pose le point à l'origine (ou au coin bas-gauche). Pointillés de lecture vers les axes pendant le geste ?
  _(Q6)_
- **Avec le reste du bloc** : courbes, `points:` donnés (noms différents des points à placer), asymptotes
  permis. Les points donnés aident les questions « place D pour que ABCD soit un parallélogramme ».
- **Cases** : **une case par point** (comme la droite à placer), réponse `2;3` ; jugée sur les nombres exacts
  _(Q3)_.
- **Correction** : une phrase par point faux — « Tu as placé A en (3 ; 2). », « Tu n'as pas placé C. » ; quand
  abscisse et ordonnée sont **échangées** : « Tu as placé A en (3 ; 2) : tu as échangé l'abscisse et
  l'ordonnée. » _(Q4)_ ; cadre rouge dès qu'un point est faux, vert si tout est juste ; le repère juste à côté,
  points nommés en vert.
- **Hors question** (cours, aperçu) : le geste est libre, rien n'est jugé. **PDF** : le repère sans les points
  (l'élève fait ses croix) ; corrigé : les points.
- **Accessibilité** : zone focalisable, `aria-valuetext` « point A en (2 ; 3) » ; étiquettes = boutons
  `aria-pressed`. Rien dans le DOM ne porte les coordonnées attendues.
- **Titres d'axes** : CM1-136, CM2-122, 5-114 et 4-063 représentent des **données** (« Durée (min) »,
  « Température (°C) »), ce que ` ```courbe ` ne sait pas encore écrire. Je propose une clé `axes: x = Durée (min) ;
y = Température (°C)`, dans ce lot, utile aussi sans geste _(Q7)_.

| Cas                                                                    | Attendu                                                 |
| ---------------------------------------------------------------------- | ------------------------------------------------------- |
| `placer: A=(2 ; 3)`, élève en (2 ; 3)                                  | juste                                                   |
| idem, élève en (3 ; 2)                                                 | faux, « … tu as échangé l'abscisse et l'ordonnée. »     |
| `placer: A=(2 ; 3) ; B=(-1 ; 2)`, B non placé                          | faux, « Tu n'as pas placé B. »                          |
| `grille: 0,5`, `placer: A=(1,5 ; -0,5)`                                | point sur un nœud, réponse `1.5;-0.5`                   |
| `placer: A=(1,3 ; 2)` sur une grille de pas 1                          | erreur au prof « A n'est pas sur un nœud de la grille » |
| cible hors de la fenêtre                                               | erreur au prof                                          |
| 7 points, nom en double, nom minuscule, point sans nom parmi plusieurs | erreur au prof                                          |
| `points: A(1 ; 1)` et `placer: A=(2 ; 3)`                              | erreur « A est déjà un point donné »                    |
| `case:` écrite par le prof, réponse dans `blanks[]`                    | refusé (comme la droite à placer)                       |
| bloc dans une liste, une case choix, un tableau                        | refusé (premier niveau seulement)                       |
| variables `{{a}}`                                                      | réponse attendue sur l'énoncé résolu                    |

### Lot 2 — tracer une droite (2-316, 2-445)

```courbe
x: -5 ; 5
y: -5 ; 5
tracer: y = 2x - 1
```

- L'élève place **deux points** (sans nom) ; la droite qui passe par eux se dessine aussitôt, d'un bord à
  l'autre de la fenêtre. **Juste si les deux points sont sur la droite et distincts** (toute paire juste est
  acceptée ; le juge ne compare jamais à des points du générateur).
- Écritures : réduite `y = mx + p`, verticale `x = k`, cartésienne `ax + by + c = 0` (coefficients entiers ou
  décimaux, variables). Le bloc refuse une droite qui passe par moins de deux nœuds de la grille dans la fenêtre.
- Réponse de la case : `x1;y1/x2;y2`. Correction : « Ta droite n'est pas celle d'équation y = 2x − 1. » (un seul
  point placé : « Il faut placer deux points. ») ; la droite juste dessous, avec deux de ses points.

### Lot 3 — tracer un vecteur (2-298) _(Q5)_

`tracer: vecteur (3 ; -2)` : l'élève place une origine puis une extrémité (une flèche se dessine) ; juste si
l'extrémité moins l'origine donne (3 ; −2), où qu'il soit. Origine imposée possible (`tracer: vecteur (3 ; -2)
depuis A`, A point donné).

### Ordre des lots (une PR chacun)

1. `placer:` dans ` ```courbe ` (+ `axes:`), écran, juge, correction, PDF.
2. `tracer:` une droite.
3. `tracer:` un vecteur (si Q5 = oui).

## 4. Hors chantier (proposé)

- Somme de deux vecteurs (2-297), parties du plan (2-324), symétrique sur quadrillage (CM2-097).
- Tracer une courbe à main levée, relier des points (le graphique cartésien « relié » de 5-114 : les points
  suffisent pour juger).
- Les modèles de questions : sessions « questions ».

## 5. Questions à David

1. **Support** : `placer:` dans ` ```courbe ` (repère, grille, fenêtre et points déjà là ; une seule convention
   de repère), ou nouveau bloc ` ```repere ` ? _Reco : dans ` ```courbe `._
2. **Aimant** : sur les nœuds de la grille seulement (la précision se règle avec `grille:`, une cible hors nœud
   est refusée au prof), ou position libre jugée avec une tolérance ? _Reco : nœuds de la grille._
3. **Cases** : une case par point (comme la droite à placer : correction point par point), ou une seule case
   pour tous les points ? _Reco : une par point._
4. **Phrase « tu as échangé l'abscisse et l'ordonnée »** quand c'est le cas (l'erreur type de 5-128) ? _Reco :
   oui._
5. **Lots 2 et 3** : tracer une droite (2-316, 2-445) dans ce chantier ; tracer un vecteur (2-298) aussi, ou plus
   tard ? _Reco : les deux dans ce chantier (même geste : deux points posés)._
6. **Pointillés de lecture** vers les axes pendant qu'on pose un point (aide à lire ses coordonnées), ou rien ?
   _Reco : rien (ce serait une aide qui fait le travail de lecture en 5e) ; la position se lit dans
   `aria-valuetext` seulement pour le lecteur d'écran._
7. **Titres d'axes** `axes: x = … ; y = …` sur ` ```courbe `, dans le lot 1 (CM1-136, CM2-122, 5-114, 4-063
   représentent des données) ? _Reco : oui._

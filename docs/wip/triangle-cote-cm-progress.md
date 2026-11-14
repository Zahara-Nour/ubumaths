# Chantier `triangle-cote-cm` — triangle quelconque coté en cm (outils-manquants n° 29)

> Demande de David du 2026-11-14 (n° 29 de [`outils-manquants.md`](outils-manquants.md)). Aujourd'hui
> `verifier: triangle ABC : AC = 4 cm ; BC = 3 cm` est refusé hors du triangle rectangle
> (`construction-parser.ts`, « une longueur en cm ne sert qu'au triangle rectangle ») ; le lot 12 de
> [`questions-6`](../archive/wip/questions-6-progress.md) § 27 passe par des segments à reporter. Point visé :
> 6-173 (exemples de réussite 6e p. 15 : « trois longueurs (si possible), deux côtés et l'angle compris, un côté
> et ses deux angles adjacents »).

## Reprendre ici

_Mis à jour le 2026-11-14, ouverture._

- **État** : phase 0 écrite, **à valider** · **Prochaine action** : réponses de David aux questions Q1-Q7, puis
  tests rouges · **En attente de David** : validation de la phase 0 · **Pièges en cours** : un cercle ouvert sur
  une graduation n'est pas « construit » pour `constructionOf` (`instruments.ts`) : c'est le cœur du travail ·
  **Worktree / branche** : `../ubumaths-wt-triangle-cote-cm` · `feat/triangle-cote-cm`

## Ce qui existe (lu dans le code, 2026-11-14)

- Triangle quelconque (`judgeTriangle`, `questions/construction/triangle.ts`) : [AB] tracé ; longueurs données
  par un segment de la figure (`AC = u`) ou deux points (`AC = PQ`) ; C doit être au **croisement de deux cercles
  construits** (compas ou Report) ; avec un angle : côté d'angle au rapporteur, et C sur ce côté (cercle construit
  ou deuxième côté d'angle).
- Triangle rectangle coté en cm (PR 4 de [`regle-graduee`](../archive/wip/regle-graduee-progress.md), #2499) :
  règle posée en A **avant** le côté, C sur une graduation (`ruledGraduationOf`) ; plusieurs C → faux (Q17) ;
  côté jugé sur le trait vu (Q18) ; refus d'auteur : côté plus long que la règle.
- Cercle de rayon donné en cm (PR 3, #2494) : règle posée au centre avant le cercle, ouverture du compas aimantée
  aux graduations ; « Ton compas est ouvert à l'œil : ouvre-le sur une graduation de la règle. »
- 1 unité de la figure = 1 cm ([ADR 0036](../adr/0036-le-cm-de-la-figure.md)), papier uni seulement.

## Phase 0 (proposée le 2026-11-14, à valider)

Le prof écrit, [AB] déjà tracé dans la figure (6 unités = 6 cm, longueur dite dans l'énoncé) :

```
verifier: triangle ABC : AC = 4 cm ; BC = 5 cm          (trois longueurs)
verifier: triangle ABC : CAB = 50 ; AC = 4 cm           (deux côtés et l'angle compris)
```

« Un côté et ses deux angles adjacents » (`CAB = 50 ; ABC = 60`) marche déjà : [AB] tracé, aucune longueur à
prendre. Rien à faire.

**Nominal**

1. **Trois longueurs** : l'élève pose la règle en A, pique le compas en A, l'ouverture s'aimante à la graduation
   de 4 cm, trace l'arc (ou le cercle) ; de même en B à 5 cm ; place C au croisement ; trace [AC] et [BC] →
   « Juste ». Les deux C (de part et d'autre de (AB)) sont justes.
2. **Deux côtés et l'angle compris** : rapporteur en A, repère à 50°, côté d'angle [Ax) ; puis C à 4 cm de A
   sur ce côté, **au choix** : la règle posée en A le long du côté, C sur la graduation (comme le triangle
   rectangle) ; ou l'arc du compas ouvert à 4 cm sur la règle ; trace [AC] et [BC] → « Juste ».
3. Palette : trois longueurs → Segment · Compas · Règle graduée ; avec l'angle → Segment · Rapporteur · Règle
   graduée · Compas. Report refusé (la longueur se prend sur la règle, pas sur la figure).
4. Correction : la règle posée en A (et en B), les arcs de 4 cm et 5 cm (ou le côté d'angle et la graduation),
   [AC] et [BC] ; comme les PR 3 et 4.

**Limite**

- Papier uni seulement (comme toute longueur en cm).
- Une seule règle posée **avant** le cercle (ou le côté) compte, comme les PR 3 et 4 (pas de faux juste « compas
  ouvert jusqu'à un point visible à 4 cm, règle posée après »).
- Les longueurs en cm au millimètre (3,5 cm, 3 cm 5 mm, 35 mm), comme le triangle rectangle.

**Erreur (message à l'élève)**, dans l'ordre :

- côté manquant, C placé à l'œil (messages actuels du triangle) ;
- compas ouvert à l'œil : « Ton compas est ouvert à l'œil : ouvre-le sur une graduation de la règle. » ;
- mauvaise longueur : « Ton côté [AC] mesure 3,8 cm au lieu de 4 cm. » (Q7) ;
- angle faux (messages actuels) ;
- plusieurs C distincts (un éventail) → « Trace un seul triangle ABC. » (Q17 de `regle-graduee`) ;
- [AC] prolongé au-delà de C → jugé sur le trait vu (Q18).

**Erreur (message au prof)** : triangle impossible (inégalité triangulaire, message actuel) ; côté plus long
que la règle graduée ; un cercle ou C hors de la fenêtre ; cm sur quadrillage ; cm et segment à reporter mêlés.

**Questions (recommandations en premier)**

1. **[AB] déjà tracé** (reco : comme le triangle rectangle coté, Q11 de `regle-graduee` ; l'énoncé dit
   « AB = 6 cm ») ; ou l'élève trace aussi [AB] à la règle (un assemblage segment + triangle, plus lourd).
2. **Mêler cm et segment à reporter** dans un même triangle (`AC = 4 cm ; BC = u`) : refusé (reco : une seule
   façon de prendre les longueurs par question) ; ou admis.
3. **Deux côtés et l'angle : C sur la graduation OU à l'arc du compas**, les deux justes (reco : c'est ce que font
   les élèves) ; ou la règle seule.
4. **Report refusé** dans la palette dès qu'une longueur est en cm (reco) ; ou laissé.
5. **Modèle 6-173** : après l'outil, ajouter au modèle des variations en cm (trois longueurs, deux côtés et
   l'angle) à côté de celles en segments à reporter (reco : le prof garde les deux, le BO écrit en cm) ; ou
   remplacer les segments ; ou ne pas toucher au modèle (chantier à part).
6. **Un seul lot** (reco : parseur, juge, vue, correction, catalogue, doc ; une PR) ; ou trois longueurs d'abord,
   l'angle ensuite.
7. **Message de mauvaise longueur** : dire la mesure, « Ton côté [AC] mesure 3,8 cm au lieu de 4 cm. » (reco :
   comme le segment en cm de la PR 1, l'élève voit de combien il s'est trompé) ; ou garder le message actuel du
   triangle, « Ton côté [AC] n'a pas la bonne longueur. ».

## Journal

- 2026-11-14 : worktree ouvert (`feat/triangle-cote-cm`), code relu (parseur, `triangle.ts`, PR 3 et 4 de
  `regle-graduee`), phase 0 écrite.

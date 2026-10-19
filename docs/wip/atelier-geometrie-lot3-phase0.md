---
title: Atelier — la géométrie, lot 3 (la souris), phase 0
date: 2026-10-19
status: phase 0 VALIDÉE (2026-10-19, « je suis tes recos sur tout ») — M1-M8 selon les recommandations ; à lancer après #1523
---

# Atelier — la géométrie, lot 3 : la souris

Chapeau : [atelier-geometrie-phase0.md](atelier-geometrie-phase0.md) (G0-G7 ; G2 : un geste qui
crée écrit une ligne dans la console, un déplacement n'en écrit pas). Lot 2 (clos le 2026-10-19) :
[atelier-geometrie-lot2-phase0.md](atelier-geometrie-lot2-phase0.md). Journal :
[atelier-geometrie-progress.md](atelier-geometrie-progress.md).

## Le but

Au collège, la figure est le registre **principal** (cadrage, §8) : l'élève construit à la souris
ou au doigt, puis fait bouger sa figure pour voir ce qui reste vrai. Le lot 3 ouvre l'atelier au
collège : **une barre d'outils** dans la vue Géométrie, et **le glisser** des points.

## Ce qui existe (relevé du 2026-10-19)

- `geometry-core/interaction/` : `findPointNear`, `findElementNear` (hit-testing), `snapToGrid`
  (aimantation). `GeometryCanvas` sait faire glisser un point (`movePoint`, `movePointOnCurve`…)
  mais **modifie la `Figure` lui-même**, sans prévenir personne ; dans l'atelier, le glisser est
  coupé (`objectsMovable={false}`, F4 du lot 1).
- L'atelier possède l'état (décision figée n° 1) ; la vue Géométrie en est une projection
  (`syncFigure`, à sens unique). Tout ce qui se crée au clavier existe déjà : points, constructions
  du DSL et raccourcis, `point_sur`, intersections, mesures (lot 2).
- **Annuler / rétablir** (lot 5 de la refonte, #1517) : `atelier.step('libellé', fn)` fait une
  étape ; la PR 2 de ce lot ajoute la fin de glissé d'un curseur (`point_sur` compris).
- **Fin de geste** (#1518, PR 2 du lot 5) : les écritures d'un même geste se fondent en une étape
  — `atelier.step(label, fn, clé)` à chaque cran avec la MÊME clé, puis `atelier.endGesture()` au
  relâchement ; un geste revenu à son point de départ ne laisse rien (`src/lib/atelier/gesture.ts`).
  Au clavier : un appui = une étape, une flèche tenue = une étape (keydown écouté en capture :
  bits-ui valide à chaque keydown). Le curseur de position d'un `point_sur` (`slidePosition`, dans
  `FigureCard`) est déjà branché ainsi : le glisser d'un point à la souris fera de même.
- **Performance** (#1513) : un recalcul complet de l'atelier coûte ~3 ms (node) et un cran de
  curseur ~13 ms (Chromium, rendu compris) sur une figure de 24 objets.

## Questions — toutes tranchées par David le 2026-10-19 (recommandations retenues)

### M1 — Le glisser : qui tient la position pendant le geste ? (architecture)

- **(a) L'atelier à chaque mouvement** (limité à une fois par image) : la position du point est
  réécrite dans sa définition, tout se recalcule — mesures, cartes, Graphe, Données — **pendant**
  le geste ; une seule étape d'annulation pour tout le glisser. Possible depuis #1513 (13 ms par
  mise à jour sur 24 objets).
- **(b) La figure seule pendant le geste**, l'atelier au relâcher : plus léger, mais pendant le
  geste les mesures et les cartes ne bougent pas — l'élève ne voit pas l'aire changer en déplaçant M.

**Reco : (a).** Elle garde une seule vérité (décision n° 1) et c'est ce qui fait l'intérêt
pédagogique (voir la mesure varier en direct). Objectif mesuré : moins de 16 ms par mouvement sur
la figure de 24 objets ; au-delà, repli sur (b) pour ce seul geste.

### M2 — Ce qui se glisse, et comment la position s'écrit

| Objet                                                     | Au glisser                                                              |
| --------------------------------------------------------- | ----------------------------------------------------------------------- |
| point par coordonnées (`A = (1 ; 2)`)                     | ses coordonnées sont réécrites                                          |
| `point_sur` à position écrite                             | sa position est réécrite (comme son curseur)                            |
| point construit (`milieu`, `intersection`…)               | **ne se glisse pas** ; le curseur le dit (on déplace ce dont il dépend) |
| point dont les coordonnées citent une valeur (`(a ; 2a)`) | ne se glisse pas ; on glisse le curseur de `a`                          |
| droite, cercle, courbe                                    | ne se glissent pas au lot 3 (on glisse leurs points)                    |

**Écriture des coordonnées d'un point glissé** — reco : **aimantation aux entiers** quand on passe
près (`snapToGrid`), sinon **arrondi au dixième** (`(1,3 ; 2)`) : des nombres qu'un élève lit et
réécrit. La grille plus fine viendrait d'un réglage, plus tard.

### M3 — La barre d'outils du lot 3

Reco, dans cet ordre : **Déplacer** (par défaut) · **Point** · **Segment** · **Droite** ·
**Demi-droite** · **Cercle** (centre puis un point) · **Milieu** · **Intersection** · **Point sur
un objet** · **Parallèle** · **Perpendiculaire**. Chaque outil **écrit la ligne qu'on aurait tapée**
(G2) — un clic avec « Point » écrit `A = (1,5 ; 2)`, deux clics avec « Segment » écrivent
`s = [AB]` — donc tout ce qui se fait à la souris se relit, se rejoue et s'annule comme le clavier.
Les mesures restent au clavier (console) au lot 3.

### M4 — Les noms donnés automatiquement

Reco : points **A, B, C…** (première majuscule libre, dans l'ordre de l'alphabet) ; droites, segments, demi-droites **d, d_1, d_2…** ; cercles **c, c_1…**. Modifiables par
« Renommer » (carte). Aucun écrasement d'un nom (invariant).

### M5 — Cliquer près d'un objet existant pendant un outil

Reco (comme dans les logiciels de géométrie) : avec un outil qui attend un point, un clic **près
d'un point existant le réutilise** ; un clic **sur une droite, un segment ou un cercle** crée un
`point_sur` de cet objet ; un clic **à l'intersection de deux objets** crée leur `intersection`.
L'objet visé est mis en évidence au survol. Tolérance : 8 px à la souris, 20 px au doigt.

### M6 — Téléphone et tablette

Reco : mêmes outils au doigt ; glisser un point au doigt ; la vue se déplace à deux doigts (le
glisser d'un doigt sur le fond, avec l'outil Déplacer, déplace la vue). Barre d'outils en bas de la
vue sur un téléphone, en icônes avec infobulle et `aria-label` en français.

### M7 — Annuler, et une construction en cours

Reco : une création = une étape (`atelier.step`) ; **tout un glisser = une étape** ; **Échap** (ou
un second appui sur l'outil) abandonne une construction commencée (le premier point d'un segment
déjà posé reste, comme une création normale). Pendant une construction, un fantôme suit la souris
(segment ou cercle « en cours ») et une phrase dit quoi faire : « Clique sur un deuxième point ».

### M8 — Accessibilité

Reco : la barre d'outils au clavier (motif de barre d'outils ARIA, flèches, comme la barre
d'icônes de l'atelier) ; chaque création est aussi annoncée (la ligne de console écrite) ; un point
sélectionné se déplace aux flèches du clavier (pas de 0,1, Maj : 1). Tout ce qui se fait à la souris
reste faisable au clavier par la console.

## Découpage proposé (après validation)

1. **Le glisser** (M1, M2, M7 pour le glisser) : points par coordonnées et `point_sur`, aimantation,
   une étape par glisser, mesure de la performance.
2. **La barre d'outils, outils de base** (M3, M4, M5 partiel, M7, M8) : Point, Segment, Droite,
   Demi-droite, Cercle.
3. **Outils de construction** : Milieu, Intersection, Point sur un objet, Parallèle, Perpendiculaire
   (M5 complet).
4. **Téléphone et tablette** (M6).

Chaque PR : tests d'abord, revue, vérification à l'écran (souris ET tactile simulé), doc système.
Coordination : la PR 2 du lot 5 de la refonte (fin de glissé du curseur) touche `ValueSlider` ; le
glisser d'un point utilisera la même API d'étape.

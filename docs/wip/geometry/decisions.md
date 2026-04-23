# Geometry-core : decisions d'architecture

> Document de progression pour le projet de geometrie dynamique ubumaths.
> Decisions prises au cours de la session du 2026-04-23.
> Prerequis : lire `docs/wip/geometry/analyse.md` pour le contexte complet.

---

## Table des matieres

1. [Cas d'usage cibles](#1-cas-dusage-cibles)
2. [Decision : rendu SVG](#2-decision--rendu-svg)
3. [Decision : architecture hybride](#3-decision--architecture-hybride)
4. [Decision : dependency graph (observer ameliore)](#4-decision--dependency-graph)
5. [Decision : calcul exact via MathNode / calcul numerique fiable](#5-decision--calcul)
6. [Decision : undo/redo delta-based](#6-decision--undoredo-delta-based)
7. [Decision : tool state machine](#7-decision--tool-state-machine)
8. [Decision : viewport partage avec grapheur](#8-decision--viewport-partage)
9. [Decision : validation d'exercices](#9-decision--validation-dexercices)
10. [Decision : structure de fichiers](#10-decision--structure-de-fichiers)
11. [Decision : priorisation en phases](#11-decision--priorisation)
12. [Prochaines etapes](#12-prochaines-etapes)

---

## 1. Cas d'usage cibles

Par ordre de priorite :

1. **Figures interactives dans les exercices** : drag de points, verification de constructions
2. **Figures statiques dans les enonces** : API declarative pour generer des figures SVG
3. **Validation de figures** : exercices de geometrie interactifs avec correction automatique
4. **Outil de dessin libre** : type GeoGebra simplifie pour l'eleve
5. **Librairie commune** : partage du viewport, export, couleurs avec `grapheur/`

### Un seul outil, pas deux modes

Il n'y a pas de distinction "exploration" vs "exercice". C'est un seul outil de geometrie dynamique. Les outils de construction (point, droite, cercle...) sont actives ou non selon la configuration de l'exercice. Le drag de points libres est toujours disponible.

Le snap sur grille au relachement est optionnel et n'est active que si l'exercice le demande.

### Separation nette avec constructions/

**Decision** : geometry-core ne gere PAS l'animation de constructions.

- `constructions/` est un **lecteur video** de constructions geometriques : timeline, instruments physiques, playback pas-a-pas. Il n'est pas interactif au-dela des sliders.
- `geometry-core` est un **outil interactif** : drag, creation d'objets, dependency graph, validation.

Ce sont deux modules distincts. Les unifier forcerait geometry-core a gerer des concepts d'animation (drawProgress, tempo, timeline) qui n'ont rien a voir avec la geometrie dynamique.

**Ce qu'ils partagent** : le viewport (systeme de coordonnees, pan/zoom) et les utilitaires de rendu (bezier, export). C'est tout.

Si un jour on veut le scenario "animation puis exploration" (l'animation joue, puis les points deviennent draggables), ca se fait au niveau composant Svelte (un wrapper qui affiche d'abord le player constructions/, puis switche vers un canvas geometry-core). Pas besoin que le core sache quoi que ce soit sur les animations.

---

## 2. Decision : rendu SVG

**Choix** : SVG comme rendu principal. Canvas uniquement en option pour les cas denses (lieux de points).

**Justification** (issue de l'analyse de 10 outils) :

- Les cas d'usage educatifs restent < 500 objets (seuil de perf SVG correct)
- L'accessibilite est critique en milieu scolaire (SVG supporte ARIA, Canvas non)
- Le texte LaTeX est omnipresent dans ubumaths (SVG le rend nativement)
- L'export SVG est trivial (clone DOM), necessaire pour enonces PDF
- Le debugging via inspecteur DOM est un avantage majeur en dev
- 7 outils sur 10 analyses utilisent SVG (constructions/, whiteboard/, grapheur/, apigeom, MathGraph32, InstrumenPoche, tldraw)
- Canvas est utilise par DGPad et Excalidraw pour des raisons de perf (>1000 objets) ou de style sketch -- ni l'un ni l'autre ne s'applique ici

---

## 3. Decision : architecture hybride

**Choix** : Coeur fonctionnel pur + Observer pattern pour le dependency graph + Store Svelte 5 pour la couche reactive UI.

**Trois couches** :

| Couche                | Role                                                          | Pattern                                                | Inspiration                            |
| --------------------- | ------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------- |
| Calculs geometriques  | Intersections, transformations, predicats, mesures            | Fonctions pures (pas de side effects)                  | grapheur/ (evaluator, sampler, bezier) |
| Graphe de dependances | Liens parent-enfant entre objets, propagation des changements | Observer pattern (subscribe/notify) avec ameliorations | apigeom (Element2D.subscribe/notify)   |
| UI reactive           | Rendu SVG, toolbar, panels                                    | Svelte 5 runes ($state, $derived)                      | constructions/, whiteboard/, grapheur/ |

**Justification** :

- Le coeur fonctionnel pur est testable unitairement sans framework (prouve par grapheur/)
- L'Observer pattern d'apigeom est simple, explicite, debuggable -- mais on l'ameliore (voir section 4)
- Les runes Svelte 5 sont deja maitrisees dans le projet (3 modules existants les utilisent)

**Ce qu'on ne fait pas** :

- Pas de classes OOP profondes (155 fichiers chez apigeom, 246 chez MathGraph32 -- trop fragmente)
- Pas de machine a etats XState (uiMachine.ts de 168KB chez apigeom -- trop lourd)
- Pas de signals custom (tldraw @tldraw/state -- Svelte 5 runes suffisent)
- Pas de mixins pre-ES6 (DGPad, MathGraph32 -- obsolete)

---

## 4. Decision : dependency graph

**Choix** : Observer pattern inspire d'apigeom, avec 4 ameliorations par rapport a l'original.

**Problemes identifies dans les outils existants** :

| Outil          | Probleme                                                                             |
| -------------- | ------------------------------------------------------------------------------------ |
| apigeom        | Pas de dedup : si un objet a N parents qui changent, il est recalcule N fois         |
| DGPad          | computeAll() O(n) : recalcule TOUT a chaque changement, meme les objets non affectes |
| MathGraph32    | Recalcul manuel : le dev doit penser a appeler recalculer(), oublis faciles          |
| constructions/ | Implicite par ordre de creation : fragile, pas de detection de cycle                 |

**Ameliorations** :

1. **Dirty flags + batch update** : quand un point bouge, on marque ses descendants comme dirty (Set = dedup automatique). Le recalcul se fait une seule fois en fin de frame, pas a chaque notification.

2. **Tri topologique** : les objets dirty sont recalcules dans l'ordre de leurs dependances (algorithme de Kahn). Garantit qu'un parent est toujours a jour avant ses enfants.

3. **Detection de cycles** : a l'ajout d'une dependance, on verifie qu'on n'introduit pas de cycle (DFS). Echec explicite plutot que boucle infinie silencieuse.

4. **Suppression en cascade** : quand on supprime un objet, tous ses descendants sont supprimes automatiquement (comme apigeom Element2D.remove()).

---

## 5. Decision : calcul

C'est la decision la plus structurante. Il y a deux regimes de calcul distincts.

### 5.1. Deux regimes

**Regime exact** : tout ce qui peut etre represente symboliquement sans perte.

- Coordonnees d'un point defini dans un enonce : (3, √2), (1/3, 4/7)
- Milieu de deux points exacts
- Intersection de deux droites definies par des points exacts
- Tout resultat d'operations rationnelles et radicales sur des valeurs exactes
- Calcul d'intersection, transformations, tangentes, etc.

**Regime numerique** : tout ce qui implique un float du navigateur ou une transcendante.

- **Drag interactif** : les coordonnees viennent de clientX/clientY, inutile de payer le cout de l'exact pendant le drag -- on recalcule les dependants en float
- sin(37°), cos(1.5) -- transcendantes
- Lieux de points, echantillonnage, traceurs

**Moment de transition** : pendant un drag, tout est numerique. Au relachement (pointerup), si le point snape sur une position exacte (grille, intersection), on repasse en exact pour lui et ses dependants.

### 5.2. Type de valeur : MathNode

**Choix** : utiliser **`MathNode`** (l'AST de MathAST) comme representation des valeurs exactes.

**Justification** :

- `MathNode` est le type public de MathAST. C'est un AST immutable qui represente n'importe quelle expression mathematique : entier, fraction, racine, somme de radicaux, etc.
- `Rational` et `AlgebraicCoefficient` sont des representations intermediaires internes au pipeline `normalize()` / `denormalize()`. Ils ne sont pas conçus comme API publique.
- MathAST fournit deja `evaluate(node, { mode: 'exact' })` qui simplifie un MathNode en forme canonique, et `evaluate(node, { mode: 'decimal' })` qui donne le float final.
- La comparaison exacte est deja geree : `normalize(a).hash === normalize(b).hash` pour l'equivalence, ou `evaluate(sub(a, b), { mode: 'exact' })` pour verifier si a - b = 0.
- Le rendu LaTeX est deja gere : `toLatex(node)` pour l'affichage.

**Type GeoValue** :

```
GeoValue =
  | { kind: 'exact', node: MathNode }     -- valeur symbolique exacte
  | { kind: 'numeric', value: number }     -- float du navigateur
```

- Les operations (add, sub, mul, div, sqrt) sur deux valeurs `exact` produisent un `exact` (via les operations MathNode + simplification).
- Des qu'un operande est `numeric`, le resultat est `numeric` (propagation).
- La conversion `exact` -> `number` (pour le rendu SVG) se fait une seule fois, le plus tard possible, via `evaluate(node, { mode: 'decimal' })`.

### 5.3. Calcul numerique fiable

Pour le regime numerique, le probleme `0.1 + 0.2 !== 0.3` de JavaScript subsiste. MathAST le resout deja en interne (arithmetique BigInt Rational, conversion float uniquement a la fin), mais pour le regime `numeric` de geometry-core on travaille directement avec des `number`.

**Choix** : pour les comparaisons numeriques, utiliser une tolerance relative.

- Egalite : `|a - b| / max(|a|, |b|, epsilon) < 1e-12`
- Zero : `|a| < 1e-15`
- C'est suffisant pour les cas interactifs (drag, transcendantes). Les cas ou la precision importe vraiment (validation d'exercices, enonces) utilisent le regime exact.

### 5.4. Propagation exacte/numerique

| Parents             | Resultat | Exemple                                       |
| ------------------- | -------- | --------------------------------------------- |
| Tous exacts         | Exact    | Milieu de (0, 0) et (2, √2) = (1, √2/2) exact |
| Au moins un numeric | Numeric  | Milieu de (point draggue) et (0, 0) = numeric |

### 5.5. Astuce pour la validation

Pour verifier "AB = 5" sans perte de precision : comparer AB² = 25 (exact, pas de sqrt) plutot que AB = 5 (qui necessite un sqrt potentiellement inexact).

Plus generalement, les predicats geometriques (parallele, perpendiculaire, collineaire, cocyclique) s'expriment comme des egalites polynomiales (produit vectoriel = 0, produit scalaire = 0, determinant = 0) qui restent exactes sans sqrt.

### 5.6. Modules MathAST utilisables par geometry-core

MathAST n'est pas juste un evaluateur -- c'est une boite a outils complete. Voici les modules pertinents pour la geometrie :

| Module              | API cle                                           | Usage en geometrie                                                                       |
| ------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **eval**            | `evaluate(node, {mode:'exact'\|'decimal'})`       | Conversion MathNode -> nombre pour le rendu SVG                                          |
| **normal**          | `normalize()` -> NormalForm avec hash             | Comparaison exacte (a = b si meme hash)                                                  |
| **solve**           | `solve(equation)` -> solutions exactes (MathNode) | Intersections droite-cercle (quadratique), cercle-cercle, resolution de contraintes      |
| **differentiation** | `differentiate(node, {variable})`                 | Tangentes, normales, pentes exactes                                                      |
| **sign**            | `analyzeSign(expr)`, `findZeros()`                | Orientation (de quel cote d'une droite est un point), sens de parcours                   |
| **matrix**          | `determinant()`, `inverse()`, `matrixMultiply()`  | Transformations affines exactes (composition rotation+translation), test de collinearite |
| **simplify**        | `simplify(node)`                                  | Simplifier les resultats avant affichage                                                 |
| **pattern**         | Pattern matching sur AST                          | Reconnaitre des formes (ex: est-ce une equation de cercle ?)                             |
| **transform**       | Identites trigo, algebriques                      | Simplifier les angles (cos(π/3) = 1/2 exact)                                             |
| **domain**          | Analyse du domaine de definition                  | Verifier qu'une expression est definie (denominateur != 0)                               |

**Exemples concrets** :

- **Intersection droite-cercle** : c'est une equation quadratique. On construit l'equation comme MathNode, on appelle `solve()`, on recoit les solutions exactes avec √ dans le discriminant. Pas de calcul float du discriminant.
- **Rotation exacte de 60°** : `matrixMultiply()` avec cos(π/3) et sin(π/3) comme MathNode donne (1/2, √3/2), pas (0.500000001, 0.866025403).
- **Tangente a un cercle** : `differentiate()` donne la pente exacte comme MathNode.
- **Paralleles** : on peut tester si le determinant de la matrice des vecteurs directeurs est exactement zero via `normalize()`.

**Ce que ca change par rapport aux outils analyses** : apigeom, DGPad, MathGraph32 travaillent tous en float IEEE 754. Aucun n'a d'arithmetique exacte. Avec MathNode, geometry-core sera plus precis que tous les outils de reference.

### 5.7. Performance et regimes de calcul

| Situation                            | Regime                | Pourquoi                                                                   |
| ------------------------------------ | --------------------- | -------------------------------------------------------------------------- |
| Drag interactif (pointerMove)        | **Numerique (float)** | ~60 fps, les coords viennent du navigateur, le cout de l'exact est inutile |
| Relachement apres drag (pointerUp)   | **Exact si snap**     | Si le point snape sur une grille ou intersection, on restaure l'exactitude |
| Creation d'un objet (point, segment) | **Exact**             | Position definie par l'utilisateur ou par calcul                           |
| Calcul d'intersection                | **Exact via solve()** | Solutions exactes avec radicaux                                            |
| Transformation (rotation, symetrie)  | **Exact via matrix**  | Angles remarquables -> valeurs exactes                                     |
| Validation d'exercice                | **Exact**             | La correction ne doit pas dependre d'un epsilon                            |
| Lieux de points, echantillonnage     | **Numerique (float)** | Trop d'operations, perf critique                                           |
| Affichage SVG (rendu final)          | **Float**             | `evaluate(node, {mode:'decimal'})` une seule fois a la fin                 |

Le drag est le seul cas ou on a besoin de 60 fps. Pour tout le reste, le calcul exact est faisable (une intersection = un appel a `solve()`, pas 60 par seconde).

---

## 6. Decision : undo/redo delta-based

**Choix** : stocker des deltas (ajouts, suppressions, modifications) plutot que des snapshots complets.

**Justification** :

| Outil       | Methode                     | Probleme                       |
| ----------- | --------------------------- | ------------------------------ |
| apigeom     | JSON snapshots complets     | Lent avec 100+ objets, memoire |
| whiteboard/ | Snapshots complets (max 50) | Consomme avec images           |
| DGPad       | Lineaire ADD/REMOVE         | Correct mais minimal           |
| tldraw      | **RecordsDiff (deltas)**    | Performant, batching           |
| Excalidraw  | **HistoryDelta**            | Performant, capture modes      |

**Inspiration** : tldraw HistoryManager.

**Principes** :

- Chaque action utilisateur (creer un point, deplacer, supprimer) est capturee comme un delta : `{ added: Map, removed: Map, updated: Map<id, {before, after}> }`
- L'undo applique le delta inverse
- Le batching regroupe plusieurs operations en un seul undo step (ex: creer 2 points + 1 segment = 1 undo)
- Le drag ne cree qu'un seul delta (position avant drag -> position apres drag), pas un delta par pixel

---

## 7. Decision : tool state machine

**Choix** : machine a etats hierarchique legere, inspiree de tldraw (StateNode) mais sans XState.

**Justification** :

- apigeom utilise XState v5 : le fichier uiMachine.ts fait 168KB, c'est inmaintenable
- tldraw utilise des StateNode simples en classes : clair, extensible, pas de dependance
- Chaque outil = une classe avec des etats enfants (Idle, Pointing, Placing...)
- Les transitions sont explicites : `onPointerDown()` retourne `{ to: 'next-state' }` ou `'stay'`

**Outils prevus** (par phase) :

| Phase   | Outils                                                    |
| ------- | --------------------------------------------------------- |
| Phase 2 | Select (idle/dragging), Point, Segment, Line, Circle      |
| Phase 3 | Parallel, Perpendicular, Bisector, Intersection, Midpoint |
| Phase 4 | Angle, Polygon, Arc, Transformations                      |
| Phase 5 | Locus, Graph, Freehand                                    |

---

## 8. Decision : viewport partage avec grapheur

**Choix** : extraire le systeme de viewport du grapheur dans `geometry-core/viewport/`.

**Ce qui est extrait** (100% reutilisable tel quel) :

| Fichier source         | Contenu                                                              | Destination                |
| ---------------------- | -------------------------------------------------------------------- | -------------------------- |
| `grapheur/viewport.ts` | CoordinateTransformer, panViewport, zoomViewport, getViewportMetrics | `geometry-core/viewport/`  |
| `grapheur/bezier.ts`   | curveToSVGPath, catmullRomToBezier                                   | `geometry-core/rendering/` |
| `grapheur/colors.ts`   | FUNCTION_COLORS, getNextColor, isValidColor                          | `geometry-core/rendering/` |
| `grapheur/export.ts`   | prepareSvgForExport, exportAsPng                                     | `geometry-core/export/`    |

**Migration** : grapheur/ re-exporte depuis geometry-core/ (pas de breaking change).

**Ajouts pour la geometrie** :

- `fitViewport(points)` : ajuster le viewport pour contenir tous les objets
- `SpatialIndex` (wrapper RBush) : hit-testing O(log n) au lieu de O(n)

---

## 9. Decision : validation d'exercices

**Choix** : systeme de checks inspire d'apigeom (`check/`), integre avec le regime de calcul exact.

**apigeom a 20 fonctions de check** : checkPoint, checkDistance, checkAngle, checkParallel, checkPerpendicular, etc. On reprend le pattern.

**Principes** :

- Chaque check est une fonction pure : `(construction) -> { valid, message }`
- Un exercice = une liste de checks
- Les checks utilisent le regime exact quand possible (predicats polynomiaux, distance² plutot que distance)
- Les messages d'erreur sont en francais, pedagogiques

**Checks prevus** :

| Check                    | Methode exacte                                                         |
| ------------------------ | ---------------------------------------------------------------------- |
| Point a une position     | Comparer coordonnees exactes                                           |
| Distance AB = d          | Comparer AB² = d² (exact, pas de sqrt)                                 |
| Droites paralleles       | Produit vectoriel = 0 (exact)                                          |
| Droites perpendiculaires | Produit scalaire = 0 (exact)                                           |
| Points alignes           | Determinant = 0 (exact)                                                |
| Angle = α                | Comparer cos(angle) = cos(α) (exact pour valeurs remarquables)         |
| Construction complete    | Verifier que tous les objets attendus existent et satisfont les checks |

---

## 10. Decision : structure de fichiers

```
src/lib/geometry-core/
├── types/
│   ├── primitives.ts        # Vec2, Box, Radians (branded types)
│   ├── elements.ts          # GeoElement union (GeoFreePoint, GeoSegment, ...)
│   ├── geo-value.ts         # GeoValue = exact(MathNode) | numeric(number)
│   └── schemas.ts           # Zod schemas pour serialisation
│
├── graph/
│   ├── dependency-graph.ts  # Dirty flags, topological sort, cycle detection
│   └── construction.ts      # Collection d'objets + factory create()
│
├── compute/
│   ├── geo-arithmetic.ts    # geoAdd, geoSub, geoMul, geoDiv, geoSqrt
│   ├── compare.ts           # geoEqual, geoIsZero (exact puis numeric)
│   └── to-number.ts         # Conversion GeoValue -> float (pour rendu)
│
├── geometry/
│   ├── intersections.ts     # LL, LC, CC
│   ├── transformations.ts   # Rotation, reflexion, translation, homothetie
│   ├── measurements.ts      # Distance, angle, aire, perimetre
│   ├── projections.ts       # Point sur droite/cercle (alpha param)
│   └── predicates.ts        # isParallel, isPerpendicular, isCollinear
│
├── viewport/
│   ├── coordinate-system.ts # Math <-> SVG (extrait de grapheur/)
│   ├── viewport.ts          # Pan, zoom, fit (extrait de grapheur/)
│   └── spatial-index.ts     # RBush wrapper
│
├── rendering/
│   ├── svg-renderer.ts      # GeoElement -> SVG
│   ├── bezier.ts            # Courbes (extrait de grapheur/)
│   └── labels.ts            # Auto-positionnement
│
├── history/
│   └── history-manager.ts   # Undo/redo delta-based
│
├── validation/
│   └── checks.ts            # checkDistance, checkParallel, etc.
│
├── export/
│   ├── svg-export.ts        # Extrait de grapheur/
│   ├── png-export.ts        # Extrait de grapheur/
│   └── latex-export.ts      # Inspire d'apigeom
│
└── tools/
    ├── tool-state.ts        # StateNode base
    ├── point-tool.ts
    ├── segment-tool.ts
    ├── circle-tool.ts
    └── select-tool.ts
```

**Relation avec les modules existants** :

```
geometry-core/viewport/  ←── extrait de grapheur/ (re-export pour compatibilite)
geometry-core/compute/   ←── utilise MathAST (MathNode, evaluate, normalize, solve, matrix, differentiate)
grapheur/                ←── partage viewport, bezier, colors, export
constructions/           ←── module separe, partage uniquement le viewport
whiteboard/              ←── module separe, pas de dependance directe
```

**Ce que geometry-core ne fait PAS** : animation de constructions, timeline, instruments physiques, dessin libre, roughjs.

---

## 11. Decision : priorisation

### Phase 1 : Fondations

- Types de base (GeoValue, GeoElement union, Vec2, Box, branded types)
- Calcul exact via MathNode + calcul numerique fiable
- Dependency graph (observer + topo sort + dirty flags)
- Viewport (extraction de grapheur/)
- Rendu SVG basique (points, segments, cercles)
- Factory create()
- Schemas Zod

### Phase 2 : Exploration interactive (figures avec drag)

- Drag de points libres avec propagation des dependances
- Hit-testing via SpatialIndex (RBush)
- Snap-to (grille, points existants)
- Mode statique pour enonces (pas de listeners, pas d'events)
- API declarative pour creer des figures explorables (enseignant definit les points, segments, etc.)

C'est le mode "exploration" : l'eleve deplace des points, il ne cree rien. Livrable rapidement, utile immediatement pour les exercices simples.

### Phase 3 : Outils de construction (exercices)

- Tool state machine (select, point, segment, line, circle)
- Undo/redo delta-based
- Intersections (LL, LC, CC) via `solve()`
- Transformations (rotation, symetrie, translation, homothetie) via `matrix`
- Points contraints (sur droite, sur cercle avec alpha parametre)
- Validation de figures (checks pour exercices)

C'est le mode "exercice" : l'eleve construit lui-meme. Plus complexe, necessite le toolbox et la validation.

### Phase 4 : Enrichissement

- Nombres dynamiques (distance, angle, aire comme objets)
- Labels auto-positionnes
- Export LaTeX/TikZ
- Expressions dynamiques ($param, textes templates via MathAST)
- Tangentes, normales via `differentiate()`

### Phase 5 : Avance

- Lieux de points
- Graphes de fonctions integres (reutiliser grapheur/)
- Macros utilisateur (MacroDefinition : inputs/outputs/steps, inspire DGPad)
- Coniques

---

## 12. Prochaines etapes

1. **Valider ce document** avec l'utilisateur
2. **Phase 1 - TDD** : proposer les comportements attendus pour chaque module, valider, ecrire les tests, implementer
3. **Extraction du viewport** de grapheur/ comme premiere etape concrete (faible risque, valeur immediate)

---

## Annexe : sources d'inspiration par decision

| Decision              | Source principale                            | Sources secondaires                    |
| --------------------- | -------------------------------------------- | -------------------------------------- |
| SVG                   | Consensus (7/10 outils)                      | -                                      |
| Architecture hybride  | grapheur/ (fonctionnel) + apigeom (observer) | tldraw (ShapeUtil)                     |
| Dependency graph      | apigeom (subscribe/notify)                   | DGPad (parent/child), tldraw (signals) |
| Calcul exact MathNode | MathAST existant                             | -                                      |
| Calcul numerique      | MathAST (Rational BigInt interne)            | -                                      |
| Undo/redo delta       | tldraw (RecordsDiff)                         | Excalidraw (HistoryDelta)              |
| Tool state machine    | tldraw (StateNode)                           | apigeom (XState, a simplifier)         |
| Viewport partage      | grapheur/ (extraction)                       | -                                      |
| Validation exercices  | apigeom (check/)                             | -                                      |
| Alpha parametre       | DGPad                                        | -                                      |
| Branded types         | Excalidraw (Radians, etc.)                   | -                                      |
| Spatial index         | tldraw (RBush)                               | -                                      |
| Types immutables      | whiteboard/ (readonly)                       | Excalidraw                             |
| Schemas Zod           | constructions/ (33 schemas)                  | whiteboard/ (file-format)              |

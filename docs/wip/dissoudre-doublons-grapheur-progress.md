---
title: Dissoudre les doublons grapheur / geometry-core — spécification Phase 0
date: 2026-09-07
status: Phase 0 — spécification, EN ATTENTE DE VALIDATION (aucun code écrit)
scope: src/lib/grapheur/, src/lib/components/grapheur/, src/lib/geometry-core/
---

# Dissoudre les doublons — spécification

Chantier n° 2 de `grapheur-vs-geometry-core.md` §8. Objectif annoncé : **hygiène,
pas d'architecture**. Rien de ce qui suit ne doit changer ce que l'utilisateur voit
— sauf **le lot 1**, et c'est le premier point à trancher.

---

## 0. Ce qui a été vérifié dans le code

| Doublon                    | Grapheur                                                            | geometry-core / mathAST                                                                                 | Vraie dépendance du code grapheur ?                                                                       |
| -------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Échantillonnage de courbes | `grapheur/sampler.ts` — 700 l.                                      | — (c'est geometry-core qui l'importe)                                                                   | **Non** : seul import = `Point`, `SampledCurve`, `Viewport`, tous re-exportés de `geometry-core/viewport` |
| Intersection courbe∩courbe | `grapheur/intersections.ts` — 260 l., numérique                     | `geometry/intersections.ts` `intersectFF` (25 l., symbolique) → `mathAST/analysis/roots.ts` `findRoots` | **Non** : seul import = `Point`, `Viewport`                                                               |
| Pas 1-2-5                  | `GridLines.calculateGridSpacing` + `AxisLines.calculateTickSpacing` | `viewport/grid.ts` `computeGridStep`                                                                    | — 3 implémentations, **3 critères différents**                                                            |

Les deux premiers modules sont donc **purs** : ils ne dépendent de rien du
grapheur. Leur déplacement est mécanique.

---

## 1. Lot GRILLE — ⚠️ ce lot n'est pas de l'hygiène

Les trois implémentations ne calculent pas la même chose :

| Implémentation                                      | Critère                                                                                                                                 |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `viewport/grid.ts` `computeGridStep(ppu)`           | viser **80 px**, borné à [40 ; 200] px ; `minor = major / 5`                                                                            |
| `GridLines.calculateGridSpacing(range)`             | viser **~8 lignes par axe**, indépendamment de la largeur en pixels ; `minor = major / 4` si le multiplicateur est 2 ou 10, `/ 5` sinon |
| `AxisLines.calculateTickSpacing(range, pixelRange)` | garantir **≥ 50 px** entre deux étiquettes ; pas de sous-graduation                                                                     |

Unifier sur `computeGridStep` change donc **la densité affichée**. Exemple mesuré,
SVG 800 × 400, fenêtre `[-10 ; 10]` sur les deux axes :

|                              | Aujourd'hui | Après unification     |
| ---------------------------- | ----------- | --------------------- |
| Lignes majeures verticales   | tous les 2  | tous les 2 (inchangé) |
| Lignes majeures horizontales | tous les 2  | **tous les 5**        |

C'est le comportement _correct_ — un espacement régulier en pixels, pas en unités
mathématiques — mais c'est un changement visible, et il ne relève pas de l'hygiène.

### Options

- **A — une seule heuristique, en pixels.** `computeGridStep(ppu, { targetPx })`.
  `GridLines` passe `transformer.scaleX` et `scaleY` (cible 80 px), `AxisLines`
  passe les siens (cible 50 px). Les deux copies du grapheur disparaissent.
  _Conséquence : densité de grille et d'étiquettes modifiée._
- **B — extraire sans unifier.** Sortir les deux fonctions des `.svelte` vers
  `grapheur/grid-spacing.ts`, critères inchangés. Elles deviennent testables et
  documentées, mais il reste deux heuristiques. _Aucun changement visible._
- **C — hors périmètre.** Ne toucher qu'aux lots 2 et 3.

**Recommandation : A**, parce que le pas en pixels est le seul critère qui a un
sens quand les deux axes ont des échelles différentes — ce qui est justement la
particularité du grapheur. Mais c'est un choix d'affichage, donc il est à toi.

### Comportements attendus (si A)

| #   | Cas                                         | Attendu                                                     |
| --- | ------------------------------------------- | ----------------------------------------------------------- |
| N1  | Fenêtre isotrope                            | Espacement ~80 px sur les deux axes                         |
| N2  | Fenêtre anisotrope (`y` écrasé)             | Chaque axe garde ~80 px ; les cellules ne sont plus carrées |
| N3  | Étiquettes d'axes                           | Jamais moins de 50 px entre deux étiquettes                 |
| L1  | Amplitude nulle                             | Aucune ligne, aucun blocage                                 |
| L2  | Fenêtre dégénérée (pas absorbé en flottant) | Aucune ligne, aucun blocage (garde déjà en place)           |
| L3  | Zoom extrême (1e-300, 1e300)                | Nombre de lignes plafonné par axe                           |
| E1  | `pixelsPerUnit` non fini ou nul             | Renvoie un pas nul, l'appelant n'affiche rien               |

⚠️ `computeGridStep` a un défaut à corriger au passage : si aucun candidat 1-2-5
ne tombe dans [40 ; 200] px, elle renvoie `pow10` sans vérifier — donc un pas hors
de sa propre plage. Trois tests suffisent à le cerner.

---

## 2. Lot INTERSECTIONS — hygiène

**Supprimer** `grapheur/intersections.ts` (260 l. : échantillonnage, changement de
signe, bissection sur des closures) au profit du cœur symbolique déjà partagé.

Consommateurs : `IntersectionPoints.svelte` et `CurveHover.svelte`, tous deux via
`findAllIntersections` + `deduplicateIntersections`.

### Options

- **A — le grapheur appelle `intersectFF` de geometry-core.** Une seule
  implémentation littérale. _Coût : le grapheur se met à dépendre de la couche
  `geometry/` et doit convertir des `GeoValue` en nombres._
- **B — les deux appellent `findRoots` de mathAST.** `intersectFF` n'est déjà
  qu'une enveloppe de 25 lignes autour de `subtract` + `findRoots` ; le grapheur
  écrit la sienne, ~15 lignes, sans `GeoValue`. Deux enveloppes fines, **un seul
  cœur**.

**Recommandation : B.** Le doublon à supprimer est l'algorithme, pas l'enveloppe ;
et le grapheur n'a aucune raison de dépendre de la géométrie pour intersecter deux
courbes. Le couplage reste `grapheur → mathAST`, qui existe déjà.

### Ce que ça apporte, au-delà de la suppression

`findRoots` est exact d'abord, numérique ensuite. Les intersections deviennent
exactes là où elles peuvent l'être — aujourd'hui elles sont toujours approchées.
Exemple : `x²` et `x` se croisent en 0 et 1 exactement.

### Comportements attendus

| #   | Cas                                               | Attendu                                                                     |
| --- | ------------------------------------------------- | --------------------------------------------------------------------------- |
| N1  | `x²` et `x`                                       | Deux intersections, `(0 ; 0)` et `(1 ; 1)`, exactes                         |
| N2  | Trois courbes visibles                            | Toutes les paires traitées, doublons fusionnés                              |
| N3  | Courbe masquée                                    | Ignorée                                                                     |
| L1  | Courbes tangentes (`x²` et `2x-1`)                | L'intersection double en 1 est trouvée (le chemin numérique seul la manque) |
| L2  | Courbes sans intersection                         | Tableau vide, pas d'erreur                                                  |
| L3  | Intersection hors fenêtre                         | Non retournée                                                               |
| L4  | Plus de `MAX_FUNCTIONS_FOR_INTERSECTIONS` courbes | Rien (garde existante conservée)                                            |
| E1  | Expression non compilable                         | Paire ignorée, les autres traitées                                          |

⚠️ À traiter dans le même lot : `mathAST/analysis/roots.ts` `solveExactRoots`
accepte les réponses de `solve()` **sans les vérifier**, exactement comme
`critical-points.ts` le faisait avant la PR #145. La cause racine est réparée,
mais le même garde-fou (`annulsFunction`) y a sa place — sinon les intersections
héritent de la prochaine erreur de `solve()`.

---

## 3. Lot SAMPLER — hygiène pure, et redressement de la dépendance croisée

`grapheur/sampler.ts` est importé **par geometry-core** (`graph/figure.ts:153`,
`rendering/svg-primitives.ts:1383`) : le moteur de bas niveau dépend de
l'application au-dessus de lui. Or le module ne dépend de rien du grapheur.

**Destination proposée : `geometry-core/viewport/sampler.ts`** — c'est là que
vivent déjà `Point`, `SampledCurve` et `Viewport`, ses seuls types.

Surface publique à déplacer telle quelle : `DEFAULT_NUM_POINTS`, `isAsymptote`,
`sampleFunction`, `sampleFunctionAdaptive`, `sampleWithDerivative`,
`ParametricSampleResult`, `sampleParametric2D`, `sampleAtPoints`.

Le test `grapheur/__tests__/sampler-parametric.test.ts` (289 l.) suit.

### Comportements attendus

| #   | Cas                                    | Attendu                                              |
| --- | -------------------------------------- | ---------------------------------------------------- |
| N1  | Les 289 tests existants                | Verts sans modification autre que le chemin d'import |
| N2  | `FunctionCurve` / `SequencePlot`       | Rendu identique                                      |
| N3  | Courbes paramétriques de geometry-core | Rendu identique                                      |
| L1  | Sens des dépendances                   | Plus aucun `geometry-core → grapheur`                |

**Question ouverte** : garde-t-on `grapheur/sampler.ts` en ré-export, comme
`bezier.ts` et `viewport.ts` (14 et 21 l.), ou met-on à jour les 4 importateurs ?
Le ré-export est moins bruyant ; mettre à jour est plus honnête. Le projet a déjà
choisi le ré-export deux fois.

---

## 4. Ordre proposé

1. **Sampler** (aucun risque, redresse la dépendance croisée) → PR
2. **Intersections** (comportement amélioré, tests à écrire d'abord) → PR
3. **Grille** (seulement si l'option A ou B est validée) → PR

Trois PR séparées : le lot 2 change des résultats, le lot 3 change l'affichage.
Les mélanger rendrait un éventuel retour en arrière pénible.

## 5. Hors périmètre

- Le repère isotrope de `GeometryCanvas` (chantier 3, décision d'architecture).
- Le statut `no-solution` renvoyé par `quadraticSolver` quand il ne sait pas lire
  les coefficients (formulation trompeuse, signalée en PR #145).
- Les exporteurs partiels de geometry-core (§5.3, mis de côté par David).

## 6. Décisions attendues avant tout code

1. **Grille** : option A (unifier en pixels, densité modifiée), B (extraire sans
   unifier, rien ne bouge à l'écran) ou C (hors périmètre) ?
2. **Intersections** : option A (le grapheur appelle geometry-core) ou B (les deux
   appellent mathAST) ?
3. **Sampler** : `grapheur/sampler.ts` devient un ré-export, ou on met à jour les
   4 importateurs ?

# B3 — `intersection(c1, c2)` paramétrique (LIVRÉ 2026-05-02)

> Roadmap source : `docs/wip/geometry/parametric-curves-v1-progress.md`
> B1 tangente livrée : `docs/wip/geometry/tangente-parametric-progress.md`
> B2 point_sur livré : `docs/wip/geometry/point-sur-parametric-progress.md`

## Spec validée (Phase 0 — 2026-05-02)

### Surface API

```
P = intersection(c1, c2)       # 1er point d'intersection (k=1 par défaut)
Q = intersection(c1, c2, 2)    # 2e point
R = intersection(c1, c2, 3)    # k-ème point ; null si k > nb intersections
```

Pattern uniforme déjà utilisé pour LQ, QQ, LF (pattern existant à étendre).

### Décisions tranchées

| #   | Question   | Décision                                                 | Rationale                                                |
| --- | ---------- | -------------------------------------------------------- | -------------------------------------------------------- |
| Q1  | Scope V1   | Paramétrique × paramétrique uniquement (polaire incluse) | Lean ; lines/circles/fonctions en V2                     |
| Q2  | Ordre      | tri lexico `(t1, t2)` croissant                          | Prévisible, lié à la paramétrisation de c1               |
| Q3  | Doublons   | `ε = (range_t1)/1000`                                    | Seuil relatif robuste à différentes échelles             |
| Q4  | Dégénérés  | Aucune gestion spéciale (Newton skippe les J singuliers) | Pas de scope creep                                       |
| Q5  | Réactivité | Recalcule from scratch (pas de warm-start V1)            | Acceptable hors hot loop ; B3 V2 plus tard si nécessaire |
| Q6  | Helper     | Nouveau fichier `graph/parametric-intersection.ts`       | Cohérent avec `parametric-newton.ts` (B2 V2)             |

### Algorithme

Système non-linéaire 2D : `F(t1, t2) = γ1(t1) − γ2(t2) = (0, 0)`.

- **Newton 2D** :
  - `J = [γ1'(t1) | −γ2'(t2)]` (matrice 2×2)
  - `Δ = −J⁻¹·F` (inverse 2×2 trivial)
  - Skip start si `|det(J)| < 1e-10`
- **Multi-start** : grille 8×8 sur `[t1_min, t1_max] × [t2_min, t2_max]` = 64 starts
- **Convergence** : `‖F‖ < 1e-8`, max 20 itérations
- **Clamp** : t1, t2 finaux clampés à `[t_min, t_max]`
- **Dédoublonnage** : ε relatif au range
- **Tri** : `(t1, t2)` lexicographique croissant

### Comportements validés

1. **Détection** : `intersection(c1, c2, [k])` avec `c1`, `c2` de type `parametricCurve` → branche paramétrique
2. **k optionnel** : k=1 par défaut (1er point). k > nombre d'intersections → `getPosition` retourne null
3. **Réactivité** : `dependsOn = [c1Id, c2Id]` ; recalcule à chaque dirty
4. **Sérialisation** : `P = intersection(c1, c2, k)` (k omis si =1)

### Erreurs DSL francophones

- `intersection(c1, c2, k)` avec `k < 1` ou `k` non entier → erreur de type standard
- `intersection(c1, c2)` avec un argument non paramétrique → branche existante (LQ, QQ, etc.)

## Plan d'exécution

| Phase | Description                                             | Agent             | Statut |
| ----- | ------------------------------------------------------- | ----------------- | ------ |
| 0     | Spec validée + doc                                      | (interactif)      | ✅     |
| 1     | Tests TDD red-first (`intersection-parametric.test.ts`) | test-automator    | ✅     |
| 2     | Implémentation : helper Newton 2D + type + builtin      | backend-developer | ✅     |
| 3     | Code review + edge cases                                | code-reviewer     | ✅     |
| 4     | Démos + doc + commit                                    | (direct)          | ✅     |

## Architecture envisagée

| Fichier                                      | Changement                                                                          |
| -------------------------------------------- | ----------------------------------------------------------------------------------- |
| `types/elements.ts`                          | Nouveau `GeoIntersectionParametric { curve1Id, curve2Id, k, dependsOn }`            |
| `graph/parametric-intersection.ts` (nouveau) | Helper `findParametricIntersections(c1, c2, sb1, sb2, config?)` retourne array trié |
| `graph/figure.ts`                            | `createIntersectionParametric(c1Id, c2Id, k, options)`                              |
| `graph/compute-position.ts`                  | Branche `intersectionParametric` qui appelle le helper et extrait le k-ème          |
| `dsl/builtins.ts`                            | Branche dans `case 'intersection'` quand les 2 args sont paramétriques              |
| `dsl/serializer.ts`                          | `P = intersection(c1, c2, k)`                                                       |
| Tests                                        | `intersection-parametric.test.ts` ~12-15 tests                                      |
| Démos                                        | parametric/polar : Lissajous × Lissajous, ellipse × ellipse, paramétrique × polaire |

## Tests à NE PAS casser

- `intersection-l*.test.ts`, `intersection-q*.test.ts`, etc.
- B1 tangente, B2 point_sur paramétriques

## Critères de succès

- ≥ 12 tests passent dans `intersection-parametric.test.ts`
- 0 régression sur `pnpm test:server src/lib/geometry-core/`
- Démo : 2 ellipses se croisent → 4 points correctement ordonnés

## Journal

### 2026-05-02 — Phase 0 ✅

- Spec validée (6 décisions Q1-Q6, Lean V1)
- Doc créée

### 2026-05-02 — Phase 1 ✅

- Fichier créé : `intersection-parametric.test.ts` (13 tests)
- Sections A/B/C/D/E/F : nominal × paramétrique, polaire, mixte, k hors range, réactivité, sérialisation
- 13/13 rouges (red-first validé)

### 2026-05-02 — Phase 2 ✅ Implémentation

- `types/elements.ts` : nouveau `GeoIntersectionParametric { curve1Id, curve2Id, k, dependsOn }` + helper `isIntersectionParametric`
- `graph/parametric-intersection.ts` : nouveau fichier avec `findParametricIntersections` (Newton 2D multi-start 8×8) + `IntersectionConfig`
- `graph/figure.ts` : factory `createIntersectionParametric` + override `getPosition` pour live-compute
- `graph/compute-position.ts` : branche `intersectionParametric` avec resolveScalarParam pour bornes + scalar bindings
- `dsl/builtins.ts` : branche détection `parametricCurve × parametricCurve` AVANT le rejet implicit-curve. Erreurs francophones pour k invalide et mixed types.
- `dsl/serializer.ts` : émet `intersection(c1, c2)` si k=1, `intersection(c1, c2, k)` sinon

**Décisions clés**

- Live computation dans `getPosition` (pas de cache) pour réactivité immédiate sur slider sans appel explicite à `recompute()`
- Symmetric averaging `(p1 + p2)/2` après convergence Newton (réduit erreur résiduelle)
- Sort BEFORE dedup pour garder le représentant canonique (plus petit (t1, t2)) lors de doublons
- Mixed types parametric × non-parametric : erreur explicite V1 (V2 future)

### 2026-05-02 — Phase 3 ✅ Code review + edge cases

**Code review** (code-reviewer) — Verdict : ✅ Ready to merge (7 issues)

- **Issue 1 (Important)** : descendants d'une intersection peuvent être stale sans `recompute()` explicite → **documenté** comme limitation V1 dans le commentaire de `getPosition`
- **Issue 2 (Important)** : doc `newtonStep` désynchronisée du code → **fixé** (commentaire mis à jour)
- **Issue 3 (Minor)** : pas de garde `c1 === c2` → **fixé** : erreur DSL `les deux courbes doivent etre distinctes`
- **Issues 4-7** : suggestions documentées (dedup O(n²) acceptable, step damping V2, acceptanceTolerance unit, etc.)

**3 edge cases ajoutés (section G)**

- G1 : `intersection(c, c)` même courbe → erreur DSL
- G2 : `k = 0` → erreur DSL
- G3 : `k = 1.5` (non-entier) → erreur DSL

### 2026-05-02 — Phase 4 ✅

**Démos**

- `parametric/+page.svelte` : 2 nouvelles (ellipses orthogonales 4 points, Lissajous × cercle)
- `polar/+page.svelte` : 1 nouvelle (cardioïde × cercle polaire)

**Final QA**

- 16/16 tests dans `intersection-parametric.test.ts` (13 + 3 edge cases)
- 2896/2898 tests passent dans geometry-core (2 skipped, 0 régression)
- ESLint clean

### Restant (post-B3)

- **B3 V2** : `intersection(c, droite)`, `intersection(c, cercle)`, `intersection(c, fonction)` — Newton 1D plus simple → **EN COURS**
- **C** : géométrie différentielle (longueur, courbure, cercle osculateur) ~1.5 j

---

## V2 — Intersection paramétrique × autres types (LIVRÉ 2026-05-02)

### Spec validée

**Scope V2** : 3 nouvelles combinaisons (paramétrique × droite, × cercle, × fonction) traitées par Newton 1D.

| Combo                   | Algorithme Newton 1D                        |
| ----------------------- | ------------------------------------------- |
| paramétrique × droite   | `cross(γ(t) − P, v) = 0`                    |
| paramétrique × cercle   | `‖γ(t) − center‖² − r² = 0`                 |
| paramétrique × fonction | `γ_y(t) − f(γ_x(t)) = 0`, filtre x ∈ domain |

**Hors scope V2** : segment/demidroite (clipping supplémentaire), quadraticCurve (conics — l'utilisateur peut convertir en paramétrique).

### Décisions tranchées

| #   | Question         | Décision                                                      |
| --- | ---------------- | ------------------------------------------------------------- |
| Q1  | Auto-swap        | Oui (line × parametric et parametric × line équivalents)      |
| Q2  | Newton 1D config | 16 starts, 20 iter, tol 1e-8                                  |
| Q3  | Helper           | Nouveau fichier `parametric-intersection-1d.ts`, 3 fonctions  |
| Q4  | Fonction domaine | Filtre `γ_x(t) ∈ [xMin, xMax]` après convergence              |
| Q5  | Cercle types     | Extract center+radius pour `circleByRadius`/`Point`/`3Points` |
| Q6  | Commit groupé    | 3 combos en 1 commit                                          |

### Implémentation

- `types/elements.ts` : 3 nouveaux types `GeoIntersectionParametric{Line,Circle,Function}`
- `graph/parametric-intersection-1d.ts` : nouveau fichier avec helper `newtonMultiStart` partagé + 3 wrappers `findParametricLineIntersections`/`Circle`/`Function`
- `graph/figure.ts` : 3 factories + extension du `getPosition` override (live-recompute pour ces types)
- `graph/compute-position.ts` : 3 branches live + helper partagé `buildCurveBindings`
- `dsl/builtins.ts` : dispatch V2 AVANT V1 avec auto-swap. `isDroiteOnly` strict (pas segment/demidroite). Élargissement scope mineur : support `x_min=`/`x_max=` named args dans `courbe()` cartésien (rewrite vers `sur [a;b]`).
- `dsl/serializer.ts` : 3 cases canoniques `intersection(c, line/circle/fn[, k])`

### Code review (8 issues, 3 fixées)

- **Issue 1 (Important)** : spatial dedup hard-coded `1e-3` → **fixé** : relatif à `acceptanceTolerance × 1000` (scale automatiquement avec la figure)
- **Issue 3 (Important)** : evaluator non-réentrant non documenté → **fixé** : commentaire explicite sur `makeCurveEvaluator`
- **Issue 8 (Suggestion)** : `speed2 < threshold` mismatch units → **fixé** : compare `‖v‖` (linear) au lieu de `‖v‖²`
- Issues 2, 4, 5, 6, 7 : cosmétique / non-bloquant

**2 edge cases ajoutés (section H)**

- H1 : `x_min`/`x_max` + `sur [a;b]` simultané → erreur DSL
- H2 : dedup spatial scale relatif (test micro-scale)

### Démos

- `parametric/+page.svelte` : 3 nouvelles (ellipse × droite, ellipse × cercle 4 pts, cercle × parabole)

### Tests

- 18/18 dans `intersection-parametric-mixed.test.ts` (16 + 2 edge cases)
- 2914/2916 tests geometry-core (2 skipped, 0 régression)
- ESLint clean

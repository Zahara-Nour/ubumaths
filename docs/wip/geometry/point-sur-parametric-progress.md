# B2 — `point_sur(c, t)` sur courbe paramétrique/polaire (LIVRÉ 2026-05-02)

> Roadmap source : `docs/wip/geometry/parametric-curves-v1-progress.md` section "B. Builtins associés au paramétrique"
> Polaire V2 livrée : `docs/wip/geometry/parametric-polar-progress.md`
> Tangente paramétrique B1 livrée : `docs/wip/geometry/tangente-parametric-progress.md`

## Spec validée (Phase 0 — 2026-05-02)

### Surface API

```
P = point_sur(c, t0)
```

- `c` : courbe paramétrique ou polaire
- `t0` : number, scalar, ou slider (obligatoire — pas de défaut)
- `P` : point à coordonnées `γ(t0)`, **non draggable en V1**

### Décisions tranchées

| #   | Question                   | Décision                                              | Rationale                                                   |
| --- | -------------------------- | ----------------------------------------------------- | ----------------------------------------------------------- |
| Q1  | Drag                       | **Non en V1 (Lean)** — V2 séparée plus tard si besoin | Débloque `lieu()` rapidement ; drag = travail séparé        |
| Q2  | Slider drag couplé         | Non                                                   | Slider drive `t`, drag inutile                              |
| Q3  | t hors `[t_min, t_max]`    | Pas d'erreur (cohérent avec autres `point_sur`)       | Évalue les compileds en extrapolation, comportement attendu |
| Q4  | `lieu(point_sur(c, t), t)` | Test explicite dans la suite                          | But principal de B2                                         |

### Comportements validés

1. **Détection branche** : `point_sur(c, ...)` avec `c` de type `parametricCurve` → branche paramétrique
2. **Position** : calculée live via `evalParametricAtT(curveId, t, figure)` (helper introduit en B1)
3. **Réactivité** :
   - `t` numérique → position fixe
   - `t = s` slider → `dependsOn` contient `[curveId, sId]` ; le slider drive le point
   - `t = scalar` → idem mais lecture seule
4. **Rendu** : cercle classique au point γ(t0). Pas de drag handler V1.
5. **Sérialisation** : `P = point_sur(c, t0)` reproductible. Si `t0` est slider, sérialisé symboliquement.

### Erreurs DSL francophones

- `point_sur(c)` (1 arg, pas de t) sur courbe paramétrique → `point_sur(): paramètre t requis pour une courbe paramétrique`
- `point_sur(point, ...)` → message existant déjà
- `t0` non résolvable en numeric/scalarRef → erreur de type standard

## Plan d'exécution

| Phase | Description                                                      | Agent             | Statut |
| ----- | ---------------------------------------------------------------- | ----------------- | ------ |
| 0     | Spec validée + doc                                               | (interactif)      | ✅     |
| 1     | Tests TDD red-first (`point-sur-parametric.test.ts`)             | test-automator    | ✅     |
| 2     | Implémentation : type + factory + builtin + canvas wiring        | backend-developer | ✅     |
| 3     | Code review + edge cases + `lieu(point_sur(c, t), t)` validation | code-reviewer     | ✅     |
| 4     | Démos + doc + memory + final QA                                  | (direct)          | ✅     |

## Architecture envisagée

- **Nouveau type** `GeoPointOnParametricCurve` :
  ```ts
  {
    type: 'pointOnParametricCurve',
    parametricCurveId: string,
    t: ScalarParam,           // number ou scalarRef pour réactivité
    draggable: false,         // V1 : pas de drag
    dependsOn: readonly string[]
  }
  ```
- **Factory** `figure.createPointOnParametricCurve(curveId, t, options)` retourne `pointId`. Évalue `γ(t0)` à la création (cache `position`).
- **Builtin** : nouvelle branche dans `case 'point_sur'` après `function`, avant le throw final
- **Sérialiseur** : nouveau case `pointOnParametricCurve` produit `P = point_sur(c, t0)`
- **Canvas wiring** : `compute-position.ts` calcule la position live ; `GeometryCanvas` rend un cercle à cette position
- **Réutilisation** : `evalParametricAtT` (helper privé de `svg-primitives.ts`) — peut-être à exposer ou recréer dans `compute-position.ts`

## Tests à NE PAS casser

- `tests` existants pour `point_sur` (segment, line, circle, function, quadratic, arc)
- `lieu()` existant (segment/circle/function comme conducteurs)
- `tangente()` paramétrique (B1)

## Critères de succès

- ≥ 12 tests passent dans `point-sur-parametric.test.ts`
- 0 régression sur `pnpm test:server src/lib/geometry-core/`
- `lieu(point_sur(c, t), t)` produit un GeoLocus valide pour une courbe paramétrique
- Démo polar : `lieu` d'un milieu glissant sur une cardioïde via `point_sur`

## Journal

### 2026-05-02 — Phase 0 ✅

- Spec validée (Option A Lean, Q1=no drag, Q2=no slider drag, Q3=pas d'erreur, Q4=lieu test)
- Doc créée

### 2026-05-02 — Phase 1 ✅

- Fichier créé : `point-sur-parametric.test.ts` (14 tests)
- Sections : A nominal parametric (3), B nominal polar (2), C reactivity (3), D errors (2), E serialization (2), F lieu (2)
- **Red-first validé** : 13/14 échouent (1 vert non-régression D2 sur segment)

### 2026-05-02 — Phase 2 ✅

**Implémentation (backend-developer Opus)**

- `types/elements.ts` — `GeoPointOnParametricCurve { type, parametricCurveId, t: ScalarParam, draggable: false (literal), dependsOn }` + helper `isPointOnParametricCurve` + ajout dans `GeoPointElement`/`GeoElement`
- `graph/figure.ts` — factory `createPointOnParametricCurve(curveId, tValue, options)`. Inclus dans la liste des drivers acceptés par `createLocus`
- `graph/compute-position.ts` — branche live qui résout `t` (via `resolveScalarParam`), injecte les bindings de scalaires depuis `curveEl.dependsOn`, et évalue `compiledX/compiledY`
- `graph/compute-locus.ts` — branche driver `pointOnParametricCurve` avec `mutateDriver: t → numeric(t)`, range depuis `curveEl.tMin`/`tMax` résolu via `scalarValues`
- `dsl/builtins.ts` — branche dans `case 'point_sur'` (avant le throw final) ; erreur DSL `paramètre t requis pour une courbe paramétrique` si `t` manquant
- `dsl/serializer.ts` — case `pointOnParametricCurve` produit `P = point_sur(c, t)` avec `fmtScalarParam` pour le slider symbolique

**Décisions clés**

- Pas d'export de `evalParametricAtT` (rendering→graph coupling évité). Position-only logic dupliquée dans compute-position.ts (~15 lignes), commentée comme "keep in sync"
- `draggable: false` est un invariant de type (literal `false`, pas `boolean`) — toute tentative de set à `true` échouerait au type-check
- Aucune modification de GeometryCanvas nécessaire : le rendu de point standard utilise `figure.getPosition(id)` qui marche grâce à compute-position

### 2026-05-02 — Phase 3 ✅

**Code review** (code-reviewer agent) — Verdict : ✅ APPROVED WITH SUGGESTIONS (6 critiques)

- **Critique 1 (Important)** : Duplication evalParametricAtT non commentée → **Fixé** : commentaire `keep in sync with evalParametricAtT` ajouté dans compute-position.ts.
- **Critique 2 (Important)** : `closed: false` systématique pour pointOnParametricCurve dans compute-locus → **Fixé** : détection révolution complète `Math.abs(tMax - tMin - 2π) < 1e-9` → `closed: true`. Cardioïde sur [0, 2π] est désormais fermée correctement.
- **Critique 3 (Important)** : Dépendances transitives non incluses dans `dependsOn` du point. **Skip** : système marche déjà via cascade dirty propagation (test C3 passe).
- **Critiques 4-5-6** : cosmétique (message fallback, guard redondant, isPointElement architectural). Skip.

**3 edge cases ajoutés (section G)**

- G1 : `t0 = 3π` hors `[0, π]` polaire → extrapolation silencieuse, position correcte (-1, 0)
- G2 : lieu sur cardioïde `[0, 2π]` → premier et dernier points coïncident exactement (closed-revolution)
- G3 : lieu sur cardioïde `[0, π]` → endpoints distincts (`dist > 0.5`), pas fermé

### 2026-05-02 — Phase 4 ✅

**Démos**

- `parametric/+page.svelte` : 2 nouvelles démos (point glissant ellipse, lieu milieu sur courbe paramétrique)
- `polar/+page.svelte` : 2 nouvelles démos (point glissant cardioïde, lieu milieu cardioïde)

**Final QA**

- 17/17 tests dans `point-sur-parametric.test.ts` (14 originaux + 3 edge cases)
- 14499/14499 tests passent (mathAST + geometry-core), 0 régression
- ESLint clean

### Restant (post-B2)

- **B2 V2** : drag du point (Newton multi-start) — phase optionnelle
- **B3** : `intersection(c1, c2)` numérique (Newton multi-start) ~2 j
- **C** : géométrie différentielle (longueur, courbure) ~1.5 j

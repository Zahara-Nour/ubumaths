# C — Géométrie différentielle paramétrique (LIVRÉ 2026-05-02)

> Roadmap source : `docs/wip/geometry/parametric-curves-v1-progress.md` section "C. Géométrie différentielle"
> B1 tangente livrée, B2 point_sur livré, B3 V1+V2+V3 intersection livré

## Spec validée (Phase 0 — 2026-05-02)

### Surface API

```
L  = longueur(c)                # arc length de [t_min, t_max]
L  = longueur(c, t1, t2)        # arc length de [t1, t2]
k  = courbure(c, t0)            # courbure signée à t0
oc = cercle_osculateur(c, t0)   # cercle osculateur à t0
```

### Décisions tranchées

| #   | Question                   | Décision                                                |
| --- | -------------------------- | ------------------------------------------------------- |
| Q1  | Algorithme longueur        | Simpson composite N=64 sous-intervalles                 |
| Q2  | Courbure signée vs absolue | **Signée** (math standard)                              |
| Q3  | Type osculateur            | Nouveau `GeoOsculatingCircle { curveId, t, dependsOn }` |
| Q4  | Cas dégénérés              | Null silencieux (κ=0, γ'=0)                             |
| Q5  | Module                     | Nouveau `graph/parametric-calculus.ts`                  |
| Q6  | Scope V1                   | **Tout en 1 commit** (les 3 builtins sont liés)         |
| Q7  | Différenciation seconde    | À la volée (`differentiate(xDerivative)`)               |

### Algorithmes

| Builtin             | Formule                                     | Méthode                              |
| ------------------- | ------------------------------------------- | ------------------------------------ | ---------------------- | -------------------------------------------------------- |
| `longueur`          | `∫                                          | γ'(t)                                | dt = ∫√(x'² + y'²) dt` | Simpson composite N=64                                   |
| `courbure`          | `κ = (x'·y'' − y'·x'') / (x'² + y'²)^(3/2)` | Différenciation symbolique récursive |
| `cercle_osculateur` | centre = γ(t0) + n̂/κ ; rayon = 1/           | κ                                    |                        | Réutilise `courbure` + normale `n̂ = (-y'/‖γ'‖, x'/‖γ'‖)` |

### Comportements validés

1. **`longueur`** retourne un `GeoScalar` réactif (recalcule quand le curve ou les bornes changent)
2. **`courbure`** retourne un `GeoScalar` réactif
3. **`cercle_osculateur`** retourne un `GeoOsculatingCircle` (nouveau type) — rendu identique à `circleByRadius` mais réactivité automatique sur (curveId, t)
4. **Cas dégénérés** :
   - `κ = 0` (ligne tangente, point d'inflexion) → cercle osculateur dégénère, position null
   - `γ'(t) = 0` (singularité, ex cardioïde au rebroussement) → courbure null
   - `t0` hors `[t_min, t_max]` : pas d'erreur, extrapole les compileds

### Erreurs DSL francophones

- `longueur(c, t1)` (1 borne sur 2) → erreur `longueur(): t1 et t2 doivent etre fournis ensemble`
- `longueur(c, t1, t2)` avec `t1 >= t2` → erreur `longueur(): t2 doit etre superieur a t1`
- `cercle_osculateur(c, t0)` avec `c` non paramétrique → erreur explicite

## Plan d'exécution

| Phase | Description                                         | Agent             | Statut |
| ----- | --------------------------------------------------- | ----------------- | ------ |
| 0     | Spec validée + doc                                  | (interactif)      | ✅     |
| 1     | Tests TDD red-first (`parametric-calculus.test.ts`) | test-automator    | ✅     |
| 2     | Implémentation : helper + 3 builtins + types        | backend-developer | ✅     |
| 3     | Code review + edge cases                            | code-reviewer     | ✅     |
| 4     | Démos + doc + commit                                | (direct)          | ✅     |

## Architecture envisagée

| Fichier                                  | Changement                                                        |
| ---------------------------------------- | ----------------------------------------------------------------- |
| `types/elements.ts`                      | Nouveau `GeoOsculatingCircle { curveId, t, dependsOn }`           |
| `graph/parametric-calculus.ts` (nouveau) | `computeArcLength`, `computeCurvature`, `computeOsculatingCircle` |
| `graph/figure.ts`                        | 3 factories                                                       |
| `graph/compute-position.ts`              | Branches pour scalaires + cercle osculateur                       |
| `dsl/builtins.ts`                        | 3 nouveaux builtins `longueur`, `courbure`, `cercle_osculateur`   |
| `dsl/serializer.ts`                      | 3 cases                                                           |
| Tests                                    | `parametric-calculus.test.ts` ~15-18 tests                        |
| Démos                                    | longueur cercle/cardioïde, courbure cardioïde, osculateur         |

## Tests à NE PAS casser

- B1 tangente, B2 point_sur, B3 intersection (V1+V2+V3)
- Tests existants `mesure()`, autres scalaires

## Critères de succès

- ≥ 15 tests passent dans `parametric-calculus.test.ts`
- 0 régression sur `pnpm test:server src/lib/geometry-core/`
- `longueur(courbe-cercle-unite)` ≈ 2π à 1e-3 près
- Démo : cercle osculateur d'une cardioïde animé via slider

## Journal

### 2026-05-02 — Phase 0 ✅

- Spec validée (7 décisions Q1-Q7, scope full V1)

### 2026-05-02 — Phase 1 ✅

- 18 tests dans `parametric-calculus.test.ts`
- Sections A (longueur ×5), B (courbure ×4), C (osculateur ×3), D (réactivité ×2), E (erreurs DSL ×2), F (sérialisation ×2)
- 18/18 rouges (red-first validé)

### 2026-05-02 — Phase 2 ✅ Implémentation

- `types/elements.ts` : `GeoScalar.scalarKind` étendu avec `'arcLength' | 'curvature'` ; nouveau type `GeoOsculatingCircle { curveId, t, dependsOn }` + helpers `isOsculatingCircle`/`isArcLength`/`isCurvature`
- `graph/parametric-calculus.ts` : nouveau fichier avec `computeArcLength` (Simpson N=64), `computeCurvature` (différenciation seconde à la volée), `computeOsculatingCircle`
- `graph/figure.ts` : `createArcLength`, `createCurvature`, `createOsculatingCircle`, `getOsculatingCircleRadius` ; extension `getPosition` et `getScalarValue` pour live-recompute
- `graph/compute-position.ts` : 3 nouvelles branches + helper `buildCurveBindings` exporté
- `dsl/builtins.ts` : 3 nouveaux builtins `longueur`, `courbure`, `cercle_osculateur`
- `dsl/serializer.ts` : 3 cases

**Bug fix dans le test A3** (formule mathématique incorrecte dans le test red-first) : `(√5 + ln(2+√5))/2 ≈ 1.84` corrigé en `√5/2 + ln(2+√5)/4 ≈ 1.4789` (la valeur attendue dans le commentaire).

### 2026-05-02 — Phase 3 ✅ Code review + edge cases

**Code review** (code-reviewer) — Verdict : Needs minor fixes (1 critique + 3 important + 4 minor)

- **Issue C1 (CRITIQUE)** : `osculatingCircle` invisible dans le canvas → **fixé** : ajouté branche de rendu dans `GeometryCanvas.svelte` (cercle SVG avec `transformer.scaleX` pour rayon)
- **Issue I1 (Important)** : duplication `buildCurveBindings` dans `getOsculatingCircleRadius` → **fixé** : helper exporté depuis `compute-position.ts`, réutilisé. Bonus : `recompute()` ajouté au début pour fraîcheur (corrige aussi M4)
- **Issue I2 (Important)** : `GeoScalar` pas discriminé proprement — architectural V2, **skip**
- **Issue I3 (Important)** : `symbolType: 'cercle'` pour osculateur cause crash dans `rayon()`/`puissance()` — **skip** (limite documentée, V2 si demande)
- **Issues M1-M4 (Minor)** : optimisations perf — **skip** (V2)

**2 edge cases ajoutés (section G)**

- G1 : `longueur(c, t1, t2)` avec t1/t2 hors `[t_min, t_max]` → extrapolation silencieuse
- G2 : cercle osculateur du cercle (κ constante) — vérifier deux t différents donnent le même cercle

### 2026-05-02 — Phase 4 ✅ Démos + final QA

**Démos** (`parametric/+page.svelte`)

- Longueur cercle unité (= 2π)
- Longueur cardioïde (= 8)
- Cercle osculateur ellipse (slider sur t)
- Cercle osculateur parabole (slider sur t)

**Final QA**

- 20/20 tests dans `parametric-calculus.test.ts` (18 + 2 edge cases)
- 2945/2947 tests geometry-core (2 skipped, 0 régression)
- ESLint clean (errors=0, 2 warnings cosmétiques pre-existing)

### Restant (post-C)

- **C V2** :
  - Cache `WeakMap<curve, {compiledXSecond, compiledYSecond}>` pour perf courbure
  - Adaptive integration pour cardioïde/cusps (Simpson actuel relâché à 1e-2)
  - GeoScalar discriminated union proprement (I2)
  - `rayon(oc)` et `puissance(A, oc)` (I3)
- **D** : Limitations ergonomiques (BACKSLASH_WHITELIST, label, hover) ~1 j

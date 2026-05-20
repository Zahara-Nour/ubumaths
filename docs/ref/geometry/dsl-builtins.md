# DSL Builtins — geometry-core

Reference for the geometry-core DSL built-in functions.
All function names use French identifiers (pedagogical language of the application).

---

## angle()

Creates a `GeoAngle` object — a first-class, **visible** geometric angle. The 3-points form is the primary constructor; V2 adds three overloads for vectors, segments and lines (all returning the same `GeoAngle` type and reusing the same rendering / accessors / surcharges).

### Signature

```
α = angle(A, V, B)                                  # 3 points (primary)
α = angle(u, v)                                     # 2 vecteurs       (V2)
α = angle(seg1, seg2)                               # 2 segments       (V2)
α = angle(d1, d2)                                   # 2 droites (acute) (V2)
α = angle(..., marque="arc"|"arcs2"|"arcs3"|"carre"|"aucune")
α = angle(..., orientation="auto"|"direct"|"indirect")
α = angle(..., kind="saillant"|"rentrant")
α = angle(..., showLabel="aucun"|"nom"|"mesure"|"mesure+nom")
α = angle(..., unite="rad"|"deg")
α = angle(..., arcRadiusPx=25)
α = angle(..., arcSpacingPx=6)                      # (V2) spacing between multi-arcs
```

All named arguments are optional, combinable, and accepted on every overload.

- **A** — first side point (p1)
- **V** — vertex (sommit, second argument)
- **B** — second side point (p2)

The angle is measured from the A-side to the B-side going through the interior (saillant) sector by default.

### Default values

| Field          | Default      | Meaning                                                 |
| -------------- | ------------ | ------------------------------------------------------- |
| `marque`       | `'arc'`      | Render a single arc                                     |
| `kind`         | `'saillant'` | Interior sector (<π)                                    |
| `orientation`  | `'auto'`     | Auto-detect CCW vs CW from point positions              |
| `showLabel`    | `'aucun'`    | No label rendered                                       |
| `unite`        | `'rad'`      | Unit for label display when `showLabel='mesure'`        |
| `arcRadiusPx`  | `25`         | Radius of the arc in screen pixels                      |
| `arcSpacingPx` | `6`          | Spacing in px between concentric arcs (`arcs2`/`arcs3`) |

### Examples

```dsl
A = point(3, 0)
O = point(0, 0)
B = point(0, 3)
alpha = angle(A, O, B)
```

```dsl
# Right angle marker
A = point(1, 0)
V = point(0, 0)
B = point(0, 1)
angle(A, V, B, marque="carre")
```

```dsl
# Double arc (marks two equal angles)
angle(A, V, B, marque="arcs2")

# Exterior (reflex) angle
angle(A, V, B, kind="rentrant")

# Show measure in degrees
angle(A, V, B, showLabel="mesure", unite="deg")
```

### Marquages (marque values)

| Value    | Rendered as                             | Replaces (V0)               |
| -------- | --------------------------------------- | --------------------------- |
| `arc`    | 1 concentric arc (default)              | `marque_angle(...)`         |
| `arcs2`  | 2 concentric arcs (equal angles marker) | `marque_angle(..., arcs=2)` |
| `arcs3`  | 3 concentric arcs                       | `marque_angle(..., arcs=3)` |
| `carre`  | Square corner (right angle indicator)   | `angle_droit(...)`          |
| `aucune` | No arc drawn (useful with `showLabel`)  | —                           |

### Surfaces

Rendered on canvas (interactive), SVG export, TikZ export, and Typst export.

### V2 — overloads

Three new constructors share the same `GeoAngle` output as `angle(A, V, B)`. Internally each builds a 3-points triplet (vertex + p1 + p2), with synthetic invisible points created on demand. Named arguments (`marque`, `arcRadiusPx`, `arcSpacingPx`, ...) work on every overload.

#### `angle(u, v)` — 2 vecteurs

Returns the **unoriented** angle between vectors `u` and `v` in `[0, π]`. When both vectors are bound and share the same origin, that point is reused as the vertex (no synthetic points). Otherwise synthetic invisible `freePoint`s are created at `vertex`, `vertex + u`, `vertex + v`.

```dsl
O = point(0, 0)
A = point(1, 0)
B = point(0, 1)
u = vecteur(O, A)
v = vecteur(O, B)
α = angle(u, v)        # vertex = O (réutilisé), mesure = π/2
```

> **Réactivité au drag (A2 + A2.x)** : **pleinement réactif** pour les 4 combinaisons (bound+bound, bound+free, free+bound, free+free). Implémenté via `createTranslatedPointByVector` (V1) et `createFreeVectorPoint` (A2.x, nouveau type `GeoFreeVectorPoint` qui dépend de `vectorId` et lit `vec.anchorX/Y` ou `+dx/dy`). Le drag d'un point bound OU de l'anchor d'un free vector propage à α via le dependency graph.

#### `angle(seg1, seg2)` — 2 segments

Vertex = **shared endpoint** if any, sinon **intersection** des droites support (calculée via `intersectLL`). Les segments parallèles non confondus lèvent `DslRuntimeError` (hint : utiliser `angle(d1, d2)`).

```dsl
V = point(0, 0)
A = point(1, 0)
B = point(0, 1)
s1 = segment(V, A)
s2 = segment(V, B)
α = angle(s1, s2)       # vertex = V (réutilisé)
```

> Pour 2 segments sécants sans extrémité commune, l'intersection est matérialisée via `createIntersectionLL` (réactif au drag des 4 endpoints des segments depuis A2 / v0.9.5). Les segments parallèles lèvent une erreur structurée listant les 4 formes acceptées.

#### `angle(d1, d2)` — 2 droites (convention angle aigu)

Vertex = intersection des 2 droites (via `createIntersectionLL`, réactif au drag des points témoins des droites depuis A2 / v0.9.5). La mesure retournée par `mesure(α)` est dans `[0, π/2]` (convention « plus petit angle »). Les droites parallèles ou confondues lèvent `DslRuntimeError`. Note : le choix p1/p2 pour la convention angle aigu est figé à la construction — la mesure suit le drag mais peut traverser π/2 sans re-swap dynamique.

```dsl
A = point(0, 0)
B = point(1, 0)
C = point(0, 0)
D = point(1, 1)
d1 = droite(A, B)
d2 = droite(C, D)
α = angle(d1, d2)       # mesure = π/4 (acute)
```

> Pour un angle géométrique de 120°, l'overload renvoie **60°** par swap interne sur p2 (`I - unit(d2)` au lieu de `I + unit(d2)`). La représentation reste un triplet de points classique, donc rendu/accesseurs V1 marchent tels quels.

### Notes de réactivité / sérialisation

- **Cache `mesure(A, V, B)` (B2, V2)** — un appel `m = mesure(A, V, B)` réutilise l'angle caché créé pour le même triplet ordonné `(p1, vertex, p2)`. Deux `mesure(A, V, B)` successifs sur le même triplet renvoient donc le **même** `scalarId` (et la même `GeoAngle` interne).
- **Sérialiseur `α → mesure(α)` (B5, V2)** — si tu écris `α = angle(A, V, B); m = mesure(α)`, le sérialiseur émet bien `m = mesure(α)` (et pas `m = mesure(A, V, B)`), préservant le lien explicite sur roundtrip. Pour `mesure(A, V, B)` direct, le fallback 3-points reste émis (l'angle caché auto-généré n'a pas de nom utilisateur).
- **`arcSpacingPx`** — valeur strictement positive requise (`0`, valeurs négatives ou `NaN` lèvent `DslRuntimeError`). Lue par les 3 renderers (SVG, TikZ, Typst).
- **`remplissage` du secteur (V3a)** — quand `marque ∈ {'arc', 'arcs2', 'arcs3'}` et `remplissage="couleur"` (avec optionnel `opacite_fond=N`) sont passés, le secteur angulaire est rempli (path fermé `M V L p1_arc A … p2_arc Z`). `marque='carre'` et `marque='aucune'` ignorent silencieusement `remplissage`. La couleur de remplissage est lue depuis `style.fillColor` standard — pas de champ dédié sur `GeoAngle`.

---

## transporte() — report d'angle au compas

Construit un nouveau `GeoAngle` au sommet `V'` de **même mesure** que `α` (sens conservé), orienté dans la direction spécifiée.

### Signatures

```
β = transporte(α, V')                # direction défaut : axe Ox (1, 0)
β = transporte(α, V', P)             # direction = unit(P − V')
β = transporte(α, V', vec=v)         # direction = unit(v)
β = transporte(α, V', angle=θ)       # direction = (cos θ, sin θ) en mode courant
```

Les 3 modes de direction (3ᵉ arg point, `vec=`, `angle=`) sont **mutuellement exclusifs** — en passer plus d'un lève `DslRuntimeError` listant les sources en conflit.

### Héritage de style

Le nouvel angle hérite de `marque`, `kind`, `orientation`, `showLabel`, `unite`, `arcRadiusPx`, `arcSpacingPx`, couleur et `fillColor`/`fillOpacity` depuis `α`. Tout named arg passé au `transporte()` override l'héritage.

### Exemple

```dsl
A = point(1, 0)
V = point(0, 0)
B = point(0, 1)              # angle AVB = 90°
a = angle(A, V, B, marque="arc", remplissage="rouge")

W = point(5, 0)
T = point(6, 1)              # direction 45° (NE)
b = transporte(a, W, T)      # nouvel angle 90° au sommet W, dans direction WT, marque et fill hérités
```

### Cas dégénérés

- `V'` confondu avec sommet de `α` → `DslRuntimeError` (hint : choisir un autre sommet).
- Direction nulle (vecteur nul, ou `P == V'`) → `DslRuntimeError`.
- `α` plat (mesure = π) ou nul (mesure = 0) : la mesure est préservée telle quelle.

---

## angle_polaire()

Returns a `GeoScalar` — the polar angle of vector **OP** relative to the positive x-axis.

### Signature

```
θ = angle_polaire(O, P)
```

- **O** — origin point
- **P** — target point

Result is in radians, in `[-π, π]`. This replaces the old `angle(O, P)` two-argument form removed in V1.

### Example

```dsl
O = point(0, 0)
P = point(1, 1)
theta = angle_polaire(O, P)  # ≈ π/4 ≈ 0.785 rad
```

---

## mesure() — angle overloads

`mesure()` is polymorphic. For angles, it provides three overloads.

### mesure(α) — measure of an existing GeoAngle

```
m = mesure(α)
m = mesure(α, unite="deg")
m = mesure(α, unite="rad")
```

Returns a reactive `GeoScalar` (invisible). The result is cached on `α.measureScalarId` — two calls with the same `unite` return the same scalar.

```dsl
A = point(3, 0)
O = point(0, 0)
B = point(0, 3)
alpha = angle(A, O, B)
m = mesure(alpha, unite="deg")   # reactive scalar ≈ 90 deg
```

### mesure(A, V, B) — angle between three points

```
m = mesure(A, V, B)
m = mesure(A, V, B, unite="deg")
```

Creates an internal `GeoAngle` with `visible=false` and returns its scalar measure. Equivalent to `mesure(angle(A, V, B))` but without creating a visible arc.

```dsl
A = point(3, 0)
O = point(0, 0)
B = point(0, 3)
m = mesure(A, O, B)  # ≈ 1.5708 rad
```

### mesure(u, v) — angle between two vectors

```
m = mesure(u, v)
```

Returns the unsigned angle between vectors `u` and `v`, in `[0, π]`. Uses `acos((u·v) / (|u||v|))`.

```dsl
u = vecteur(3, 1, couleur="rouge")
v = vecteur(1, 0, couleur="bleu")
a = mesure(u, v)
```

### Refused overloads (throw DslRuntimeError)

```dsl
mesure(u)        # Error: hint "utilise norme(u) pour la longueur d'un vecteur"
mesure(s)        # Error: hint "utilise longueur(s) pour la longueur d'un segment"
```

---

## sommet()

Accessor (pure reference — no element created). Returns the vertex point of a `GeoAngle`.

### Signature

```
V = sommet(α)
```

- **α** — a `GeoAngle` object

```dsl
A = point(3, 0)
O = point(0, 0)
B = point(0, 3)
alpha = angle(A, O, B)
V = sommet(alpha)   # V is O
```

---

## cote()

Accessor (pure reference — no element created). Returns side point p1 or p2 of a `GeoAngle`.

### Signature

```
P = cote(α, 1)    # first side (A in angle(A, V, B))
P = cote(α, 2)    # second side (B in angle(A, V, B))
```

Throws `DslRuntimeError` if index is not 1 or 2.

```dsl
A = point(3, 0)
O = point(0, 0)
B = point(0, 3)
alpha = angle(A, O, B)
P1 = cote(alpha, 1)   # P1 is A
P2 = cote(alpha, 2)   # P2 is B
```

---

## bissectrice() — angle overload

In addition to the three-point form `bissectrice(A, V, B)`, `bissectrice` accepts a `GeoAngle` directly.

### Signatures

```
d = bissectrice(A, V, B)   # existing form
d = bissectrice(α)          # new overload — reads vertex and sides from α
```

Throws `DslRuntimeError` on a flat angle (180°) in both forms.

```dsl
alpha = angle(A, O, B)
d = bissectrice(alpha)
```

---

## rotation() — angle overload

`rotation` accepts a `GeoAngle` as the rotation amount. The rotation reacts to drag of the angle's defining points.

### Signatures

```
P2 = rotation(P, θ, centre=O)      # θ is a scalar or number
P2 = rotation(P, α, centre=O)      # α is a GeoAngle (new overload)
```

```dsl
alpha = angle(A, O, B)
P2 = rotation(P, alpha, centre=O)
```

---

## Migration from V0 builtins

The following builtins were **removed in V1**. Attempting to call them raises `DslRuntimeError`.

| V0 (removed)                      | V1 replacement                     |
| --------------------------------- | ---------------------------------- |
| `marque_angle(P1, V, P2)`         | `angle(P1, V, P2)`                 |
| `marque_angle(P1, V, P2, arcs=2)` | `angle(P1, V, P2, marque="arcs2")` |
| `marque_angle(P1, V, P2, arcs=3)` | `angle(P1, V, P2, marque="arcs3")` |
| `angle_droit(P1, V, P2)`          | `angle(P1, V, P2, marque="carre")` |
| `angle_vecteurs(u, v)`            | `mesure(u, v)`                     |
| `angle(O, P)` (2 args)            | `angle_polaire(O, P)`              |

### Migration script (Supabase)

To migrate existing DSL scripts stored in the `constructions.dsl_script` column:

```bash
# Dry-run (default — shows changes, writes nothing)
npx tsx scripts/migrate-angle-builtins-supabase.ts

# Apply to production
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  npx tsx scripts/migrate-angle-builtins-supabase.ts --apply
```

### Lint check

To verify no source file uses the removed builtins:

```bash
npx tsx scripts/lint-angle-builtins.ts
```

Exit 0 = clean. Exit 1 = occurrences found with file/line details.

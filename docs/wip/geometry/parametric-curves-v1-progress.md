# Courbes paramétriques — V1 (geometry-core)

**Statut V1** : terminée (7 phases, 102 tests TDD verts, 6 commits sur main)
**Statut post-V1** : 3 régressions corrigées (mai 2026) — voir section dédiée
**Module** : `src/lib/geometry-core/`
**Doc de plan** : voir conversation pour spec complète
**Date début** : 2026-05-02

---

## Phase 0 — Spécification (validée)

### Surcharge `courbe()` par nombre d'équations

```
# Existant — 1 équation = cartésien
courbe("y = x^2")
courbe("x^2 + y^2 = 4")

# V1 nouveau — 2 équations = paramétrique
courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=2*pi)

# V2 futur — 1 équation r= = polaire
courbe("r = 2*cos(theta)", theta_min=0, theta_max=pi)
```

### Comportements V1 verrouillés

**Création** : cercle, parabole, cardioïde, Lissajous, avec scalaires/sliders.
**Auto-détection paramètre** : variable libre commune aux 2 RHS, hors {x, y} et symboles définis.
**Échappatoire** : `param="t"` explicite.
**Bornes** : `t_min` / `t_max` strict (pas d'alias `debut`/`fin`).
**Sampling** : adaptatif 2D via ‖(x'(t), y'(t))‖, fallback uniforme si dérivation symbolique échoue.
**Discontinuités** : NaN/Inf → split en sous-paths.
**Courbe fermée** : détectée si dist(P(t_min), P(t_max)) < ε relatif viewport → SVG path fermé.
**Réactivité** : `dependsOn` collecte ids des scalaires/sliders dans x, y, t_min, t_max.

### Erreurs DSL (messages francophones)

| Cas                            | Message                                                    |
| ------------------------------ | ---------------------------------------------------------- |
| 2 strings sans `t_min`/`t_max` | `t_min et t_max obligatoires pour une courbe paramétrique` |
| `t_min ≥ t_max`                | `t_max doit être strictement supérieur à t_min`            |
| Deux équations en `x`          | `il faut une équation en x et une en y`                    |
| LHS ∉ {x, y}                   | `équation invalide : "z" non reconnu (utilise x, y)`       |
| Pas une relation               | `1ère équation invalide : attendu "x = ..." ou "y = ..."`  |
| Variables différentes x vs y   | `paramètre incohérent : "t" en x, "u" en y`                |
| ≥2 vars libres                 | `paramètre ambigu : {a, t} ; précisez param="..."`         |
| Aucune var libre               | `aucune variable de paramètre détectée`                    |
| 1 string + `t_min/t_max`       | `t_min/t_max ne s'applique qu'à une courbe paramétrique`   |

---

## Phases d'exécution

| Phase                                  | Statut                         | Commit     |
| -------------------------------------- | ------------------------------ | ---------- |
| 1 — Type + Factory + Sampler 2D        | terminée (TDD, 34 tests verts) | 2273eccf   |
| 2 — DSL builtin courbe() 2-strings     | terminée (TDD, 30 tests verts) | d99a0522   |
| 3 — Rendu SVG + courbe fermée + UI     | terminée (TDD, 16 tests verts) | 6d23b1a1   |
| 4 — Réactivité (sliders/scalaires)     | terminée (TDD, 4 tests verts)  | ec8791a52  |
| 5 — Exports TikZ/Typst + sérialisation | terminée (TDD, 18 tests verts) | 9c658a48c  |
| 6 — Demo page                          | terminée                       | fb8c57811  |
| 7 — Quality Checks finaux              | terminée                       | en attente |

### Phase 7 — Quality Checks

**Statut** : terminée — 0 régression, 0 erreur dans le périmètre paramétrique.

- `pnpm format` sur tous les fichiers modifiés → tous "unchanged" (prettier déjà appliqué via husky pre-commit hooks).
- `npx eslint` sur les 9 fichiers modifiés/créés → 0 erreur, 0 warning.
- `pnpm check:incremental` → ✓ 1541 FILES, 9 errors filtrés (pré-existantes dans `slides/demo` et `extern/`), exit 0. Aucune erreur introduite par la V1 paramétrique.
- Suite complète `pnpm test:server src/lib/geometry-core/ src/lib/grapheur/` → **2767 passing, 2 skipped (pré-existants), 0 failing** sur 116 fichiers de tests.
- Périmètre paramétrique seul : **102 tests verts** sur 7 fichiers (Phase 1-2-3-4-5).

---

## Résumé final V1

**102 tests** ajoutés en TDD red-first, **6 commits** sur `main` :

| #   | Commit      | Phase | Périmètre                                           |
| --- | ----------- | ----- | --------------------------------------------------- |
| 1   | `2273eccf`  | 1     | Type GeoParametricCurve + factory + sampler 2D      |
| 2   | `d99a0522`  | 2     | DSL builtin courbe() 2-strings + auto-détection     |
| 3   | `6d23b1a1`  | 3     | Rendu SVG + détection courbe fermée + canvas branch |
| 4   | `ec8791a52` | 4     | Tests d'intégration réactivité (sliders)            |
| 5   | `9c658a48c` | 5     | Exports TikZ/Typst + sérialisation DSL              |
| 6   | `fb8c57811` | 6     | Demo page (9 exemples)                              |

**Comportements V1 livrés** :

- Création via `courbe("x = ...", "y = ...", t_min=..., t_max=...)` avec auto-détection du paramètre.
- Sampling 2D adaptatif basé sur ‖vitesse(t)‖, fallback uniforme si dérivation symbolique échoue.
- Détection automatique de courbe fermée (path SVG `Z`, fill conditionnel).
- Réactivité : t_min, t_max, et les coefficients de x(t), y(t) peuvent référencer des sliders/scalaires ; le tracé se redessine quand la valeur change.
- Exports TikZ (`\draw plot coordinates`) et Typst (`line(..., closed: true)`) en sampling-based, robustes face aux cas limites.
- Sérialisation DSL round-trip avec préservation des noms symboliques (sliders).
- Page demo `/geometry-demo/parametric` avec 9 exemples : cercle, parabole, cardioïde, Lissajous (3 ratios), cycloïde, spirale d'Archimède, animations slider, ellipse remplie.

**Documents produits** :

- `docs/wip/geometry/parametric-curves-v1-progress.md` (ce fichier — historique complet, post-V1, roadmap, reprise crash).

---

## Post-V1 — Régressions corrigées (mai 2026)

Trois bugs hors plan, découverts en utilisant `/geometry-demo/parametric` une fois la V1 livrée.

### 1. `feat(mathAST): support full lowercase Greek letter alphabet` — `2c1cc1fc5`

**Cause** : le parser custom mathAST ne reconnaissait que 5 lettres grecques (alpha, beta, gamma, theta, pi). `\phi` levait `Invalid backslash sequence`. `phi` nu était tokenisé en multiplication implicite `p·h·i` (avec `i` = unité imaginaire) → variable phi jamais visible côté courbe builtin.

**Fix** : extension à l'alphabet grec lowercase complet (22 lettres, omicron exclu — rendu `o` en LaTeX) :

- `src/lib/mathAST/types.ts` : type `GreekLetter` étendu
- `src/lib/mathAST/parser/types.ts` : `GREEK_COMMANDS`
- `src/lib/mathAST/parser/constants.ts` : `SUPPORTED_GREEK_LETTERS` + type union
- `src/lib/mathAST/custom-generator.ts` : `SUPPORTED_GREEK`
- `src/lib/mathAST/parser/custom/{parser-pratt,parser-rd}.ts` : `GREEK_SYMBOL_MAP`
- `src/lib/mathAST/parser/custom/{tokenizer,pattern-tokenizer}.ts` : `VALID_SYMBOLS`

**Tests** :

- `src/lib/mathAST/parser/__tests__/greek-support.test.ts` mis à jour (UNSUPPORTED_GREEK passe à `varphi/varepsilon/vartheta`)
- `src/lib/geometry-core/dsl/__tests__/dsl-courbe-with-variables.test.ts` : nouveau test `\phi` dans courbe paramétrique
- Demo mise à jour : `"x = \phi*cos(t)"` au lieu de `"x = phi*cos(t)"`

### 2. `fix(geometry-core): inject scalar bindings in parametric curve sampling` — `9279b2b64`

**Cause** : `figure.computeParametricCurveSampling` (figure.ts:3611) ne passait que `{ [param]: t }` à `compiledX/Y/X'/Y'`. Tout slider/scalaire référencé dans `x(t)` ou `y(t)` (ex. `r·cos(t)` avec `r` slider) restait non lié → `compiledX({ t })` retournait NaN → 0 points → courbe invisible. Visible sur l'exemple "Coefficient dynamique" de `/geometry-demo/parametric`.

**Fix** : construction d'un dict `name→value` à partir de `pc.dependsOn` en utilisant le `label` de chaque dépendance, fusionné dans chaque appel de fonction compilée. Pattern identique à `svg-primitives.ts:1361-1367` pour les courbes de fonction.

**Pourquoi ça n'avait pas été détecté en V1** : le test existant `figure-parametric-reactivity.test.ts:84-112` "slider in x(t)/y(t) coefficient rescales the sampled points" itérait `for (const p of before!.points) expect(...)` — quand `points` est vide, la boucle ne lance aucune assertion et le test passe à vide. Test renforcé avec `expect(points.length).toBeGreaterThan(2)` avant l'itération.

### 3. `fix(geometry-core): default fillOpacity to 1 when fillColor is set` — `afb578253`

**Cause** : `resolveStyle` (svg-primitives.ts:90) retournait `fillOpacity ?? 0`. Quand l'utilisateur écrit `remplissage="violet"` sans `opacite_fond=...`, `fillOpacity` valait 0 → fill invisible. Visible sur l'exemple "Courbe fermée — remplissage". Le pattern défensif `?? 0.3` dans certains templates (sectors, etc.) ne déclenchait jamais son fallback puisque 0 n'est pas nullish.

**Fix** : défaut conditionnel `?? (fillColor !== undefined ? 1 : 0)` — préserve le pass-through pour les éléments sans fill, mais affiche fully opaque dès qu'un `fillColor` est explicite.

**Tests** : `src/lib/geometry-core/rendering/__tests__/resolve-style.test.ts` (5 tests, dont vérification de l'override explicite à 0).

---

## Roadmap — prochains développements possibles

Classés par catégorie. Les priorités reflètent le couplage à des cas d'usage concrets identifiés (démo, exercice, demande utilisateur), pas une opinion absolue.

### A. Forme polaire (V2 explicitement prévue)

**Priorité** : HAUTE — déjà spec dans Phase 0 ligne 22.

Surface API visée :

```
# 3e branche du builtin courbe()
courbe("r = 2*cos(theta)", theta_min=0, theta_max=pi)
```

Croquis d'implémentation :

- Détecter en amont : 1 string positionnelle dont la LHS de la relation est `r` → branche polaire.
- Réécriture interne : `x = r(θ)·cos(θ)`, `y = r(θ)·sin(θ)` puis `createParametricCurveFromEquations` avec `param="theta"` (ou `\theta`).
- Bornes : `theta_min` / `theta_max` (et alias `θ_min`/`θ_max` ?) mappés vers `t_min`/`t_max` du moteur paramétrique.
- Décision à prendre : conserver une marque `polar: true` dans le `GeoParametricCurve` pour la sérialisation round-trip ? Sinon le serializer reproduira la forme paramétrique x/y, ce qui est correct mais perd l'intention pédagogique.

Effort estimé : ~1 j TDD (5-10 tests) en réutilisant le pipeline existant.

### B. Builtins associés au paramétrique

**Priorité** : MOYENNE — usages pédagogiques évidents.

- **`tangente(c, t=...)`** — vecteur tangent `(x'(t₀), y'(t₀))`. La dérivation symbolique est déjà calculée et stockée (`xDerivative`, `yDerivative`, `compiledXPrime`, `compiledYPrime`). Reste : nouveau cas dans le builtin `tangente()` quand l'argument est une courbe paramétrique, et rendu (vecteur ou droite). Effort ~1 j.
- **`point_sur(c, t=...)`** — point ancré sur la courbe au paramètre `t`, draggable. Nouveau type d'élément `GeoPointOnParametric` avec `dependsOn = [curveId, scalarRef(t)]`. Coordonnées calculées via les compileds. Drag → résoudre `t` minimisant la distance au curseur (Newton sur `f(t) = (γ(t) - cursor)·γ'(t) = 0`). Effort ~2 j.
- **`lieu(point_sur(c, t), t)`** — driver = point sur courbe paramétrique. À tester : le sous-graphe de `lieu()` recompile-t-il bien quand `t` varie sur sa plage ? Pas de nouveau code attendu si `point_sur` produit un scalaire propre. Effort ~0,5 j (essentiellement test).
- **`intersection(c1, c2)` / `intersection(c, droite)`** numériques — système non linéaire `γ₁(t₁) = γ₂(t₂)` ou `γ(t) = P + s·v`. Newton multi-démarrages sur grille `[t_min, t_max]`. Effort ~2 j.

### C. Géométrie différentielle

**Priorité** : BASSE — pédagogie spécialisée.

- **`longueur(c, t1?, t2?)`** — `∫|γ'(t)| dt`, quadrature numérique adaptative (Gauss-Legendre ou Simpson sur sous-intervalles).
- **`courbure(c, t)`** — `κ(t) = (x'·y'' − y'·x'') / (x'² + y'²)^(3/2)`. Demande la dérivée seconde — soit symbolique via `differentiate(xDerivative, t)`, soit numérique sur les compileds.
- **`cercle_osculateur(c, t)`** — cercle de rayon `1/κ(t)` centré au centre de courbure.

Effort total ~1,5 j si on factorise un module `parametric-calculus.ts` partagé.

### D. Limitations relevées hors V2/V3

**Priorité** : faible mais utile pour ergonomie.

- **DSL tokenizer `BACKSLASH_WHITELIST`** (`src/lib/geometry-core/dsl/tokenizer.ts:27`) ne contient que `pi`. Conséquence : impossible d'écrire `\phi = (1+sqrt(5))/2` ou `\theta = pi/4` comme assignation DSL — seulement `phi`/`theta` (ASCII). À l'intérieur des chaînes d'équations le parser mathAST accepte désormais tout l'alphabet grec. Action : aligner `BACKSLASH_WHITELIST` sur l'alphabet grec, et harmoniser le mapping `\phi`-DSL ↔ `phi`-mathAST (clé symbol-table sans backslash). Effort ~0,5 j.
- **Placement du label** (Phase 3 ligne 245) : centre du viewport + offset (10,−10). Idéal : placer au point de la courbe à `t = (t_min+t_max)/2`, ou à |y| max, ou comme la branche `function` (à `0.85·xMax`). Effort ~0,3 j.
- **Hover / popover / double-clic** (Phase 3 ligne 246) : pas de handler dédié. Ajouter au minimum un popover avec `x(t)`, `y(t)`, et la valeur courante de `t` au survol — utile en démo et en exercices. Effort ~0,5 j.
- **Direct LHS `\theta = ...`** : actuellement `\phi` n'est accepté que dans les chaînes d'équations (côté mathAST). Si on veut `\phi*cos(t)` en RHS d'une assignation DSL hors chaîne (ex. `r = \phi * 2`), il faut que la pipeline math-pure de l'interpréteur (`tryEvaluateAsMathExpr`) reconnaisse les Greek letters DSL → routage parseCustom. À tester : ça marche probablement déjà puisque la slice raw passe directe à `parseCustom`. Effort : 0,1 j (audit + 2 tests).

### E. Robustesse des tests

**Priorité** : MOYENNE — un bug similaire à celui du sampling pourrait se cacher ailleurs.

- **Audit `for-of` vacuous** : grep des tests qui itèrent sur des collections résultantes (`points`, `paths`, `elements`) sans `expect(length).toBeGreaterThan(...)` au préalable. Ajouter l'assertion partout où le test est censé valider que la collection est non vide. Effort ~0,5 j.
- **Test snapshot du SVG path** sur un cas avec `remplissage` mais sans `opacite_fond` : éviter une régression de `resolveStyle.fillOpacity` à 0. Effort 0,1 j.

---

### Phase 6 — Demo page

**Statut** : terminée (test visuel utilisateur recommandé via `pnpm dev -- --port 5175` puis `/geometry-demo/parametric`).

- `src/routes/(public)/geometry-demo/parametric/+page.svelte` — 9 exemples : cercle, parabole, cardioïde, Lissajous (3 ratios), cycloïde, spirale d'Archimède, tracé animé via slider sur t_max, coefficient dynamique via slider, ellipse fermée avec fill.
- `src/routes/(public)/geometry-demo/parametric/+page.ts` — `ssr = false`.
- `src/routes/(public)/geometry-demo/+page.svelte` — carte ajoutée (lien vers la nouvelle demo).

### Phase 4 — Réactivité

**Statut** : terminée (4 tests d'intégration verts).

L'infrastructure réactive était déjà câblée par les phases 1-3 :

- Phase 2 collecte les `dependsOn` des scalaires/sliders dans x(t), y(t), t_min, t_max
- Phase 3 résout `ScalarParam` dynamiquement via `resolveScalarParam` à chaque appel de `computeParametricCurveSampling`
- `figure.moveSlider` met à jour `scalarValues` et `markDirty` pour invalider le graphe

Phase 4 ajoute uniquement les tests d'intégration end-to-end :

- `src/lib/geometry-core/graph/__tests__/figure-parametric-reactivity.test.ts` — 4 tests
  - F-A. Slider sur `t_max` change le dernier point échantillonné
  - F-B. Slider sur `t_max` bascule le flag `closed` (demi-cercle → cercle complet)
  - F-C. Slider dans coefficient de x(t)/y(t) rescale tous les points
  - F-D. `dependsOn` contient bien tous les sliders référencés (x, y, t_min, t_max)

---

## Décisions techniques

- **Type** : `GeoParametricCurve` autonome (pas de `dependsOn` figé readonly[] : peut référencer scalaires/sliders).
- **Sampler** : nouveau `sampleParametric2D` dans `src/lib/grapheur/sampler.ts`, parallèle à `sampleWithDerivative`.
- **Factory** : `figure.createParametricCurve(...)` parallèle à `createFunction`.
- **Auto-détection variables** : utilise `getVariables` de `$lib/mathAST/eval/substitute` (re-export `$lib/mathAST`).
- **Courbe fermée** : détection à la fin du sampling, propagée via flag `closed?: boolean` sur le résultat.

---

## Fichiers modifiés / créés

À mettre à jour à chaque phase.

### Phase 1 (terminée — 32 tests verts, en attente code review)

Modifiés :

- `src/lib/geometry-core/types/elements.ts`
  - nouvelle interface `GeoParametricCurve` (après `GeoImplicitCurve`)
  - ajout dans l'union `GeoElement`
  - nouveau type guard `isParametricCurve`
- `src/lib/geometry-core/graph/figure.ts`
  - import du type `GeoParametricCurve`
  - nouvelle factory `createParametricCurve(...)` (après `createFunction`)
  - id préfixé `pc_`, `addElement(id, element, [...dependencies])` câble la liste réelle de dépendances dans le graphe
- `src/lib/grapheur/sampler.ts`
  - nouveau type exporté `ParametricSampleResult`
  - nouvelle fonction `sampleParametric2D(...)` : adaptatif via ‖speed(t)‖ avec dérivées, fallback uniforme sinon, détection NaN/Inf/saut, courbe fermée

Créés (tests TDD red-first) :

- `src/lib/geometry-core/types/__tests__/parametric-curve.test.ts` — 12 tests (structure + type guard)
- `src/lib/grapheur/__tests__/sampler-parametric.test.ts` — 11 tests (cercle/parabole/spirale/cardioïde, edge cases, densité adaptative, viewport)
- `src/lib/geometry-core/graph/__tests__/figure-parametric.test.ts` — 9 tests (id `pc_`, structure, dépendances scalaires/sliders, options, multiplicité)

Décisions prises pendant l'implémentation :

- **Constantes du sampler 2D paramétriques** : `PARAMETRIC_PROBE_COUNT = 100`, `PARAMETRIC_DENSITY_FACTOR = 3`, `DEFAULT_PARAMETRIC_SPAN = 10` (utilisé pour ε relatif quand `viewport` n'est pas fourni). Réutilise `ASYMPTOTE_FACTOR` et `MIN_VIEWPORT_DIM` existants.
- **Détection courbe fermée** : ε = max(viewportSpan/100, MIN_VIEWPORT_DIM), désactivée s'il y a déjà des discontinuités ou < 3 points.
- **Endpoints** : forçage exact de `tValues[0] = tMin` et `tValues[n-1] = tMax` pour garantir que la détection de fermeture utilise bien P(tMin) et P(tMax).
- **Pas d'inférence de dépendances** dans la factory : la liste est passée par l'appelant (le builtin DSL Phase 2 collectera les `scalarRef` via `getVariables`).
- **`compiledX` / `compiledY` jamais nullables** (l'évaluation numérique est obligatoire) ; seules `compiledXPrime` / `compiledYPrime` peuvent être `null` (échec de différentiation symbolique → fallback uniforme côté sampler).

### Phase 2 (terminée — 29 tests verts, en attente code review)

Modifiés :

- `src/lib/geometry-core/dsl/builtins.ts`
  - imports : ajout de `isVariable`, `isGreek`, `getVariables` depuis `$lib/mathAST`
  - case `'courbe'` étendu : 1 string positionnelle (cartésien existant) ou 2 strings positionnelles (paramétrique). Garde-fou explicite sur les arguments nommés `t_min`/`t_max` quand 1 seule string est fournie.
  - nouvelle fonction `createParametricCurveFromEquations(eq1, eq2, named, figure, line, label, toGeoValue, symbols)` qui :
    1. parse les 2 équations via `parseCustom` + valide `isRelation` + LHS ∈ {x, y} (incluant `\theta`/`\alpha` → GreekLetterNode acceptés via `isGreek`),
    2. identifie l'équation x= et y= peu importe l'ordre d'entrée,
    3. valide `t_min`/`t_max` (obligatoires, scalaire/slider/numérique acceptés, `t_min < t_max` vérifié si numériques),
    4. détecte l'incohérence des variables (free var exclusive à xRhs ET autre free var exclusive à yRhs) AVANT l'auto-détection,
    5. honore `param="..."` ou auto-détecte la variable libre unique (hors {x, y, symboles définis}),
    6. différencie symboliquement (best-effort) avec fallback `null`,
    7. compile `compiledX`/`compiledY` (obligatoire) et les dérivées (best-effort),
    8. collecte les ids des scalaires/sliders dans `dependsOn` (variables libres définies dans la SymbolTable + `scalarRef` de tMin/tMax).
  - helpers privés : `lhsVariableName`, `parseParametricEquation`, `resolveTBoundArg`.

Créés (tests TDD red-first) :

- `src/lib/geometry-core/dsl/__tests__/courbe-parametric.test.ts` — 29 tests (A. nominal × 6, B. swap d'ordre × 2, C. param= × 2, D. erreurs × 13, E. dérivation/compilation × 3, F. dependsOn × 3)

Décisions prises pendant l'implémentation :

- **Token `theta`** : le tokenizer `parseCustom` ne reconnaît pas `theta` nu (interprétation implicite multiplicative `t*h*e*t*a`). Le test A3 utilise `\theta` (syntaxe LaTeX-style supportée par le parser) — les variables grecques arrivent comme `GreekLetterNode` et sont détectées via `isGreek` dans `lhsVariableName` et `getVariables`.
- **Pas d'escape de chaînes côté DSL** : le tokenizer DSL prend les bytes bruts entre `"` ; un `\` dans la source DSL est passé tel quel au parser mathématique.
- **Ordre des vérifications** : incohérence avant ambiguïté (sinon une courbe `x = cos(t), y = sin(u)` lèverait "ambigu {t, u}" au lieu du message dédié "incohérent").
- **Coherence sautée quand `param=` explicite** : le filtrage `xFree`/`yFree` du plan a été remplacé par une détection basée sur les variables exclusives à un seul côté (`exclusiveX` ∩ `exclusiveY` non vides). Cela évite un faux positif quand `param="t"` force le paramètre alors que l'expression contient une autre variable libre commune aux deux RHS (cas C1).
- **Dépendances réactives** : on filtre les variables libres dont l'entrée `SymbolTable` est de type `'scalar'` (slider, distance, etc.) et on ajoute aussi le `scalarRef` éventuel de `tMin`/`tMax`. Doublon évité via `Set<string>`.
- **Erreurs sur compile** : si `compile(xRhs)` ou `compile(yRhs)` échoue → erreur DSL claire (mandatory). Si le `compile` d'une dérivée échoue → on retombe à `null` (le sampler utilise alors la version uniforme).

### Phase 3 (terminée — 16 tests verts, en attente code review)

Modifiés :

- `src/lib/geometry-core/graph/figure.ts`
  - import `sampleParametric2D` + `ParametricSampleResult` depuis `$lib/grapheur/sampler` (nouvel import)
  - nouvelle méthode `computeParametricCurveSampling(id, viewport?)` après `computeLocusCurveForElement` (~ligne 3604) : résout `tMin`/`tMax` via `resolveScalarParam` (gère scalaires/sliders), wrappe `compiledX`/`compiledY` avec garde NaN/Inf, idem pour les dérivées (best-effort, null-safe), retourne null si bornes invalides ou inversées, sinon délègue à `sampleParametric2D` avec 300 points.
- `src/lib/geometry-core/rendering/svg-primitives.ts`
  - nouvelle fonction `parametricCurveToSVG(id, figure, transformer, dims)` insérée après `locusToSVG` (~ligne 1680) : calcule le viewport math, appelle `figure.computeParametricCurveSampling`, convertit avec `curveToSVGPath` (Catmull-Rom), suffixe ` Z` au path quand `result.closed === true`. Renvoie `{ path: string; closed: boolean } | null`.
- `src/lib/components/geometry/GeometryCanvas.svelte`
  - import `parametricCurveToSVG` ajouté à la liste destructurée (entre `locusToSVG` et `traceToSVG`, ligne 37)
  - branche `{:else if el.type === 'parametricCurve'}` ajoutée juste après `'function'` et avant `'quadraticCurve'` (~ligne 1335). Path SVG avec strokes/dasharray standard, fill conditionnel si courbe fermée + fillColor explicite, label centré au milieu du viewport (positionnement minimal viable — Phase 6 pourra raffiner).

Créés (tests TDD red-first) :

- `src/lib/geometry-core/rendering/__tests__/parametric-curve-svg.test.ts` — 16 tests :
  - A. Nominal × 4 : cercle path non vide + `closed: true`, parabole path non vide + `closed: false`, suffixe `Z` sur fermée, absence de `Z` sur ouverte.
  - B. Bornes dynamiques (slider) × 2 : tMax slider à π → demi-cercle non fermé ; tMax slider à 2π → fermé.
  - C. Edge cases × 3 : id inconnu, élément non paramétrique (slider), bornes inversées slider → null.
  - D. Discontinuité × 1 : `y = 1/t` sur `[-2, 2]` → path contient ≥ 2 commandes `M` (split au passage NaN).
  - E. `computeParametricCurveSampling` × 4 : structure, id inconnu, mauvais type, viewport optionnel.
  - F. Type signatures × 2 : forme de retour, type d'élément.

Décisions prises pendant l'implémentation :

- **Pas de `dependsOn` → tracking** : la résolution dynamique des bornes se fait à chaque appel via `resolveScalarParam(this.scalarValues)` ; pas de cache. La réactivité côté Svelte est portée par le `version` counter qui invalide les `$derived` du canvas — donc déjà câblée sans changement supplémentaire.
- **Viewport optionnel sur `computeParametricCurveSampling`** : utile pour les tests serveur sans transformer ; le sampler a un fallback `DEFAULT_PARAMETRIC_SPAN`. La branche canvas le passe toujours explicitement (calculé via `transformer.svgToMath`).
- **Suffixe `Z` au path** : ajouté dans `parametricCurveToSVG` plutôt qu'au niveau du builder Catmull-Rom (qui ne sait pas si la courbe doit être fermée). Format `${basePath} Z` conservé séparé pour permettre au caller d'inspecter `closed` indépendamment.
- **Fill conditionnel** : la branche canvas n'applique le `fill` que si `svg.closed && sty.fillColor`. Sans `fillColor` explicite, la courbe fermée reste un trait (cas par défaut). Le `fillOpacity` provient de `GeoStyleResolved` (toujours défini avec valeur 0 par défaut).
- **Label position simple** : centre du viewport + offset (10, -10) par défaut. Le placement précis le long de la courbe (équivalent à ce que `'function'` fait avec `f(0.85 * xMax)`) est non trivial pour une courbe paramétrique (il faudrait choisir un t arbitraire) — repoussé à une phase de polish.
- **Hover/popover/double-clic** : non implémentés dans la branche (path n'a pas de handler dédié, juste la classe `function-curve` et `class:hovered`). Le hit-testing global du canvas (via `findElementNear`) suffit pour le hover de base ; un popover dédié pourra être ajouté en Phase 6 si besoin.
- **Svelte autofixer** : exécuté sur le composant. 3 issues détectées (`state_referenced_locally` lignes 137-138 sur `initialCenter`/`initialPpu` dans `$state(...)` initializers) — toutes pré-existantes au fichier, non introduites par la Phase 3. La nouvelle branche en isolation ne génère aucun warning.

---

### Phase 5 (terminée — 18 tests verts)

Modifiés :

- `src/lib/geometry-core/rendering/export-tikz.ts`
  - Pass 2e ajouté entre Pass 2c (conics) et Pass 2d (tangentes) : `el.type === 'parametricCurve'`
  - Appelle `figure.computeParametricCurveSampling(el.id, viewport)` → liste de points
  - Split sur `discontinuityIndices` → sous-paths séparés
  - Format TikZ : `\draw[opts, smooth] plot coordinates {(x1,y1) ...}` + ` -- cycle` si fermée
- `src/lib/geometry-core/rendering/export-typst.ts`
  - Pass 2e ajouté entre Pass 2c (conics) et Pass 2d (tangentes) : `el.type === 'parametricCurve'`
  - Même approche sampler → sous-paths
  - Format Typst : `line((x1,y1), ..., stroke: ..., fill: none, closed: true)` si fermée
- `src/lib/geometry-core/dsl/serializer.ts`
  - Ajout `'parametricCurve'` dans `defaultPrefix()` (→ `'f'`)
  - Case `'parametricCurve'` dans `serializeElement()` :
    - Produit `courbe("${el.equationX}", "${el.equationY}", t_min=..., t_max=...)`
    - Bornes via `fmtScalarParam()` : scalarRef → nom symbolique, numeric → nombre
    - Ajoute `param="..."` seulement si `el.parameter !== 't'`
    - Préfixe omis si nom commence par `_` (élément anonyme)

Créés (tests TDD red-first) :

- `src/lib/geometry-core/rendering/__tests__/parametric-exports.test.ts` — 18 tests :
  - A. TikZ × 4 : draw present, cycle sur fermée, pas de cycle sur ouverte, plot coordinates
  - B. TikZ styles × 2 : couleur par défaut, dash=dashed
  - C. Typst × 3 : line( présent, coordonnées multiples, parabole
  - D. Sérialiseur nominal × 2 : cercle et parabole avec noms et bornes corrects
  - E. Sérialiseur scalarRef × 2 : t_max=s (nom slider), t_min=a t_max=b (deux sliders)
  - F. Sérialiseur param × 2 : param= omis si 't', param="u" si non-défaut
  - G. Sérialiseur anonyme × 1 : pas de "\_ = courbe"
  - H. Round-trip × 2 : cercle et parabole préservent l'élément après re-parse

Décisions prises pendant l'implémentation :

- **Approche sampler vs symbolique** : approche échantillonnage explicite retenue (robuste, évite traduction mathAST→TikZ/Typst math). Même approche que les conics dans `sampleConicPaths`.
- **Discontinuités** : split en sous-paths séparés pour TikZ et Typst (même logique dans les deux exports).
- **Courbe fermée TikZ** : suffixe ` -- cycle` uniquement si `result.closed && discontinuityIndices.length === 0` (pas de cycle si curve discontinue).
- **Courbe fermée Typst** : attribut `closed: true` sur la dernière `line()`.
- **Sérialiseur** : `fmtScalarParam()` existant réutilisé directement (gère déjà scalarRef → nom symbolique via `idToName`).
- **0 régression** : 310 tests rendering + 1216 tests DSL tous verts.

---

## Crash recovery

En cas de crash de session :

1. Lire ce doc complet
2. Lire `src/lib/geometry-core/types/elements.ts` autour de `GeoFunction` (~ligne 731) pour pattern de référence
3. Lire la logique `courbe()` actuelle dans `dsl/builtins.ts:2143-2300`
4. Vérifier les tests Phase précédente passent : `pnpm test:server src/lib/geometry-core/`
5. Continuer à la phase marquée "en cours" ou "pending" suivante

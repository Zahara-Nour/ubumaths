# Courbes paramétriques — V1 (geometry-core)

**Statut** : en cours — Phase 0 validée, Phase 1+2 terminées, **Phase 3 terminée (en attente code review)**
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
| 1 — Type + Factory + Sampler 2D        | terminée (TDD, 32 tests verts) | en attente |
| 2 — DSL builtin courbe() 2-strings     | terminée (TDD, 29 tests verts) | en attente |
| 3 — Rendu SVG + courbe fermée + UI     | terminée (TDD, 16 tests verts) | en attente |
| 4 — Réactivité (sliders/scalaires)     | pending                        | —          |
| 5 — Exports TikZ/Typst + sérialisation | pending                        | —          |
| 6 — Demo page                          | pending                        | —          |
| 7 — Quality Checks finaux              | pending                        | —          |

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

## Crash recovery

En cas de crash de session :

1. Lire ce doc complet
2. Lire `src/lib/geometry-core/types/elements.ts` autour de `GeoFunction` (~ligne 731) pour pattern de référence
3. Lire la logique `courbe()` actuelle dans `dsl/builtins.ts:2143-2300`
4. Vérifier les tests Phase précédente passent : `pnpm test:server src/lib/geometry-core/`
5. Continuer à la phase marquée "en cours" ou "pending" suivante

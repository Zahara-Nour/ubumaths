# Implémentation `integrale(f, a, b)` — progression

> Document de reprise pour le builtin DSL `integrale(f, a, b)`. Mis à jour
> après chaque phase. Spec et plan : `docs/wip/geometry/integrale-study.md`.

---

## État actuel

**Phase 1 terminée** ✅ — Type `GeoIntegralArea` et factory
`figure.createIntegralArea()`.

Reste : Phases 2 (DSL builtin + warn singularité), 3 (compute réactif déjà
en place via Phase 1, à valider plus en profondeur), 4 (rendu SVG splittage
par signe), 5 (démo + doc), 6 (quality + commit final).

---

## Décisions clés enregistrées

(Source : `integrale-study.md` §7)

| #   | Sujet             | Décision                                                                              |
| --- | ----------------- | ------------------------------------------------------------------------------------- |
| 1   | Sémantique        | **Intégrale** `F(b) − F(a)` (peut être négative). `aire(...)` reporté V2.             |
| 2   | Visuel `f < 0`    | Teintes différentes par sous-région (splittage sur les zéros, à faire en Phase 4).    |
| 3   | Type d'élément    | **Option C** : paire `GeoScalar` (exposé au DSL) + `GeoIntegralArea` (zone visuelle). |
| 4   | Label automatique | Aucun. L'utilisateur fait `mesure(A)` ou `texte(...)`.                                |
| 5   | Singularités      | **Warn console** heuristique en V1 (Phase 2, niveau DSL).                             |

---

## Phase 1 — Type + factory ✅

### Livrables

**Modifiés** :

- `src/lib/geometry-core/types/elements.ts`

  - Nouvelle interface `GeoIntegralArea` (visuel : functionId, bornes en
    `ScalarParam`, antiderivative cache, compiledF cache, integrationStatus,
    `_scalarId`).
  - Ajout du champ optionnel `_visualAreaId?: string` sur `GeoScalar`.
  - Ajout de `GeoIntegralArea` dans l'union `GeoElement`.

- `src/lib/geometry-core/graph/figure.ts`
  - Imports : `GeoIntegralArea` (type), `compile`, `integrateDefinite`,
    `numericIntegrate`, `resolveScalarParam`.
  - Nouvelle méthode `createIntegralArea(functionId, lower, upper, options?)`
    qui retourne `{ areaId, scalarId }`.

**Nouveaux** :

- `src/lib/geometry-core/graph/__tests__/figure-integral-area.test.ts`
  29 tests, tous verts.

### Comportements implémentés

- ✅ Création avec bornes numériques (`numeric(0)`, `numeric(1)`) ou
  références dynamiques (`{ scalarRef: sliderId }`).
- ✅ Cache symbolique : `integrateDefinite` appelé une fois à la création
  avec `allowNumeric: false`. Si statut `'exact'`, on stocke `antiderivative`
  - `compiledF`. Sinon `null` partout, statut `'unsupported'`.
- ✅ Compute closure du scalaire : `compiledF({x:b}) − compiledF({x:a})` si
  cache disponible, sinon `numericIntegrate(fnExpression, 'x', a, b)`.
- ✅ Liens réciproques : `area._scalarId` ↔ `scalar._visualAreaId`.
- ✅ Création atomique en transaction (undo simple = suppression des deux
  éléments en groupe ; redo simple = restauration des deux).
- ✅ Validation : rejet si `functionId` n'est pas `'function'`, ou si
  `scalarRef` pointe vers un id inexistant ou un type non-scalaire.
- ✅ Visibilité : zone visible par défaut, scalaire invisible (cohérent avec
  `createScalarArea`).
- ✅ Label sur la zone uniquement (pas le scalaire).
- ✅ Phase 1 silencieuse : aucun `console.warn` (le warn singularité arrive
  en Phase 2).
- ✅ Edge cases : `lower === upper` (= 0), `lower > upper` (convention
  `∫ᵇₐ = -∫ₐᵇ`).

### Code review (corrections appliquées)

Issues corrigées suite au passage du `code-reviewer` :

1. **Important** — `scalarDeps: []` corrigé en `scalarDeps: scalarRefDeps`
   (liste réelle des sliders/scalars référencés).
2. **Important** — `computePosition(areaId)` ajouté avant
   `computePosition(scalarId)` (forward-compat Phase 4).
3. **Minor** — `integrateDefinite` appelé avec `{ allowNumeric: false }`
   pour éviter un Simpson redondant à la création (le numérique est fait
   dans la closure si besoin).
4. **Minor** — Cast inutile `as GeoScalar & { _visualAreaId?: string }`
   retiré du test (le champ est désormais sur `GeoScalar`).

### Tests

- 29 tests sur `figure-integral-area.test.ts` : tous verts.
- Régression complète : **2209/2209** tests verts sur tout `geometry-core`.

### Détail d'implémentation à noter pour Phase 2

- La factory `createIntegralArea` jette des `Error` JS standards (pas de
  `DslRuntimeError`). Phase 2 (case `'integrale'` dans `builtins.ts`) doit
  catcher ces erreurs et les re-lancer en `DslRuntimeError` avec numéro de
  ligne.
- Le scalaire a `scalarKind: 'expression'` et `compute` est une closure ;
  le compute path dans `compute-position.ts:889` (case `'expression'`) gère
  déjà ce cas. Aucune modification de `compute-position.ts` nécessaire en
  Phase 1.

---

## Phase 2 — DSL builtin `integrale(...)` + warn singularité (à venir)

### À faire

- Helper `resolveBoundParam(arg, line)` dans `builtins.ts` :
  - `arg` est un nombre littéral → `numeric(value)`
  - `arg` est une référence à un scalaire/slider DSL → `{ scalarRef: id }`
- `case 'integrale'` dans le switch de `executeBuiltin` (~ligne 1614,
  juste après `case 'derivee'`) :
  - Validation : 3 args (f, a, b), f de type `'fonction'`.
  - Appel `figure.createIntegralArea(fnId, lower, upper, { label, ... })`.
  - Retourne `{ figureId: scalarId, symbolType: 'scalar' }` (le scalaire
    exposé au DSL).
  - Catch des erreurs JS et re-throw en `DslRuntimeError` avec ligne.
- Heuristique singularité dans un module séparé :
  - `src/lib/geometry-core/dsl/singularity-warn.ts`
  - Fonction `warnIfSingularitySuspected(fnExpression, a, b, line?)` qui
    émet un `console.warn` si l'expression contient `1/g(x)`, `tan(x)`,
    `ln(g(x))` (avec `g` qui s'annule dans `[a, b]`) ou `sqrt(g(x))` (avec
    `g(x) < 0` dans `[a, b]`).
  - Implémentation : parcours AST + zéros approximatifs via évaluation
    numérique sur 100 points.
- Tests : `src/lib/geometry-core/dsl/__tests__/integrale.test.ts` et
  `src/lib/geometry-core/dsl/__tests__/singularity-warn.test.ts`.

### Estimation

4-5 h.

---

## Phase 3 — Compute réactif (à venir, partiellement déjà en Phase 1)

### À faire

- ✓ Compute path déjà fonctionnel via `scalarKind: 'expression'` (Phase 1).
- Bench perf : 100 évaluations slider drag, vérifier < 16 ms / frame.
  Probable que le compiledF + closures soient sub-ms ; numericIntegrate
  fallback à mesurer sur fonctions intégrables (~5 ms typique attendu).
- Tests `integral-reactive.test.ts` ciblés sur les patterns réactifs
  (multi-sliders, chaînage, undo après slider).

### Estimation

2-3 h (réduit grâce à Phase 1 qui a déjà fait le gros du compute).

---

## Phase 4 — Rendu SVG (à venir)

Voir `integrale-study.md` §2.8 et §4.

---

## Phase 5 — Démo + doc utilisateur (à venir)

---

## Phase 6 — Quality checks finaux (à venir)

À la fin du plan **uniquement** (CLAUDE.md) :

- `mcp__svelte__svelte-autofixer` sur chaque `.svelte` modifié
- `pnpm check:incremental`
- `npx eslint <fichiers modifiés>`
- Commit final

---

## Documents produits

À ce stade :

- `docs/wip/geometry/integrale-study.md` (étude / spec, validée
  utilisateur)
- `docs/wip/geometry/integrale-progress.md` (ce document)

À produire en cours / fin de plan :

- `docs/ref/geometry-dsl/integrale.md` (doc utilisateur du DSL — Phase 5)

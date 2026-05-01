# Implémentation `integrale(f, a, b)` — progression

> Document de reprise pour le builtin DSL `integrale(f, a, b)`. Mis à jour
> après chaque phase. Spec et plan : `docs/wip/geometry/integrale-study.md`.

---

## État actuel

**Phase 1 terminée** ✅ — Type `GeoIntegralArea` et factory
`figure.createIntegralArea()` (commit `6e808d0e`).

**Phase 2 terminée** ✅ — Builtin DSL `case 'integrale'` + module
`singularity-warn.ts` (heuristique + warn console).

Reste : Phases 3 (compute réactif déjà en place via Phase 1, à valider plus
en profondeur), 4 (rendu SVG splittage par signe), 5 (démo + doc), 6
(quality + commit final).

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

## Phase 2 — DSL builtin `integrale(...)` + warn singularité ✅

### Livrables

**Modifiés** :

- `src/lib/geometry-core/dsl/builtins.ts`
  - Ajout import `warnIfSingularitySuspected` depuis `./singularity-warn`.
  - Ajout `'integrale'` dans `BUILTIN_NAMES`.
  - Ajout du champ optionnel `styleTargetId?: string` à `BuiltinResult` :
    permet à un builtin renvoyant un élément invisible (le scalaire) de
    rediriger l'application automatique du style inline vers un élément
    visible (la zone). Modification de la logique d'application de style
    dans `executeBuiltin` pour respecter `styleTargetId`.
  - Nouveau `case 'integrale'` (~70 lignes) après `case 'derivee'` :
    validation des 3 args, helper local `resolveBoundParam` (number →
    `numeric()`, element scalar/slider → `{ scalarRef }`), appel à
    `figure.createIntegralArea`, warn singularité, retour
    `{ figureId: scalarId, symbolType: 'scalar', styleTargetId: areaId }`.

**Nouveaux** :

- `src/lib/geometry-core/dsl/singularity-warn.ts` (~240 lignes)

  - Type `SingularityFinding` (`kind`, `description`, `approxLocation?`).
  - Walker AST `collectCandidates` qui descend dans `division`, `function`,
    `addition/subtraction/multiplication`, `opposite/positive`,
    `superscript`, `subscript`, `composition`, `delimiter`. Marque comme
    candidats les sous-arbres suspects : dénominateurs, args de
    `tan/ln/log/sqrt`.
  - Sampling 51 points sur `[a, b]` via `compile()` du sous-arbre.
  - Détecteurs : `findZero` (sign-change interpolé) pour division,
    `findTanPole` (shifted-floor sur `(g - π/2)/π`) pour tan, `findFirstWhere`
    pour ln (g ≤ 0) et sqrt (g < 0). Note : ln/sqrt ratent les dips entre
    deux samples — V2 utilisera `findZero` pour ces cas (commenté dans le
    code).
  - 3 exports publics : `findSingularitiesInRange`, `formatSingularityWarnings`,
    `warnIfSingularitySuspected`.

- `src/lib/geometry-core/dsl/__tests__/singularity-warn.test.ts` (33 tests)
- `src/lib/geometry-core/dsl/__tests__/interpreter-integrale.test.ts` (20 tests)

### Comportements implémentés

- ✅ DSL : `integrale(f, a, b)` avec validation stricte (3 args, f de type
  fonction, bornes nombre|scalar|slider). Erreurs `DslRuntimeError` claires.
- ✅ Bornes : nombre → `numeric()`, élément scalaire/slider → `{ scalarRef }`.
- ✅ Style inline : `couleur`, `opacite_fond`, `remplissage`, etc., appliqués
  à la zone (pas au scalaire) via `styleTargetId`.
- ✅ Warn singularité émis une seule fois à la création (pas de re-warn sur
  drag de slider).
- ✅ Warn message : multi-line agrégé, préfixé `integrale ligne N: ` quand
  ligne dispo.
- ✅ Skip silencieux du warn si bornes non-finies (NaN).
- ✅ Robustesse : pas de crash sur a == b, a > b, NaN-producing expressions,
  bornes inversées.

### Code review (corrections appliquées)

Issues corrigées suite au passage du `code-reviewer` :

1. **Important** — Walker AST étendu pour couvrir `subscript` et
   `composition` (forward-compat ; rares en intégrandes mais propres).
2. **Minor** — Commentaires V2 ajoutés sur `ln`/`sqrt` pour signaler la
   limite (dip entre samples non détecté).
3. **Minor** — Commentaire ajouté à l'appel `findTanPole` clarifiant que
   `ys` = valeurs de l'argument `g`, pas de `tan(g)`.
4. **Minor** — Commentaire dans `case 'integrale'` documentant que
   `'x'` est la convention de tout `geometry-core` pour `GeoFunction`.
5. **Minor** — Test `expect(message).toContain('2')` resserré en
   `toMatch(/integrale ligne 2:/)`.
6. **Suggestion** — Test ajouté pour bornes inversées via DSL
   (`integrale(f, 1, 0)` retourne `-1/3` pour `x²`).

### Tests

- 33 tests sur `singularity-warn.test.ts` : tous verts.
- 20 tests sur `interpreter-integrale.test.ts` : tous verts.
- Régression complète : **2262/2262** tests verts sur tout `geometry-core`.

### Détail d'implémentation à noter pour Phase 4

- Le rendu SVG (Phase 4) consommera `area.functionId`, `area.lowerBound`,
  `area.upperBound` via `resolveScalarParam`, puis `splitOnZeros` sur les
  samples de la fonction pour produire les paths multi-régions.
- Les attributs visuels `color`, `style.fillOpacity`, etc., sont déjà
  posés sur la zone par `applyInlineStyle` quand le DSL passe les args
  nommés. Le renderer n'a qu'à les lire.

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

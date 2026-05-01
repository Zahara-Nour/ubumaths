# Implémentation `aire(f, a, b)` — progression

> Document de reprise pour le builtin DSL `aire(f, a, b)`. Mis à jour après
> chaque phase. Spec et plan : `docs/wip/geometry/aire-study.md`.

---

## État actuel

**Phase 1 terminée** ✅ — Extension du type `GeoIntegralArea` (champ `signed`)

- branchement de la closure compute dans `figure.createIntegralArea` selon
  le mode signé/non-signé. Commit `ef6ab0ad`.

**Phase 2 terminée** ✅ — Surcharge du `case 'aire'` dans `builtins.ts` pour
router vers la branche aire-sous-courbe quand le premier arg est une
`GeoFunction`. Refactor `singularity-warn` pour préfixe paramétrique. Commit
`6f4caf9c`.

**Phase 3 terminée** ✅ — Couleur verte par défaut (`#22c55e`) côté DSL
builtin + branche dispatcher Svelte pour `fillOpacity` uniforme quand
`el.signed === false`.

Phases restantes :

- **Phase 4** — Page démo `/geometry-demo/sliders/aire` + doc utilisateur
  `docs/ref/geometry-dsl/aire.md`.
- **Phase 5** — Quality checks finaux + commit final.

---

## Décisions clés enregistrées (2026-05-01)

(Source : `aire-study.md` §0)

| #   | Sujet                          | Décision                                                                           |
| --- | ------------------------------ | ---------------------------------------------------------------------------------- |
| 1   | Type d'élément                 | **Option α** — flag `signed: boolean` (défaut `true`) sur `GeoIntegralArea`.       |
| 2   | Nom du builtin                 | **Surcharge** `aire(f, a, b)` sur `case 'aire'` (discrimination par type).         |
| 3   | Couleur par défaut             | **Vert** (`#22c55e`) pour contraster avec bleu d'`integrale`.                      |
| 4   | Détection des zéros            | **`findRoots`** de `mathAST/analysis/roots` (hybride exact + bisection numérique). |
| 5   | Refactorisation integrale/aire | **Reportée en V3** (à faire avec `aire_entre`, pas en V1).                         |

---

## Phase 1 — Extension type + factory ✅

### Livrables

**Modifiés** :

- `src/lib/geometry-core/types/elements.ts`

  - `GeoIntegralArea` : ajout du champ `signed: boolean` (non-optionnel).
  - JSDoc étendue pour expliquer les deux modes (`true` = integrale signée,
    `false` = aire géométrique).

- `src/lib/geometry-core/graph/figure.ts`
  - Import `findRoots` depuis `$lib/mathAST/analysis/roots`.
  - `createIntegralArea(...)` : signature étendue avec
    `options?: ElementOptions & { signed?: boolean }` (défaut `true`).
  - Capture `fnEl.compiledFn` dans la closure (pour `findRoots` côté `signed=false`).
  - Compute closure branchée :
    - `signed = true` → code V1 inchangé (`F(b) − F(a)` symbolique ou
      fallback `numericIntegrate`).
    - `signed = false` → formule `Σ |F(z_{i+1}) − F(z_i)|` avec `findRoots`
      filtrés par tolérance `1e-7` aux bornes ; fallback `numericIntegrate`
      par sous-intervalle si pas d'antidérivée close.
  - JSDoc de `createIntegralArea` étendue (lien vers `aire-study.md`).

**Nouveaux** :

- `src/lib/geometry-core/graph/__tests__/figure-integral-area-unsigned.test.ts`
  19 tests, tous verts (cf. §Tests).

### Comportements implémentés

#### A. Rétrocompatibilité V1 (signed=true par défaut)

- ✅ A1 : `createIntegralArea(...)` sans option → `signed: true`.
- ✅ A2 : `signed: true` explicite → identique au défaut.
- ✅ A3 : compute V1 retourne `F(b) − F(a)` (peut être négatif).
- ✅ A4 : bornes inversées V1 → `−∫ₐᵇ` (convention standard).
- ✅ Les 29 tests V1 (`figure-integral-area.test.ts`) passent inchangés.

#### B. Aire géométrique (signed=false)

- ✅ B6 : `signed: false` → champ correctement stocké.
- ✅ B7 : `f ≥ 0` → aire = integrale (`x²` sur `[0, 1]` = 1/3).
- ✅ B8 : changement de signe (`x³ − x` sur `[-1, 1]`) → 0.5 (vs integrale = 0).
- ✅ B9 : zéro tangent (`(x − 1)²` sur `[0, 2]`) → 2/3 — splittage harmless.
- ✅ B10 : `sin(x)` sur `[0, 2π]` → 4 (vs integrale = 0).
- ✅ B11 : `cos(x)` sur `[0, π]` → 2 (vs integrale = 0).
- ✅ B12 : bornes inversées `signed=false` (`x³−x`, `[1, -1]`) → 0.5 (orientation ignorée).
- ✅ B13 : bornes égales → 0.
- ✅ B14 : fallback numérique `e^{-x²}` sur `[-1, 1]` ≈ 1.4937.

#### C. Réactivité (slider drag)

- ✅ C15 : déplacement du slider lower → recompute correct.
- ✅ C16 : déplacement du slider upper → recompute correct.
- ✅ C17 : déplacement à travers un zéro de `f` (`sin(x)`, `b` passe de `π/2` à `3π/2`)
  → splittage adapté dynamiquement (aire = 2).

#### D. Validation inputs (héritée V1)

- ✅ D18 : functionId non-fonction → erreur claire.
- ✅ D19 : scalarRef invalide → erreur.

#### E. Coexistence

- ✅ E20 : `integrale` (signed) et `aire` (unsigned) sur la même `f` calculent
  des scalaires indépendants (testé avec `x³ − x` : integrale = 0, aire = 0.5).

### Code review (correction appliquée)

Issue **Important** corrigée suite au passage du `code-reviewer` :

1. **try/catch interne à la boucle** dans le fallback numérique
   `signed=false`. Avant : un échec de `numericIntegrate` sur un
   sous-intervalle annulait toute la somme (`return NaN`). Après : on
   skippe la contribution qui échoue et on continue avec les autres
   sous-intervalles. Préserve les sous-sommes valides au lieu de tout perdre.

Reste validé sans modification :

- Capture des variables dans la closure (`signed`, `fnCompiled`, etc.)
- Ordre `breakpoints = [lo, ...inner, hi]` (déjà trié par `findRoots`)
- Défaut `signed = true` correct pour tous les chemins (`undefined`,
  options sans le champ, options.signed = undefined explicite)
- Pas de risque de régression V1 non couvert par les tests

### Tests

- 19 tests sur `figure-integral-area-unsigned.test.ts` : tous verts.
- 29 tests V1 sur `figure-integral-area.test.ts` : tous verts inchangés.
- Régression complète : **2305/2305** tests verts sur tout `geometry-core`
  (+ 2 skipped pour bench perf manuel V1 d'`integrale`).

### Détail d'implémentation à noter pour Phase 2

- Le DSL builtin `case 'aire'` actuel (`builtins.ts:1118`) calcule l'aire
  d'un polygone (≥ 3 points). La Phase 2 doit ajouter une **discrimination
  par type du premier argument** : si `pos[0]` est de type `'fonction'`
  ET `pos.length === 3`, router vers la nouvelle branche
  aire-sous-courbe. Sinon comportement polygone actuel.
- Pattern de référence pour la discrimination : `case 'mtexte'`
  (`builtins.ts:1126-1162`), qui surcharge déjà sur le shape des arguments.
- Un test régression `aire(P1, P2, P3)` doit être ajouté pour s'assurer
  que la signature polygone reste fonctionnelle.
- L'appel sera `figure.createIntegralArea(fnId, lower, upper, { label, signed: false })`
  (Phase 2 ajoutera juste `signed: false` à l'appel actuel d'`integrale`).

---

## Phase 2 — DSL builtin `aire(f, a, b)` ✅

### Livrables

**Modifiés** :

- `src/lib/geometry-core/dsl/singularity-warn.ts`

  - `formatSingularityWarnings(findings, line?, builtin = 'integrale')` :
    nouveau paramètre `builtin` pour personnaliser le préfixe du message
    (`'integrale ligne X:'` ou `'aire ligne X:'`). Défaut V1 backward compat.
  - `warnIfSingularitySuspected(...)` : idem, propage à `formatSingularityWarnings`.
  - Wording du message générique : "le résultat peut être incorrect"
    (au lieu de "l'intégrale peut être incorrecte"). Aucun test V1 ne
    dépend du wording exact (vérifié).

- `src/lib/geometry-core/dsl/builtins.ts`
  - `case 'aire'` étendu avec discrimination en tête :
    - Si `pos.length === 3` ET `pos[0].type === 'element'` ET
      `candidateEl.type === 'function'` → branche aire-sous-courbe (clone
      de `case 'integrale'` avec `signed: false` et préfixe `'aire'`).
    - Sinon (incluant ≥ 4 args, ou pos[0] non-fonction) → comportement
      polygone inchangé (`createScalarArea(pointIds, ...)`).
  - Helper `resolveBoundParam` dupliqué inline (décision §2.10 de l'étude).
  - Re-wrap des `Error` JS en `DslRuntimeError` avec numéro de ligne.
  - Retour : `{ figureId: scalarId, symbolType: 'scalar', styleTargetId: areaId }`
    (cohérent V1 d'`integrale`).
  - Commentaires de tête : explicite la fallthrough pour pos[0] non-fonction
    (acceptable V1, à améliorer V3) + limitation slider non-rechecked.

**Nouveaux** :

- `src/lib/geometry-core/dsl/__tests__/interpreter-aire-undercurve.test.ts`
  18 tests, tous verts.

### Comportements implémentés

#### A. Régression polygon (3 tests)

- ✅ A1 : `aire(P1, P2, P3)` triangle = 2.
- ✅ A2 : `aire(P1, P2, P3, P4)` quadrilatère = 4 (≥ 3 args toujours OK).
- ✅ A3 : `aire(P1, P2)` (< 3 args) → erreur `DslRuntimeError`.

#### B. Aire sous courbe (8 tests)

- ✅ B1 : `aire(x², 0, 1)` = 1/3.
- ✅ B2 : `aire(x³−x, -1, 1)` = 0.5 (vs `integrale = 0`).
- ✅ B3 : symbole DSL exposé = scalar.
- ✅ B4 : `GeoIntegralArea` créé avec `signed: false`.
- ✅ B5 : `integrale` et `aire` sur même `f` créent 2 areas indépendantes
  (signed/unsigned).
- ✅ B6 : sliders + recompute correct (`aire(sin(x), 0, b)` avec `b` qui
  passe de π à 2π → 2 puis 4).
- ✅ B7 : fallback numérique gaussienne `aire(e^{-x²}, -1, 1)` ≈ 1.4937.
- ✅ B8 : bornes inversées → même valeur (orientation ignorée).

#### C. Style inline (2 tests)

- ✅ C1 : `couleur="vert"` appliqué à l'area.
- ✅ C2 : `opacite_fond=0.5` appliqué à l'area.

#### D. Singularity warn (3 tests)

- ✅ D1 : pôle de `1/x` dans `[-1, 1]` → warn émis.
- ✅ D2 : préfixe du message est `'aire ligne X:'` (pas `'integrale'`).
- ✅ D3 : fonction propre → silence.

#### E. Disambiguation (2 tests)

- ✅ E1 : `aire(f, a, b)` avec sliders → routes correctement vers
  under-curve (1 area créée).
- ✅ E2 : `aire(f, P, 1)` (point comme borne) → erreur claire dans
  `resolveBoundParam` (n'arrive pas jusqu'à polygon, branche under-curve
  rejette immédiatement).

### Code review (corrections appliquées)

Issues mineures suggérées par `code-reviewer` et corrigées :

1. **Minor** — Commentaire ajouté avant `warnIfSingularitySuspected` :
   "Singularity check uses numeric bound values at creation time only —
   slider-driven bounds are not re-checked on drag (same limitation as
   integrale())." Aligne sur le style V1.
2. **Minor** — Documentation de la fallthrough dans le commentaire de
   tête du `case 'aire'` : explicite qu'un élément non-fonction (ex.
   cercle) en pos[0] sera routé vers polygon avec une erreur "point1"
   peu claire. Documenté comme acceptable V1.

Suggestions optionnelles déclinées :

- Renommage `aireFnEl` → `aireFunctionEl` : non, alias minimal cohérent.
- Test DSL-level pour le label sur l'area : redondant avec le test factory
  V1 (`figure-integral-area.test.ts:292`).

### Tests

- 18 nouveaux tests sur `interpreter-aire-undercurve.test.ts` : tous verts.
- 20 tests V1 `interpreter-integrale.test.ts` : tous verts inchangés
  (préfixe `'integrale ligne 2:'` toujours valide grâce au défaut).
- 33 tests V1 `singularity-warn.test.ts` : tous verts inchangés.
- Régression complète : **2323/2323** tests verts sur tout `geometry-core`
  (+ 2 skipped pour bench perf manuel V1).

### Détail d'implémentation à noter pour Phase 3

- Le `GeoIntegralArea` créé par `aire()` a `signed: false`. La Phase 3
  doit lire ce flag dans `GeometryCanvas.svelte` pour appliquer un
  `fillOpacity` uniforme (au lieu du splittage signed/unsigned du V1
  `integrale`).
- Le rendu `splitOnZeros` + `integralAreaToSVG` reste inchangé : il
  retourne déjà des paths avec un tag `sign: 'positive' | 'negative'`.
  Le dispatcher Svelte doit ignorer le tag quand `signed=false`.
- La couleur par défaut verte (`#22c55e`) sera appliquée via le style
  par défaut quand `couleur=` n'est pas spécifié — décision §0.

---

## Phase 3 — Rendu SVG + couleur verte par défaut ✅

### Livrables

**Modifiés** :

- `src/lib/geometry-core/dsl/builtins.ts`

  - `case 'aire'` under-curve branch : passe `color: '#22c55e'` à
    `createIntegralArea` pour la couleur verte par défaut. Si l'utilisateur
    spécifie `couleur=...`, `applyInlineStyle` set `el.style.color` qui
    prend précédence dans `resolveStyle` (ordre : `style.color > color > default`).
  - Commentaire explicite sur le mécanisme d'override.

- `src/lib/components/geometry/GeometryCanvas.svelte`
  - Dispatcher `el.type === 'integralArea'` : ternaire imbriqué pour
    `fill-opacity` :
    - `el.signed === true` (V1 integrale) → `positive` à
      `baseFillOpacity`, `negative` à `baseFillOpacity * 0.5`.
    - `el.signed === false` (aire) → `baseFillOpacity` uniforme pour
      toutes les sous-régions.
  - `splitOnZeros` et `integralAreaToSVG` inchangés (le tag `sign` reste
    sur chaque path, juste ignoré côté dispatcher quand non-signé).

**Modifiés (tests)** :

- `src/lib/geometry-core/dsl/__tests__/interpreter-aire-undercurve.test.ts`
  - C1 : changement de `couleur="vert"` → `couleur="rouge"` (le vert étant
    désormais le défaut, tester avec une couleur différente est plus
    informatif).
  - C3 (NOUVEAU) : `aire(f, 0, 1)` sans couleur → `el.color === '#22c55e'`.
  - C4 (NOUVEAU) : `couleur="rouge"` → `el.style.color !== '#22c55e'`
    (override via `applyInlineStyle`).
  - C5 (NOUVEAU) : sur la même figure, `integrale` reste `#1e40af` (V1
    default), `aire` est `#22c55e`.

### Comportements implémentés

#### Rendu SVG (validation manuelle Phase 4)

- ✅ `el.signed === true` (V1) : opacité différenciée par signe inchangée.
- ✅ `el.signed === false` (aire) : opacité uniforme sur toutes les sous-régions.
- ✅ `splitOnZeros` toujours appelé (donne la découpe géométrique correcte).

#### Couleur par défaut

- ✅ C3 : aire sans `couleur=` → vert (`#22c55e`).
- ✅ C4 : `couleur="rouge"` override le vert via `el.style.color`.
- ✅ C5 : integrale reste bleu (`#1e40af`), aire est verte — coexistence
  visuelle distincte sur la même figure.

### Code review (rien à corriger)

`code-reviewer` consulté — quality score : Good, ready to merge :

- Ternaire imbriqué : lisible pour 2 cas, OK comme tel. `{@const}`
  envisageable si un 3ème cas apparaît.
- Constante `AIRE_DEFAULT_COLOR` : à différer (un seul call site
  actuellement).
- `el.signed` runtime risk : confirmé safe (le champ est `readonly boolean`
  non-optionnel, toujours set par la factory via `options?.signed ?? true`).
- Faux positif sur des typos de commentaires (les `//` sont corrects, le
  diff dans le prompt était tronqué).

### Tests

- 21 tests sur `interpreter-aire-undercurve.test.ts` (3 nouveaux + 18
  existants) : tous verts.
- 20 tests V1 `interpreter-integrale.test.ts` : tous verts inchangés
  (couleur bleue `#1e40af` vérifiée par C5).
- Svelte autofixer sur le bloc dispatcher modifié : aucun issue.
- Régression complète : **2326/2326** tests verts sur tout `geometry-core`
  (+ 2 skipped pour bench perf manuel V1).

### Détail d'implémentation à noter pour Phase 4

- La page démo `/geometry-demo/sliders/aire` doit montrer la **différence
  pédagogique** entre `integrale` et `aire` sur la même figure (cas clé
  du brief). Suggestion : `f = courbe("y = x^3 - x")` avec deux sliders
  pour les bornes, et afficher `I = integrale(f, a, b)` (bleu) et
  `A = aire(f, a, b)` (vert) côte à côte avec `mtexte`.
- La doc utilisateur `docs/ref/geometry-dsl/aire.md` peut largement se
  calquer sur `docs/ref/geometry-dsl/integrale.md` (vocabulaire,
  syntaxe, exemples), en mettant en avant la sémantique non-signée et
  la couleur verte par défaut.

---

## Documents produits

- `docs/wip/geometry/aire-study.md` — étude / spec validée par l'utilisateur
  (5 décisions clés enregistrées).
- `docs/wip/geometry/aire-progress.md` — ce document, journal de reprise.

# Implémentation `aire(f, a, b)` — progression

> Document de reprise pour le builtin DSL `aire(f, a, b)`. Mis à jour après
> chaque phase. Spec et plan : `docs/wip/geometry/aire-study.md`.

---

## État actuel

**Phase 1 terminée** ✅ — Extension du type `GeoIntegralArea` (champ `signed`)

- branchement de la closure compute dans `figure.createIntegralArea` selon
  le mode signé/non-signé.

Phases restantes :

- **Phase 2** — Builtin DSL `case 'aire'` (surcharge sur le case existant).
- **Phase 3** — Rendu SVG (branche `fillOpacity` uniforme dans `GeometryCanvas.svelte`).
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

## Documents produits

- `docs/wip/geometry/aire-study.md` — étude / spec validée par l'utilisateur
  (5 décisions clés enregistrées).
- `docs/wip/geometry/aire-progress.md` — ce document, journal de reprise.

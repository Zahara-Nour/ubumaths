# Improper Integrals V5 — Progress Document

> Crash recovery + suivi exécution du plan TDD défini dans
> `docs/wip/geometry/improper-integrals-study.md`.

## Décisions verrouillées (utilisateur, 2026-05-01)

1. **Alias `infini`** : NON. `inf` seul en V5.
2. **T₀, MAX_T** : constantes V5 (T₀=10, k=0..6 → T_max=640).
3. **Notification divergence** : `console.warn` V5.
4. **Indicateur visuel SVG** : reporté V6.
5. **`aire_entre(f, g, -inf, +inf)`** : gardé V5.

## Statut des phases

- [x] Phase 0 — Étude + GO utilisateur
- [x] **Phase 1 — Tokens DSL `inf` / `+inf` / `-inf`** ✓
- [x] **Phase 2 — Helper routing improper** ✓
- [x] **Phase 3 — `improperIntegrate` numérique (cœur)** ✓
- [x] **Phase 4 — Rendu SVG clipping viewport** ✓
- [x] **Phase 5 — Démo + doc utilisateur** ✓
- [x] **Phase 6 — Quality checks finaux** ✓

## Phase 5 + 6 récap (2026-05-01)

**Démo** : `src/routes/(public)/geometry-demo/integrales/improper/+page.svelte`
(8 sections : 1 exp, 2 gaussienne, 3 Cauchy, 4 1/x², 5 1/x divergent,
6 sin oscillant, 7 curseur, 8 aire_entre).

**Code review final** (Sonnet 4.6) → "Good", 3 améliorations appliquées :

- Constante `PROBE_T_MAX = T₀·2^K_MAX = 640` exportée depuis `improper.ts`
  (DRY : remplace duplication dans figure.ts + area-builtin-helper.ts).
- Clipping SVG : `b === -Infinity` (explicite) au lieu de `b < 0` (ambigu).
- Test `a === b = ±∞` : assertion explicite `value === 0, status convergent`
  au lieu d'une disjonction vacuously-true.
- TODO inline dans `improper.ts` pour la limitation heuristique sur les
  intégrandes lentement-convergents (V6).

**Quality checks finaux** :

- ESLint : 0 erreur sur tous les fichiers V5.
- `pnpm check:incremental` : 0 erreur (9 errors pré-existants filtrées
  slides/demo + extern).
- Tests V5 : **48/48 verts** (16 improper + 14 parser-inf + 14 interpreter
  - 4 svg).
- Non-régression : **2782/2782 tests verts** sur DSL + integration +
  rendering (115 fichiers de tests).
- Pas de pollution du cache : 9 errors filtrées vérifiées pré-existantes
  via `git stash` + run.

## Documents produits (Phase 0–6)

- `docs/wip/geometry/improper-integrals-study.md` (étude Phase 0)
- `docs/wip/geometry/improper-integrals-progress.md` (ce document)

## Phases 2+3+4 — Récap (2026-05-01)

**Fichiers créés** :

- `src/lib/mathAST/integration/improper.ts` (cœur numérique : diagnose + substitution)
- `src/lib/mathAST/integration/__tests__/improper.test.ts` (16 tests)
- `src/lib/geometry-core/dsl/__tests__/interpreter-improper.test.ts` (14 tests)
- `src/lib/geometry-core/rendering/__tests__/integral-svg-improper.test.ts` (4 tests)

**Fichiers modifiés** :

- `src/lib/geometry-core/types/geo-value.ts` — ajout `InfinityParam` + `isInfinityParam`
- `src/lib/geometry-core/graph/compute-position.ts` — `resolveScalarParam` gère `InfinityParam`
- `src/lib/geometry-core/graph/figure.ts` — nouvelle méthode `createImproperIntegralArea`
- `src/lib/geometry-core/dsl/area-builtin-helper.ts` — routing improper + bornes ±∞
- `src/lib/geometry-core/rendering/svg-primitives.ts` — clipping viewport sur les 2 renderers

**Tests cumulés V5** : 14 (parser-inf) + 16 (improper.ts) + 14 (interpreter-improper) + 4 (svg) = **48 tests verts**
**Non-régression** : 1526/1526 sur DSL+integration, 271/271 sur rendering, **0 régression**.

## Phase 1 — Tokens DSL `inf` ✓ (2026-05-01)

**Implémentation** :

- `parser.ts` : `parseUnary()` accepte PLUS comme no-op récursif.
- `interpreter.ts` : `Interpreter.constructor()` pré-charge `inf` =
  `{ type: 'nombre', value: Infinity }` en scope global.

**Tests** : 14/14 verts dans `__tests__/parser-inf.test.ts` (parsing,
sémantique JS héritée, parseUnary PLUS, scope macro isolé).

**Non-régression** : 1171/1171 tests DSL existants verts.

**Code review** : code-reviewer (Sonnet 4.6) → "Excellent", 2 améliorations
mineures appliquées (macro-scope isolation test + comment inline).

## Documents produits

- `docs/wip/geometry/improper-integrals-study.md` (étude Phase 0)
- `docs/wip/geometry/improper-integrals-progress.md` (ce document)

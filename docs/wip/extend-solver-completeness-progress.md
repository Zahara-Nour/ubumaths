# Extend Solver Completeness — Progress

Spec: [extend-solver-completeness.md](./extend-solver-completeness.md)

## Overview

| Gap                             | Priorite | Status                                 | Tests            |
| ------------------------------- | -------- | -------------------------------------- | ---------------- |
| Gap 1: Trig periodic solutions  | HIGH     | Phase 1 DONE, Phase 2 pending decision | 46 pass + 9 todo |
| Gap 2: Degree 4 polynomials     | MEDIUM   | Not started                            | —                |
| Gap 3: Mixed/factored equations | LOW      | Not started                            | —                |

---

## Gap 1: Trigonometric periodic solutions

### Phase 1: Bounded domain enumeration — DONE

**Commits:**

- `ad92a0b8` feat(solve): return full periodic solution families for trig equations
- `3487c980` test(solve): expand trig periodic tests from 11 to 55 cases
- `01c23a46` fix(custom-generator): wrap fractions in {} for implicit multiplication

**Files modified:**

| File                                    | Changes                                                                                                                                                                              |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `solve/types.ts`                        | `PeriodicSolutionFamily` interface, `periodicSolutions?` on `SolveResult`                                                                                                            |
| `solve/solvers/transcendental.ts`       | Rewrite de `solveTrigonometric()`: `extractTrigEquation()`, toutes les solutions de base (2 pour sin/cos, 1 pour tan), arguments lineaires `sin(ax+b)`, retourne `periodicSolutions` |
| `sign/helpers/zeros.ts`                 | `enumeratePeriodicZeros()`, `buildPeriodicZeroSymbolic()`. `findZeros()` enumere tous les `baseSolution + k*period` dans les domaines bornes                                         |
| `custom-generator.ts`                   | Fix `{1/2}\pi` wrapping (fractions dans multiplication implicite)                                                                                                                    |
| `solve/__tests__/trig-periodic.test.ts` | 55 tests                                                                                                                                                                             |

**Bugs corriges en cours de route:**

1. `mapNode` extrayait le `2` de `sin(2x)` comme constante de l'equation → remplace par `extractTrigEquation()`
2. Precision flottante aux bornes (`3*Math.PI` manque) → tolerance epsilon 1e-9
3. `1/2π` ambigu dans `toCustom` → wrapping `{1/2}π`

**Ce qui marche:** sin/cos/tan = 0 avec arguments lineaires (ax), domaines bornes fermes/ouverts/semi-ouverts, unions d'intervalles, domaines negatifs, grands domaines, deduplication des solutions (sin=1, cos=-1).

**Tests:** deduplication, coefficients lineaires (cos(3x), tan(2x)), bornes open/closed, unions d'intervalles, domaines negatifs, sous-periodes, grands domaines (10π), precision aux bornes (k=50), domaines ponctuels, signe correct (+/-), tri des zeros, regression non-trig (x²-4).

### Phase 1 — Limitations connues

1. **`extractTrigEquation` ne gere que trig(x) = 0.** Apres normalisation, `sin(x) - 1/2` devient une forme non reconnue (ex: `2*sin(x) - 1`). Les equations `trig(x) = c` avec c ≠ 0 ne produisent pas de solutions periodiques. (9 tests todo documentent ceci.)

2. **Domaines non bornes non geres.** `sin(x)` sur ℝ retombe sur le chemin non-periodique (2 solutions de base seulement). Incorrect pour l'analyse de signe.

### Phase 2: Domaines non bornes — EN ATTENTE DE DECISION

Options discutees:

1. **Restreindre a une periode** : retourner les zeros sur `[base, base + period]` et marquer le resultat comme periodique (style tableau de signes lycee)
2. **Retourner un statut special** (`'periodic'`) dans `SignAnalysisResult`
3. **Ne rien changer** : exiger des domaines bornes pour les expressions trig

Decision utilisateur: en attente.

### Phase 3 (future): Extension aux constantes non nulles

Etendre `extractTrigEquation` pour gerer les formes normalisees (`k*trig(x) + c = 0`). Debloquerait les 9 tests todo et permettrait l'analyse de signe de `sin(x) - 1/2` sur un domaine borne.

---

## Gap 2: Degree 4 polynomials — NOT STARTED

**Probleme:** `polynomialSolver` ne gere que les cubiques (Cardano) et puissances pures. Les quartiques generales (ax⁴ + bx³ + cx² + dx + e = 0) ne sont pas supportees. Bloque l'analyse de variation des polynomes de degre 5.

**Approches envisagees dans la spec:**

- Ferrari symbolique
- Durand-Kerner numerique + raffinement Newton
- Companion matrix eigenvalues

**Prerequis:** aucun (independant du Gap 1).

---

## Gap 3: Mixed/factored equations — NOT STARTED

**Probleme:** `x·sin(x) = 0`, `(x²-1)·e^x = 0` classes comme 'mixed', non resolues. Decomposition en facteurs possible pour beaucoup de cas.

**Approche envisagee:** detecter la structure produit et resoudre chaque facteur independamment. `analyzeExpressionStructure` dans `interval-sign.ts` decompose deja les produits — logique similaire applicable au zero-finding.

**Prerequis:** Gap 1 (au moins Phase 1) pour que les zeros periodiques des facteurs trig soient trouves.

---

## Regression check

11 003 tests mathAST passent (196 fichiers). Zero regressions.

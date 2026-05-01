# Singularity rigorous V2 — progression

**Statut** : Phase 1 livrée. Phases 2-3 à venir.
**Étude amont** : `docs/wip/geometry/singularity-rigorous-study.md`.
**Brief** : `docs/wip/geometry/prompt-singularity-rigorous-study.md`.

---

## Phase 0 — Étude ✅

Document : `docs/wip/geometry/singularity-rigorous-study.md` (~370 lignes).

Décisions validées par l'utilisateur (5 questions ouvertes + 3 clarifs C1-C3) :

- Sémantique : Option C — comportement par type de discontinuité.
- Migration : Option α — préserver `warnIfSingularitySuspected`, supprimer
  les internes V1.
- Format warn : multi-ligne avec header + bullets, conclusion "L'intégrale
  diverge — retour NaN.".
- Boundary `sqrt(x)` sur `[0, 4]` : silencieux (limite intérieure finie).
- `sign(x)` : limitation V2 documentée, fix repoussé V3.
- C1 : `jump` interior → silencieux (pas de warn pédago).
- C2 : warn ssi `causesDivergence: true` ; conclusion uniforme.
- C3 : `analyzeRangeContinuity` peut throw, le wrapper catche silencieusement.

---

## Phase 1 — `analyzeRangeContinuity` + refactor wrapper ✅

### Livrables

- `src/lib/geometry-core/dsl/singularity-warn.ts` : réécriture complète V2.
  - **Nouveau** : `RangeDiscontinuity`, `analyzeRangeContinuity`.
  - **Nouveau format warn** dans `warnIfSingularitySuspected` (multi-ligne,
    header + bullets, conclusion divergence).
  - **Supprimés** : `SingularityFinding`, `findSingularitiesInRange`,
    `formatSingularityWarnings`, et tout le code d'échantillonnage
    (collectCandidates, sample, findZero, findFirstWhere, findTanPole,
    shortLabel, interp, SAMPLE_COUNT, ZERO_TOL).
- `src/lib/geometry-core/dsl/__tests__/singularity-warn-v2.test.ts` :
  19 tests sur `analyzeRangeContinuity` (clean, removable, jump, infinite,
  essential, boundary, edge cases). Inclut un test périodique `tan(x) ∈ [0, 2π]`
  ajouté après la code review.
- `src/lib/geometry-core/dsl/__tests__/singularity-warn.test.ts` :
  réécrit pour cibler le wrapper V2 (18 tests : silent cases / warning cases /
  format and prefix / robustness).

### Tests

- 19 tests `singularity-warn-v2.test.ts` : tous verts.
- 18 tests `singularity-warn.test.ts` : tous verts.
- 1105/1105 tests DSL (`src/lib/geometry-core/dsl/__tests__/`) : tous verts.
  Aucune régression dans les builtins consommateurs (signature
  `warnIfSingularitySuspected` préservée).

### Code review (corrections appliquées)

Issues retournées par `code-reviewer` (Sonnet) et corrigées :

1. **Important — Correctness clarity** : ajout d'un commentaire dans
   `classifyCausesDivergence` expliquant que pour `essential` la
   `continuity.ts` met toujours `leftLimit`/`rightLimit` à `null`, donc
   la garde `interiorLimit === null` couvre aussi la branche
   essentielle au boundary.
2. **Minor — JSDoc `pointToNumber`** : ajout d'une note explicitant que
   `analyzeContinuity` n'émet en pratique que des points numériques pour
   les expressions traitées par `integrale`/`aire` (skip sur points
   symboliques = graceful degradation, pas un cas chaud).
3. **Minor — Test périodique manquant** : ajout du test `tan(x) ∈ [0, 2π]`
   suggéré dans l'étude § 5.

Issues notées non bloquantes (pas d'action) :

- `formatPoint` sur `(-0.0005).toFixed(3)` produit `"-0"` — non bug, cas
  rare, format console acceptable.
- Troncature UTF-8 par `.slice` — non issue (UTF-16 code units, pas de
  surrogate pairs dans les sorties de `toCustom`).

### Détail d'implémentation à noter pour Phase 2

- Le wrapper `warnIfSingularitySuspected` est défensif (catche tout) →
  les builtins peuvent l'appeler sans `try/catch`.
- `analyzeRangeContinuity` peut throw — Phase 2 (intégration NaN) devra
  l'appeler **avec** un `try/catch` pour décider du retour.
- Le résultat de `analyzeRangeContinuity` retourné par le builtin doit
  être **caché** sur l'élément créé par `figure.createIntegralArea` pour
  que le compute closure (réactivité au drag des bornes) puisse en
  consulter une version statique sans réappeler l'analyse.

---

## Phase 2 — Intégration dans `case 'integrale'` et `case 'aire'` (À FAIRE)

### Tâches restantes

| Tâche                                                                                    | Agent / Méthode           |
| ---------------------------------------------------------------------------------------- | ------------------------- |
| 2.1 Lister comportements (sémantique Q1) en français, attendre validation                | direct (Claude)           |
| 2.2 Tests sur le builtin DSL : `integrale 1/x` → NaN, `integrale sin(x)/x` → valeur,     | `test-automator` (Sonnet) |
| etc. (~10 nouveaux tests dans `builtins.test.ts`)                                        |                           |
| 2.3 Modifier `case 'integrale'` et `case 'aire'` pour consulter `analyzeRangeContinuity` | direct (Claude)           |
| 2.4 Cacher le résultat sur l'élément (cf. O5 du study)                                   | direct (Claude)           |
| 2.5 Adapter le compute closure pour retourner NaN sur infinite/essential interior        | direct (Claude)           |
| 2.6 Code review                                                                          | `code-reviewer` (Sonnet)  |
| 2.7 Commit                                                                               | `commit-manager`          |

### Question ouverte O5 à trancher en Phase 2

Cache des discontinuités sur `GeoIntegralArea` (champ optionnel) **vs**
fermeture lexicale dans le compute closure. La conversation Phase 0 a
mentionné cette question mais ne l'a pas explicitement tranchée. À
clarifier avant le 2.3.

---

## Phase 3 — Quality checks finaux (À FAIRE)

| Tâche                                                  | Méthode               |
| ------------------------------------------------------ | --------------------- |
| 3.1 `pnpm format` sur fichiers modifiés                | direct                |
| 3.2 `pnpm check:incremental`                           | direct                |
| 3.3 `mcp__svelte__svelte-autofixer` si .svelte modifié | direct (a priori non) |

---

## Documents produits (à supprimer ou conserver à la fin)

- `docs/wip/geometry/singularity-rigorous-study.md` ✅ conserver
- `docs/wip/geometry/singularity-rigorous-progress.md` ✅ conserver
- `docs/wip/geometry/prompt-singularity-rigorous-study.md` ✅ conserver
  (brief amont)
- `src/lib/mathAST/analysis/__tests__/_throwaway-singularity-study.test.ts`
  ✅ supprimé (Phase 1, données capturées dans le study).

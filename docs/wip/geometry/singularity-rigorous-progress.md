# Singularity rigorous V2 — progression

**Statut** : ✅ TERMINÉ — Phases 0, 1, 2, 3 livrées.
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

## Phase 2 — Intégration dans `case 'integrale'` et `case 'aire'` ✅

### Décisions clarifiées avant implémentation

- **O5 cache** : Option **b** validée — fermeture lexicale dans le compute
  closure de `createIntegralArea`. Implémentation : nouveau champ optionnel
  `discontinuities?: readonly Discontinuity[]` sur les options de
  `createIntegralArea`. Le builtin passe la liste **complète** (sortie de
  `analyzeContinuity`, non filtrée par bornes) ; le closure filtre contre
  les bornes courantes à chaque drag.
- **Quirk `courbe()`** : le DSL parse `y = E` en `--E` (double opposé), ce
  qui fait que `analyzeContinuity` mé-classifie removable comme essential.
  Solution : helper `unwrapDoubleOpposites` dans `singularity-warn.ts` et
  helper `getAllDiscontinuities(expr, var)` qui unwrap + analyse + swallow
  les exceptions. Le builtin utilise `getAllDiscontinuities`.
- **Cas removable interior** : l'intégrale converge mais `numericIntegrate`
  échantillonne aux endpoints, ce qui produit `NaN` si on évalue exactement
  au point removable (ex. `sin(0)/0`). Solution : split avec sliver `1e-9`
  autour du point dans le compute closure.

### Livrables

- `src/lib/geometry-core/dsl/singularity-warn.ts` :
  - **Nouveau** : `pointValue: number` sur `RangeDiscontinuity`.
  - **Nouveau** : export `classifyDiscontinuitiesForRange(allDiscs, a, b)`
    (extraction du filtre interne, utilisé par le compute closure à chaque
    drag — pas de re-analyse).
  - **Nouveau** : export `getAllDiscontinuities(expr, var)` (unwrap +
    `analyzeContinuity`, défensif).
  - **Nouveau** : helper interne `unwrapDoubleOpposites`.
- `src/lib/geometry-core/graph/figure.ts createIntegralArea` :
  - Nouvelle option `discontinuities?: readonly Discontinuity[]`.
  - Compute closure : NaN guard + split-points pour signed=true et
    signed=false.
- `src/lib/geometry-core/dsl/builtins.ts` `case 'integrale'` et `case 'aire'` :
  - Appel à `getAllDiscontinuities` à la création.
  - Passage à `createIntegralArea` via `options.discontinuities`.
- `src/lib/geometry-core/dsl/__tests__/interpreter-singularity-nan.test.ts` :
  15 tests (5 NaN intégrale + 5 finite intégrale + 4 aire + 1 réactivité drag).

### Tests

- 15 tests `interpreter-singularity-nan.test.ts` : tous verts.
- 37 tests Phase 1 (singularity-warn + singularity-warn-v2) : restent verts.
- 1559/1561 tests sur `geometry-core/dsl` + `geometry-core/graph` (2 skipped
  préexistants) : aucune régression.

### Code review (corrections appliquées)

Issues retournées par `code-reviewer` (Sonnet) et adressées :

1. **Important — Latent issue antiderivative + jump** : commentaire ajouté
   dans le path `signed=true` + `cachedCompiledF` expliquant pourquoi le
   chemin est sûr aujourd'hui (`integrateDefinite` refuse les piecewise
   discontinus) et comment ajouter le guard si une régression apparaît.
2. **Important — Tolerance asymetry 1e-7 vs 1e-9** : commentaire ajouté
   sur `removableNotZero` justifiant le choix `1e-7` (matche la précision
   de `findRoots`) vs `splitEps = 1e-9` (sliver pour adaptive Simpson).
3. **Minor — `unwrapDoubleOpposites` paire seulement** : commentaire ajouté
   notant la limitation et la condition pour étendre.
4. **Minor — JSDoc `getAllDiscontinuities` downstream consequence** :
   précisé que `null` désactive le NaN guard (fail-open).
5. **Minor — TODO(perf)** : `analyzeContinuity` est appelé deux fois à la
   création (via `getAllDiscontinuities` + via `warnIfSingularitySuspected`).
   Coût single-digit ms, comment posé pour optimisation future.
6. **Minor — Tests manquants** : ajout de **C4** (`aire(sin(x)/x, -1, 1)`
   — exerce le path signed=false avec interior removable) et **B5**
   (`integrale(x^2, 1, 0)` — valide le `direction * total` sur bornes
   inversées).

### Détail d'implémentation à noter pour Phase 3

- Pas de fichier `.svelte` modifié → pas d'autofixer à lancer.
- `pnpm format` sur les 4 fichiers modifiés (singularity-warn.ts, figure.ts,
  builtins.ts, interpreter-singularity-nan.test.ts) + le doc.
- `pnpm check:incremental` sur les modifications.

---

## Phase 3 — Quality checks finaux ✅

- ✅ `pnpm format` sur les 6 fichiers modifiés (singularity-warn.ts,
  builtins.ts, figure.ts, et les 3 fichiers de test) : tous unchanged
  (Prettier déjà appliqué par les pre-commit hooks lint-staged).
- ✅ `pnpm check:incremental` : exit 0. Les 9 errors résiduelles affichées
  dans le summary sont dans `slides/demo` et `extern/` (chemins exclus du
  script). Aucune erreur dans les fichiers du scope.
- N/A `mcp__svelte__svelte-autofixer` : aucun fichier `.svelte` modifié.

---

## Documents produits (à supprimer ou conserver à la fin)

- `docs/wip/geometry/singularity-rigorous-study.md` ✅ conserver
- `docs/wip/geometry/singularity-rigorous-progress.md` ✅ conserver
- `docs/wip/geometry/prompt-singularity-rigorous-study.md` ✅ conserver
  (brief amont)
- `src/lib/mathAST/analysis/__tests__/_throwaway-singularity-study.test.ts`
  ✅ supprimé (Phase 1, données capturées dans le study).

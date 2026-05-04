# Pedagogical Steppers MVP — Progress

> Source: `docs/wip/pedagogical-steppers-mvp-prompt.md`
> Started: 2026-05-04

## Phase 0 — Spécification TDD (terminée)

### Décisions architecturales validées

**Comportements A-G** : tous validés tels que proposés.

**Q1 — Nommage** : `rewrite(node, config)` (court, sans ambiguïté car co-localisé dans son module).

**Q2 — Emplacement des fichiers** : `common/` pour l'infrastructure transversale.

- `common/step-renderer-base.ts` (types renderer)
- `common/technical-renderer.ts` (renderer générique)
- `common/rewriting-engine.ts` (moteur)
- `solve/pedagogical-renderer.ts` (spécifique au domaine solve)
- `pedagogical-evaluate/types.ts` (type stubs phase 5+)

**Q3 — TechnicalRenderer** : générique unique via dump des champs `BaseStep` + reflection sur les champs spécifiques.

**Q4 — Format de sortie** : `'structured' | 'text'` au MVP. `'markdown'` / `'latex'` ajoutés à la demande.

**Q5 — Démo** : `solve/__tests__/dual-rendering-demo.test.ts`.

**Q6 — Scope arithmetic-steps** :

- (a) Limité à `evaluate(exact)` + suppression doublon `evaluateNumeric`. PAS d'unification recorder/renderer.
- (b) Changements float→exact acceptables. Tests existants ajustés au besoin.

### Confirmations process

- 4 commits intermédiaires (1 par phase)
- `code-reviewer` agent après chaque phase
- Quality checks (eslint + check:incremental) à la toute fin uniquement
- Modèle Opus pour les sous-agents

### Observations issues de la lecture du code

- `SchoolLevel` actuellement défini dans `step-generator/types.ts:12` — **canonisation prévue** dans `common/step-renderer-base.ts`, re-export depuis `step-generator/types.ts` pour préserver les imports existants (arithmetic-steps.ts, components/calculator/, etc.).
- Conflit de nom détecté : `lib/components/GradeBadgeSelector.svelte` utilise un type `SchoolLevel` distinct (valeurs anglaises `'primary'|'middle'|'high'`). Aucun croisement avec celui du moteur math — laissé intact.
- `arithmetic-steps.ts` a déjà des descriptions adaptées par `SchoolLevel` (lignes 27-64). Le refactor MVP touche uniquement la partie calcul (`evaluateNumeric` → `evaluate(exact)`), pas la partie pédagogique.

---

## Phase 1 — Infrastructure (terminée ✓)

### Sous-tâches

- [x] 1.1 `common/step-renderer-base.ts` + canonisation `SchoolLevel`
- [x] 1.2 `common/technical-renderer.ts` + tests (13/13 ✓)
- [x] 1.3 `common/rewriting-engine.ts` + tests d'isolation (18/18 ✓)
- [x] 1.4 Refactor `simplify.ts` (API publique inchangée, 92/92 simplify tests ✓, 0 régression sur 11907 mathAST tests)
- [x] 1.5 Type stubs `pedagogical-evaluate/types.ts`
- [x] `code-reviewer` agent (Opus) — appliqué les fixes : doc iterations, doc bestCost sentinel, doc RewriteStep.label, doc bridge phase, +2 tests (cost tie-break, onStep ordering)
- [ ] commit Phase 1

### Fichiers créés / modifiés

**Créés :**

- `src/lib/mathAST/common/step-renderer-base.ts` (~140 LOC, types only)
- `src/lib/mathAST/common/technical-renderer.ts` (~95 LOC, `GenericTechnicalRenderer` class)
- `src/lib/mathAST/common/rewriting-engine.ts` (~250 LOC, `rewrite()` engine)
- `src/lib/mathAST/common/__tests__/technical-renderer.test.ts` (13 tests)
- `src/lib/mathAST/common/__tests__/rewriting-engine.test.ts` (18 tests)
- `src/lib/mathAST/pedagogical-evaluate/types.ts` (~110 LOC, types only)

**Modifiés :**

- `src/lib/mathAST/common/index.ts` (re-exports types only — voir note ci-dessous)
- `src/lib/mathAST/step-generator/types.ts` (re-export `SchoolLevel` depuis `common/step-renderer-base`)
- `src/lib/mathAST/simplify/simplify.ts` (refactor : thin wrapper autour de `rewrite()`, API publique inchangée)

### Décisions de design issues de Phase 1

**Engine API : `onStep` callback plutôt que `recorder` injecté.**
Le prompt suggérait `recorder?: StepRecorder<TStep>` dans `EngineConfig`. J'ai préféré un callback `onStep(step)` car le recorder a des sémantiques domaine-spécifiques (`setPhase`, lookup de descriptions FR) que l'engine ne peut pas inférer. Le wrapper (`simplify`) bridge le callback vers le recorder. Cette approche est aussi plus flexible pour les futurs renderers qui n'utiliseraient pas de recorder.

**Engine assigne toujours `current = after` après pre/post-process.**
`nodesEqual` est structurelle et ignore les métadonnées (`displayStyle`, etc.). Si pre-process produit un node structurellement égal mais sémantiquement enrichi (e.g. `divide(x, y)` sans displayStyle → `divide(x, y, 'fraction')`), il faut MAJ `current` pour propager la canonisation. Le `onStep` reste gaté sur `!nodesEqual` (pas de step spurious).

**`technical-renderer.ts` et `rewriting-engine.ts` PAS re-exportés depuis `common/index.ts`.**
Ces fichiers ont des imports runtime (`pattern/rule`, `pattern/match`, `latex-generator`). Si re-exportés depuis `common/index.ts`, ils sont chargés transitivement par tout module qui importe `from '../common'` (limits/, domain/), ce qui change l'ordre de chargement et casse 50 tests downstream (continuity, range, differentiability) via un problème d'initialisation subtil que je n'ai pas réussi à trouver précisément (probablement dépendance circulaire latente activée par l'ordre de chargement).

**Fix retenu :** seuls les TYPES (no-runtime) sont re-exportés depuis `common/index.ts`. Consommateurs importent directement :

```typescript
import { GenericTechnicalRenderer } from '$lib/mathAST/common/technical-renderer';
import { rewrite } from '$lib/mathAST/common/rewriting-engine';
```

Note ajoutée dans `common/index.ts` pour expliquer cette restriction.

### Validation Phase 1

- [x] Engine isolé : 18/18 tests passent
- [x] Technical renderer : 13/13 tests passent
- [x] Simplify : 92/92 tests passent (3 skipped baseline)
- [x] Continuity (était cassée pendant développement) : 30/30 passent
- [x] Suite complète mathAST : **11907/11928 passent** (18 skipped + 3 todo, 0 régression)
- [x] Doc de progression écrite

---

## Phase 2 — Renderer pédagogique solve (à faire)

## Phase 3 — Refactor arithmetic-steps (à faire)

## Phase 4 — Démo end-to-end + README (à faire)

## Phase 5 — Quality checks + commit final (à faire)

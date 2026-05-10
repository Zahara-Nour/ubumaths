# Refactor — Stratégies de validation des exercices Python

> Document de spécification validé pour le refactor du module de validation des
> exercices Python. **Aucune implémentation à ce stade** — ce doc est le point
> d'entrée d'une session d'implémentation future.

---

## Contexte

Le module `python_exercises` expose aujourd'hui trois stratégies de validation
sous forme de discriminated union sur le champ `type` :

- `output` : compare stdout/stderr (4 modes de comparaison : exact, text,
  numeric, custom Python)
- `unit_test` : appelle une fonction et compare la valeur de retour
- `ast` : vérifie des prédicats structurels sur le code (uses_loop,
  defines_function, etc.). Peut **optionnellement** déclencher des
  `output_tests` à la suite si tous les checks AST passent.

### Le problème de design

`ast` peut combiner avec `output_tests` mais **pas** avec `unit_tests`.
C'est de la dette de conception, pas un choix architectural. La table actuelle :

| Stratégie   | AST checks | output tests  | unit tests |
| ----------- | ---------- | ------------- | ---------- |
| `output`    | ✗          | ✓             | ✗          |
| `unit_test` | ✗          | ✗             | ✓          |
| `ast`       | ✓          | ✓ (optionnel) | ✗          |

Asymétrie : `ast` peut greffer du output, mais ni `output` ni `unit_test`
ne peuvent greffer des AST checks.

### Insight clé

Un AST check **n'est pas une stratégie de validation** : c'est un **prédicat
structurel orthogonal**. Il évalue la _forme_ du code, pas son _comportement_.
Ce sont deux dimensions indépendantes qui doivent être modélisées séparément.

---

## Décisions arrêtées

### Q1 — Naming

`ast_requirements` (côté code/types) et `behavior` (côté code/types).
UI consommateur : « Forme du code » et « Comportement attendu ».

### Q2 — Result shape

`failed_layer: 'ast' | 'behavior' | null` + `behavior_kind?: 'output' | 'unit_test'`.
Refus de l'enum composite (`'ast_failed' | 'output_failed' | ...`) — couple deux
dimensions orthogonales.

### Q3 — Short-circuit AST

**OUI**. Si AST échoue, behavior n'est pas exécuté. Cohérent avec le
comportement actuel de `ast.output_tests`.

### Q4 — Au moins un des deux requis

**OUI**. Refus Zod si `ast_requirements` absent ET `behavior` absent.
Pas d'exo "vide".

### Q5 — Migration DB

**Big-bang** sans tolérance lecture transitoire. Volume bas (~10 exos prod) →
migration en millisecondes, déploiement atomique.

### Q6 — Wording UI

- « Forme du code » (et non « Vérifications structurelles » : trop jargon)
- « Comportement attendu »

### Q7 — AST seul autorisé

**OUI**. Cas pédagogiques réels (refactor à l'identique fonctionnel mais
forme imposée).

### Q8 — SyntaxError

Si AST configuré : traité comme échec AST avec message dédié
(« Erreur de syntaxe Python : … »).
Sans AST : behavior s'exécute, runtime error remonte naturellement.

---

## Architecture cible

### Types TypeScript

```ts
interface ValidationConfig {
	ast_requirements?: ASTRequirement[];
	behavior?: BehaviorCheck;
	timeout_ms?: number;
}

type BehaviorCheck =
	| { kind: 'output'; test_cases: OutputTestCase[]; comparison: OutputComparison }
	| { kind: 'unit_test'; function_name: string; test_cases: UnitTestCase[] };

interface ValidationResult {
	valid: boolean;
	failed_layer: 'ast' | 'behavior' | null;
	behavior_kind?: 'output' | 'unit_test';
	ast_issues?: string[];
	test_results: TestCaseResult[];
	error?: string;
	execution_time_ms: number;
}
```

`ASTRequirement`, `OutputTestCase`, `UnitTestCase`, `OutputComparison`,
`TestCaseResult` : **inchangés** par rapport à l'existant.

### Contrainte Zod

`.refine` au niveau `ValidationConfig` : `ast_requirements?.length || behavior`
doit être truthy. Sinon erreur explicite « Au moins une vérification de forme
ou un comportement attendu doit être défini ».

---

## Comportements de la pipeline

Ordre d'exécution worker : **AST checks → behavior** (avec short-circuit).

| #   | Cas                                | `valid`                                                             | `failed_layer`         | `behavior_kind`             | `ast_issues`                       | `test_results`                        |
| --- | ---------------------------------- | ------------------------------------------------------------------- | ---------------------- | --------------------------- | ---------------------------------- | ------------------------------------- |
| 1   | AST + behavior, tout passe         | `true`                                                              | `null`                 | `'output'` ou `'unit_test'` | `[]`                               | tous passed                           |
| 2   | AST échoue → behavior pas exécuté  | `false`                                                             | `'ast'`                | présent (info)              | non-vide                           | `[]`                                  |
| 3   | AST passe, behavior échoue         | `false`                                                             | `'behavior'`           | présent                     | `[]`                               | au moins un failed                    |
| 4   | AST seul (sans behavior)           | dépend                                                              | `'ast'` ou `null`      | `undefined`                 | dépend                             | `[]`                                  |
| 5   | Behavior seul (sans AST)           | dépend                                                              | `'behavior'` ou `null` | présent                     | absent                             | dépend                                |
| 6   | SyntaxError + AST configuré        | `false`                                                             | `'ast'`                | présent (info)              | `['Erreur de syntaxe Python : …']` | `[]`                                  |
| 7   | SyntaxError + pas d'AST            | `false`                                                             | `'behavior'`           | présent                     | absent                             | runtime error                         |
| 8   | Timeout global                     | `false`                                                             | n/a                    | n/a                         | n/a                                | `error: 'Délai d\'exécution dépassé'` |
| 9   | Comparator custom (kind: 'custom') | inchangé, géré dans behavior layer (timeout/namespace isolé propre) |

---

## Migration DB

### Transformation des 3 anciens formats

```
old { type: 'output', test_cases, comparison, timeout_ms }
→ new { behavior: { kind: 'output', test_cases, comparison }, timeout_ms }

old { type: 'unit_test', function_name, test_cases, timeout_ms }
→ new { behavior: { kind: 'unit_test', function_name, test_cases }, timeout_ms }

old { type: 'ast', requirements, timeout_ms }
→ new { ast_requirements: requirements, timeout_ms }

old { type: 'ast', requirements, output_tests, output_comparison, timeout_ms }
→ new {
    ast_requirements: requirements,
    behavior: {
      kind: 'output',
      test_cases: output_tests,
      comparison: output_comparison ?? { kind: 'exact' }
    },
    timeout_ms
  }
```

### Livrables migration (Phase 3)

- 1 migration SQL `UPDATE python_exercises SET validation_config = ...` avec
  `CASE … WHEN validation_config->>'type' = '…'` pour chaque ancien type
- 1 migration `down` documentée (transformation inverse)
- 1 script `scripts/validate-python-exercises-migration.ts` qui parse old + new
  pour chaque exo, vérifie équivalence sémantique, fail si non-équivalent
- Réécriture des seeds : `20260508163407_seed_python_exercises_samples.sql`
- Worker accepte uniquement le nouveau schéma dès le déploiement

---

## Form UI

### Layout

```
┌─ Forme du code ──────────────────────────┐
│ ☐ Activer les vérifications de forme    │
│   (si activé : panneau requirements)     │
└──────────────────────────────────────────┘
┌─ Comportement attendu ───────────────────┐
│ Type : [ Aucun | Sortie stdout | Test de fonction ]
│ (sous-form selon le type sélectionné)    │
└──────────────────────────────────────────┘
```

Toggle AST et selector behavior **indépendants**. Au moins un des deux requis
(validation Zod côté serveur + feedback inline dans le form).

### Composants

- Extraire `ASTRequirementsPanel.svelte` (réutilisable, déjà un sous-bloc dans
  l'UI actuelle)
- Refonte de `ExerciseStrategyEditor.svelte` (passer de 3 branches mutuellement
  exclusives à 2 panneaux indépendants)

---

## Plan d'implémentation par phases

### Phase 1 — Types TS + schémas Zod nouveaux

**Agent** : `backend-developer` (Opus)
**Effort** : ~2h
**Livrable** : commit `feat(python-exercises): add new ValidationConfig types`

- Nouveaux types dans `src/lib/shared/python/types.ts`
- Nouveaux schémas dans `src/lib/server/validation/python-exercises.ts` ET
  `src/lib/shared/python/worker/messages.ts`
- Tests Zod : round-trip valid configs, rejection invalid configs (refine "au
  moins un des deux")
- **Garder anciens schémas en parallèle** sous nom `*Legacy` pour la transition
  worker phase 2
- Code review (`code-reviewer`, Opus)

### Phase 2 — Worker refactor

**Agent** : `backend-developer` (Opus)
**Effort** : ~3-4h
**Livrable** : commit `feat(python-exercises): refactor worker to AST + behavior pipeline`

- Refactor `validateExerciseCode()` en pipeline :
  1. Si `config.ast_requirements` non-vide → `runASTChecks()` (extrait du
     `validateAST` actuel, isolé en helper réutilisable)
  2. Si AST échoue → return early avec `failed_layer: 'ast'`
  3. Sinon `runBehavior(config.behavior)` selon `kind`
- `runBehavior` factorise le contenu actuel de `validateOutputComparison` /
  `validateUnitTests`
- Tests worker : matrice complète des 9 cas du tableau ci-dessus
- **Le worker accepte uniquement le nouveau schéma** (pas de tolérance)
- Code review

### Phase 3 — Migration DB + script de validation

**Agent** : `supabase-expert`
**Effort** : ~2-3h
**Livrable** : commit `feat(python-exercises): migrate validation_config to ast+behavior schema`

- Migration SQL avec `CASE … WHEN` pour les 3 formes anciennes (cf. section
  Migration DB ci-dessus)
- Migration `down` : transformation inverse
- Script TS de validation post-migration (équivalence sémantique)
- Réécriture des seeds (`20260508163407_seed_python_exercises_samples.sql`)
- **Tu push avec `pnpm db:migrate` après dry-run sur snapshot**
- Code review (`supabase-expert`)

### Phase 4 — Form UI refonte

**Agent** : `frontend-developer` (Opus)
**Effort** : ~3-4h
**Livrable** : commit `feat(python-exercises): redesign strategy editor with form + behavior UI`

- Refonte `ExerciseStrategyEditor.svelte` : 2 panneaux indépendants
- Extraction `ASTRequirementsPanel.svelte`
- Wording : « Forme du code » et « Comportement attendu »
- `mcp__svelte__svelte-autofixer` obligatoire après modifs
- Tests : édition d'exo (la migration aura déjà rapatrié au nouveau format)
- Code review

### Phase 5 — Consommateurs

**Agent** : `frontend-developer` + `backend-developer`
**Effort** : ~2h
**Livrable** : commit `feat(python-exercises): update consumers for new ValidationConfig shape`

- `src/routes/(public)/python-exercises/[id]/+page.svelte` :
  `isUnitTest` → `config.behavior?.kind === 'unit_test'` (gating du panneau
  "Tester ma fonction")
- `ExerciseValidationResult.svelte` : afficher AST issues séparément du
  behavior result, avec wording adapté au `failed_layer`
- API endpoints + tests :
  - `src/routes/api/python-exercises/+server.ts`
  - `src/routes/api/python-exercises/server.test.ts`
  - `src/routes/api/python-exercises/[id]/server.test.ts`
- `ExerciseForm.svelte` (ligne 135 : `form.validation_config.type`)
- Page `/mine` si listing affiche le type de validation
- Code review

### Phase 6 — Cleanup

**Effort** : ~1h
**Livrable** : commit `chore(python-exercises): remove legacy ValidationConfig schema`

- Supprimer schémas Zod `*Legacy` (phase 1)
- Supprimer logique worker legacy si reste (chaînage `ast.output_tests`)
- Update docs `docs/ref/python/`
- Doc de progression finale `docs/wip/python-validation-refactor-progress.md`
  listant tous les commits

### Phase 7 — Quality gates

**Effort** : ~1h

À la **fin** uniquement, conformément à CLAUDE.md :

- `pnpm check:incremental` (vérifier baseline ≈ 9 errors / 46 warnings stable)
- `npx eslint <fichiers modifiés>`
- `mcp__svelte__svelte-autofixer` sur tous les `.svelte` modifiés
- Audit sécurité (`security-auditor`, Opus) — focus sur worker isolation et
  injection via comparator code

---

## Effort total estimé

**~14-17h** sur l'ensemble des 7 phases. Volume DB bas (~10 exos) → pas de
contingence migration majeure.

---

## Fichiers à toucher (inventaire)

### Schémas et types

- `src/lib/shared/python/types.ts`
- `src/lib/server/validation/python-exercises.ts`
- `src/lib/shared/python/worker/messages.ts`
- `src/lib/types/python-exercises.ts`

### Worker

- `src/lib/workers/pyodide.worker.ts` (lignes ~2000-2700 : `validateAST`,
  `validateOutputComparison`, `validateUnitTests`)

### Migration DB

- Nouvelle migration `supabase/migrations/<timestamp>_refactor_python_validation_config.sql`
- `supabase/migrations/20260508163407_seed_python_exercises_samples.sql`
- Nouveau script `scripts/validate-python-exercises-migration.ts`

### Form UI

- `src/lib/components/python/exercises/ExerciseStrategyEditor.svelte` (refonte)
- Nouveau `src/lib/components/python/exercises/ASTRequirementsPanel.svelte`
- `src/lib/components/python/exercises/ExerciseForm.svelte` (ligne 135)
- `src/lib/components/python/exercises/ExerciseValidationResult.svelte`

### Consommateurs

- `src/routes/(public)/python-exercises/[id]/+page.svelte` (lignes 46, 110)
- `src/routes/(public)/python-exercises/[id]/edit/+page.svelte`
- `src/routes/(public)/python-exercises/new/+page.svelte`
- `src/routes/api/python-exercises/+server.ts`
- `src/routes/api/python-exercises/server.test.ts`
- `src/routes/api/python-exercises/[id]/server.test.ts`

---

## Critères de validation finale

Avant de marquer le refactor complet :

- [ ] Tous les 10 exos prod chargent sans erreur sur `/python-exercises/[id]`
- [ ] Tous les 10 exos prod soumettent et valident correctement
- [ ] La création d'un nouvel exo "AST + unit_test" (cas Briggs) fonctionne
      end-to-end (form → DB → viewer → submission)
- [ ] La création d'un nouvel exo "AST seul" fonctionne end-to-end
- [ ] Le panneau "Tester ma fonction" s'affiche dès qu'il y a un
      `behavior.kind === 'unit_test'`, indépendamment de la présence d'AST
- [ ] Les tests existants passent (`pnpm test:server` sur le module python)
- [ ] `pnpm check:incremental` : baseline préservée
- [ ] Audit sécurité : pas de régression sur l'isolation worker

---

## Démarrage de la session d'implémentation

Ouvrir une nouvelle session avec un prompt du type :

> Implémente le refactor python-exercises validation. Spec validée :
> `docs/wip/python-validation-refactor-spec.md`. Démarre par la Phase 1.

L'agent doit lire ce doc en premier, puis exécuter phases 1→7 en suivant le
plan, avec doc de progression `docs/wip/python-validation-refactor-progress.md`
mise à jour après chaque commit.

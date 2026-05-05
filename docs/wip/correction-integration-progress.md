# Intégration steppers pédagogiques aux corrections — Progression

> Source : `docs/wip/correction-integration-prompt.md`
> Branche : `main`
> Dernière mise à jour : 2026-05-05

## Objectif global

Permettre aux questions de déclarer une **correction Mode B** :
les étapes pédagogiques sont générées automatiquement par
`pedagogical-arithmetic` ou `pedagogical-solve/linear` au lieu d'être
écrites à la main par l'auteur. Le composant Svelte
`<GeneratedStepsCorrection>` (Phase 3) les affiche aux élèves.

## Décisions architecturales validées (Phase 0)

| #   | Décision                                                                             |
| --- | ------------------------------------------------------------------------------------ |
| Q1  | Glue dans `correction-generator.ts` (séparé de `correction-resolver.ts`)             |
| Q2  | `gradeLevelToSchoolLevel()` — multi-grades → plus haut, vide → `'lycee'`             |
| Q3  | `MarkdownRenderer` existant pour rendu LaTeX                                         |
| Q4  | **V1 = 2 kinds** : `arithmetic` + `linear-equation` (skip `arithmetic-from-blank`)   |
| Q5  | `_renderedSteps` sur `ResolvedCorrection`, `generatedSteps` copié sur les deux types |
| Q6  | V1 passive (pas d'interactivité)                                                     |
| Q7  | Fallback silencieux + `console.warn`                                                 |
| Q8  | 2 questions migrées (1 primaire arithmétique + 1 collège équation)                   |
| Q9  | **Auto-call** dans `generateInstance()` avec early-return strict                     |

## Phases

### ✅ Phase 1 — Schéma types + grade level mapping

**Fichiers :**

- `src/lib/questions/grade-level-to-school-level.ts` (nouveau)
- `src/lib/questions/grade-level-to-school-level.test.ts` (12 tests)
- `src/lib/questions/types.ts` (ajout `GeneratedSteps`, `GeneratedStepsOptions`,
  extension `QuestionCorrection.generatedSteps` et
  `ResolvedCorrection.{generatedSteps, _renderedSteps}`)
- `src/lib/questions/template-schema.ts` (Zod : `generatedStepsSchema`,
  `generatedStepsOptionsSchema`, mise à jour `correctionSchema` et version stricte)
- `src/lib/questions/__tests__/template-schema.test.ts` (14 nouveaux tests)

**Résultat :** types cohérents, Zod aligné, mapping CP-T validé.

### ✅ Phase 2 — `generateCorrection()` + auto-call

**Fichiers :**

- `src/lib/questions/generator/correction-generator.ts` (nouveau)
- `src/lib/questions/generator/correction-generator.test.ts` (16 tests)
- `src/lib/questions/generator/instance-generator.ts` (import + auto-call à la
  fin de `generateInstance`, copie de `generatedSteps` sur la `ResolvedCorrection`)
- `src/lib/questions/generator/instance-generator.test.ts` (4 tests d'intégration)
- `src/lib/questions/validators/template-validator.ts` (correction valide aussi
  avec `generatedSteps` seul)

**Comportements clés :**

1. **Early-return strict** : si `correction.generatedSteps` absent, retour
   immédiat (zéro allocation, zéro log).
2. **Fallback silencieux** : tout throw / parse-fail dans la pipeline mène à un
   `console.warn` + retour de l'instance sans `_renderedSteps`. Le composant
   tombera sur Mode A si présent.
3. **`schoolLevel: 'auto'`** : résolu via `gradeLevelToSchoolLevel()`.
   Override explicite possible.
4. **`primaire` bumpé à `college`** pour `kind: 'linear-equation'` (linear
   algebra hors curriculum primaire).
5. **`generatedSteps` copié tel quel** sur `ResolvedCorrection` (les `{{vars}}`
   ne sont résolus que dans `generateCorrection`).

**Code review (code-reviewer agent)** : OK. 2 micro-corrections appliquées
(spread superflu, commentaire sur le cast `RelationNode`).

**Tests cumulés Phase 1+2** : 47 tests dédiés aux nouveautés, 0 régression
(les 11 échecs préexistants dans `variable-resolver`, `color-integration`,
`test-exact-repro`, `e2e-fill-blanks-pipeline` ne sont pas liés aux changements
— vérifié via `git stash`).

### ⏳ Phase 3 — Composant `<GeneratedStepsCorrection>` + `CorrectionCard`

À faire :

- Composant Svelte `src/lib/components/questions/GeneratedStepsCorrection.svelte`
- Étendre `CorrectionCard.svelte:76-87` pour basculer sur Mode B si
  `_renderedSteps` présent.
- Tests visuels (ou snapshot) sur 2-3 cas.
- Svelte autofixer.

### ⏳ Phase 4 — Migration de 2 questions tests

À faire :

- 1 question primaire (arithmétique CM2) → Mode B
- 1 question collège (équation linéaire 4e/3e) → Mode B
- Vérification visuelle dev server.
- Captures avant/après dans ce doc.

### ⏳ Phase 5 — Quality checks + doc + commit final

À faire :

- `npx eslint <fichiers modifiés>`
- `pnpm check:incremental`
- Svelte autofixer sur les `.svelte` modifiés
- Mise à jour de ce doc
- Commits structurés (un par phase ou un commit Phase 3-5 selon volume)

## État actuel des fichiers (après Phase 2)

**Nouveaux :**

- `src/lib/questions/grade-level-to-school-level.{ts,test.ts}`
- `src/lib/questions/generator/correction-generator.{ts,test.ts}`

**Modifiés :**

- `src/lib/questions/types.ts`
- `src/lib/questions/template-schema.ts`
- `src/lib/questions/__tests__/template-schema.test.ts`
- `src/lib/questions/generator/instance-generator.{ts,test.ts}`
- `src/lib/questions/validators/template-validator.ts`

## Tests cumulés Phase 1+2

| Suite                                 | Avant | Après           | Δ       |
| ------------------------------------- | ----- | --------------- | ------- |
| `grade-level-to-school-level.test.ts` | —     | 12              | +12     |
| `template-schema.test.ts`             | 40    | 54              | +14     |
| `correction-generator.test.ts`        | —     | 16              | +16     |
| `instance-generator.test.ts`          | 43    | 47              | +4      |
| **Phase 1+2 total**                   | —     | **47 nouveaux** | **+47** |

## Risques connus / TODOs futurs (post-V1)

- **`arithmetic-from-blank`** : skip en V1, à reconsidérer si la duplication
  d'expression entre `expectedAnswer` (`{{eval:a+b}}`) et
  `generatedSteps.expression` (`{{a}}+{{b}}`) devient gênante en pratique.
- **`kind: 'solve'` (algorithmique)** : pas couvert (le pedagogical-solve V1
  ne supporte que linéaire).
- **Composant interactif (étape par étape)** : V1 passive uniquement.
- **UI éditeur de questions** : écriture JSON manuelle pour V1.
- **Hybridation Mode A + Mode B** : Mode A prioritaire si les deux présents.

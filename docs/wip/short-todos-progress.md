# Short Todos — Progress

> Document de progression du tunnel `docs/wip/short-todos-prompt.md`
> (6 tracks A-F). Mis à jour après chaque track livré pour permettre la
> reprise en cas de crash.

---

## Track A — `expressionName` dans `InstanceBlank` ✅ Livré

**Date** : 2026-05-07
**Effort réel** : ~1.5h (estimation prompt révisée : 3-4h — gain via tests
existants déjà solides + structure claire)
**Tests ajoutés** : 11 (7 unit + 3 e2e + 4 deduction = 14 ; un test e2e
ajouté sur recommandation code review)
**Régressions** : 0

### Décisions arbitrées (pré-implémentation)

- Pattern d'usage 3 préservé (caller sans blank, 3e arg explicite) — pas
  de `@deprecated`.
- Quand `expressionName` (3e arg) ET `blank.expressionName` sont tous
  deux présents, le 3e arg explicite **prime** (override caller).
- Marker `<<expr:NAME>>` avec NAME inconnu de `answerFormats` → fallback
  silencieux sur le path « pas de marker » (cohérent avec le comportement
  pré-existant).

### Fichiers modifiés

| Fichier                                                      | Changement                                                                                                                                                           |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/questions/generator/assign-blank-indices.ts`        | Ajout `expressionNameByIndex?: Record<number, string>` dans `AssignBlankIndicesResult`, peuplé quand un marker matche un `answerFormat` connu. JSDoc regex enrichie. |
| `src/lib/questions/types.ts`                                 | Ajout `expressionName?: string` dans `InstanceBlank`.                                                                                                                |
| `src/lib/questions/generator/instance-generator.ts`          | Propagation depuis `blankResult.expressionNameByIndex[i]` vers `InstanceBlank.expressionName`. Commentaire d'invariant ajouté.                                       |
| `src/lib/mathAST/pedagogical-arithmetic/target-extractor.ts` | Auto-déduction : `effectiveExpressionName = expressionName ?? blank?.expressionName`. JSDoc Q9 mise à jour.                                                          |

### Fichiers de tests modifiés

| Fichier                                                     | Tests ajoutés                                                     |
| ----------------------------------------------------------- | ----------------------------------------------------------------- |
| `assign-blank-indices.test.ts`                              | 7 (`describe('expressionNameByIndex — track A propagation map')`) |
| `__tests__/generation-fill-blanks.test.ts`                  | 4 (3 e2e + 1 mixed marker/plain ajouté post-review)               |
| `pedagogical-arithmetic/__tests__/target-extractor.test.ts` | 4 (`describe('expressionName deduction from blank (Track A)')`)   |

### Code review

`code-reviewer` (Opus). Verdict : « Ready to merge with optional minor
doc fixes ». 3 minor doc fixes appliqués post-review :

1. JSDoc `types.ts` : « replaces » → « complements » (le 3e arg n'est
   pas remplacé, il coexiste).
2. JSDoc `assign-blank-indices.ts` : commentaire regex étendu pour
   documenter la contrainte « NAME doit commencer par `expression` ».
3. Commentaire d'invariant ajouté dans `instance-generator.ts:305` sur
   l'alignement `i` ↔ `assignBlankIndices` counter.

Plus 1 suggestion adoptée : test e2e mixed marker + plain blank.

### Quality checks

- ESLint : clean sur les 4 fichiers source + 3 fichiers de tests
- TypeScript : `pnpm check:incremental` → 0 erreur (les 9 ERRORS du
  total brut sont dans `slides/demo`/`extern/`, filtrées par le script)
- Tests Track A : 104/104 verts (assign-blank-indices 32 + generation-
  fill-blanks 38 + target-extractor 34)
- Tests régression : `pedagogical-arithmetic` 256/256, `questions/`
  baseline 11 failures préexistantes orthogonales (variable-resolver,
  color-integration, e2e-fill-blanks-pipeline) — confirmé par stash test.

### Commit

À créer.

---

## Track B, C, D, E, F — En attente

Statut : non démarrés.

---

## Documents produits dans ce tunnel

À compléter à la fin du tunnel.

- `docs/wip/short-todos-progress.md` (ce fichier)
- Commits :
  - `4e24ed457` — révision short-todos-prompt
  - Track A — à venir

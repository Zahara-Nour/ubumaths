# Prompt de continuation — Phase 5 : Transformer de migration

## Contexte

On redessine le systeme fill-in-blanks d'UbuMaths. Les phases 1-4 sont terminees :

- **Phase 1** (COMPLETE) : Types TypeScript — supprime `type`/`transformType`, ajoute `getQuestionType()`, `InstanceBlank`, `blankDefaults`, `answerFormats`, `expressions`, `orderIndependent`
- **Phase 2** (COMPLETE) : Parser ubumark — `<<expr:NAME>>` detection, module `assignBlankIndices()`
- **Phase 3** (COMPLETE) : Pipeline de generation — `instance-generator.ts` construit `blanks[]`, `expressions[]`, appelle `assignBlankIndices()`
- **Phase 4** (COMPLETE) : Validation per-blank — pipeline validationRules → mode infere → requiredForm → constraints, nouvelle signature `validateQuantityAnswer`

**Phase 5 concerne le transformer de migration** (`src/lib/migration/question-transformer.ts`) qui convertit les 633 anciennes questions TinyMath vers le nouveau format.

## Documents de reference

- **`docs/wip/fill-in-blanks-redesign.md`** — Doc d'architecture (LIRE EN ENTIER). Sections pertinentes pour Phase 5 : 3.3, 4.4, 4.6, 4.10, section 7 etape 8
- **`docs/wip/fill-in-blanks-v2-plan.md`** — Plan d'implementation, section "Phase 5"
- **`docs/wip/fill-in-blanks-v2-progress.md`** — Etat de progression des phases 1-4
- **`.claude/old-questions.json`** — 633 questions TinyMath (exemples concrets pour tests)

## Etat actuel du code

### Transformer (`src/lib/migration/question-transformer.ts`, 2145 lignes)

Le transformer convertit deja les questions TinyMath vers le format v2 mais avec des lacunes :

- Il utilise `detectQuestionType()` pour classifier mais le champ `type` n'est plus stocke (Phase 1)
- `extractBlanks()` existe (L1773-1807) mais genere des `blanks[]` simples avec juste `position` + `expectedAnswer`
- **8 tests pre-existants echouent** (depuis Phase 1) sur des assertions `type` et `solution` obligatoire qui ne sont plus vrais
- Le transformer ne gere pas encore : `answerFormats`, `expressions`, `unit` sur blanks, reclassification result/rewrite, conversion answerField

### Tests existants

- `question-transformer.test.ts` : 56 tests (48 pass, **8 fail** pre-existants)
- Les 8 echecs sont lies aux changements de Phase 1 (plus de `type`, `solution` optionnel)

## Objectif Phase 5

Adapter le transformer pour produire la nouvelle structure complete :

### 5.1 — Reclasser les 369 questions result/rewrite en fill_in_blanks

Les result/rewrite sont les questions ou l'eleve evalue une expression (ex: `3+5`). Elles deviennent des fill_in_blanks avec :

- Variable `expression` → convention `expression*`
- `blanks[]` generes depuis `solutionss`
- `answerFormats` extraits si present (ex: `10^?`, `?*10^?`)

**Critere de reclassification** : `expressions[]` present dans l'ancienne question ET pas de `choicess` (sinon c'est un QCM)

### 5.2 — Convertir les 157 questions answerField

Le template de phrase `\text{Le double de }$$&1$$\text{ est }$$...$$\text{.}` devient un statement ubumark :

```
Le double de ${{a}}$ est $?$.
```

Technique : regex `\text{...}` → texte, `$$...$$` → `$?$` ou `${{var}}$` selon le contenu. Generer `blanks[]` depuis `solutionss`.

### 5.3 — Gerer les 45 questions Grandeurs (globalIndex 426-470)

Ajouter `unit: { expected: false }` sur les blanks. L'unite est dans l'expression (ex: `&1 km = ? m`), l'eleve tape un nombre pur.

### 5.4 — Gerer `expressions2` (2 questions QCM, globalIndex 478, 587)

Creer une variable `expression2` depuis `expressions2[i]` en plus de `expression1` depuis `expressions[i]`. Ces questions restent `multiple_choice`.

### 5.5 — Retirer `type` de la sortie

Le champ `type` n'est plus stocke dans le template (Phase 1). Le transformer ne doit plus le mettre.

### 5.6 — Corriger les 8 tests pre-existants

Les 8 tests qui echouent doivent etre corriges pour refleter la nouvelle structure (pas de `type`, `solution` optionnel, `blanks[]` obligatoire pour fill_in_blanks).

## Exemples concrets (`.claude/old-questions.json`)

| globalIndex | Type ancien    | Description                                   |
| ----------- | -------------- | --------------------------------------------- |
| 10          | result/rewrite | Simple (sans answerFormat)                    |
| 413         | result/rewrite | answerFormat `10^?` (puissances)              |
| 411         | result/rewrite | answerFormat `?*10^?` (notation scientifique) |
| 0           | answerField    | Mono-trou                                     |
| 51          | fill-in        | `?` dans l'expression                         |
| 426-470     | Grandeurs      | Conversions d'unites                          |
| 478, 587    | QCM            | `expressions2` (2 expressions simultanees)    |

## Workflow TDD (OBLIGATOIRE)

1. **Phase 5.0** : Proposer les comportements en francais, attendre validation utilisateur
2. **Phase 5.1** : Ecrire les tests (`src/lib/migration/__tests__/transformer-fill-blanks.test.ts`)
3. **Phase 5.2** : Implementer dans `question-transformer.ts`
4. **Phase 5.3** : Verification (tests passent, tsc --noEmit)
5. **Phase 5.4** : Code review + commit + doc progression

## Fichiers a modifier

| Fichier                                          | Modifications                                                                                    |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `src/lib/migration/question-transformer.ts`      | Reclassifier result/rewrite, convertir answerField, unit Grandeurs, expressions2, retirer `type` |
| `src/lib/migration/question-transformer.test.ts` | Corriger 8 tests pre-existants                                                                   |

## Fichier a creer

| Fichier                                                       | Description                          |
| ------------------------------------------------------------- | ------------------------------------ |
| `src/lib/migration/__tests__/transformer-fill-blanks.test.ts` | Tests Phase 5 avec exemples concrets |

## Regles ABSOLUES

1. **LIRE le doc d'architecture EN ENTIER** (`docs/wip/fill-in-blanks-redesign.md`) avant de coder
2. **Workflow TDD** : proposer les comportements → attendre validation → ecrire tests → implementer
3. **Utiliser des exemples concrets** de `.claude/old-questions.json` pour les tests
4. **NE PAS devirer du doc** : si le doc dit X, faire X
5. **Code review** (agent) apres implementation
6. **Documents de progression** dans `docs/wip/fill-in-blanks-v2-progress.md`
7. **Commits reguliers** apres chaque etape validee

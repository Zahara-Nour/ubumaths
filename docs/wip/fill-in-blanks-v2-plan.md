# Plan : Fill-in-Blanks Redesign v2 — Implementation

## Context

Le systeme fill-in-blanks d'UbuMaths doit etre reecrit pour unifier les 3 modes d'interaction de l'ancien systeme TinyMath (result/rewrite 369q, answerField 157q, fill-in 107q = 633 questions). Un premier plan (v1) a ete implemente puis **entierement reverte**. 5 sessions de design ont produit un doc d'architecture complet (`docs/wip/fill-in-blanks-redesign.md`) avec toutes les decisions resolues.

**Doc de reference** : `docs/wip/fill-in-blanks-redesign.md` (LIRE EN ENTIER avant chaque phase)

---

## Phase 1 : Types TypeScript (Step 2) — COMPLETE

## Phase 2 : Parser ubumark + assignBlankIndices (Steps 3-4) — COMPLETE

---

## Phase 3 : Pipeline de generation (Step 6)

**Objectif** : Le generateur detecte les expressions, construit `blanks[]`, appelle `assignBlankIndices()`.

### Phase 3.0 — TDD : Specification

- Proposer comportements, attendre validation

### Phase 3.1 — Tests (travail direct, Opus)

**Fichier** : `src/lib/questions/generator/__tests__/generation-fill-blanks.test.ts` (nouveau)

- [ ] Generation instance fill_in_blanks simple (1 trou math)
- [ ] Generation avec convention `expression*` + answerFormat
- [ ] Generation multi-trous (expression + statement)
- [ ] Fusion `blankDefaults` + overrides per-blank
- [ ] `blanks[].type` infere (`math` vs `text`)
- [ ] `expressions[]` peuple correctement
- [ ] `expectedAnswerLatex` genere pour flash back
- [ ] `solution` absent pour fill_in_blanks
- [ ] Utiliser exemples de `.claude/old-questions.json` (globalIndex 10, 51, 413, 411)

### Phase 3.2 — Implementation (travail direct, Opus)

**Fichier** : `src/lib/questions/generator/content-resolver.ts`

- [ ] Inserer marqueur `<<expr:NAME>>` pour variables commencant par `expression`
- [ ] Pipeline answerFormat : resolution variables → conversion LaTeX

**Fichier** : `src/lib/questions/generator/instance-generator.ts`

- [ ] `resolveVariationWithShared()` : merger `blankDefaults`, `answerFormats`, `solution` optionnel
- [ ] Detecter variables `expression*` → extraire `instance.expressions[]`
- [ ] Copier `answerFormats` → `expressions[i].answerFormat`
- [ ] Construire `instance.blanks[]` avec type infere + config validation fusionnee
- [ ] Appeler `assignBlankIndices()` apres resolution du statement
- [ ] Generer `expectedAnswerLatex` pour chaque blank math
- [ ] Verification coherence `totalBlanks == blanks.length`

### Phase 3.3 — Verification

- [ ] Tests passent : `pnpm test:server src/lib/questions/generator/`
- [ ] Tests existants du generateur passent toujours
- [ ] `npx tsc --noEmit` sur fichiers modifies

### Phase 3.4 — Code review + Commit + Doc

- **Agent** : `code-reviewer` (Opus)
- Commit
- [ ] Mettre a jour `docs/wip/fill-in-blanks-v2-progress.md`

### Checklist Phase 3

- [ ] Code fonctionnel
- [ ] Tests passent (nouveaux + existants)
- [ ] Code review effectue
- [ ] Doc progression mise a jour
- [ ] Commit cree

---

## Phase 4 : Validation (Step 7)

**Objectif** : Validation per-blank avec mode infere, nouvelle signature `validateQuantityAnswer`.

### Phase 4.0 — TDD : Specification

- Proposer comportements, attendre validation

### Phase 4.1 — Tests (travail direct, Opus)

**Fichier** : `src/lib/utils/__tests__/answer-validator-blanks.test.ts` (nouveau)

- [ ] Validation per-blank : trou math equivalence (areEquivalent)
- [ ] Validation per-blank : trou math approximate (precision)
- [ ] Validation per-blank : trou math unite (validateQuantityAnswer)
- [ ] Validation per-blank : trou texte fuzzy (accents, casse, Levenshtein)
- [ ] Pipeline complet : validationRules → validation mode → checkRequiredForm → applyConstraints
- [ ] Switch `choices !== undefined` au lieu de `type`
- [ ] `values: string[]` + `valuesLatex: string[]` interface

### Phase 4.2 — Implementation (travail direct, Opus)

**Fichier** : `src/lib/utils/answer-validator.ts`

- [ ] `validateAnswer()` : switch sur `instance.choices !== undefined`
- [ ] Nouvelle branche fill_in_blanks : validation per-blank
- [ ] Chaque trou math : validationRules OU mode infere, puis checkRequiredForm, puis applyConstraints
- [ ] Chaque trou texte : fuzzy matching
- [ ] Supprimer `UnitValidationOptions`, `validateNumericalWithUnit`
- [ ] Supprimer references a `options.unitOptions`

**Fichier** : `src/lib/questions/units/validator.ts`

- [ ] Nouvelle signature : `validateQuantityAnswer(userAnswer, correctAnswer, precision?, requiredUnit?)`
- [ ] Supporter tous les modes de `PrecisionType`
- [ ] Supprimer `requireSameSymbol` de `ValidationOptions`

### Phase 4.3 — Verification

- [ ] Tests passent : `pnpm test:server src/lib/utils/`
- [ ] Tests unites existants passent : `pnpm test:server src/lib/questions/units/`
- [ ] `npx tsc --noEmit` sur fichiers modifies

### Phase 4.4 — Code review + Commit + Doc

- **Agent** : `code-reviewer` (Opus)
- Commit
- [ ] Mettre a jour `docs/wip/fill-in-blanks-v2-progress.md`

### Checklist Phase 4

- [ ] Code fonctionnel
- [ ] Tests passent (nouveaux + existants units 770 tests)
- [ ] Code review effectue
- [ ] Doc progression mise a jour
- [ ] Commit cree

---

## Phase 5 : Transformer de migration (Step 8)

**Objectif** : Adapter le transformer pour produire la nouvelle structure (blanks, answerFormats, expressions, unit).

### Phase 5.0 — TDD : Specification

- Proposer comportements avec exemples concrets de `.claude/old-questions.json`
- Attendre validation

### Phase 5.1 — Tests (travail direct, Opus)

**Fichier** : `src/lib/migration/__tests__/transformer-fill-blanks.test.ts` (nouveau)

- [ ] Result/rewrite simple (globalIndex 10) → fill_in_blanks avec expression + blanks
- [ ] Result/rewrite avec answerFormat `10^?` (globalIndex 413)
- [ ] Result/rewrite multi-trous `?*10^?` (globalIndex 411)
- [ ] AnswerField mono-trou (globalIndex 0) → statement avec `$?$`
- [ ] AnswerField multi-trous
- [ ] Fill-in avec `?` dans expression (globalIndex 51)
- [ ] Questions Grandeurs (globalIndex 426-470) → `unit: { expected: false }`
- [ ] `expressions2` QCM (globalIndex 478, 587)
- [ ] `type` absent de la sortie

### Phase 5.2 — Implementation (travail direct, Opus)

**Fichier** : `src/lib/migration/question-transformer.ts`

- [ ] Reclasser 369 result/rewrite en fill_in_blanks
- [ ] Generer `blanks[]` depuis `solutionss`
- [ ] Extraire `answerFormat` → `shared.answerFormats`
- [ ] Convertir 157 answerField (regex `\text{...}` → texte, `$$...$$` → `$?$`)
- [ ] Generer `blanks[]` pour answerField
- [ ] 45 questions Grandeurs : `unit: { expected: false }`
- [ ] `expressions2` : creer variable `expression2`
- [ ] Retirer `type` de la sortie

### Phase 5.3 — Verification

- [ ] Tests passent : `pnpm test:server src/lib/migration/`
- [ ] Tests existants du transformer passent
- [ ] `npx tsc --noEmit` sur fichiers modifies

### Phase 5.4 — Code review + Commit + Doc

- **Agent** : `code-reviewer` (Opus)
- Commit
- [ ] Mettre a jour `docs/wip/fill-in-blanks-v2-progress.md`

### Checklist Phase 5

- [ ] Code fonctionnel
- [ ] Tests passent
- [ ] Code review effectue
- [ ] Doc progression mise a jour
- [ ] Commit cree

---

## Phase 6 : Composant FillBlanksInput (Step 5)

**Objectif** : Reecrire le composant avec parcours AST unifie, support expressions, flash back.

### Phase 6.0 — TDD : Specification

- Proposer comportements UI, attendre validation

### Phase 6.1 — Implementation (Agent `frontend-developer`, Opus)

**Fichier** : `src/lib/components/question-inputs/FillBlanksInput.svelte`

- [ ] Parcours AST unifie (un seul chemin de rendu)
- [ ] `\placeholder[N]{}` deja dans le statement (inseres par assignBlankIndices)
- [ ] Noeuds expression (tag `expressionName`) : augmenter avec `= answerFormat[\placeholder]`
- [ ] Flash back : `expectedAnswerLatex` en lecture seule
- [ ] Interface : `bind:values` + `bind:valuesLatex`
- [ ] Svelte autofixer obligatoire

**Fichiers connexes** :

- [ ] `FlashCard.svelte` : adapter integration FillBlanksInput
- [ ] `QuestionCard.svelte` : adapter integration FillBlanksInput
- [ ] Svelte autofixer sur chaque fichier .svelte modifie

### Phase 6.2 — Composants existants a integrer (PAS reecrire)

- `MathPrompt.svelte` : gere `\placeholder[N]{}` (existant, fonctionnel)
- `BlankInput.svelte` : input texte pour `[_]` (existant, fonctionnel)
- `ParagraphNode.svelte` : routage AST (existant, fonctionnel)
- `InputState` : passer en 0-based (fait en Phase 1)

### Phase 6.3 — Verification

- [ ] Svelte autofixer execute sur tous les .svelte modifies
- [ ] `npx tsc --noEmit` sur fichiers modifies

### Phase 6.4 — Code review + Commit + Doc

- **Agent** : `code-reviewer` (Opus)
- Commit
- [ ] Mettre a jour `docs/wip/fill-in-blanks-v2-progress.md`

### Checklist Phase 6

- [ ] Code fonctionnel
- [ ] Svelte autofixer execute
- [ ] Code review effectue
- [ ] Doc progression mise a jour
- [ ] Commit cree

---

## Phase 7 : Dictionnaire vocabulaire FR (Step 9)

**Objectif** : Creer le dictionnaire de ~200-300 termes math FR.

### Phase 7.1 — Implementation (travail direct, Haiku pour generation de donnees, Opus pour types/fonctions)

**Fichier** : `src/lib/data/math-dictionary-fr.ts` (nouveau)

- [ ] Interface `MathTerm` : `{ term, tags, definition, image?, level, synonyms? }`
- [ ] ~200-300 termes couvrant les themes des 633 questions
- [ ] Fonctions utilitaires : `getTermsForLevel()`, `getTermsByTag()`, `getAllTerms()`
- [ ] Export default du dictionnaire

### Phase 7.2 — Tests (travail direct, Opus)

- [ ] Tests basiques : lookup, filtering, pas de doublons
- [ ] `pnpm test:server src/lib/data/`

### Phase 7.3 — Code review + Commit

- **Agent** : `code-reviewer` (Sonnet — fichier simple)
- Commit direct

### Checklist Phase 7

- [ ] Code fonctionnel
- [ ] Tests passent
- [ ] Code review effectue
- [ ] Commit cree

---

## Phase 8 : Quality Checks finaux + Integration (Step 10)

**Objectif** : Verification globale, quality checks, doc finale.

### Phase 8.1 — Quality Checks (UNIQUEMENT a la fin)

- [ ] ESLint : `npx eslint <tous les fichiers modifies>`
- [ ] TypeScript : `npx tsc --noEmit` sur tous les fichiers .ts modifies
- [ ] Svelte autofixer sur tous les fichiers .svelte modifies

### Phase 8.2 — Tests d'integration

- [ ] `pnpm test:server` — tous les tests serveur passent
- [ ] Test E2E manuel si possible : generer une instance, valider une reponse

### Phase 8.3 — Documentation finale

- [ ] Finaliser `docs/wip/fill-in-blanks-v2-progress.md`
- [ ] Lister tous les fichiers modifies/crees
- [ ] Lister tous les commits

### Phase 8.4 — Commit final

- **Agent** : `commit-manager` (Opus)

---

## Fichiers modifies/crees (resume)

### Modifies

| Fichier                                                     | Phase |
| ----------------------------------------------------------- | ----- |
| `src/lib/questions/types.ts`                                | 1     |
| `src/lib/ubumark/types/ast.ts`                              | 1     |
| `src/lib/questions/generator/instance-generator.ts`         | 1, 3  |
| `src/lib/utils/answer-validator.ts`                         | 1, 4  |
| `src/lib/questions/generator/content-resolver.ts`           | 1, 3  |
| `src/lib/ubumark/parser/markdown-parser.ts`                 | 2     |
| `src/lib/questions/units/validator.ts`                      | 4     |
| `src/lib/migration/question-transformer.ts`                 | 5     |
| `src/lib/components/question-inputs/FillBlanksInput.svelte` | 6     |
| `src/lib/components/questions/FlashCard.svelte`             | 6     |
| `src/lib/components/questions/QuestionCard.svelte`          | 6     |

### Crees

| Fichier                                                                | Phase |
| ---------------------------------------------------------------------- | ----- |
| `src/lib/questions/generator/assign-blank-indices.ts`                  | 2     |
| `src/lib/ubumark/__tests__/parser/blank-and-expression.test.ts`        | 2     |
| `src/lib/questions/generator/assign-blank-indices.test.ts`             | 2     |
| `src/lib/questions/generator/__tests__/generation-fill-blanks.test.ts` | 3     |
| `src/lib/utils/__tests__/answer-validator-blanks.test.ts`              | 4     |
| `src/lib/migration/__tests__/transformer-fill-blanks.test.ts`          | 5     |
| `src/lib/data/math-dictionary-fr.ts`                                   | 7     |
| `docs/wip/fill-in-blanks-v2-progress.md`                               | 1-8   |

## Verification end-to-end

1. `pnpm test:server` — tous les tests passent
2. Generer une instance fill_in_blanks depuis un template de test
3. Verifier que `assignBlankIndices` produit le bon statement
4. Verifier que la validation per-blank fonctionne
5. Verifier que le transformer produit la bonne structure pour les 633 questions

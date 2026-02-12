# Fill-in-Blanks v2 — Session Prompt: Phase 3

## Contexte

On implemente le redesign fill-in-blanks v2 d'UbuMaths. **Phases 1 et 2 sont terminees**. On attaque **Phase 3 : Pipeline de generation**.

## Documents a lire AVANT de commencer

1. **Plan d'implementation** : `docs/wip/fill-in-blanks-v2-plan.md` — Section "Phase 3"
2. **Doc d'architecture** : `docs/wip/fill-in-blanks-redesign.md` — Sections pertinentes :
   - Section 3.4 : Convention `expression` + pipeline answerFormat (lignes 173-221)
   - Section 3.10 : Pipeline `assignBlankIndices` (ligne 434)
   - Section 3.7 : Validation per-blank (lignes 263-278)
3. **Progress Phases 1-2** : `docs/wip/fill-in-blanks-v2-progress.md` — Decisions prises, issues ouvertes
4. **Types** : `src/lib/questions/types.ts` — `InstanceBlank`, `blankDefaults`, `answerFormats`, `expressions`
5. **Module Phase 2** : `src/lib/questions/generator/assign-blank-indices.ts` — `assignBlankIndices()` + ses tests
6. **Generateur existant** : `src/lib/questions/generator/instance-generator.ts`
7. **Content resolver existant** : `src/lib/questions/generator/content-resolver.ts`
8. **Exemples old-questions** : `.claude/old-questions.json` — globalIndex 10, 51, 413, 411

## Ce que Phase 1 a fait

- Supprime `type` et `transformType` de `QuestionTemplate`/`QuestionInstance`
- `getQuestionType()` infere le type depuis `choices`
- `fill_in_blanks` requiert `blanks[]` (pas de `solution`)
- `solution` n'existe que pour `multiple_choice`
- `solutionPool` remplace par `options.orderIndependent` sur `blanks[]`
- `validateBlanks()` supporte `orderIndependent`
- Constraints utilisent `blanks[].expectedAnswer` au lieu de `solution`

## Ce que Phase 2 a fait

- Parser detecte `<<expr:NAME>>` dans les noeuds math → `expressionName` sur le noeud AST, marqueur supprime du `expression`
- Nouveau module `assignBlankIndices(statement, answerFormats?)` :
  - `?` dans math → `\placeholder[N]{}`
  - `[_]` dans texte → `{{blank:N}}`
  - `<<expr:NAME>>` avec answerFormat → reserve indices via answerFormat uniquement (statement inchange)
  - Compteur global 0-based gauche→droite
- Decision : `[_]` pas dans le parser (gere par `assignBlankIndices` en amont)
- Decision : expressions avec answerFormat vs sans sont deux chemins disjoints (les 107 fill-in n'utilisent pas de variable `expression*`)
- Decision : marqueur `<<expr:>>` preserve dans le statement par `assignBlankIndices`, retire par le parser

## Issues ouvertes (a traiter en Phase 3)

- **`expectedAnswerLatex` non peuple** : champ declare sur `InstanceBlank` mais jamais rempli par le generateur. Sert pour le flash back.
- **Inference type blank (math vs text)** : `InstanceBlank.type` doit etre infere du contexte — `'math'` si `?` dans `$...$`, `'text'` si `[_]` dans texte. `assignBlankIndices` connait ce contexte.

## Phase 3 — Objectif

Le generateur detecte les expressions, construit `blanks[]`, appelle `assignBlankIndices()`.

## Phase 3 — Etapes

### 3.0 — TDD : Specification

Proposer les comportements en francais, attendre validation utilisateur.

### 3.1 — Tests (nouveau fichier)

**`src/lib/questions/generator/__tests__/generation-fill-blanks.test.ts`** :

- Generation instance fill_in_blanks simple (1 trou math)
- Generation avec convention `expression*` + answerFormat
- Generation multi-trous (expression + statement)
- Fusion `blankDefaults` + overrides per-blank
- `blanks[].type` infere (`math` vs `text`)
- `expressions[]` peuple correctement
- `expectedAnswerLatex` genere pour flash back
- `solution` absent pour fill_in_blanks
- Utiliser exemples de `.claude/old-questions.json` (globalIndex 10, 51, 413, 411)

### 3.2 — Implementation

**`src/lib/questions/generator/content-resolver.ts`** :

- Inserer marqueur `<<expr:NAME>>` pour variables commencant par `expression`
- Pipeline answerFormat : resolution variables → conversion LaTeX

**`src/lib/questions/generator/instance-generator.ts`** :

- `resolveVariationWithShared()` : merger `blankDefaults`, `answerFormats`, `solution` optionnel
- Detecter variables `expression*` → extraire `instance.expressions[]`
- Copier `answerFormats` → `expressions[i].answerFormat`
- Construire `instance.blanks[]` avec type infere + config validation fusionnee
- Appeler `assignBlankIndices()` apres resolution du statement
- Generer `expectedAnswerLatex` pour chaque blank math
- Verification coherence `totalBlanks == blanks.length`

### 3.3 — Verification

- `pnpm test:server src/lib/questions/generator/`
- Tests existants du generateur passent toujours
- `npx tsc --noEmit` sur fichiers modifies

### 3.4 — Code review + Commit + Doc

- Agent `code-reviewer` (Opus)
- Commit
- Mettre a jour `docs/wip/fill-in-blanks-v2-progress.md`

## Regles critiques

- **TDD obligatoire** : proposer comportements → validation utilisateur → tests → code → verification
- **Ne PAS prendre de decisions sans demander** : si un choix se presente, demander a l'utilisateur
- **`fill_in_blanks` n'a PAS de `solution`** : seul `blanks[]` existe
- **Utiliser `assignBlankIndices()`** : le module Phase 2 existe deja, ne PAS reimplementer sa logique
- **Lire la doc d'architecture** (`docs/wip/fill-in-blanks-redesign.md`) sections 3.4 et 3.10 AVANT de coder
- **Respecter le plan** : ne pas reimplementer ce que le plan dit d'utiliser
- **Lire les fichiers existants** (`instance-generator.ts`, `content-resolver.ts`) AVANT de modifier

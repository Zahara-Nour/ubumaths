# Fill-in-Blanks v2 — Session Prompt: Phase 2

## Contexte

On implemente le redesign fill-in-blanks v2 d'UbuMaths. **Phase 1 est terminee** (types TypeScript). On attaque **Phase 2 : Parser ubumark + `assignBlankIndices`**.

## Documents a lire AVANT de commencer

1. **Plan d'implementation** : `.claude/plans/cosmic-dreaming-owl.md` — Section "Phase 2" (lignes 70-134)
2. **Doc d'architecture** : `docs/wip/fill-in-blanks-redesign.md` — Sections pertinentes :
   - Section 3.10 : Pipeline `assignBlankIndices` (ligne 434)
   - Marqueurs `<<expr:NAME>>` (lignes 179-210)
   - Conversion answerField (lignes 166-168)
3. **Progress Phase 1** : `docs/wip/fill-in-blanks-v2-progress.md` — Decisions prises, etat actuel
4. **Types modifies en Phase 1** : `src/lib/questions/types.ts` — `InstanceBlank`, `blankDefaults`, `answerFormats`, `expressions`
5. **AST types modifies en Phase 1** : `src/lib/ubumark/types/ast.ts` — `expressionName` sur math nodes, index 0-based

## Ce que Phase 1 a fait

- Supprime `type` et `transformType` de `QuestionTemplate`/`QuestionInstance`
- `getQuestionType()` infere le type depuis `choices`
- `fill_in_blanks` requiert `blanks[]` (pas de `solution`)
- `solution` n'existe que pour `multiple_choice`
- `solutionPool` remplace par `options.orderIndependent` sur `blanks[]`
- `validateBlanks()` supporte `orderIndependent`
- `validateWithSolutionPool` supprime, legacy solution fallback supprime
- Constraints utilisent `blanks[].expectedAnswer` au lieu de `solution`

## Phase 2 — Objectif

Le parser ubumark supporte `[_]` et `<<expr:NAME>>`. Nouveau module `assignBlankIndices()` qui numérote tous les blanks.

## Phase 2 — Etapes

### 2.0 — TDD : Specification

Proposer les comportements en francais, attendre validation utilisateur.

### 2.1 — Tests (nouveaux fichiers)

**`src/lib/ubumark/__tests__/parser/blank-and-expression.test.ts`** :

- `[_]` dans texte → `BlankNode` avec index correct (0-based)
- `[_]` ne matche pas dans `$...$` (seulement hors math)
- `<<expr:expression1>>` dans math → noeud avec `expressionName: "expression1"`
- `<<expr:NAME>>` supprime du contenu math
- Coexistence `{{blank:N}}` et `[_]` (pas dans le meme statement)

**`src/lib/questions/generator/__tests__/assign-blank-indices.test.ts`** :

- `?` dans `$...$` → `\placeholder[N]{}`
- `[_]` dans texte → `{{blank:N}}`
- `<<expr:NAME>>` reserve indices pour les `?` de l'answerFormat
- Compteur global sequentiel gauche→droite
- Verification coherence `totalBlanks == blanks.length`
- Cas expression + trous statement + trou texte (exemple du doc section 3.10)
- answerFormats modifies (`?` → `\placeholder[N]{}`)

### 2.2 — Implementation parser

**`src/lib/ubumark/parser/markdown-parser.ts`** :

- Regex pour `[_]` (hors math zones)
- `parseTextForBlanks()` : supporter `[_]` en plus de `{{blank:N}}`
- Detection `<<expr:NAME>>` dans les noeuds math
- `MathInlineNode`/`MathBlockNode` : ajouter `expressionName` si marqueur present

### 2.3 — Implementation assignBlankIndices

**`src/lib/questions/generator/assign-blank-indices.ts`** (nouveau) :

```typescript
export function assignBlankIndices(
	statement: string,
	answerFormats?: Record<string, string>
): { statement: string; answerFormats?: Record<string, string>; totalBlanks: number };
```

- Parcours gauche→droite avec compteur global
- `?` dans `$...$` et `$$...$$` → `\placeholder[N]{}`
- `[_]` dans texte → `{{blank:N}}`
- `<<expr:NAME>>` → reserve indices pour `?` de l'answerFormat
- Retourner statement modifie + answerFormats modifies + totalBlanks

### 2.4 — Verification

- `pnpm test:server src/lib/ubumark/__tests__/parser/`
- `pnpm test:server src/lib/questions/generator/__tests__/assign-blank-indices`
- `npx tsc --noEmit` sur fichiers modifies

### 2.5 — Code review + Commit + Doc

- Agent `code-reviewer` (Opus)
- Commit
- Mettre a jour `docs/wip/fill-in-blanks-v2-progress.md`

## Regles critiques

- **TDD obligatoire** : proposer comportements → validation utilisateur → tests → code → verification
- **Ne PAS prendre de decisions sans demander** : si un choix se presente, demander a l'utilisateur
- **`fill_in_blanks` n'a PAS de `solution`** : seul `blanks[]` existe
- **Lire la doc d'architecture** (`docs/wip/fill-in-blanks-redesign.md`) section 3.10 AVANT de coder
- **Respecter le plan** : ne pas reimplementer ce que le plan dit d'utiliser

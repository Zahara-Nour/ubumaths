# Prompt de continuation — Phase 6 : Composant FillBlanksInput

## Contexte

On redessine le systeme fill-in-blanks d'UbuMaths. Les phases 1-5 sont terminees :

- **Phase 1** (COMPLETE) : Types TypeScript — supprime `type`/`transformType`, ajoute `getQuestionType()`, `InstanceBlank`, `blankDefaults`, `answerFormats`, `expressions`, `orderIndependent`
- **Phase 2** (COMPLETE) : Parser ubumark — `<<expr:NAME>>` detection, module `assignBlankIndices()`
- **Phase 3** (COMPLETE) : Pipeline de generation — `instance-generator.ts` construit `blanks[]`, `expressions[]`, appelle `assignBlankIndices()`
- **Phase 4** (COMPLETE) : Validation per-blank — pipeline validationRules → mode infere → requiredForm → constraints, nouvelle signature `validateQuantityAnswer`
- **Phase 5** (COMPLETE) : Transformer de migration — `MigrationMode`, reclassification result/rewrite → fill_in_blanks, conversion answerField, unit detection, expressions2

**Phase 6 concerne le composant FillBlanksInput** qui doit etre reecrit pour supporter le nouveau format avec parcours AST unifie, expressions avec answerFormat, et flash back.

## Documents de reference

- **`docs/wip/fill-in-blanks-redesign.md`** — Doc d'architecture. Sections pertinentes : 3.4 (convention expression), 3.9 (lien expressions↔blanks), 4.7 (composant a refaire), 4.8 (syntaxe des trous texte)
- **`docs/wip/fill-in-blanks-v2-plan.md`** — Plan d'implementation, section "Phase 6"
- **`docs/wip/fill-in-blanks-v2-progress.md`** — Etat de progression des phases 1-5

## Etat actuel du code

### FillBlanksInput actuel (`src/lib/components/question-inputs/FillBlanksInput.svelte`, 197 lignes)

Le composant actuel est simpliste :

- Split le statement sur `____` (4 underscores) et intercale des MathField
- N'utilise PAS l'AST ubumark
- Ne gere PAS les expressions avec `answerFormat`
- Ne gere PAS le flash back (affichage de `expectedAnswerLatex`)
- Ne distingue PAS les trous math des trous texte
- Interface : `statement: ResolvedMarkdown`, `blanks: BlankConfig[]`, `bind:values`, `disabled`, `validationResults`

### Donnees disponibles dans QuestionInstance

L'instance generee par la Phase 3 fournit :

```typescript
interface QuestionInstance {
	statement: ResolvedMarkdown; // Statement resolu avec \placeholder[N]{} et {{blank:N}}
	blanks?: InstanceBlank[]; // Par blank : expectedAnswer, expectedAnswerLatex, type, precision, unit, ...
	expressions?: {
		// Pour les questions "expression" (result/rewrite)
		name: string; // "expression1", "expression2"
		latex: string; // Expression resolue en LaTeX
		answerFormat?: string; // "10^{\placeholder[0]{}}" ou absent
	}[];
}

interface InstanceBlank {
	expectedAnswer: string; // "5", "entier", "eval:a+b" resolu
	expectedAnswerLatex?: string; // "5" en LaTeX (pour flash back, math blanks only)
	type: 'math' | 'text'; // Infere du contexte ($..$ → math, sinon text)
	precision?: PrecisionType;
	requiredForm?: RequiredForm;
	validationRules?: ValidationRule[];
	unit?: { expected: boolean; required?: string };
	prefilled?: string;
}
```

### AST ubumark disponible

Le parser ubumark produit un AST avec les noeuds suivants (pertinents pour FillBlanksInput) :

- `TextNode` → `<span>` texte
- `BlankNode { index: number }` → trou texte ou math (index = 0-based depuis `assignBlankIndices`)
- `MathInlineNode { expression, expressionName? }` → `$...$` inline, contient deja `\placeholder[N]{}` si des `?` etaient presents
- `MathBlockNode { expression, expressionName? }` → `$$...$$` block, idem

Le statement resolu contient deja les `\placeholder[N]{}` (inseres par `assignBlankIndices()` en Phase 2). Le composant n'a PAS a compter les `?` — les indices sont deja dans le statement.

### Composants existants (ne PAS reecrire)

| Composant          | Fichier                                                  | Role                                        |
| ------------------ | -------------------------------------------------------- | ------------------------------------------- |
| `MathField`        | `src/lib/components/MathField.svelte`                    | Wrapper MathLive (25 lignes)                |
| `BlankInput`       | `src/lib/components/markdown/nodes/BlankInput.svelte`    | Input texte pour `{{blank:N}}` (104 lignes) |
| `ParagraphNode`    | `src/lib/components/markdown/nodes/ParagraphNode.svelte` | Routage AST existant (223 lignes)           |
| `MarkdownRenderer` | `src/lib/components/markdown/MarkdownRenderer.svelte`    | Rendu markdown (291 lignes)                 |
| `MathInput`        | `src/lib/components/question-inputs/MathInput.svelte`    | Input MathLive standalone                   |

### Integration dans FlashCard et QuestionCard

Les deux parents utilisent actuellement FillBlanksInput ainsi :

```svelte
<!-- FlashCard.svelte (L377) et QuestionCard.svelte (L221) -->
<FillBlanksInput
	statement={instance.statement}
	blanks={instance.blanks || []}
	bind:values={fillBlankValues}
	disabled={isInputDisabled}
	validationResults={isSubmitted ? blankValidationResults : []}
	onSubmit={handleSubmit}
/>
```

## Objectif Phase 6

Reecrire FillBlanksInput avec un parcours AST unifie (un seul chemin de rendu) qui supporte :

### 6.1 — Parcours AST unifie

Le composant parse le statement resolu en AST ubumark et route chaque noeud :

- `TextNode` → `<span>` texte
- `BlankNode { index: N }` → `<BlankInput>` texte (si `blanks[N].type === 'text'`) ou `<MathField>` (si `blanks[N].type === 'math'`)
- `MathInlineNode` / `MathBlockNode` sans `expressionName` et sans `\placeholder` → `<MathField>` en lecture seule (math decorative)
- `MathInlineNode` / `MathBlockNode` sans `expressionName` mais avec `\placeholder[N]{}` → `<MathField>` interactif (trous dans l'expression)
- `MathInlineNode` / `MathBlockNode` avec `expressionName` → voir 6.2

### 6.2 — Support expressions avec answerFormat

Quand un noeud math a un `expressionName` (ex: `expression1`), le composant cherche `instance.expressions[]` pour trouver les metadonnees :

- **Mode interactif** : affiche `expression.latex + ' = ' + expression.answerFormat` dans un seul MathField. L'answerFormat contient deja les `\placeholder[N]{}` (inseres par `assignBlankIndices`).
- **Mode flash back** : affiche `expression.latex + ' = ' + answerFormatResolu` ou chaque `\placeholder[N]{}` est remplace par `blanks[N].expectedAnswerLatex`. Tout en lecture seule.
- **Sans answerFormat** : affiche juste `expression.latex + ' = ' + '\placeholder[N]{}'` (format defaut `?`)

### 6.3 — Flash back (affichage de la reponse correcte)

En mode `disabled` (apres soumission ou en flash back) :

- Trous math dans le statement : afficher `blanks[N].expectedAnswerLatex` dans un MathField en lecture seule
- Trous texte : afficher `blanks[N].expectedAnswer` dans un `<span>` stylise
- Expressions : voir 6.2 mode flash back

### 6.4 — Interface de sortie (values + valuesLatex)

Le composant fournit deux tableaux paralleles au parent :

```typescript
interface Props {
	statement: ResolvedMarkdown;
	blanks: InstanceBlank[];
	expressions?: QuestionInstance['expressions'];
	values?: string[]; // bind:values — ascii-math pour math, texte pour text
	valuesLatex?: string[]; // bind:valuesLatex — LaTeX pour math (vide pour text)
	disabled?: boolean;
	showCorrectAnswers?: boolean; // flash back mode
	validationResults?: (boolean | null)[];
	onSubmit?: () => void;
}
```

### 6.5 — Adapter FlashCard et QuestionCard

Passer les props supplementaires : `expressions`, `valuesLatex`, `showCorrectAnswers`.

## Workflow TDD (OBLIGATOIRE)

1. **Phase 6.0** : Proposer les comportements en francais, attendre validation utilisateur
2. **Phase 6.1** : Ecrire les tests (composant Svelte → `.svelte.test.ts`)
3. **Phase 6.2** : Implementer le composant
4. **Phase 6.3** : Verification (tests passent, svelte autofixer, tsc)
5. **Phase 6.4** : Code review + commit + doc progression

## Fichiers a modifier

| Fichier                                                     | Modifications                                              |
| ----------------------------------------------------------- | ---------------------------------------------------------- |
| `src/lib/components/question-inputs/FillBlanksInput.svelte` | Reecriure complete : parcours AST, expressions, flash back |
| `src/lib/components/questions/FlashCard.svelte`             | Passer `expressions`, `valuesLatex`, `showCorrectAnswers`  |
| `src/lib/components/questions/QuestionCard.svelte`          | Idem FlashCard                                             |

## Dependances et contraintes

- **Svelte 5 runes** : `$state`, `$derived`, `$props`, `$bindable` — PAS de `$:` ou `export let`
- **Svelte autofixer OBLIGATOIRE** : `mcp__svelte__svelte-autofixer` sur chaque `.svelte` modifie
- **MathLive** : `<MathField>` est le wrapper existant, NE PAS reimplementer
- **Parser ubumark** : utiliser `parseMarkdown()` depuis `$lib/ubumark` pour obtenir l'AST du statement
- **Pas de `____` split** : l'ancien mecanisme de split sur 4 underscores est remplace par le parcours AST
- **Ne PAS reecrire** les composants existants (MathField, BlankInput, ParagraphNode, MarkdownRenderer)

## Regles ABSOLUES

1. **LIRE le doc d'architecture** (`docs/wip/fill-in-blanks-redesign.md` sections 3.4, 3.9, 4.7, 4.8) avant de coder
2. **Workflow TDD** : proposer les comportements → attendre validation → ecrire tests → implementer
3. **Svelte autofixer** sur chaque fichier `.svelte` modifie
4. **Agent `frontend-developer` avec Opus** pour l'implementation du composant
5. **Code review** (`code-reviewer`) apres implementation
6. **Documents de progression** dans `docs/wip/fill-in-blanks-v2-progress.md`
7. **Commits reguliers** apres chaque etape validee

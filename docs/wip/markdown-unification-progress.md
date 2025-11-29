# Markdown Unification Progress

## État actuel

- **Phase** : 4 (COMPLETE)
- **Tâche en cours** : Terminé
- **Dernier commit** : 82d9d889 `refactor(rendering): deprecate MathDisplay and migrate preview cards`
- **Quality checks** : Build ✓ | Lint ✓ (0 nouvelles erreurs, erreurs préexistantes dans scripts/ et worksheets/)

## Objectif

Unifier les systèmes de rendu des Questions et Exercices en utilisant un système markdown unifié avec des composants de rendu génériques réutilisables.

## Décisions architecturales

1. **{{blank:N}}** : Syntaxe pour les fill_in_blanks dans le markdown
2. **Composants génériques** : Réutilisables partout dans l'app (questions, exercices, chatbot, docs)
3. **Toggle raw/rendered** : Deux modes d'affichage pour debug/preview
4. **Séparation claire** : Les composants de rendu ne font PAS l'instanciation (template → instance)

## Structure cible

```
src/lib/components/markdown/
├── index.ts
├── types.ts
├── utils.ts
├── MarkdownRenderer.svelte
├── MarkdownRaw.svelte
└── nodes/
    ├── MathInline.svelte           # Read-only inline (<math-span>)
    ├── MathInlineEditable.svelte   # Editable inline (<math-field>)
    ├── MathInlineOld.svelte        # Deprecated (<math-field read-only>)
    ├── MathBlock.svelte            # Read-only block (<math-div>)
    ├── MathBlockEditable.svelte    # Editable block (<math-field>)
    ├── MathBlockOld.svelte         # Deprecated (<math-field read-only>)
    ├── ImageDisplay.svelte
    ├── TextNode.svelte
    ├── ParagraphNode.svelte
    ├── HeadingNode.svelte
    ├── ListNode.svelte
    ├── TableNode.svelte
    ├── CodeBlock.svelte
    ├── Blockquote.svelte
    ├── HorizontalRule.svelte
    └── BlankInput.svelte
```

## Fichiers créés/modifiés par phase

### Phase 1 : Composants de rendu génériques (COMPLETE)

- [x] `src/lib/components/markdown/types.ts`
- [x] `src/lib/components/markdown/index.ts`
- [x] `src/lib/components/markdown/utils.ts` (escapeHtml)
- [x] `src/lib/components/markdown/nodes/MathInline.svelte`
- [x] `src/lib/components/markdown/nodes/MathBlock.svelte`
- [x] `src/lib/components/markdown/nodes/TextNode.svelte`
- [x] `src/lib/components/markdown/nodes/ParagraphNode.svelte`
- [x] `src/lib/components/markdown/nodes/HeadingNode.svelte`
- [x] `src/lib/components/markdown/nodes/HorizontalRule.svelte`
- [x] `src/lib/components/markdown/nodes/ImageDisplay.svelte`
- [x] `src/lib/components/markdown/nodes/ListNode.svelte`
- [x] `src/lib/components/markdown/nodes/TableNode.svelte`
- [x] `src/lib/components/markdown/nodes/CodeBlock.svelte`
- [x] `src/lib/components/markdown/nodes/Blockquote.svelte`
- [x] `src/lib/components/markdown/nodes/index.ts`
- [x] `src/lib/components/markdown/MarkdownRenderer.svelte`
- [x] `src/lib/components/markdown/MarkdownRaw.svelte`

### Phase 2 : Extension parser pour {{blank:N}} (COMPLETE)

- [x] `src/lib/exercises/types.ts` (ajout BlankNode)
- [x] `src/lib/exercises/parser/markdown-parser.ts` (parsing {{blank:N}})
- [x] `src/lib/components/markdown/nodes/BlankInput.svelte`
- [x] `src/lib/components/markdown/nodes/ParagraphNode.svelte` (intégration)
- [x] `src/lib/components/markdown/MarkdownRenderer.svelte` (props blanks)
- [x] Tests unitaires pour blank parsing (7 nouveaux tests)

### Phase 3 : Intégration Questions → Markdown (COMPLETE)

- [x] `src/lib/questions/types.ts` (ajout statement_md, correction_md)
- [x] `src/lib/questions/generator/content-to-markdown.ts` (NEW - conversion utility)
- [x] `src/lib/questions/generator/content-to-markdown.test.ts` (NEW - 14 tests)
- [x] `src/lib/questions/generator/instance-generator.ts` (génère statement_md, correction_md)
- [x] `src/lib/components/questions/FlashCard.svelte` (→ MarkdownRenderer)
- [x] `src/lib/components/questions/QuestionCard.svelte` (→ MarkdownRenderer)
- [x] `src/lib/components/questions/CorrectionCard.svelte` (→ MarkdownRenderer)
- [x] Code review Phase 3

### Phase 4 : Simplification et nettoyage (COMPLETE - partial)

- [x] `src/lib/components/MathDisplay.svelte` (dépréciation notice ajoutée)
- [x] `src/lib/components/questions/QuestionPreviewBaseCard.svelte` (→ MarkdownRenderer)
- [ ] `src/lib/components/exercises/ExerciseDisplay.svelte` (conservé - fonctionne avec son propre système AST)
- [ ] `src/lib/utils/latex-parser.ts` (conservé pour rétrocompatibilité avec ChatBot/SRS)

Note: ExerciseDisplay et les composants ChatBot/SRS conservent MathDisplay pour l'instant.
Migration complète possible dans une future phase si nécessaire.

### Phase 4b : Optimisation MathLive (COMPLETE)

Migration de `<math-field read-only>` vers `<math-span>`/`<math-div>` pour les composants d'affichage statique.

**Motivation** : MathLive recommande `<math-span>` et `<math-div>` pour l'affichage read-only car ils sont :

- Lazy-loaded et viewport-aware
- Plus légers (pas de machinerie d'éditeur)
- Conçus spécifiquement pour l'affichage statique

**Fichiers modifiés** :

- [x] `src/lib/components/markdown/nodes/MathBlock.svelte` (→ `<math-div>`)
- [x] `src/lib/components/markdown/nodes/MathInline.svelte` (→ `<math-span>`)

**Fichiers de sauvegarde créés** :

- [x] `src/lib/components/markdown/nodes/MathBlockOld.svelte` (ancienne version avec `<math-field read-only>`)
- [x] `src/lib/components/markdown/nodes/MathInlineOld.svelte` (ancienne version avec `<math-field read-only>`)

**Résultat** : ~50% de réduction du code CSS (plus besoin de masquer les styles d'éditeur).

**Composants éditables ajoutés** :

- [x] `src/lib/components/markdown/nodes/MathBlockEditable.svelte` (éditable avec `<math-field>`)
- [x] `src/lib/components/markdown/nodes/MathInlineEditable.svelte` (éditable avec `<math-field>`)

**Matrice des composants Math** :

| Composant          | Element MathLive         | Usage                      | Props                                                           |
| ------------------ | ------------------------ | -------------------------- | --------------------------------------------------------------- |
| MathBlock          | `<math-div>`             | Affichage bloc read-only   | `latex`, `class`                                                |
| MathInline         | `<math-span>`            | Affichage inline read-only | `latex`, `class`                                                |
| MathBlockEditable  | `<math-field>`           | Saisie bloc éditable       | `value` (bindable), `placeholder`, `class`, `onchange`          |
| MathInlineEditable | `<math-field>`           | Saisie inline éditable     | `value` (bindable), `placeholder`, `class`, `onchange`          |
| MathBlockOld       | `<math-field read-only>` | Déprécié                   | `latex`, `class`                                                |
| MathInlineOld      | `<math-field read-only>` | Déprécié                   | `latex`, `class`                                                |
| MathPrompt         | `<math-field readonly>`  | Champs éditables in-situ   | `latex`, `display`, `promptIndices`, `inputs`, `onPromptChange` |

**Usage des composants éditables (Svelte 5)** :

```svelte
<script lang="ts">
	import MathInlineEditable from '$lib/components/markdown/nodes/MathInlineEditable.svelte';
	let latex = $state('x^2');
</script>

<MathInlineEditable bind:value={latex} /><p>Valeur : {latex}</p>
```

### Phase 4c : Math Prompts - Champs éditables dans expressions math (COMPLETE)

Support pour les champs fill-in-the-blank directement dans les expressions mathématiques via la syntaxe native MathLive `\placeholder[N]{}`.

**Motivation** : Permettre aux élèves de compléter des expressions mathématiques (fractions, équations, matrices) sans quitter le contexte mathématique.

**Syntaxe** :

```markdown
Trouve x: $x = \placeholder[1]{}$
Simplifie: $$\frac{\placeholder[1]{}}{\placeholder[2]{}} = \placeholder[3]{}$$
```

**API unifiée InputState** :

```typescript
interface InputState {
	index: number; // Index 1-based
	value: string; // Valeur (texte ou LaTeX)
	type: 'text' | 'math'; // Discriminant
	isCorrect: boolean | null; // Validation
}
```

**Fichiers créés/modifiés** :

- [x] `src/lib/exercises/types.ts` - InputState, extension MathInlineNode/MathBlockNode (hasPrompts, promptIndices)
- [x] `src/lib/exercises/parser/math-extractor.ts` - extractPromptInfo(), détection \placeholder[N]{}
- [x] `src/lib/exercises/parser/math-extractor.test.ts` - 12 tests pour placeholder detection
- [x] `src/lib/components/markdown/nodes/MathPrompt.svelte` - NEW: Composant pour champs math éditables
- [x] `src/lib/components/markdown/nodes/ParagraphNode.svelte` - Intégration MathPrompt, API unifiée inputs
- [x] `src/lib/components/markdown/MarkdownRenderer.svelte` - Intégration MathPrompt, API unifiée inputs
- [x] `src/lib/components/markdown/nodes/BlankInput.svelte` - Renommage validationState → isCorrect
- [x] `src/lib/components/markdown/types.ts` - Update BlankInputProps
- [x] `src/lib/exercises/parser/markdown-parser.ts` - Bug fix: propagation hasPrompts/promptIndices aux AST
- [x] `src/lib/exercises/parser/unified-inputs.test.ts` - NEW: 25 tests d'intégration

**Commits** :

| Sous-phase | Commit     | Description                                                              |
| ---------- | ---------- | ------------------------------------------------------------------------ |
| 4c.1       | `95898307` | `feat(parser): add placeholder detection in math expressions`            |
| 4c.2       | `6617a4c8` | `feat(components): add MathPrompt component for editable math fields`    |
| 4c.3       | `008520c9` | `refactor(inputs): unify BlankInput and MathPrompt under InputState API` |
| 4c.4       | `8d6b5df8` | `test(integration): add comprehensive tests for unified input system`    |

**Documentation** : Voir `docs/ref/markdown.md` section 2.3 "Champs math editables"

### Phase 5 : Migration données (optionnel)

- [ ] `scripts/migrate-contentfields-to-markdown.ts`
- [ ] Migration Supabase

## Notes de reprise après crash

### Si interruption pendant Phase 1

1. Vérifier quels fichiers de `src/lib/components/markdown/` existent déjà
2. Vérifier le contenu de chaque fichier créé (complet ou partiel)
3. Reprendre à la tâche correspondant au premier fichier manquant ou incomplet

### Si interruption pendant Phase 2-5

1. Consulter la checklist ci-dessus pour identifier les fichiers modifiés
2. Vérifier `git status` pour voir les changements non commités
3. Reprendre à partir de la dernière tâche non cochée

## Historique des commits

| Phase | Commit    | Description                                                            |
| ----- | --------- | ---------------------------------------------------------------------- |
| 1     | 1a140325  | `feat(markdown): add generic markdown rendering components`            |
| 2     | 9201ee13  | `feat(parser): add {{blank:N}} syntax for fill-in-blanks`              |
| 3     | bf4a7ff0  | `feat(questions): migrate to markdown-based rendering`                 |
| 4     | 82d9d889  | `refactor(rendering): deprecate MathDisplay and migrate preview cards` |
| 5     | (pending) | `feat(migration): add ContentField to markdown migration`              |

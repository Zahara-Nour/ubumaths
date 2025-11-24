# Markdown Unification Progress

## État actuel

- **Phase** : 2 (COMPLETE)
- **Tâche en cours** : Phase 3 à démarrer
- **Dernier commit** : 1a140325 `feat(markdown): add generic markdown rendering components`

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
    ├── MathInline.svelte
    ├── MathBlock.svelte
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

### Phase 3 : Intégration Questions → Markdown (IN PROGRESS)

- [x] `src/lib/questions/types.ts` (ajout statement_md, correction_md)
- [x] `src/lib/questions/generator/content-to-markdown.ts` (NEW - conversion utility)
- [x] `src/lib/questions/generator/content-to-markdown.test.ts` (NEW - 14 tests)
- [x] `src/lib/questions/generator/instance-generator.ts` (génère statement_md, correction_md)
- [x] `src/lib/components/questions/FlashCard.svelte` (→ MarkdownRenderer)
- [x] `src/lib/components/questions/QuestionCard.svelte` (→ MarkdownRenderer)
- [x] `src/lib/components/questions/CorrectionCard.svelte` (→ MarkdownRenderer)
- [ ] Code review Phase 3

### Phase 4 : Simplification et nettoyage

- [ ] `src/lib/components/exercises/ExerciseDisplay.svelte`
- [ ] `src/lib/components/MathDisplay.svelte` (dépréciation)
- [ ] `src/lib/utils/latex-parser.ts` (suppression ou fusion)

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

| Phase | Commit    | Description                                                  |
| ----- | --------- | ------------------------------------------------------------ |
| 1     | 1a140325  | `feat(markdown): add generic markdown rendering components`  |
| 2     | 9201ee13  | `feat(parser): add {{blank:N}} syntax for fill-in-blanks`    |
| 3     | (pending) | `feat(questions): migrate to markdown-based rendering`       |
| 4     | (pending) | `refactor(rendering): unify exercise and question rendering` |
| 5     | (pending) | `feat(migration): add ContentField to markdown migration`    |

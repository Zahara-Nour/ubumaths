# Math Placeholder Implementation Progress

## Etat actuel

- **Phase** : 3 (PENDING)
- **Tache en cours** : Aucune (Phase 2 terminee)
- **Dernier commit** : `6617a4c8` - Phase 2 complete

## Objectif

Ajouter le support des champs math editables via `\placeholder[N]{}` de MathLive avec state management unifie.

## Decisions prises

1. **Syntaxe** : `\placeholder[N]{}` natif MathLive dans `$...$` et `$$...$$`
2. **Identification** : Index numerique N (1-based), coherent avec `{{blank:N}}`
3. **State unifie** : `InputState { index, value, type: 'text' | 'math', isCorrect }`
4. **Rendu conditionnel** : `<math-field readonly>` si prompts, sinon `<math-span>/<math-div>`

## Phases

### Phase 1 : Types et detection placeholder (COMPLETE)

- [x] 1.1 Definir `InputState` et etendre `MathInlineNode`/`MathBlockNode`
- [x] 1.2 Detection `\placeholder[N]{}` dans `math-extractor.ts`
- [x] 1.3 Tests unitaires (12 tests, tous passent)
- [x] 1.4 Code review (approuve)
- [x] Commit: `95898307`

**Fichiers modifies** :

- `src/lib/exercises/types.ts` - InputState, MathInlineNode, MathBlockNode, MathPlaceholder
- `src/lib/exercises/parser/math-extractor.ts` - extractPromptInfo(), extractMath()
- `src/lib/exercises/parser/math-extractor.test.ts` - 12 nouveaux tests

### Phase 2 : Composant MathPrompt (COMPLETE)

- [x] 2.1 Creer `MathPrompt.svelte`
- [x] 2.2 Integrer dans `ParagraphNode.svelte`
- [x] 2.3 Integrer dans `MarkdownRenderer.svelte`
- [x] 2.4 Tests composant (Svelte autofixer valide, build OK, tests deferred to Phase 4)
- [x] 2.5 Code review (approved with fixes applied)
- [x] Commit: `6617a4c8`

**Fichiers crees/modifies** :

- `src/lib/components/markdown/nodes/MathPrompt.svelte` - NOUVEAU : composant editable math
- `src/lib/components/markdown/nodes/ParagraphNode.svelte` - Import MathPrompt, props mathInputs/onMathPromptChange
- `src/lib/components/markdown/MarkdownRenderer.svelte` - Import MathPrompt, props mathInputs/onMathPromptChange
- `src/lib/components/markdown/nodes/index.ts` - Export MathPrompt

### Phase 3 : Migration BlankInput

- [ ] 3.1 Adapter `BlankInput.svelte`
- [ ] 3.2 Adapter `ParagraphNode.svelte`
- [ ] 3.3 Unifier props `MarkdownRenderer`
- [ ] 3.4 Adapter tests existants
- [ ] 3.5 Code review
- [ ] Commit

### Phase 4 : Tests d'integration

- [ ] 4.1 Tests integration markdown → rendu
- [ ] 4.2 Tests validation texte vs math
- [ ] 4.3 Debug si necessaire
- [ ] 4.4 Code review
- [ ] Commit

### Phase 5 : Documentation

- [ ] 5.1 Mettre a jour `docs/ref/markdown.md`
- [ ] 5.2 Mettre a jour `docs/wip/markdown-unification-progress.md`
- [ ] 5.3 Quality checks
- [ ] 5.4 Commit final

## Commandes pour reprendre

```bash
# Voir l'etat actuel
cat docs/wip/math-placeholder-progress.md

# Lancer les tests
pnpm test:server src/lib/exercises/parser

# Build check
pnpm check:fast
```

## Historique des commits

| Phase | Commit    | Description                                                              |
| ----- | --------- | ------------------------------------------------------------------------ |
| 1     | 95898307  | `feat(parser): add placeholder detection in math expressions`            |
| 2     | 6617a4c8  | `feat(components): add MathPrompt component for editable math fields`    |
| 3     | (pending) | `refactor(inputs): unify BlankInput and MathPrompt under InputState API` |
| 4     | (pending) | `test(integration): add comprehensive tests for unified input system`    |
| 5     | (pending) | `docs: add math editable fields documentation`                           |

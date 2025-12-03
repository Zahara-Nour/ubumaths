# CAS REPL - Document de progression

## Statut actuel

**Phase**: 5 - Help, Keyboard & Polish
**Progression**: 60%
**Derniere mise a jour**: 2025-12-03

---

## Phases

| Phase | Description             | Statut        | Agent                             | Model        |
| ----- | ----------------------- | ------------- | --------------------------------- | ------------ |
| 1     | Infrastructure REPL Web | ✅ Termine    | backend-developer                 | sonnet       |
| 2     | Composants de base      | ✅ Termine    | frontend-developer                | sonnet       |
| 3     | Tabs specifiques        | ✅ Termine    | (integre Phase 2)                 | -            |
| 4     | AST Viewer + Highlight  | ✅ Termine    | frontend-developer                | opus         |
| 5     | Help, Keyboard & Polish | ⏳ En attente | frontend-developer                | sonnet       |
| 6     | Sidebar + Tests         | ⏳ En attente | frontend-developer/test-automator | haiku/sonnet |
| 7     | Quality Checks          | ⏳ En attente | -                                 | -            |

---

## Fichiers crees/modifies

### Phase 1 ✅

- [x] `src/lib/mathAST/cli/web/types.ts`
- [x] `src/lib/mathAST/cli/web/output-formatter-web.ts` (+ corrections XSS)
- [x] `src/lib/mathAST/cli/web/web-repl-engine.ts` (+ corrections type safety)
- [x] `src/lib/mathAST/cli/web/index.ts`
- [x] `src/lib/stores/repl.svelte.ts`
- [x] `src/lib/mathAST/cli/types.ts` (ajout UNKNOWN_ERROR)

### Phase 2 ✅

- [x] `src/routes/(public)/cas/+page.svelte`
- [x] `src/lib/components/cas/ReplContainer.svelte`
- [x] `src/lib/components/cas/ReplInput.svelte` (+ accessibility, submit button)
- [x] `src/lib/components/cas/ReplOutput.svelte` (+ accessibility, remove unused import)
- [x] `src/lib/components/cas/HistoryEntry.svelte`

### Phase 4 ✅

- [x] `src/lib/components/cas/AstDrawer.svelte` - Drawer avec bits-ui Dialog
- [x] `src/lib/components/cas/AstTreeViewer.svelte` - Visualisation recursive avec:
  - Categories colorees (literal, binary, unary, function, structure, relation, unit)
  - Expand/collapse avec profondeur max 20
  - Highlight bidirectionnel via store
  - Accessibilite clavier (Enter/Space)
- [x] `src/lib/components/cas/HistoryEntry.svelte` - Ajout callback onShowAst
- [x] `src/lib/components/cas/ReplContainer.svelte` - Integration AstDrawer

### Phase 5 (a venir)

- [ ] Systeme d'aide (Tooltip/Popover)
- [ ] Raccourcis clavier documentes
- [ ] Polish UI

---

## Decisions prises

1. **Route**: `/cas` (public)
2. **3 Tabs**: Terminal, Modern (MathField input), Hybrid
3. **AST**: Highlight bidirectionnel (hover noeud <-> expression)
4. **Historique**: localStorage, max 100 entrees
5. **Aide**: Tooltip/Popover avec icone `?`
6. **AST Drawer**: Utilise bits-ui Dialog au lieu de Shadcn Sheet
7. **Max depth**: 20 niveaux pour l'AST viewer

---

## Corrections appliquees

### Phase 1

- XSS: escapeHtml() avec backticks
- Type safety: type guards au lieu d'assertions

### Phase 2

- Accessibility: aria-label, role="log", aria-live="polite"
- MathField: bouton submit + handler onkeydown
- Unused import: suppression onMount

### Phase 4

- Max depth protection (20 niveaux)
- ARIA role conflict: suppression role="button" redondant

---

## Prochaines etapes

1. Phase 5: Aide et polish
2. Phase 6: Sidebar + Tests
3. Phase 7: Quality Checks

---

## Notes

- CLI existant est 95% browser-compatible
- XSS: HTML genere dans output-formatter-web.ts est deja sanitize
- Self-import pattern pour recursion AstTreeViewer (Svelte 5)

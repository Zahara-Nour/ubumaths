# CAS REPL - Document de progression

## Statut actuel

**Phase**: 3 - Tabs specifiques
**Progression**: 30%
**Derniere mise a jour**: 2025-12-03

---

## Phases

| Phase | Description             | Statut        | Agent                             | Model        |
| ----- | ----------------------- | ------------- | --------------------------------- | ------------ |
| 1     | Infrastructure REPL Web | ✅ Termine    | backend-developer                 | sonnet       |
| 2     | Composants de base      | ✅ Termine    | frontend-developer                | sonnet       |
| 3     | Tabs specifiques        | ⏳ En attente | frontend-developer                | sonnet       |
| 4     | AST Viewer + Highlight  | ⏳ En attente | frontend-developer                | opus         |
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

### Phase 3 (a venir)

- [ ] Integration des 3 tabs specifiques (Terminal, Modern, Hybrid)
- [ ] Affinage UX par tab

---

## Decisions prises

1. **Route**: `/cas` (public)
2. **3 Tabs**: Terminal, Modern (MathField input), Hybrid
3. **AST**: Highlight bidirectionnel (hover noeud <-> expression)
4. **Historique**: localStorage, max 100 entrees
5. **Aide**: Tooltip/Popover avec icone `?`

---

## Corrections Phase 2 (Code Review)

1. **Accessibility**: Ajout `aria-label`, `role="log"`, `aria-live="polite"`
2. **MathField**: Ajout bouton submit + handler `onkeydown` pour Enter
3. **Unused import**: Suppression `onMount` dans ReplOutput.svelte
4. **Type fix**: Ajout `UNKNOWN_ERROR` au type `ErrorCode`

---

## Prochaines etapes

1. Lancer Phase 3: Tabs specifiques
2. Phase 4: AST Viewer avec highlight bidirectionnel (opus)
3. Phase 5: Aide et polish
4. Phase 6: Sidebar + Tests

---

## Blocages

Aucun pour le moment.

---

## Notes

- CLI existant est 95% browser-compatible
- Seuls `repl.ts` et `cli.ts` utilisent Node.js APIs
- `chalk` remplace par classes CSS
- XSS: HTML genere cote serveur (output-formatter-web.ts) est deja sanitize

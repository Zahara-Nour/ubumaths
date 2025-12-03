# CAS REPL - Document de progression

## Statut actuel

**Phase**: 2 - Composants de base
**Progression**: 15%
**Dernière mise à jour**: 2025-12-03

---

## Phases

| Phase | Description             | Statut        | Agent                             | Model        |
| ----- | ----------------------- | ------------- | --------------------------------- | ------------ |
| 1     | Infrastructure REPL Web | ✅ Terminé    | backend-developer                 | sonnet       |
| 2     | Composants de base      | 🔄 En cours   | frontend-developer                | sonnet       |
| 3     | Tabs spécifiques        | ⏳ En attente | frontend-developer                | sonnet       |
| 4     | AST Viewer + Highlight  | ⏳ En attente | frontend-developer                | opus         |
| 5     | Help, Keyboard & Polish | ⏳ En attente | frontend-developer                | sonnet       |
| 6     | Sidebar + Tests         | ⏳ En attente | frontend-developer/test-automator | haiku/sonnet |
| 7     | Quality Checks          | ⏳ En attente | -                                 | -            |

---

## Fichiers créés/modifiés

### Phase 1 ✅

- [x] `src/lib/mathAST/cli/web/types.ts`
- [x] `src/lib/mathAST/cli/web/output-formatter-web.ts` (+ corrections XSS)
- [x] `src/lib/mathAST/cli/web/web-repl-engine.ts` (+ corrections type safety)
- [x] `src/lib/mathAST/cli/web/index.ts`
- [x] `src/lib/stores/repl.svelte.ts`

### Phase 2 (en cours)

- [ ] `src/routes/(public)/cas/+page.svelte`
- [ ] `src/lib/components/cas/ReplContainer.svelte`
- [ ] `src/lib/components/cas/ReplInput.svelte`
- [ ] `src/lib/components/cas/ReplOutput.svelte`
- [ ] `src/lib/components/cas/HistoryEntry.svelte`

---

## Décisions prises

1. **Route**: `/cas` (public)
2. **3 Tabs**: Terminal, Modern (MathField input), Hybrid
3. **AST**: Highlight bidirectionnel (hover nœud ↔ expression)
4. **Historique**: localStorage, max 100 entrées
5. **Aide**: Tooltip/Popover avec icône `?`

---

## Prochaines étapes

1. Lancer `backend-developer` agent pour Phase 1
2. Créer les types web-spécifiques
3. Adapter output-formatter pour HTML
4. Créer WebReplEngine
5. Créer replStore avec localStorage

---

## Blocages

Aucun pour le moment.

---

## Notes

- CLI existant est 95% browser-compatible
- Seuls `repl.ts` et `cli.ts` utilisent Node.js APIs
- `chalk` à remplacer par classes CSS

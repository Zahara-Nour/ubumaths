# Kanban d'organisation — Progress

Feature : outil Kanban (style Trello minimal) pour élèves et profs (`/organisation/kanban`).

## Scope v1 validé

- Tableaux **perso** (privés) + tableaux de **classe** (prof crée, élèves voient/contribuent aux cartes)
- Colonnes (création/renommage/suppression réservées au propriétaire du board)
- Cartes (titre + description ubumark) — tout utilisateur avec accès peut gérer
- Drag & drop colonnes + cartes (fractional indexing)
- Pas de realtime, pas d'assignation, pas d'échéances, pas de tags (v1)
- Description carte = `RichTextEditor` (Tiptap) + `MarkdownRenderer` (réutilisation whiteboard)
- DnD lib : `svelte-dnd-action`

## Phase 1 — DB + RLS ✅

**Fichiers créés/modifiés :**

- `supabase/migrations/20260526190624_create_kanban_tables.sql` — 3 tables (`kanban_boards`, `kanban_columns`, `kanban_cards`), 4 indexes, 2 triggers `updated_at`, 3 helpers SECURITY DEFINER (`is_class_member`, `can_access_kanban_board`, `can_access_kanban_column`), 12 policies RLS.
- `src/lib/types/database-helpers.ts` — types stopgap `KanbanBoard` / `KanbanColumn` / `KanbanCard` + Insert/Update + composite `KanbanBoardWithCounts`. `class_id` exclu de `KanbanBoardUpdate` (immuable post-création).
- `docs/architecture/database-schema.md` — section Kanban ajoutée.

**Code review (Opus)** : 0 bloquant. Ajustements appliqués : `KanbanBoardUpdate` exclut `class_id`, commentaire SQL sur `owner_id` clarifié.

**Décisions :**

- `class_id` traité comme **immuable** côté API (Zod) pour éviter conversions implicites perso↔classe qui changeraient brutalement la visibilité.
- Helper `can_access_kanban_board(board_id)` factorise la logique d'accès (owner OR teacher OR member).
- Pas d'index composite `(column_id, position)` pour v1 (volumétrie attendue faible).

**Commandes utilisateur à lancer (post-merge) :**

1. `pnpm db:migrate`
2. `pnpm db:types` (régénère `src/lib/types/database.ts` ; remplacer ensuite les stopgaps dans `database-helpers.ts` par `Tables<'kanban_*'>`).

## Phase 2 — API endpoints ⏳

À venir.

## Phase 3 — Frontend liste ⏳

À venir.

## Phase 4 — Frontend vue tableau (DnD) ⏳

À venir.

## Phase 5 — Quality checks finaux ⏳

À venir.

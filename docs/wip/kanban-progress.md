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

## Phase 2 — API endpoints ✅

**Fichiers créés :**

- `src/lib/server/validation/kanban.ts` — schémas Zod (createBoard, updateBoard, createColumn, updateColumn, createCard, updateCard) + `parseKanbanId(raw, kind)` helper.
- `src/lib/server/kanban.ts` — service layer : queries (`getAccessibleBoards`, `getBoardWithContent`, `getColumnBoardId`, `getCardColumnId`), helpers d'autorisation (`assertBoardOwner`, `assertBoardAccess`, `isClassTeacher`).
- 6 endpoints REST sous `src/routes/api/organisation/kanban/` :
  - `boards/+server.ts` (GET list, POST create)
  - `boards/[boardId]/+server.ts` (GET, PATCH, DELETE)
  - `boards/[boardId]/columns/+server.ts` (POST)
  - `columns/[columnId]/+server.ts` (PATCH, DELETE)
  - `columns/[columnId]/cards/+server.ts` (POST)
  - `cards/[cardId]/+server.ts` (PATCH, DELETE)
- `src/routes/api/organisation/kanban/api-routes.test.ts` — 53 tests serveurs unitaires, tous verts.

**Code review (Opus)** : 0 bloquant. Améliorations appliquées : factorisation `parseKanbanId`, suppression cast `Record<string, unknown>`, suppression `assertBoardAccess` redondant dans `cards POST`, audit log sur DELETE board.

**Security audit (Opus)** : 0 critique. Defense-in-depth correcte (RLS + asserts), validation Zod exhaustive, cross-board move guard, XSS-safe (ubumark renderer fait `escapeHtml`).

**Dette technique notée pour Phase 3+ :**

- **Rate limiting absent** : un user peut spammer la création de cartes/colonnes. À ajouter via `checkRateLimit` (ex 60 POST/min sur cards).
- **DB-level CHECK manquant** sur `kanban_cards.description ≤ 50000` (Zod-only) — migration future si nécessaire.
- **Élèves peuvent supprimer cartes d'autres élèves** (board classe) : voulu par les specs. À décider plus tard si on veut limiter à `created_by` + prof.
- **Pagination `GET /boards`** : pas de limite. Ajouter `.limit(100)` + curseur si > 200 boards/user.
- **Race condition fractional positions** : non gérée, deux clients peuvent calculer la même position. Acceptable v1.
- **Tests d'intégration manquants** (uniquement unitaires mockés) — à ajouter Phase 3 pour vérifier RLS bout-en-bout.
- **Tri client-side `getBoardWithContent`** : peut être remplacé par `.order('position', { referencedTable: ... })` après `pnpm db:types`.
- **STOPGAP `'kanban_*' as any`** : 11 occurrences à nettoyer après `pnpm db:types`.

**Décisions :**

- `parseKanbanId(raw, kind)` factorise les 3 helpers locaux dupliqués.
- Audit log `console.info('[kanban] board deleted', {...})` ajouté car action destructive (cascade colonnes + cartes).
- Cross-board move guard explicite dans `cards/[cardId]/PATCH` pour bloquer même un user ayant accès aux 2 boards.

## Phase 3 — Frontend liste ⏳

À venir.

## Phase 4 — Frontend vue tableau (DnD) ⏳

À venir.

## Phase 5 — Quality checks finaux ⏳

À venir.

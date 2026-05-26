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

## Phase 3 — Frontend liste ✅

**Fichiers créés :**

- `src/routes/(protected)/organisation/+layout.svelte` — header avec titre "Organisation" + breadcrumb auto-généré.
- `src/routes/(protected)/organisation/kanban/+page.server.ts` — load function : `getAccessibleBoards` (try/catch défensif si migration absente) + classes du prof (filtrées par rôle).
- `src/routes/(protected)/organisation/kanban/+page.svelte` — liste responsive (1/2/3/4 cols), badges Personnel/Classe, compteurs, date relative FR, suppression owner-only.
- `src/routes/(protected)/organisation/kanban/CreateBoardDialog.svelte` — modal shadcn Dialog, MySelect type + classe.
- `src/routes/(protected)/organisation/kanban/[boardId]/+page.svelte` — stub Phase 4 (placeholder pour permettre `resolve()`).

**Dépendance ajoutée :** `svelte-dnd-action@^0.9.69` (utilisée en Phase 4).

**Code review (Opus)** : 1 bloquant identifié (cartes non cliquables sur la majeure partie de leur surface à cause d'un mauvais empilage z-index). Corrigé via le pattern **stretched link** : `<a>` avec `before:absolute before:inset-0` sur le titre, dropdown en `relative z-10`. Bonus appliqués : type `role` strict (suppression du `| string`), suppression du check mort `title.length > 200` (déjà bloqué par `maxlength`), commentaire `+page.server.ts` clarifié.

**Décisions :**

- Pas de `+layout.server.ts` propre à `organisation/` — héritage de `(protected)`.
- `<a href={resolve(...)}>` plutôt que `goto()` — meilleure a11y, supporte ctrl+click.
- `confirm()` natif pour la suppression (acceptable v1, à passer à shadcn `AlertDialog` si besoin).

## Phase 4 — Frontend vue tableau (DnD) ✅

**Fichiers créés :**

- `src/routes/(protected)/organisation/kanban/[boardId]/+page.server.ts` — load function : `getBoardWithContent` + `{ board, userId, isOwner }`.
- `src/routes/(protected)/organisation/kanban/[boardId]/+page.svelte` — page principale (509 lignes) : header avec rename inline du board, conteneur horizontal scrollable, dndzone des colonnes, bouton ajout colonne, gestion centralisée des mutations + optimistic updates avec rollback.
- `src/routes/(protected)/organisation/kanban/[boardId]/KanbanColumn.svelte` — colonne (rename inline, menu suppression, dndzone des cartes, création inline carte).
- `src/routes/(protected)/organisation/kanban/[boardId]/KanbanCard.svelte` — carte cliquable avec indicateur description.
- `src/routes/(protected)/organisation/kanban/[boardId]/CardEditDialog.svelte` — modal édition avec `RichTextEditor` (ubumark via Tiptap) + suppression. API impérative `openCard(card)` via `bind:this`.
- `src/routes/(protected)/organisation/kanban/[boardId]/CardEditForm.svelte` — sous-composant interne pour éviter `$state` dans `$effect`.
- `src/routes/(protected)/organisation/kanban/[boardId]/api.ts` — helpers REST client (createColumn, updateColumn, deleteColumn, createCard, updateCard, deleteCard, updateBoard). Pattern `T | null` + toast intégré.
- `src/lib/utils/fractional-indexing.ts` — `getPositionBetween(before, after)` avec **fix collision** : `after - 1` au lieu de `after / 2` quand `before == null` (sinon collision avec position=0).

**Code review (Opus)** : 3 vrais bloquants corrigés (1 jugé incorrect : voir notes).

**Corrections appliquées :**

- **B1** — `dropTargetStyle` : `hsl(var(--ring))` → `var(--color-ring)` (Tailwind 4 expose `--color-ring` direct, pas en composants HSL).
- **B3** — Détection no-op drop : court-circuite la PATCH quand l'ordre n'a pas changé (intra-colonne ET intra-position).
- **B4** — `getPositionBetween(null, 0)` retournait 0 (collision) → maintenant `after - 1` (toujours sous le min).

**Critique écartée :** B2 (cartes draggables pour non-owners) — la spec dit explicitement que les élèves peuvent gérer toutes les cartes sur un board classe. Seul le drag des colonnes est owner-only.

**Architecture clé :**

- **Source de vérité unique** côté client : `+page.svelte` détient `columns: $state<ColumnWithCards[]>`. Les enfants sont passifs (callbacks pour mutations).
- **Optimistic + rollback** : chaque mutation snapshot pré-mutation, applique localement, appelle API. Si API retourne `null` (déjà toasté), restaure snapshot.
- **2 niveaux de dndzone** : un sur les colonnes (`type: 'kanban-column'`, `dragDisabled: !isOwner`), un par colonne pour les cartes (`type: 'kanban-card'`).
- **Pas de re-seed automatique** de l'état local sur `data` : commenté, évite d'écraser modifications locales en cours.

**Dette technique notée pour plus tard :**

- **Keyboard fallback DnD** : `svelte-dnd-action` propose un mode clavier (`zoneTabIndex`) non activé. À ajouter pour a11y complète. Documenter dans `docs/ref/warning-svelte.md`.
- **Race condition handleSaveCard** : si suppression concurrente pendant edition, rollback peut viser le mauvais index. Atténuation : retrouver l'index par id juste avant rollback (mono-user OK, à corriger si realtime arrive).
- **CardEditForm `{#key card.id}`** : le commentaire mentionne un `{#key}` non implémenté. Soit ajouter, soit corriger le commentaire.
- **Confirmations natives** : `confirm()` pour suppression colonne/carte (cohérent avec liste boards). Migrer vers shadcn `AlertDialog` plus tard.
- **`cn()` non utilisé** dans `KanbanCard.svelte` : tableau de classes inline marche mais le projet préfère `cn()`.

## Phase 5 — Quality checks finaux ⏳

À venir.

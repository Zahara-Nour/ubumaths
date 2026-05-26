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

## Phase 5 — Quality checks finaux ✅

**Vérifications :**

- ✅ `pnpm test:server src/routes/api/organisation/kanban/api-routes.test.ts` → **53 tests verts**.
- ✅ `npx eslint` sur tous les fichiers kanban → **0 erreur, 0 warning**.
- ✅ `pnpm check:incremental` → **9 errors / 46 warnings / 25 files** : identique au baseline projet (cf `project_preexisting-svelte-check-errors.md`). **0 nouvelle erreur introduite par Kanban.**
- ✅ `mcp__svelte__svelte-autofixer` exécuté en Phase 3 et Phase 4 (par les agents `frontend-developer`).
- ✅ Lint-staged auto-formate à chaque commit (prettier + eslint --fix).

## Bilan final

**Commits :**

| SHA         | Phase | Description                      |
| ----------- | ----- | -------------------------------- |
| `5f71de51c` | 1     | DB schema + RLS + stopgap types  |
| `02fdf108b` | 2     | API endpoints + 53 tests         |
| `b7d38f8cc` | 3     | Boards list page + create dialog |
| `052020415` | 4     | Board detail view + drag & drop  |

**Fichiers créés (synthèse) :**

- Migration : `supabase/migrations/20260526190624_create_kanban_tables.sql`
- Backend : `src/lib/server/kanban.ts`, `src/lib/server/validation/kanban.ts`
- API : 6 endpoints `src/routes/api/organisation/kanban/**` + 1 fichier de tests
- Frontend liste : `src/routes/(protected)/organisation/+layout.svelte`, `kanban/+page.{server.ts,svelte}`, `CreateBoardDialog.svelte`
- Frontend détail : `kanban/[boardId]/+page.{server.ts,svelte}`, `KanbanColumn.svelte`, `KanbanCard.svelte`, `CardEditDialog.svelte`, `CardEditForm.svelte`, `api.ts`
- Utils : `src/lib/utils/fractional-indexing.ts`
- Types : section Kanban ajoutée à `src/lib/types/database-helpers.ts`
- Doc : `docs/architecture/database-schema.md` (section Kanban), `docs/wip/kanban-progress.md`

**Dépendance ajoutée :** `svelte-dnd-action@^0.9.69`.

## Actions utilisateur requises (post-merge)

1. **`pnpm db:migrate`** — push la migration sur Supabase
2. **`pnpm db:types`** — régénère `src/lib/types/database.ts`
3. **Nettoyage stopgap** dans `src/lib/types/database-helpers.ts` : remplacer les 3 interfaces `KanbanBoard` / `KanbanColumn` / `KanbanCard` par des alias `Tables<'kanban_*'>`. Garder les `*Insert` / `*Update` / `KanbanBoardWithCounts`.
4. **Nettoyage casts** : `grep "kanban_.* as any" src/` — les 11 occurrences `'kanban_*' as any` peuvent être supprimées une fois `database.ts` régénéré. Retirer aussi les `eslint-disable-next-line @typescript-eslint/no-explicit-any` associés.
5. **Test navigateur** sur `/organisation/kanban` (port 5175 si Claude, 5173 si user) :
   - Créer un tableau perso → OK
   - Créer un tableau classe (en tant que prof) → OK
   - Naviguer vers le détail → OK
   - Créer des colonnes + cartes → OK
   - Drag & drop cartes intra-colonne + inter-colonnes → OK
   - Drag & drop colonnes (owner uniquement) → OK
   - Rename inline board / colonne → OK
   - Édition carte avec description ubumark (RichTextEditor) → OK
   - Suppression colonne non vide (confirmation FR mentionnant le nombre de cartes) → OK
   - Supprimer un tableau (depuis la liste) → OK

## Dette technique consolidée

À traiter en v2+ (par ordre de priorité) :

1. **Rate limiting** sur les endpoints (60 POST/min sur cards, 10 POST/min sur columns/boards)
2. **Keyboard fallback DnD** (`zoneTabIndex` de svelte-dnd-action) — a11y
3. **Tests d'intégration** RLS bout-en-bout (les 53 tests actuels sont unitaires mockés)
4. **Pagination** `GET /boards` (`.limit(100)` + curseur) si > 200 boards/user
5. **Realtime** Supabase pour collaboration live sur boards classe
6. **Assignation cartes** à un utilisateur spécifique (champ `assigned_to`)
7. **Tags / labels colorés** sur les cartes
8. **Dates d'échéance** sur les cartes
9. **AlertDialog** shadcn à la place de `confirm()` natif
10. **DB-level CHECK** `description ≤ 50000` (Zod-only actuellement)
11. **Race condition** `handleSaveCard` (rollback par id, pas par index) — important si realtime arrive
12. **RPC dédiée** pour `getAccessibleBoards` (PostgREST nested embeds complexes)
13. **Sort PostgREST** : `.order('position', { referencedTable: ... })` au lieu du sort client-side

## Documents produits

- `docs/wip/kanban-progress.md` (ce fichier)
- `docs/architecture/database-schema.md` (section Kanban ajoutée)

---

## v1.1 — Dates d'échéance ✅

Sous-feature ajoutée après la v1 : un champ `due_date` optionnel sur les cartes, avec date picker dans l'éditeur et badge coloré sur la carte.

**Migration :** `supabase/migrations/20260526230517_add_kanban_card_due_date.sql` (colonne `kanban_cards.due_date TIMESTAMPTZ NULL` + index partiel sur les dates non-null).

**Décisions :**

- **Date seule, sans heure** (UI). On stocke en TIMESTAMPTZ pour rester flexible côté DB ; le client envoie un ISO 8601 à minuit UTC.
- **3 paliers couleur** : rouge (passée), orange (aujourd'hui/demain), gris (futur > 1 jour).
- **shadcn Calendar** scaffoldé via `pnpm dlx shadcn-svelte@latest add calendar` (ajoute aussi 17 fichiers `calendar/*.svelte` + dépendances internes). Pas de tri par date dans la v1.1 ; pas d'indicateur au niveau colonne ; pas de filtre.

**Fichiers modifiés :**

- `src/lib/server/validation/kanban.ts` — schémas Zod : `dueDateSchema` (ISO 8601 nullable) ajouté à `createCardSchema` et `updateCardSchema`, refine étendu pour le `due_date`.
- `src/routes/api/organisation/kanban/columns/[columnId]/cards/+server.ts` — propage `due_date` dans l'insert.
- `src/routes/api/organisation/kanban/cards/[cardId]/+server.ts` — `CardMutationPayload` étendu, le PATCH transmet `due_date`.
- `src/routes/api/organisation/kanban/api-routes.test.ts` — 5 tests supplémentaires (création avec/sans date, format invalide, PATCH set/clear/invalid) ; total 58 tests verts.
- `src/routes/(protected)/organisation/kanban/[boardId]/api.ts` — `CardPatch.due_date` ajouté.
- `src/routes/(protected)/organisation/kanban/[boardId]/CardEditForm.svelte` — Popover + Calendar `fr-FR`, conversion ISO ↔ DateValue via `@internationalized/date`, bouton « Retirer l'échéance » quand une date est définie.
- `src/routes/(protected)/organisation/kanban/[boardId]/CardEditDialog.svelte` — état `dueDate` ajouté à `openCard`, propagé via `bind:dueDate`, inclus dans le diff de `canSave` et dans le patch envoyé au PATCH.
- `src/routes/(protected)/organisation/kanban/[boardId]/+page.svelte` — `handleSaveCard` propage `due_date` dans l'optimistic update.
- `src/routes/(protected)/organisation/kanban/[boardId]/KanbanCard.svelte` — `dueBadge` derived (label FR court + tier overdue/soon/future), rendu sous le titre avec couleurs Tailwind (rouge/orange/muted) et icône `CalendarDays`.

**Quality checks :**

- ✅ `pnpm check:incremental` → baseline 9 / 46 préservé (1618 fichiers maintenant, +18 du Calendar shadcn).
- ✅ 58 tests serveurs verts (5 nouveaux pour due_date).
- ✅ Migration pushée + types régénérés.

---

## v1.2 — Robustesse + Perf ✅

Lot couvrant tout le bloc "Robustesse" + "Perf" du backlog (items 5-13 de la dette consolidée).

### Phase 1 — DB (`20260527000101_kanban_robustness_perf.sql`)

- **CHECK constraint** `kanban_cards_description_max_length` : `description IS NULL OR char_length(description) <= 50000` — miroir de Zod max(50000) au niveau DB.
- **RPC `get_accessible_kanban_boards(p_limit, p_cursor)`** : retourne board + column_count + card_count en une requête, sorted by `updated_at DESC, id DESC`. Cursor-paginated. `p_limit` clamped to [1, 200].
- **Index composites** : `(column_id, position)` sur `kanban_cards` et `(board_id, position)` sur `kanban_columns` — accélèrent les `ORDER BY position` PostgREST.

### Phase 2 — Backend

- **Rate limit** : 3 helpers dans `rateLimiter.ts` :
  - `checkKanbanBoardCreateRateLimit` (20/h)
  - `checkKanbanColumnMutationRateLimit` (60/h)
  - `checkKanbanCardMutationRateLimit` (240/h, ~4/min)
- Helper `rateLimitResponse()` dans `kanban.ts` qui transforme un `RateLimitResult` en `Response` 429 avec `Retry-After`. Une seule ligne au site d'appel.
- Appliqué sur **6 endpoints mutants** : board POST, column POST/PATCH/DELETE, card POST/PATCH/DELETE.
- **Pagination `GET /boards`** : query params `limit` + `cursor` validés par `listBoardsQuerySchema`. Retourne `{ boards, nextCursor }`.
- `getAccessibleBoards` réécrit pour appeler la RPC (plus de PostgREST nested embed cryptique).
- **Sort PostgREST natif** dans `getBoardWithContent` : `.order('position', { referencedTable: 'kanban_columns' })` + `referencedTable: 'kanban_columns.kanban_cards'`. Plus de sort client-side.

### Phase 3 — Frontend

- **`handleSaveCard`** : rollback par id (findCard avant le rollback) au lieu d'index stale. Corrige la race où une suppression / drag concurrent invalide l'index.
- **Pagination UI** : `boards` + `cursor` en state local seedés depuis `data` via helpers (évite le warning `state_referenced_locally`). Bouton « Voir plus de tableaux » qui appelle `GET /boards?cursor=...`.
- Création/suppression : update local de l'état (filter pour delete, refetch first-page pour create) au lieu de `invalidateAll()`.

### Phase 4 — Tests intégration RLS

- **`tests/integration/kanban-rls.test.ts`** : 8 tests couvrant
  - Personal board : seul l'owner voit / update.
  - Class board : prof + membres voient ; élèves peuvent CRUD cartes mais pas colonnes.
  - Cross-class : autre prof ne voit rien.
  - Cascade DELETE : board → colonnes → cartes.
  - CHECK constraint : 50001 chars rejeté (code 23514), 50000 chars OK.
  - RPC pagination : limit + cursor + pas de chevauchement entre pages.
- `cleanupAllTestData` étendu pour inclure les 3 tables kanban (children-first order).
- **À lancer localement** avec `pnpm db:start` puis `pnpm test:integration kanban-rls`.

### Quality checks

- ✅ 58 tests serveurs verts (rate-limit helpers vi.mock'd pour ne pas hit le service-role client).
- ✅ `pnpm check:incremental` baseline 9 / 46 préservé.
- ✅ Migration pushée + types régénérés.

### Reste de la dette (à traiter plus tard)

Items du backlog couverts par v1.2 : **5, 6, 7, 8, 9, 10, 11, 12, 13** ✅

Items restants (features uniquement) :

1. Tags / labels colorés
2. Realtime
3. Assignation cartes
4. A11y clavier DnD

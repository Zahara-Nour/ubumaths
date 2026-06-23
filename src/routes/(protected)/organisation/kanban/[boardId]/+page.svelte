<!--
	Kanban Board Detail
	===================

	Phase 4 — interactive board view. Renders the columns + cards horizontally,
	supports drag&drop of cards within and across columns, drag&drop of columns
	(owner only), inline rename of the board / columns, quick-create cards via
	inline input, and a modal editor for a card's description.

	State model:
	- The server load gives us the initial board content. We mirror it in a
	  *local* mutable `columns` state — this is the source of truth for the UI
	  (drag operations mutate it directly for snappy optimistic feedback).
	- Every mutation has a rollback: we snapshot the previous state, attempt the
	  API call, and restore on failure (the api.ts helpers already toast).

	DnD wiring (svelte-dnd-action):
	- `onconsider`: updates the visible item array while the user drags.
	- `onfinalize`: the drop is committed → we compute a new fractional position
	  for the moved item and persist via the API.
	- The library mutates the items array itself via the events, so both phases
	  produce a fresh array we can swap in.

	Defensive note: `kanban_*` tables may not yet exist in the DB (migration not
	pushed). The server load will 500 in that case — that error propagates and
	the framework renders an error page. We don't try to fallback here because
	there is no usable empty state for a "missing board".
-->

<script lang="ts">
	import { lore } from '$lib/config/lore';
	import {
		dndzone,
		SHADOW_PLACEHOLDER_ITEM_ID,
		SHADOW_ITEM_MARKER_PROPERTY_NAME,
		type DndEvent
	} from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import { resolve } from '$app/paths';
	import { ArrowLeft, Plus, Users, User } from '@lucide/svelte';
	import { Filter, Tag } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { getPositionBetween } from '$lib/utils/fractional-indexing';
	import type {
		KanbanCard,
		KanbanColumn,
		KanbanTag,
		KanbanTagColor,
		KanbanBoardMember
	} from '$lib/types/database-helpers';

	import KanbanColumnComp from './KanbanColumn.svelte';
	import CardEditDialog from './CardEditDialog.svelte';
	import ManageTagsDialog from './ManageTagsDialog.svelte';
	import {
		createCard,
		createColumn,
		createTag,
		deleteCard as apiDeleteCard,
		deleteColumn,
		deleteTag as apiDeleteTag,
		updateBoard,
		updateCard,
		updateColumn,
		updateTag
	} from './api';
	import type { PageData } from './$types';

	const FLIP_MS = 200;

	/**
	 * Helpers for svelte-dnd-action shadow items. When a drag is in progress
	 * the library injects a shadow copy of the dragged element into the items
	 * array (same id, marked via `isDndShadowItem`). To keep Svelte's keyed
	 * each blocks happy we encode the marker in the key (composite key) — see
	 * "Nested Zones Optional Optimization" in the library README.
	 */
	function isDndShadow(item: { id: string }): boolean {
		return Boolean((item as Record<string, unknown>)[SHADOW_ITEM_MARKER_PROPERTY_NAME]);
	}

	function columnDndKey(column: { id: string }): string {
		return isDndShadow(column) ? `${column.id}_dnd-shadow` : column.id;
	}

	/**
	 * Defensive: svelte-dnd-action sometimes emits an items array containing
	 * two entries with the same id (a real one + a freshly-inserted shadow, or
	 * two shadows). Keep only the first occurrence per id so Svelte's keyed
	 * each block stays happy. The order is preserved, so the dnd intent is
	 * still respected (we drop the redundant duplicate, not the meaningful
	 * shadow).
	 */
	function dedupeById<T extends { id: string }>(items: T[]): T[] {
		const seen = new Set<string>();
		const out: T[] = [];
		for (const item of items) {
			if (seen.has(item.id)) continue;
			seen.add(item.id);
			out.push(item);
		}
		return out;
	}

	let { data }: { data: PageData } = $props();

	// Local composite type: a card with tag_ids + assignee_ids flattened, and
	// a column holding such cards (mirrors getBoardWithContent's shape).
	// tag_ids/assignee_ids are optional to match KanbanColumn's onCardsConsider/Finalize signature
	type CardWithExtras = KanbanCard & { tag_ids?: string[]; assignee_ids?: string[] };
	type ColumnWithCards = KanbanColumn & { cards: CardWithExtras[] };

	// Local mutable mirror of the server data, seeded once at mount via a
	// helper that copies out of the reactive `data` prop. We deliberately do
	// NOT re-seed if `data` changes (no `invalidateAll()` happens on this page
	// — all mutations go through optimistic local state). Using a helper
	// function keeps the autofixer happy about state_referenced_locally.
	function snapshotColumns(): ColumnWithCards[] {
		return data.board.columns.map((c) => ({
			id: c.id,
			board_id: c.board_id,
			title: c.title,
			position: c.position,
			created_at: c.created_at,
			cards: c.cards.map((card) => ({
				id: card.id,
				column_id: card.column_id,
				title: card.title,
				description: card.description,
				position: card.position,
				due_date: card.due_date,
				created_at: card.created_at,
				updated_at: card.updated_at,
				tag_ids: [...(card.tag_ids ?? [])],
				assignee_ids: [...(card.assignee_ids ?? [])]
			}))
		}));
	}

	function snapshotBoardTitle(): string {
		return data.board.title;
	}

	function snapshotTags(): KanbanTag[] {
		// Sorted alphabetically (locale FR) up front so picker / chips share order.
		return [...(data.board.tags ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
	}

	function snapshotMembers(): KanbanBoardMember[] {
		// Sorted by name so the picker is stable; nameless members fall to the
		// end with their id as fallback ordering key.
		return [...(data.board.members ?? [])].sort((a, b) => {
			const an = a.full_name ?? a.id;
			const bn = b.full_name ?? b.id;
			return an.localeCompare(bn, 'fr');
		});
	}

	let boardTitle = $state(snapshotBoardTitle());
	let columns = $state<ColumnWithCards[]>(snapshotColumns());
	let tags = $state<KanbanTag[]>(snapshotTags());
	let members = $state<KanbanBoardMember[]>(snapshotMembers());

	const membersById = $derived.by(() => {
		const lookup: Record<string, KanbanBoardMember> = {};
		for (const m of members) lookup[m.id] = m;
		return lookup;
	});

	const tagsById = $derived.by(() => {
		const lookup: Record<string, KanbanTag> = {};
		for (const tag of tags) lookup[tag.id] = tag;
		return lookup;
	});

	// Tag usage counts: { [tagId]: number of cards on the board carrying it }.
	// Recomputed cheaply from local state; used by ManageTagsDialog for its
	// delete-confirmation wording.
	const tagUsageByTagId = $derived.by(() => {
		const lookup: Record<string, number> = {};
		for (const col of columns) {
			for (const card of col.cards) {
				for (const tagId of card.tag_ids ?? []) {
					lookup[tagId] = (lookup[tagId] ?? 0) + 1;
				}
			}
		}
		return lookup;
	});

	// Manage-tags dialog state (owner only).
	let manageTagsOpen = $state(false);

	// "Mes cartes" filter: when on, columns hide every card the current user
	// isn't assigned to. Visible only on class boards (where assignment is
	// meaningful — on personal boards the owner is the only candidate).
	let myCardsOnly = $state(false);

	// Read-through derived values for read-only data props. These DO react to
	// `data` updates (should the framework ever re-run the load), unlike the
	// local mirror above which is intentionally one-way.
	const boardId = $derived(data.board.id);
	const isOwner = $derived(data.isOwner);
	const isClassBoard = $derived(data.board.class_id !== null);

	// Columns to actually render: identical to `columns` unless the "Mes
	// cartes" filter is on, in which case we shadow-copy each column with a
	// filtered card list. The original `columns` state stays untouched so
	// toggling the filter is instant and lossless.
	const visibleColumns = $derived.by<ColumnWithCards[]>(() => {
		if (!myCardsOnly) return columns;
		const me = data.userId;
		return columns.map((col) => ({
			...col,
			cards: col.cards.filter((c) => (c.assignee_ids ?? []).includes(me))
		}));
	});

	// Inline rename of the board title (owner only).
	let isRenamingBoard = $state(false);
	let boardRenameValue = $state('');
	let boardRenameInputRef = $state<HTMLInputElement | null>(null);

	function startRenameBoard() {
		if (!isOwner) return;
		boardRenameValue = boardTitle;
		isRenamingBoard = true;
	}

	$effect(() => {
		// Focus the input when entering rename mode (DOM side-effect).
		if (isRenamingBoard && boardRenameInputRef) {
			boardRenameInputRef.focus();
			boardRenameInputRef.select();
		}
	});

	async function commitRenameBoard() {
		const next = boardRenameValue.trim();
		isRenamingBoard = false;
		if (!next || next === boardTitle) return;
		const previous = boardTitle;
		boardTitle = next; // optimistic
		const updated = await updateBoard(boardId, { title: next });
		if (!updated) boardTitle = previous; // rollback
	}

	function cancelRenameBoard() {
		isRenamingBoard = false;
	}

	function handleBoardRenameKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			commitRenameBoard();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			cancelRenameBoard();
		}
	}

	// ===== Card edit dialog wiring =====
	// We control the dialog imperatively via a child-exposed `openCard()` method
	// to avoid the $state-in-$effect antipattern (see CardEditDialog.svelte).
	let cardDialogRef = $state<{ openCard: (c: KanbanCard) => void } | null>(null);

	function handleEditCard(card: KanbanCard) {
		cardDialogRef?.openCard(card);
	}

	// ===== Helpers to navigate the local state =====

	/** Locate a card and its column. Returns null when not found. */
	function findCard(cardId: string): { column: ColumnWithCards; index: number } | null {
		for (const col of columns) {
			const idx = col.cards.findIndex((c) => c.id === cardId);
			if (idx !== -1) return { column: col, index: idx };
		}
		return null;
	}

	// ===== Column CRUD =====

	let isCreatingColumn = $state(false);
	let newColumnTitle = $state('');
	let newColumnInputRef = $state<HTMLInputElement | null>(null);

	function startCreateColumn() {
		newColumnTitle = '';
		isCreatingColumn = true;
	}

	$effect(() => {
		if (isCreatingColumn && newColumnInputRef) {
			newColumnInputRef.focus();
		}
	});

	function cancelCreateColumn() {
		isCreatingColumn = false;
		newColumnTitle = '';
	}

	async function commitCreateColumn() {
		const title = newColumnTitle.trim();
		if (!title) {
			isCreatingColumn = false;
			return;
		}
		// Position = end of the list.
		const last = columns[columns.length - 1];
		const position = getPositionBetween(last?.position ?? null, null);
		const created = await createColumn(boardId, title, position);
		if (created) {
			columns = [
				...columns,
				{
					id: created.id,
					board_id: created.board_id,
					title: created.title,
					position: created.position,
					created_at: created.created_at,
					cards: []
				}
			];
			newColumnTitle = '';
			// Stay in create mode for rapid input.
		}
	}

	function handleNewColumnKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			commitCreateColumn();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			cancelCreateColumn();
		}
	}

	async function handleRenameColumn(columnId: string, title: string) {
		const col = columns.find((c) => c.id === columnId);
		if (!col) return;
		const previous = col.title;
		col.title = title; // optimistic
		const res = await updateColumn(columnId, { title });
		if (!res) col.title = previous;
	}

	async function handleDeleteColumn(columnId: string) {
		const idx = columns.findIndex((c) => c.id === columnId);
		if (idx === -1) return;
		const removed = columns[idx];
		columns = columns.filter((_, i) => i !== idx); // optimistic
		const ok = await deleteColumn(columnId);
		if (!ok) {
			// Rollback at original index.
			columns = [...columns.slice(0, idx), removed, ...columns.slice(idx)];
		} else {
			toaster.success('Colonne supprimée');
		}
	}

	// ===== Card CRUD =====

	async function handleCreateCard(columnId: string, title: string) {
		const col = columns.find((c) => c.id === columnId);
		if (!col) return;
		const last = col.cards[col.cards.length - 1];
		const position = getPositionBetween(last?.position ?? null, null);
		const created = await createCard(columnId, title, position);
		if (created) {
			col.cards = [...col.cards, { ...created, tag_ids: [], assignee_ids: [] }];
		}
	}

	async function handleSaveCard(
		cardId: string,
		patch: {
			title?: string;
			description?: string | null;
			due_date?: string | null;
			tag_ids?: string[];
			assignee_ids?: string[];
		}
	) {
		const located = findCard(cardId);
		if (!located) return;
		const { column, index } = located;
		const previous = column.cards[index];
		const optimistic: CardWithExtras = {
			...previous,
			...(patch.title !== undefined ? { title: patch.title } : {}),
			...(patch.description !== undefined ? { description: patch.description } : {}),
			...(patch.due_date !== undefined ? { due_date: patch.due_date } : {}),
			...(patch.tag_ids !== undefined ? { tag_ids: [...patch.tag_ids] } : {}),
			...(patch.assignee_ids !== undefined ? { assignee_ids: [...patch.assignee_ids] } : {})
		};
		column.cards[index] = optimistic;

		const updated = await updateCard(cardId, patch);

		// Look the card up again by id rather than reusing `index`: between the
		// optimistic update and the API response, other handlers (drag, delete,
		// concurrent save when realtime ships) may have reordered or removed it.
		// Indexes are unstable across these mutations; ids are not.
		const after = findCard(cardId);
		if (updated) {
			// The API returns the row but NOT the new tag_ids / assignee_ids —
			// keep the optimistic sets on success (they're the source of truth
			// for the junctions since we just replaced them server-side).
			if (after) {
				after.column.cards[after.index] = {
					...updated,
					tag_ids: optimistic.tag_ids,
					assignee_ids: optimistic.assignee_ids
				};
			}
			toaster.success('Carte enregistrée');
		} else if (after) {
			after.column.cards[after.index] = previous;
		}
	}

	async function handleDeleteCard(cardId: string) {
		const located = findCard(cardId);
		if (!located) return;
		const { column, index } = located;
		const removed = column.cards[index];
		column.cards = column.cards.filter((_, i) => i !== index);
		const ok = await apiDeleteCard(cardId);
		if (!ok) {
			column.cards = [...column.cards.slice(0, index), removed, ...column.cards.slice(index)];
		} else {
			toaster.success('Carte supprimée');
		}
	}

	// ===== Tag CRUD (owner only) =====

	// Keep the local `tags` array sorted alphabetically so the manager and
	// the card picker render in the same order.
	function sortTags(arr: KanbanTag[]): KanbanTag[] {
		return [...arr].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
	}

	async function handleCreateTag(name: string, color: KanbanTagColor): Promise<KanbanTag | null> {
		const created = await createTag(boardId, name, color);
		if (created) {
			tags = sortTags([...tags, created]);
		}
		return created;
	}

	async function handleUpdateTag(tagId: string, patch: { name?: string; color?: KanbanTagColor }) {
		const previous = tags.find((t) => t.id === tagId);
		if (!previous) return;
		// Optimistic local change.
		tags = sortTags(tags.map((t) => (t.id === tagId ? { ...t, ...patch } : t)));
		const updated = await updateTag(tagId, patch);
		if (!updated) {
			// Rollback.
			tags = sortTags(tags.map((t) => (t.id === tagId ? previous : t)));
		}
	}

	async function handleDeleteTag(tagId: string) {
		const previous = tags.find((t) => t.id === tagId);
		if (!previous) return;
		// Optimistic: remove the tag locally AND from any card's tag_ids so chips
		// disappear immediately. The DB cascade keeps things in sync server-side.
		tags = tags.filter((t) => t.id !== tagId);
		for (const col of columns) {
			for (const card of col.cards) {
				if ((card.tag_ids ?? []).includes(tagId)) {
					card.tag_ids = (card.tag_ids ?? []).filter((id) => id !== tagId);
				}
			}
		}
		const ok = await apiDeleteTag(tagId);
		if (!ok) {
			// Rollback the tag itself (we don't track which cards had it before
			// since that's complex; in practice rollback failure here is rare).
			tags = sortTags([...tags, previous]);
			toaster.error('Suppression annulée — rechargez pour rétablir les associations.');
		}
	}

	function openManageTags() {
		manageTagsOpen = true;
	}

	// ===== DnD: cards =====

	function handleCardsConsider(columnId: string, items: CardWithExtras[]) {
		const col = columns.find((c) => c.id === columnId);
		if (!col) return;
		col.cards = dedupeById(items);
	}

	async function handleCardsFinalize(
		columnId: string,
		items: CardWithExtras[],
		info: DndEvent<CardWithExtras>['info']
	) {
		const destCol = columns.find((c) => c.id === columnId);
		if (!destCol) return;

		// Snapshot all columns' cards (for rollback) BEFORE mutating local state.
		const snapshot = columns.map((c) => ({ colId: c.id, cards: [...c.cards] }));

		// Apply the dnd library's final items array to the destination column.
		destCol.cards = dedupeById(items);

		// The dropped item's id is in `info.id`. It might or might not have come
		// from another column — to know, we look for it in the snapshot.
		const movedId = info.id;
		const movedCard = items.find((c) => c.id === movedId);
		if (!movedCard) return; // dropped outside or never landed

		// If it came from another column, remove it from that column's array.
		const sourceSnapshot = snapshot.find((s) => s.cards.some((c) => c.id === movedId));
		const crossColumn = sourceSnapshot && sourceSnapshot.colId !== columnId;
		if (crossColumn) {
			const sourceCol = columns.find((c) => c.id === sourceSnapshot!.colId);
			if (sourceCol) {
				sourceCol.cards = sourceCol.cards.filter((c) => c.id !== movedId);
			}
			// Also update the local column_id on the moved card.
			movedCard.column_id = columnId;
		}

		// Compute new fractional position based on neighbours in the destination.
		const destIndex = destCol.cards.findIndex((c) => c.id === movedId);
		const before = destIndex > 0 ? destCol.cards[destIndex - 1].position : null;
		const after =
			destIndex < destCol.cards.length - 1 ? destCol.cards[destIndex + 1].position : null;

		// Short-circuit no-op drops: same column AND same index → nothing to persist.
		// If the snapshot didn't contain the card anywhere (rare race when the
		// library emits a finalize before the source column's consider has fully
		// committed), skip the no-op check and just persist the move — the API
		// will treat it as a position update.
		if (!crossColumn && sourceSnapshot) {
			const oldIndex = sourceSnapshot.cards.findIndex((c) => c.id === movedId);
			if (oldIndex === destIndex) return;
		}

		const newPosition = getPositionBetween(before, after);
		movedCard.position = newPosition;

		// Persist. For cross-column moves, the API requires both column_id AND
		// position; for same-column it accepts position alone (we send both for
		// uniformity — the schema permits it).
		const patch: { position: number; column_id?: string } = { position: newPosition };
		if (crossColumn) patch.column_id = columnId;

		const updated = await updateCard(movedId, patch);
		if (!updated) {
			// Rollback to the snapshot.
			columns = columns.map((c) => {
				const snap = snapshot.find((s) => s.colId === c.id);
				return snap ? { ...c, cards: snap.cards } : c;
			});
		}
	}

	// ===== DnD: columns =====

	function handleColumnsConsider(event: CustomEvent<DndEvent<ColumnWithCards>>) {
		columns = dedupeById(event.detail.items);
	}

	async function handleColumnsFinalize(event: CustomEvent<DndEvent<ColumnWithCards>>) {
		const movedId = event.detail.info.id;
		const snapshot = [...columns];
		const deduped = dedupeById(event.detail.items);

		// ALWAYS commit the dedup. The finalize event payload is the lib's
		// authoritative "post-drop" state: shadow markers have been replaced by
		// the original draggedElData. Skipping this assignment on no-op drops
		// (early-return below) would leave the previous consider event's shadow
		// marker in our state, making the column appear faded and undraggable.
		columns = deduped;

		// Short-circuit no-op drops: same index → nothing to persist.
		const oldIndex = snapshot.findIndex((c) => c.id === movedId);
		const newIndex = deduped.findIndex((c) => c.id === movedId);
		if (oldIndex === newIndex) return;

		if (newIndex === -1) return;

		const before = newIndex > 0 ? columns[newIndex - 1].position : null;
		const after = newIndex < columns.length - 1 ? columns[newIndex + 1].position : null;
		const newPosition = getPositionBetween(before, after);
		columns[newIndex].position = newPosition;

		const updated = await updateColumn(movedId, { position: newPosition });
		if (!updated) {
			columns = snapshot;
		}
	}
</script>

<div class="flex h-full flex-col gap-4">
	<!-- Header -->
	<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
		<div class="flex min-w-0 flex-1 items-center gap-3">
			<Button variant="ghost" size="sm" href={resolve('/organisation/kanban')} class="gap-2">
				<ArrowLeft class="h-4 w-4" aria-hidden="true" />
				Tableaux
			</Button>

			<div class="flex min-w-0 flex-1 items-center gap-2">
				{#if isRenamingBoard}
					<Input
						bind:ref={boardRenameInputRef}
						bind:value={boardRenameValue}
						maxlength={200}
						onblur={commitRenameBoard}
						onkeydown={handleBoardRenameKeydown}
						class="max-w-md text-xl font-semibold"
						aria-label="Renommer le tableau"
					/>
				{:else}
					<button
						type="button"
						class="truncate rounded px-2 py-1 text-left text-xl font-semibold tracking-tight hover:bg-muted disabled:cursor-default disabled:hover:bg-transparent sm:text-2xl"
						disabled={!isOwner}
						onclick={startRenameBoard}
						aria-label={isOwner ? `Renommer le tableau ${boardTitle}` : boardTitle}
					>
						{boardTitle}
					</button>
				{/if}

				<Badge variant={isClassBoard ? 'default' : 'secondary'} class="shrink-0 gap-1">
					{#if isClassBoard}
						<Users class="h-3 w-3" aria-hidden="true" />
						Classe
					{:else}
						<User class="h-3 w-3" aria-hidden="true" />
						Personnel
					{/if}
				</Badge>
			</div>
		</div>

		<div class="flex shrink-0 items-center gap-2">
			{#if isClassBoard}
				<!--
					"Mes cartes" filter (class boards only — on personal boards
					every card is implicitly yours). Toggling on disables card DnD
					so a drag can't accidentally drop hidden cards.
				-->
				<Button
					variant={myCardsOnly ? 'default' : 'outline'}
					size="sm"
					class="gap-2"
					onclick={() => (myCardsOnly = !myCardsOnly)}
					aria-pressed={myCardsOnly}
					aria-label="Filtrer mes cartes"
				>
					<Filter class="h-4 w-4" aria-hidden="true" />
					Mes cartes
				</Button>
			{/if}

			{#if isOwner}
				<Button
					variant="outline"
					size="sm"
					class="gap-2"
					onclick={openManageTags}
					aria-label="Gérer les tags du tableau"
				>
					<Tag class="h-4 w-4" aria-hidden="true" />
					Tags{tags.length > 0 ? ` (${tags.length})` : ''}
				</Button>
			{/if}
		</div>
	</div>

	<!-- Empty state -->
	{#if columns.length === 0 && !isCreatingColumn}
		<div
			class="mx-auto mt-8 flex max-w-md flex-col items-center gap-3 rounded-lg border border-dashed bg-muted/30 p-8 text-center"
		>
			<p class="text-base font-medium">Aucune colonne pour le moment.</p>
			<p class="text-sm text-muted-foreground">
				Créez votre première colonne pour commencer à organiser vos tâches.
			</p>
			{#if isOwner}
				<Button onclick={startCreateColumn} class="mt-2 gap-2">
					<Plus class="h-4 w-4" aria-hidden="true" />
					Créer une colonne
				</Button>
			{/if}
		</div>
	{:else}
		<!-- Columns + add-column zone, horizontally scrollable -->
		<div class="flex-1 overflow-x-auto pb-4">
			<div
				class="flex h-full items-start gap-3"
				use:dndzone={{
					items: visibleColumns,
					type: 'kanban-column',
					flipDurationMs: FLIP_MS,
					// Column DnD is disabled when the "Mes cartes" filter is on
					// because reordering operates on the filtered subset.
					dragDisabled: !isOwner || myCardsOnly,
					centreDraggedOnCursor: true,
					useCursorForDetection: true,
					dropTargetStyle: { outline: '2px dashed var(--color-ring)' }
				}}
				onconsider={handleColumnsConsider}
				onfinalize={handleColumnsFinalize}
			>
				{#each visibleColumns as column (columnDndKey(column))}
					{@const dndShadow = isDndShadow(column)}
					{@const isShadow = column.id === SHADOW_PLACEHOLDER_ITEM_ID || dndShadow}
					<div
						animate:flip={{ duration: FLIP_MS }}
						class={isShadow ? 'opacity-40' : ''}
						data-is-dnd-shadow-item-hint={dndShadow}
					>
						<KanbanColumnComp
							{column}
							cards={column.cards}
							{isOwner}
							{tagsById}
							{membersById}
							cardsDragDisabled={myCardsOnly}
							onCardsConsider={handleCardsConsider}
							onCardsFinalize={handleCardsFinalize}
							onEditCard={handleEditCard}
							onRenameColumn={handleRenameColumn}
							onDeleteColumn={handleDeleteColumn}
							onCreateCard={handleCreateCard}
						/>
					</div>
				{/each}

				{#if isOwner}
					<div class="w-72 shrink-0 sm:w-80">
						{#if isCreatingColumn}
							<div class="flex flex-col gap-2 rounded-lg border border-dashed p-2">
								<Input
									bind:ref={newColumnInputRef}
									bind:value={newColumnTitle}
									placeholder="Titre de la colonne"
									maxlength={100}
									class="h-8 text-sm"
									onkeydown={handleNewColumnKeydown}
									aria-label="Titre de la nouvelle colonne"
								/>
								<div class="flex justify-end gap-2">
									<Button variant="ghost" size="sm" onclick={cancelCreateColumn}
										>{lore.actions.cancel}</Button
									>
									<Button size="sm" onclick={commitCreateColumn} disabled={!newColumnTitle.trim()}
										>Ajouter</Button
									>
								</div>
							</div>
						{:else}
							<Button
								variant="outline"
								class="w-full justify-start gap-2 border-dashed"
								onclick={startCreateColumn}
							>
								<Plus class="h-4 w-4" aria-hidden="true" />
								Ajouter une colonne
							</Button>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<CardEditDialog
	bind:this={cardDialogRef}
	availableTags={tags}
	availableMembers={members}
	showAssignees={isClassBoard}
	canManageAllAssignees={isOwner}
	currentUserId={data.userId}
	onManageTags={isOwner ? openManageTags : undefined}
	onSave={handleSaveCard}
	onDelete={handleDeleteCard}
/>

{#if isOwner}
	<ManageTagsDialog
		bind:open={manageTagsOpen}
		{tags}
		usageByTagId={tagUsageByTagId}
		onCreate={handleCreateTag}
		onUpdate={handleUpdateTag}
		onDelete={handleDeleteTag}
	/>
{/if}

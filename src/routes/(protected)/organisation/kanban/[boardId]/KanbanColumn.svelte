<!--
	KanbanColumn
	============

	A single column in a kanban board. Owns:
	- Header with title (click → inline rename for owner), card count, "⋮" menu.
	- A vertical dndzone hosting its cards.
	- Bottom affordance for quick-create (title only via inline input).

	DnD integration: this component is itself an item inside the board-level
	column dndzone. The board injects its own `dndzone` action on the columns
	container; here we host a *nested* `dndzone` for the cards. The `type:
	'kanban-card'` discriminator prevents cards from being dropped between
	dndzones of different types.

	Why a callback-heavy API? Because the column-level optimistic state lives
	in the parent (the entire `columns` array is one source of truth so that
	cross-column drags reorder both sides cleanly).
-->

<script lang="ts">
	import {
		dndzone,
		SHADOW_PLACEHOLDER_ITEM_ID,
		SHADOW_ITEM_MARKER_PROPERTY_NAME,
		type DndEvent
	} from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import { MoreVertical, Plus, Trash2 } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import type { KanbanColumn, KanbanCard } from '$lib/types/database-helpers';

	import KanbanCardComp from './KanbanCard.svelte';

	const FLIP_MS = 200;

	/**
	 * svelte-dnd-action injects a transient "shadow" copy of the dragged item
	 * into the items array (with the same id) while a drag is in progress, and
	 * marks it via `isDndShadowItem = true`. To prevent Svelte's keyed each
	 * block from seeing two items with the same id, we suffix the marker into
	 * the key — exactly as recommended in the library README under the
	 * "Nested Zones Optional Optimization" section.
	 */
	function isDndShadow(item: { id: string }): boolean {
		return Boolean((item as Record<string, unknown>)[SHADOW_ITEM_MARKER_PROPERTY_NAME]);
	}

	function cardDndKey(card: KanbanCard): string {
		return isDndShadow(card) ? `${card.id}_dnd-shadow` : card.id;
	}

	type Props = {
		column: KanbanColumn;
		cards: KanbanCard[];
		isOwner: boolean;
		/** Called while a card is being dragged over this column (visual update). */
		onCardsConsider: (columnId: string, items: KanbanCard[]) => void;
		/** Called when a card drop is finalized in / from this column. */
		onCardsFinalize: (
			columnId: string,
			items: KanbanCard[],
			info: DndEvent<KanbanCard>['info']
		) => void;
		/** Open the edit dialog for a card. */
		onEditCard: (card: KanbanCard) => void;
		/** Persist a rename of this column. */
		onRenameColumn: (columnId: string, title: string) => void;
		/** Delete this column (after confirmation). */
		onDeleteColumn: (columnId: string) => void;
		/** Create a new card at the bottom of this column. */
		onCreateCard: (columnId: string, title: string) => void;
	};

	let {
		column,
		cards,
		isOwner,
		onCardsConsider,
		onCardsFinalize,
		onEditCard,
		onRenameColumn,
		onDeleteColumn,
		onCreateCard
	}: Props = $props();

	// Title rename inline mode (owner only). `renameValue` is seeded each time
	// the user opens the rename input (via `startRename`), so we don't need to
	// reference `column.title` at the top level (which would be the initial
	// snapshot only — see `state_referenced_locally`).
	let isRenaming = $state(false);
	let renameValue = $state('');
	let renameInputRef = $state<HTMLInputElement | null>(null);

	function startRename() {
		if (!isOwner) return;
		renameValue = column.title;
		isRenaming = true;
	}

	$effect(() => {
		// Side effect: focus & select the input when entering rename mode.
		// This is a textbook valid $effect (DOM-side-effect, not state mutation).
		if (isRenaming && renameInputRef) {
			renameInputRef.focus();
			renameInputRef.select();
		}
	});

	function commitRename() {
		const next = renameValue.trim();
		isRenaming = false;
		if (next && next !== column.title) {
			onRenameColumn(column.id, next);
		}
	}

	function cancelRename() {
		isRenaming = false;
		renameValue = column.title;
	}

	function handleRenameKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			commitRename();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			cancelRename();
		}
	}

	// Quick-create card inline.
	let isCreatingCard = $state(false);
	let newCardTitle = $state('');
	let newCardInputRef = $state<HTMLInputElement | null>(null);

	function startCreateCard() {
		newCardTitle = '';
		isCreatingCard = true;
	}

	$effect(() => {
		if (isCreatingCard && newCardInputRef) {
			newCardInputRef.focus();
		}
	});

	function commitCreateCard() {
		const title = newCardTitle.trim();
		if (!title) {
			isCreatingCard = false;
			return;
		}
		onCreateCard(column.id, title);
		// Stay in create mode so the user can rapidly add multiple cards.
		newCardTitle = '';
	}

	function cancelCreateCard() {
		isCreatingCard = false;
		newCardTitle = '';
	}

	function handleCreateKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			commitCreateCard();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			cancelCreateCard();
		}
	}

	// Delete column with confirmation that mentions the card count when non-empty.
	function handleDelete() {
		const n = cards.length;
		const message =
			n === 0
				? `Supprimer la colonne "${column.title}" ?`
				: `Supprimer la colonne "${column.title}" ? Elle contient ${n} carte${n > 1 ? 's' : ''} qui ${n > 1 ? 'seront supprimées' : 'sera supprimée'}.`;
		if (confirm(message)) {
			onDeleteColumn(column.id);
		}
	}

	// DnD handlers (cards inside this column).
	function handleCardsConsider(event: CustomEvent<DndEvent<KanbanCard>>) {
		onCardsConsider(column.id, event.detail.items);
	}

	function handleCardsFinalize(event: CustomEvent<DndEvent<KanbanCard>>) {
		onCardsFinalize(column.id, event.detail.items, event.detail.info);
	}
</script>

<div
	class="flex w-72 shrink-0 flex-col gap-2 rounded-lg border border-border bg-muted/40 p-2 shadow-sm sm:w-80"
>
	<!-- Column header -->
	<div
		class="sticky top-0 z-10 flex items-center gap-2 rounded-md bg-muted/40 px-2 py-1 backdrop-blur"
	>
		{#if isRenaming}
			<Input
				bind:ref={renameInputRef}
				bind:value={renameValue}
				maxlength={100}
				onblur={commitRename}
				onkeydown={handleRenameKeydown}
				class="h-7 text-sm"
				aria-label="Renommer la colonne"
			/>
		{:else}
			<button
				type="button"
				class="flex-1 cursor-text rounded px-1 py-0.5 text-left text-sm font-semibold hover:bg-muted disabled:cursor-default disabled:hover:bg-transparent"
				disabled={!isOwner}
				onclick={startRename}
				aria-label={isOwner ? `Renommer la colonne ${column.title}` : column.title}
			>
				<span class="break-words">{column.title}</span>
				<span class="ml-1 text-xs font-normal text-muted-foreground">({cards.length})</span>
			</button>

			{#if isOwner}
				<DropdownMenu.Root>
					<DropdownMenu.Trigger
						class="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						aria-label="Actions sur la colonne"
					>
						<MoreVertical class="h-4 w-4" aria-hidden="true" />
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="end">
						<DropdownMenu.Item
							class="text-destructive focus:text-destructive"
							onclick={handleDelete}
						>
							<Trash2 class="mr-2 h-4 w-4" aria-hidden="true" />
							Supprimer la colonne
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			{/if}
		{/if}
	</div>

	<!-- Cards drop zone -->
	<div
		class="flex min-h-2 flex-col gap-2"
		use:dndzone={{
			items: cards,
			type: 'kanban-card',
			flipDurationMs: FLIP_MS,
			dropTargetStyle: { outline: '2px dashed var(--color-ring)', outlineOffset: '4px' }
		}}
		onconsider={handleCardsConsider}
		onfinalize={handleCardsFinalize}
	>
		{#each cards as card (cardDndKey(card))}
			{@const dndShadow = isDndShadow(card)}
			<div animate:flip={{ duration: FLIP_MS }} data-is-dnd-shadow-item-hint={dndShadow}>
				<KanbanCardComp
					{card}
					isShadow={card.id === SHADOW_PLACEHOLDER_ITEM_ID || dndShadow}
					onEdit={onEditCard}
				/>
			</div>
		{/each}
	</div>

	<!-- Add card affordance -->
	{#if isCreatingCard}
		<div class="flex flex-col gap-1 px-1">
			<Input
				bind:ref={newCardInputRef}
				bind:value={newCardTitle}
				placeholder="Titre de la carte"
				maxlength={200}
				class="h-8 text-sm"
				onkeydown={handleCreateKeydown}
				aria-label="Titre de la nouvelle carte"
			/>
			<div class="flex justify-end gap-2">
				<Button variant="ghost" size="sm" onclick={cancelCreateCard}>Annuler</Button>
				<Button size="sm" onclick={commitCreateCard} disabled={!newCardTitle.trim()}>Ajouter</Button
				>
			</div>
		</div>
	{:else}
		<Button
			variant="ghost"
			size="sm"
			class="justify-start gap-2 text-muted-foreground hover:text-foreground"
			onclick={startCreateCard}
		>
			<Plus class="h-4 w-4" aria-hidden="true" />
			Ajouter une carte
		</Button>
	{/if}
</div>

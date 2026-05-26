<!--
	CardEditDialog
	==============

	Modal dialog used to edit an existing kanban card's title + description
	(markdown / ubumark). Card creation goes through the inline "+ Ajouter une
	carte" affordance inside KanbanColumn — this dialog handles edits only.

	State flow:
	1. The parent invokes `openCard(card)` (exposed below) to seed the working
	   state and open the dialog. Seeding is therefore driven by an explicit
	   user action — no `$effect` required.
	2. The user edits inside the inline form. Title + description are
	   bidirectionally bound between this component and `CardEditForm`.
	3. On "Enregistrer", `onSave(cardId, patch)` is invoked with only the
	   changed fields. The parent handles persistence + optimistic updates.
	4. On "Supprimer", a native confirm() is followed by `onDelete(cardId)`.
-->

<script lang="ts" module>
	// No module-level state — kept for symmetry with other dialogs in the
	// project that expose imperative open helpers via module-scoped APIs.
</script>

<script lang="ts">
	import { Trash2 } from 'lucide-svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import type { KanbanCard } from '$lib/types/database-helpers';
	import type { CardPatch } from './api';
	import CardEditForm from './CardEditForm.svelte';

	type Props = {
		/** Called with only the fields that changed. Parent handles persistence. */
		onSave: (cardId: string, patch: CardPatch) => Promise<void> | void;
		/** Called after user confirms deletion. */
		onDelete: (cardId: string) => Promise<void> | void;
	};

	let { onSave, onDelete }: Props = $props();

	// Card currently being edited. `null` ↔ dialog closed. The parent calls
	// `openCard(card)` via a bound reference to set both at once.
	let card = $state<KanbanCard | null>(null);
	let open = $state(false);

	// Working copies — seeded by `openCard` (explicit user-action trigger).
	let title = $state('');
	let description = $state('');
	let dueDate = $state<string | null>(null);
	let initialTitle = '';
	let initialDescription = '';
	let initialDueDate: string | null = null;

	let saving = $state(false);
	let deleting = $state(false);

	/**
	 * Public entry point: open the dialog seeded with `c`. Imported by the
	 * parent via `bind:this` (see KanbanBoard page).
	 */
	export function openCard(c: KanbanCard) {
		card = c;
		title = c.title;
		description = c.description ?? '';
		// `?? null` guards against legacy cards where due_date was never
		// selected; the bindable below has a `null` fallback that crashes on
		// undefined.
		dueDate = c.due_date ?? null;
		initialTitle = title;
		initialDescription = description;
		initialDueDate = dueDate;
		open = true;
	}

	const canSave = $derived.by(() => {
		if (!card || saving || deleting) return false;
		if (!title.trim()) return false;
		return (
			title !== initialTitle || description !== initialDescription || dueDate !== initialDueDate
		);
	});

	function handleOpenChange(next: boolean) {
		// Block close while a mutation is in flight to keep state coherent.
		if (!next && (saving || deleting)) return;
		open = next;
		if (!next) {
			// Clear the card so a future re-open with the same id still seeds.
			card = null;
		}
	}

	async function handleSave() {
		if (!card || !canSave) return;
		saving = true;
		try {
			const patch: CardPatch = {};
			if (title !== initialTitle) patch.title = title.trim();
			if (description !== initialDescription) {
				// Normalize "" → null so the DB stores NULL rather than empty string.
				patch.description = description.trim().length === 0 ? null : description;
			}
			if (dueDate !== initialDueDate) patch.due_date = dueDate;
			await onSave(card.id, patch);
			open = false;
			card = null;
		} finally {
			saving = false;
		}
	}

	async function handleDelete() {
		if (!card || deleting) return;
		const ok = confirm(`Supprimer la carte "${card.title}" ? Action irréversible.`);
		if (!ok) return;
		deleting = true;
		try {
			await onDelete(card.id);
			open = false;
			card = null;
		} finally {
			deleting = false;
		}
	}
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
	<Dialog.Content class="flex max-h-[90vh] flex-col gap-4 sm:max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>Modifier la carte</Dialog.Title>
			<Dialog.Description>
				Mettez à jour le titre et la description. La description accepte du markdown.
			</Dialog.Description>
		</Dialog.Header>

		{#if card}
			<div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
				<CardEditForm bind:title bind:description bind:dueDate />
			</div>

			<Dialog.Footer class="flex-row justify-between gap-2 sm:gap-2">
				<Button
					type="button"
					variant="ghost"
					class="text-destructive hover:bg-destructive/10 hover:text-destructive"
					onclick={handleDelete}
					disabled={saving || deleting}
				>
					<Trash2 class="mr-2 h-4 w-4" aria-hidden="true" />
					{deleting ? 'Suppression…' : 'Supprimer'}
				</Button>
				<div class="flex gap-2">
					<Button
						type="button"
						variant="outline"
						onclick={() => handleOpenChange(false)}
						disabled={saving || deleting}
					>
						Annuler
					</Button>
					<Button type="button" onclick={handleSave} disabled={!canSave}>
						{saving ? 'Enregistrement…' : 'Enregistrer'}
					</Button>
				</div>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>

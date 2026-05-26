<!--
	ManageTagsDialog
	================

	Owner-only dialog to manage the per-board tag palette: create / rename /
	recolour / delete. The parent owns the canonical `tags` state and is
	notified via the three async callbacks; this dialog is purely a view.

	Behaviours:
	- Each existing tag is shown as a row with a colour swatch picker, an
	  inline rename input, and a delete button (with confirmation if the tag
	  is in use somewhere on the board).
	- A "+ Ajouter un tag" affordance at the bottom opens an inline form.
	- All mutations are committed immediately to the parent (no Save button at
	  the dialog level). Closing the dialog has no rollback semantics.
-->

<script lang="ts">
	import { Plus, Trash2, Check } from 'lucide-svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { ConfirmDialog } from '$lib/components/ui/confirm-dialog';
	import type { KanbanTag, KanbanTagColor } from '$lib/types/database-helpers';
	import { TAG_COLORS, TAG_COLOR_TOKENS } from './tag-colors';

	type Props = {
		/** Tag palette to display (canonical state owned by the parent). */
		tags: KanbanTag[];
		/** For each tag id, how many cards on the board carry it. Used to
		 * make the delete confirmation accurate. */
		usageByTagId: Record<string, number>;
		open: boolean;
		/** Create a tag and return the persisted row (or null on failure). */
		onCreate: (name: string, color: KanbanTagColor) => Promise<KanbanTag | null>;
		/** Update an existing tag's name and/or color. */
		onUpdate: (tagId: string, patch: { name?: string; color?: KanbanTagColor }) => Promise<void>;
		/** Delete a tag (cascade in kanban_card_tags). */
		onDelete: (tagId: string) => Promise<void>;
	};

	let { tags, usageByTagId, open = $bindable(), onCreate, onUpdate, onDelete }: Props = $props();

	// --- New tag form ---
	let newTagName = $state('');
	let newTagColor = $state<KanbanTagColor>('gray');
	let creating = $state(false);

	async function handleCreate() {
		const name = newTagName.trim();
		if (!name) return;
		creating = true;
		try {
			const created = await onCreate(name, newTagColor);
			if (created) {
				newTagName = '';
				newTagColor = 'gray';
			}
		} finally {
			creating = false;
		}
	}

	function handleCreateKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			handleCreate();
		}
	}

	// --- Per-tag rename (debounced-ish: commit on blur or Enter) ---
	let renameDraft = $state<Record<string, string>>({});

	function startRename(tag: KanbanTag) {
		// Seed the draft from the canonical name only when the user begins editing.
		if (renameDraft[tag.id] === undefined) {
			renameDraft[tag.id] = tag.name;
		}
	}

	async function commitRename(tag: KanbanTag) {
		const next = (renameDraft[tag.id] ?? '').trim();
		// Reset the draft so the input goes back to mirroring the canonical name.
		delete renameDraft[tag.id];
		if (!next || next === tag.name) return;
		await onUpdate(tag.id, { name: next });
	}

	function handleRenameKeydown(tag: KanbanTag, event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			(event.currentTarget as HTMLInputElement).blur();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			delete renameDraft[tag.id];
			(event.currentTarget as HTMLInputElement).blur();
		}
	}

	// --- Per-tag colour change ---
	async function changeColor(tag: KanbanTag, color: KanbanTagColor) {
		if (color === tag.color) return;
		await onUpdate(tag.id, { color });
	}

	// --- Delete (with confirmation when in use) ---
	let deleteConfirmOpen = $state(false);
	let pendingDelete = $state<KanbanTag | null>(null);

	function requestDelete(tag: KanbanTag) {
		const inUse = usageByTagId[tag.id] ?? 0;
		if (inUse === 0) {
			// Nobody uses this tag → delete immediately without prompting.
			void onDelete(tag.id);
			return;
		}
		pendingDelete = tag;
		deleteConfirmOpen = true;
	}

	async function performDelete() {
		const tag = pendingDelete;
		pendingDelete = null;
		if (!tag) return;
		await onDelete(tag.id);
	}

	const deleteDescription = $derived.by(() => {
		if (!pendingDelete) return '';
		const n = usageByTagId[pendingDelete.id] ?? 0;
		const plural = n > 1;
		return `Le tag « ${pendingDelete.name} » est utilisé sur ${n} carte${
			plural ? 's' : ''
		}. Il sera supprimé et retiré de ${plural ? 'ces cartes' : 'cette carte'}.`;
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Gérer les tags</Dialog.Title>
			<Dialog.Description>
				Les tags servent à catégoriser les cartes de ce tableau (max 20 tags).
			</Dialog.Description>
		</Dialog.Header>

		<div class="flex max-h-[60vh] flex-col gap-3 overflow-y-auto pr-1">
			{#if tags.length === 0}
				<p class="text-sm text-muted-foreground">
					Aucun tag pour le moment. Créez-en un ci-dessous.
				</p>
			{:else}
				<ul class="flex flex-col gap-2">
					{#each tags as tag (tag.id)}
						<li class="flex items-center gap-2 rounded-md border bg-card p-2">
							<!-- Colour picker: 8 small swatches; the active one shows a check -->
							<div class="flex gap-1" role="radiogroup" aria-label="Couleur du tag">
								{#each TAG_COLORS as color (color)}
									<button
										type="button"
										role="radio"
										aria-checked={tag.color === color}
										aria-label={`Couleur ${TAG_COLOR_TOKENS[color].label}`}
										class={[
											'flex h-5 w-5 items-center justify-center rounded-full transition-transform hover:scale-110',
											TAG_COLOR_TOKENS[color].swatch
										]}
										onclick={() => changeColor(tag, color)}
									>
										{#if tag.color === color}
											<Check class="h-3 w-3" aria-hidden="true" />
										{/if}
									</button>
								{/each}
							</div>

							<!-- Inline rename input -->
							<Input
								class="h-8 flex-1 text-sm"
								value={renameDraft[tag.id] ?? tag.name}
								onfocus={() => startRename(tag)}
								oninput={(e) => (renameDraft[tag.id] = (e.currentTarget as HTMLInputElement).value)}
								onblur={() => commitRename(tag)}
								onkeydown={(e) => handleRenameKeydown(tag, e)}
								maxlength={30}
								aria-label={`Renommer le tag ${tag.name}`}
							/>

							<Button
								variant="ghost"
								size="icon"
								class="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
								onclick={() => requestDelete(tag)}
								aria-label={`Supprimer le tag ${tag.name}`}
							>
								<Trash2 class="h-4 w-4" />
							</Button>
						</li>
					{/each}
				</ul>
			{/if}

			<!-- Create form -->
			<div class="mt-2 flex flex-col gap-2 rounded-md border border-dashed p-3">
				<Label for="new-tag-name" class="text-sm">Nouveau tag</Label>
				<div class="flex items-center gap-2">
					<div class="flex gap-1" role="radiogroup" aria-label="Couleur du nouveau tag">
						{#each TAG_COLORS as color (color)}
							<button
								type="button"
								role="radio"
								aria-checked={newTagColor === color}
								aria-label={`Couleur ${TAG_COLOR_TOKENS[color].label}`}
								class={[
									'flex h-5 w-5 items-center justify-center rounded-full transition-transform hover:scale-110',
									TAG_COLOR_TOKENS[color].swatch
								]}
								onclick={() => (newTagColor = color)}
							>
								{#if newTagColor === color}
									<Check class="h-3 w-3" aria-hidden="true" />
								{/if}
							</button>
						{/each}
					</div>
					<Input
						id="new-tag-name"
						class="h-8 flex-1 text-sm"
						bind:value={newTagName}
						onkeydown={handleCreateKeydown}
						placeholder="Nom du tag"
						maxlength={30}
					/>
					<Button
						size="sm"
						onclick={handleCreate}
						disabled={creating || !newTagName.trim() || tags.length >= 20}
						class="gap-1"
					>
						<Plus class="h-3.5 w-3.5" />
						Créer
					</Button>
				</div>
				{#if tags.length >= 20}
					<p class="text-xs text-muted-foreground">
						Limite de 20 tags atteinte — supprimez-en un pour en créer un autre.
					</p>
				{/if}
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>

<ConfirmDialog
	bind:open={deleteConfirmOpen}
	title="Supprimer ce tag ?"
	description={deleteDescription}
	confirmLabel="Supprimer"
	cancelLabel="Annuler"
	variant="destructive"
	onConfirm={performDelete}
/>

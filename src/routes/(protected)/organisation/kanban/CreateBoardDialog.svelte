<!--
	CreateBoardDialog
	=================

	Modal dialog used to create a new kanban board.

	- Students see only a title input (board is always personal).
	- Teachers additionally see a MySelect to choose between "Personnel" and a
	  class board. If "Classe" is picked, a second MySelect lists their classes.

	On submit, POSTs to /api/organisation/kanban/boards. On success, calls
	`onCreated` (parent triggers `invalidateAll()`) and closes the dialog.
-->

<script lang="ts">
	import { lore } from '$lib/config/lore';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import MySelect from '$lib/components/MySelect.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { TeacherClassOption } from './+page.server';

	type Props = {
		/** Controlled open state of the dialog (bindable). */
		open: boolean;
		/** Current user role - controls whether the class selector is shown. */
		role: 'student' | 'teacher' | 'admin';
		/** Classes the teacher can create a board for. Ignored for non-teachers. */
		classes: TeacherClassOption[];
		/** Called after a successful creation so the parent can refresh data. */
		onCreated?: () => void;
	};

	let { open = $bindable(), role, classes, onCreated }: Props = $props();

	// Form state. boardType is typed as `string` to match MySelect's bind shape;
	// we narrow it back via runtime comparison ('class') at the use sites.
	let title = $state('');
	let boardType = $state<string>('personal');
	let selectedClassId = $state<string>('');
	let submitting = $state(false);

	const isTeacher = $derived(role === 'teacher' || role === 'admin');

	const boardTypeItems = [
		{ value: 'personal', label: 'Personnel' },
		{ value: 'class', label: 'Classe' }
	];

	const classItems = $derived(classes.map((c) => ({ value: c.id, label: c.name })));

	// Reset the form via the Dialog's open-change callback rather than $effect:
	// the source of truth for "dialog just opened" is the user event, not a
	// reactive derivation, so we keep the event-driven flow explicit.
	function handleOpenChange(next: boolean) {
		open = next;
		if (next) {
			title = '';
			boardType = 'personal';
			selectedClassId = '';
		}
	}

	const canSubmit = $derived.by(() => {
		if (submitting) return false;
		if (!title.trim()) return false;
		if (isTeacher && boardType === 'class' && !selectedClassId) return false;
		return true;
	});

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (!canSubmit) return;

		submitting = true;
		try {
			const body: { title: string; class_id?: string } = { title: title.trim() };
			if (isTeacher && boardType === 'class' && selectedClassId) {
				body.class_id = selectedClassId;
			}

			const res = await fetch('/api/organisation/kanban/boards', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});

			if (!res.ok) {
				// Extract a usable message from SvelteKit's error envelope or the body
				let message = 'Erreur lors de la création du tableau';
				try {
					const data = await res.json();
					if (typeof data?.message === 'string') message = data.message;
					else if (typeof data?.error === 'string') message = data.error;
				} catch {
					/* ignore JSON parse error */
				}
				toaster.error(message);
				return;
			}

			toaster.success('Tableau créé');
			open = false;
			onCreated?.();
		} catch (err) {
			console.error('[CreateBoardDialog] create failed:', err);
			toaster.error('Erreur réseau lors de la création');
		} finally {
			submitting = false;
		}
	}
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Nouveau tableau</Dialog.Title>
			<Dialog.Description>Créez un tableau Kanban pour organiser vos tâches.</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={handleSubmit} class="flex flex-col gap-4 py-2">
			<div class="flex flex-col gap-2">
				<Label for="board-title">Titre</Label>
				<Input
					id="board-title"
					bind:value={title}
					placeholder="Ex. Préparation contrôle"
					maxlength={200}
					required
					autofocus
				/>
				<p class="text-xs text-muted-foreground">{title.length} / 200</p>
			</div>

			{#if isTeacher}
				<div class="flex flex-col gap-2">
					<Label for="board-type">Type</Label>
					<MySelect
						id="board-type"
						type="single"
						bind:value={boardType}
						items={boardTypeItems}
						placeholder="Sélectionner le type"
					/>
				</div>

				{#if boardType === 'class'}
					<div class="flex flex-col gap-2">
						<Label for="board-class">{lore.entities.class}</Label>
						{#if classItems.length === 0}
							<p class="text-sm text-muted-foreground">
								Vous n'avez aucun {lore.entities.class}. Créez d'abord un {lore.entities.class} pour
								pouvoir partager un tableau.
							</p>
						{:else}
							<MySelect
								id="board-class"
								type="single"
								bind:value={selectedClassId}
								items={classItems}
								placeholder="Choisir un {lore.entities.class}"
							/>
						{/if}
					</div>
				{/if}
			{/if}

			<Dialog.Footer class="gap-2 sm:gap-2">
				<Button type="button" variant="ghost" onclick={() => (open = false)} disabled={submitting}>
					Annuler
				</Button>
				<Button type="submit" disabled={!canSubmit}>
					{submitting ? 'Création…' : 'Créer'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

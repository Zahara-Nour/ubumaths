<!--
	SaveAsTemplateDialog — modal to save the current notebook as a template.

	Posts to /api/python-notebooks/[id]/save-as-template which CREATES A COPY
	(the source notebook is left intact). On success: closes, toaster, no
	navigation — the teacher's current edit context is preserved.

	The "Partager publiquement" checkbox is intentionally unchecked by
	default to avoid accidental publication.
-->
<script lang="ts">
	import { lore } from '$lib/config/lore';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { Sparkles, Loader2 } from '@lucide/svelte';

	interface Props {
		open: boolean;
		notebookId: string;
		/** Pre-fills the title input. */
		defaultTitle: string;
		/** Pre-fills the description textarea. */
		defaultDescription: string | null;
	}

	let { open = $bindable(), notebookId, defaultTitle, defaultDescription }: Props = $props();

	let title = $state('');
	let description = $state('');
	let category = $state('');
	let isPublic = $state(false);
	let isSaving = $state(false);

	// Sync inputs with the source notebook every time the dialog opens, so
	// reopening after a save reflects the latest editor state (the title may
	// have changed in the editor between two open/close cycles).
	$effect(() => {
		if (open) {
			title = defaultTitle;
			description = defaultDescription ?? '';
			category = '';
			isPublic = false;
		}
	});

	let canSubmit = $derived(title.trim().length > 0 && !isSaving);

	async function handleSave(): Promise<void> {
		if (!canSubmit) return;
		isSaving = true;
		try {
			const response = await fetch(`/api/python-notebooks/${notebookId}/save-as-template`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: title.trim(),
					description: description.trim() === '' ? null : description.trim(),
					category: category.trim() === '' ? null : category.trim(),
					is_public: isPublic
				})
			});

			if (!response.ok) {
				const err = (await response.json().catch(() => null)) as { message?: string } | null;
				toaster.error(err?.message ?? 'Erreur lors de la création du template');
				return;
			}

			toaster.success('Template créé');
			open = false;
		} catch (err) {
			console.error('[SaveAsTemplateDialog] save failed:', err);
			toaster.error('Erreur réseau lors de la création du template');
		} finally {
			isSaving = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Enregistrer comme template</Dialog.Title>
			<Dialog.Description>
				Crée une copie de ce notebook marquée comme template. Le notebook actuel reste utilisable
				normalement (les élèves continuent à y accéder s'il était partagé).
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-3 py-2">
			<div class="space-y-1">
				<Label for="template-title">Titre</Label>
				<Input id="template-title" bind:value={title} placeholder="Titre du template" />
			</div>

			<div class="space-y-1">
				<Label for="template-description">Description (optionnelle)</Label>
				<Textarea
					id="template-description"
					rows={2}
					bind:value={description}
					placeholder="À quoi sert ce template, à qui il s'adresse…"
				/>
			</div>

			<div class="space-y-1">
				<Label for="template-category">Catégorie (optionnelle)</Label>
				<Input
					id="template-category"
					bind:value={category}
					placeholder="Statistiques, Algorithmique, Fonctions…"
					maxlength={50}
				/>
				<p class="text-xs text-muted-foreground">Affichée en badge sur la carte du template.</p>
			</div>

			<MyCheckbox
				bind:checked={isPublic}
				label="Partager publiquement (visible par les autres enseignants)"
			/>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (open = false)} disabled={isSaving}
				>{lore.actions.cancel}</Button
			>
			<Button onclick={handleSave} disabled={!canSubmit} class="gap-1.5">
				{#if isSaving}
					<Loader2 class="size-4 animate-spin" />
					<span>Création…</span>
				{:else}
					<Sparkles class="size-4" />
					<span>{lore.actions.save}</span>
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

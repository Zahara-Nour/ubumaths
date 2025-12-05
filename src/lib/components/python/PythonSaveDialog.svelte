<script lang="ts">
	/**
	 * PythonSaveDialog - Dialog for saving Python code to cloud
	 *
	 * Allows users to save their current code with a title, optional description,
	 * and public/private visibility setting.
	 */

	// Imports
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import { Loader2, Save } from 'lucide-svelte';
	import { pythonStore } from '$lib/stores/pythonPlayground.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';

	// Props
	let {
		open = $bindable(false),
		onSaved
	}: {
		open: boolean;
		onSaved?: () => void;
	} = $props();

	// State
	let title = $state('');
	let description = $state('');
	let isPublic = $state(false);
	let isSaving = $state(false);

	// Derived
	let isEditing = $derived(pythonStore.currentFile !== null);
	let dialogTitle = $derived(isEditing ? 'Modifier le fichier' : 'Sauvegarder le fichier');
	let saveButtonText = $derived(isEditing ? 'Mettre a jour' : 'Sauvegarder');

	// Initialize form when dialog opens
	$effect(() => {
		if (open) {
			if (pythonStore.currentFile) {
				// Editing existing file
				title = pythonStore.currentFile.title;
				description = pythonStore.currentFile.description ?? '';
				isPublic = pythonStore.currentFile.is_public ?? false;
			} else {
				// New file
				title = '';
				description = '';
				isPublic = false;
			}
		}
	});

	// Functions
	async function handleSave(): Promise<void> {
		if (!title.trim()) {
			toaster.error('Veuillez entrer un titre');
			return;
		}

		isSaving = true;

		try {
			const result = await pythonStore.saveToCloud(
				title.trim(),
				description.trim() || undefined,
				isPublic
			);

			if (result) {
				toaster.success(isEditing ? 'Fichier mis a jour' : 'Fichier sauvegarde');
				open = false;
				onSaved?.();
			} else if (pythonStore.cloudError) {
				toaster.error(pythonStore.cloudError);
			}
		} catch (error) {
			console.error('Save error:', error);
			toaster.error('Erreur lors de la sauvegarde');
		} finally {
			isSaving = false;
		}
	}

	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Enter' && event.ctrlKey) {
			handleSave();
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>{dialogTitle}</Dialog.Title>
			<Dialog.Description>
				{isEditing
					? 'Modifiez les informations de votre fichier Python.'
					: 'Sauvegardez votre code Python dans le cloud.'}
			</Dialog.Description>
		</Dialog.Header>

		<form
			onsubmit={(e) => {
				e.preventDefault();
				handleSave();
			}}
			class="space-y-4"
		>
			<div class="space-y-2">
				<Label for="title">Titre *</Label>
				<Input
					id="title"
					bind:value={title}
					placeholder="Mon script Python"
					onkeydown={handleKeydown}
					disabled={isSaving}
					required
				/>
			</div>

			<div class="space-y-2">
				<Label for="description">Description (optionnel)</Label>
				<Textarea
					id="description"
					bind:value={description}
					placeholder="Une courte description de votre code..."
					rows={3}
					disabled={isSaving}
				/>
			</div>

			<div class="flex items-center justify-between rounded-lg border border-border p-3">
				<div class="space-y-0.5">
					<Label for="public-switch" class="cursor-pointer">Fichier public</Label>
					<p class="text-xs text-muted-foreground">
						Les fichiers publics peuvent etre vus par tous
					</p>
				</div>
				<Switch id="public-switch" bind:checked={isPublic} disabled={isSaving} />
			</div>

			<Dialog.Footer class="gap-2 sm:gap-0">
				<Button type="button" variant="outline" onclick={() => (open = false)} disabled={isSaving}>
					Annuler
				</Button>
				<Button type="submit" disabled={isSaving || !title.trim()}>
					{#if isSaving}
						<Loader2 class="mr-2 size-4 animate-spin" />
						Sauvegarde...
					{:else}
						<Save class="mr-2 size-4" />
						{saveButtonText}
					{/if}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

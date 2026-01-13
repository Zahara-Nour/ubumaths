<script lang="ts">
	/**
	 * CreateFolderDialog - Dialog for creating a new subfolder
	 *
	 * Used in FileDrawer to create subfolders within class folders
	 */

	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { FolderPlus, Loader2 } from 'lucide-svelte';

	// ==========================================================================
	// Props
	// ==========================================================================

	interface Props {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		onFolderCreated?: (name: string) => void;
		isCreating?: boolean;
	}

	let {
		open = $bindable(false),
		onOpenChange,
		onFolderCreated,
		isCreating = false
	}: Props = $props();

	// ==========================================================================
	// State
	// ==========================================================================

	let folderName = $state('');
	let error = $state<string | null>(null);

	// ==========================================================================
	// Derived
	// ==========================================================================

	const canCreate = $derived(folderName.trim().length > 0 && !isCreating);

	// ==========================================================================
	// Effects
	// ==========================================================================

	$effect(() => {
		if (open) {
			// Reset state when dialog opens
			folderName = '';
			error = null;
		}
	});

	// ==========================================================================
	// Handlers
	// ==========================================================================

	function handleCreate() {
		const trimmedName = folderName.trim();

		// Validate
		if (!trimmedName) {
			error = 'Le nom du dossier est requis';
			return;
		}

		if (trimmedName.length > 255) {
			error = 'Le nom du dossier est trop long (max 255 caractères)';
			return;
		}

		// Forbidden characters in Google Drive folder names
		if (/[\\/:*?"<>|]/.test(trimmedName)) {
			error = 'Le nom contient des caractères non autorisés';
			return;
		}

		error = null;
		onFolderCreated?.(trimmedName);
	}

	function handleClose() {
		open = false;
		onOpenChange?.(false);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && canCreate) {
			e.preventDefault();
			handleCreate();
		}
	}
</script>

<Dialog.Root bind:open {onOpenChange}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<FolderPlus class="h-5 w-5" />
				Nouveau dossier
			</Dialog.Title>
			<Dialog.Description>Créez un sous-dossier pour organiser vos documents.</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-4">
			<div class="space-y-2">
				<Label for="folder-name">Nom du dossier</Label>
				<Input
					id="folder-name"
					bind:value={folderName}
					placeholder="Ex: Chapitre 1, Exercices..."
					onkeydown={handleKeydown}
					disabled={isCreating}
				/>
				{#if error}
					<p class="text-sm text-destructive">{error}</p>
				{/if}
			</div>
		</div>

		<Dialog.Footer>
			<Button type="button" variant="outline" onclick={handleClose} disabled={isCreating}>
				Annuler
			</Button>
			<Button type="button" onclick={handleCreate} disabled={!canCreate} class="gap-2">
				{#if isCreating}
					<Loader2 class="h-4 w-4 animate-spin" />
					Création...
				{:else}
					<FolderPlus class="h-4 w-4" />
					Créer
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

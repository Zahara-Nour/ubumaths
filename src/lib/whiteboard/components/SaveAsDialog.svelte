<script lang="ts">
	/**
	 * SaveAsDialog - Modal dialog to save whiteboard with a new name to Google Drive
	 *
	 * Features:
	 * - Text input for file name
	 * - Validates name (not empty, max length)
	 * - Shows loading state during save
	 */

	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Loader2 } from 'lucide-svelte';

	// ==========================================================================
	// Props
	// ==========================================================================

	interface Props {
		open: boolean;
		defaultName: string;
		saving: boolean;
		onSave: (fileName: string) => void;
		onClose: () => void;
	}

	let { open = $bindable(), defaultName, saving, onSave, onClose }: Props = $props();

	// ==========================================================================
	// State
	// ==========================================================================

	let fileName = $state(defaultName);
	let inputError = $state<string | null>(null);

	// ==========================================================================
	// Effects
	// ==========================================================================

	$effect(() => {
		if (open) {
			// Reset to default name when dialog opens
			fileName = defaultName;
			inputError = null;
		}
	});

	// ==========================================================================
	// Methods
	// ==========================================================================

	function validateFileName(): boolean {
		const trimmed = fileName.trim();

		if (!trimmed) {
			inputError = 'Le nom de fichier est requis';
			return false;
		}

		if (trimmed.length > 255) {
			inputError = 'Le nom de fichier est trop long (max 255 caractères)';
			return false;
		}

		// Check for invalid characters
		const invalidChars = /[<>:"/\\|?*]/;
		if (invalidChars.test(trimmed)) {
			inputError = 'Le nom contient des caractères non autorisés';
			return false;
		}

		inputError = null;
		return true;
	}

	function handleSave() {
		if (validateFileName() && !saving) {
			onSave(fileName.trim());
		}
	}

	function handleClose() {
		if (!saving) {
			open = false;
			onClose();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !saving) {
			handleSave();
		}
	}
</script>

<Dialog.Root bind:open onOpenChange={(o) => !o && handleClose()}>
	<Dialog.Content class="max-w-sm">
		<Dialog.Header>
			<Dialog.Title>Sauvegarder sur Drive</Dialog.Title>
			<Dialog.Description>
				Gardez le même nom pour mettre à jour, ou changez-le pour créer un nouveau fichier
			</Dialog.Description>
		</Dialog.Header>

		<div class="py-4">
			<div class="space-y-2">
				<Label for="fileName">Nom du fichier</Label>
				<Input
					id="fileName"
					bind:value={fileName}
					placeholder="Mon whiteboard"
					disabled={saving}
					onkeydown={handleKeydown}
					class={inputError ? 'border-destructive' : ''}
				/>
				{#if inputError}
					<p class="text-sm text-destructive">{inputError}</p>
				{/if}
				<p class="text-xs text-muted-foreground">L'extension .ubw sera ajoutée automatiquement</p>
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={handleClose} disabled={saving}>Annuler</Button>
			<Button onclick={handleSave} disabled={saving || !fileName.trim()}>
				{#if saving}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					Enregistrement...
				{:else}
					Enregistrer
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

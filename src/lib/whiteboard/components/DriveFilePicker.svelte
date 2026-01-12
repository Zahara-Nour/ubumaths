<script lang="ts">
	/**
	 * DriveFilePicker - Modal dialog to select whiteboard file from Google Drive
	 *
	 * Features:
	 * - Lists .ubw files from UbuMaths Whiteboards folder
	 * - Shows file name and modification date
	 * - Sorted by modification time (newest first)
	 */

	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Loader2, FileText, AlertCircle } from 'lucide-svelte';
	import { driveSyncService, type DriveFile } from '../services/drive-sync';
	import { toaster } from '$lib/stores/toaster.svelte';

	// ==========================================================================
	// Props
	// ==========================================================================

	interface Props {
		open: boolean;
		onSelect: (fileId: string, fileName: string) => void;
		onClose: () => void;
	}

	let { open = $bindable(), onSelect, onClose }: Props = $props();

	// ==========================================================================
	// State
	// ==========================================================================

	let files = $state<DriveFile[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let selectedFileId = $state<string | null>(null);

	// ==========================================================================
	// Effects
	// ==========================================================================

	$effect(() => {
		if (open) {
			loadFiles();
		} else {
			// Reset state when dialog closes
			selectedFileId = null;
			error = null;
		}
	});

	// ==========================================================================
	// Methods
	// ==========================================================================

	async function loadFiles() {
		loading = true;
		error = null;

		try {
			files = await driveSyncService.listFiles();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Erreur de chargement';
			toaster.error('Impossible de charger les fichiers');
		} finally {
			loading = false;
		}
	}

	function handleSelect() {
		if (selectedFileId) {
			const file = files.find((f) => f.id === selectedFileId);
			if (file) {
				onSelect(file.id, file.name);
				open = false;
			}
		}
	}

	function handleClose() {
		open = false;
		onClose();
	}

	function formatDate(isoDate: string): string {
		if (!isoDate) return '';
		const date = new Date(isoDate);
		return date.toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<Dialog.Root bind:open onOpenChange={(o) => !o && handleClose()}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Ouvrir depuis Google Drive</Dialog.Title>
			<Dialog.Description>Sélectionnez un fichier whiteboard</Dialog.Description>
		</Dialog.Header>

		<div class="py-4">
			{#if loading}
				<div class="flex items-center justify-center py-8">
					<Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			{:else if error}
				<div class="flex flex-col items-center gap-2 py-8 text-center text-destructive">
					<AlertCircle class="h-8 w-8" />
					<p>{error}</p>
					<Button variant="outline" size="sm" onclick={loadFiles}>Réessayer</Button>
				</div>
			{:else if files.length === 0}
				<p class="py-8 text-center text-muted-foreground">Aucun fichier whiteboard trouvé</p>
			{:else}
				<div class="max-h-64 space-y-1 overflow-y-auto">
					{#each files as file (file.id)}
						<button
							type="button"
							class="w-full rounded-md px-3 py-2 text-left transition-colors hover:bg-accent {selectedFileId ===
							file.id
								? 'bg-accent'
								: ''}"
							onclick={() => (selectedFileId = file.id)}
							ondblclick={handleSelect}
						>
							<div class="flex items-center gap-2">
								<FileText class="h-4 w-4 flex-shrink-0 text-muted-foreground" />
								<div class="min-w-0 flex-1">
									<div class="truncate font-medium">{file.name}</div>
									<div class="text-xs text-muted-foreground">
										Modifié {formatDate(file.modifiedTime)}
									</div>
								</div>
							</div>
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={handleClose}>Annuler</Button>
			<Button onclick={handleSelect} disabled={!selectedFileId || loading}>Ouvrir</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Label } from '$lib/components/ui/label';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { invalidateAll } from '$app/navigation';
	import type { ImportResult } from '$lib/exercises/types';

	interface Props {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		onSuccess?: () => void;
	}

	let { open = $bindable(false), onOpenChange, onSuccess }: Props = $props();

	// Import state
	let selectedFormat = $state<'json' | 'markdown'>('json');
	let fileInput = $state<HTMLInputElement>();
	let selectedFile = $state<File | null>(null);
	let importing = $state(false);
	let dragOver = $state(false);
	let importResult = $state<ImportResult | null>(null);

	// Options
	let onDuplicate = $state<'skip' | 'replace' | 'create-copy'>('skip');

	/**
	 * Handle file selection
	 */
	function handleFileChange(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files[0]) {
			selectedFile = target.files[0];
			importResult = null;

			// Auto-detect format from file extension
			if (selectedFile.name.endsWith('.json')) {
				selectedFormat = 'json';
			} else if (selectedFile.name.endsWith('.md')) {
				selectedFormat = 'markdown';
			}
		}
	}

	/**
	 * Handle drag over
	 */
	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		dragOver = true;
	}

	/**
	 * Handle drag leave
	 */
	function handleDragLeave() {
		dragOver = false;
	}

	/**
	 * Handle file drop
	 */
	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragOver = false;

		if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
			selectedFile = event.dataTransfer.files[0];
			importResult = null;

			// Auto-detect format
			if (selectedFile.name.endsWith('.json')) {
				selectedFormat = 'json';
			} else if (selectedFile.name.endsWith('.md')) {
				selectedFormat = 'markdown';
			}
		}
	}

	/**
	 * Handle import
	 */
	async function handleImport() {
		if (!selectedFile) {
			toaster.error('Veuillez sélectionner un fichier');
			return;
		}

		importing = true;
		importResult = null;

		try {
			// Read file content
			const content = await selectedFile.text();

			// Call import API
			const response = await fetch('/api/exercises/import', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					format: selectedFormat,
					content,
					options: {
						on_duplicate: onDuplicate,
						validate: true
					}
				})
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || "Erreur lors de l'import");
			}

			const result: ImportResult = await response.json();
			importResult = result;

			// Show result
			if (result.success) {
				if (result.imported > 0) {
					toaster.success(
						`${result.imported} exercice${result.imported > 1 ? 's' : ''} importé${result.imported > 1 ? 's' : ''}`
					);
				}
				if (result.skipped > 0) {
					toaster.info(
						`${result.skipped} exercice${result.skipped > 1 ? 's' : ''} ignoré${result.skipped > 1 ? 's' : ''} (doublons)`
					);
				}

				// Refresh exercise list
				await invalidateAll();

				// Call success callback
				if (onSuccess) onSuccess();

				// Auto-close if fully successful
				if (result.failed === 0) {
					setTimeout(() => {
						open = false;
						if (onOpenChange) onOpenChange(false);
					}, 1500);
				}
			} else {
				toaster.error(`Échec de l'import : ${result.failed} erreur${result.failed > 1 ? 's' : ''}`);
			}
		} catch (error) {
			console.error('Import error:', error);
			toaster.error(error instanceof Error ? error.message : "Erreur lors de l'import");
		} finally {
			importing = false;
		}
	}

	/**
	 * Reset dialog state when closed
	 */
	function handleOpenChange(newOpen: boolean) {
		open = newOpen;
		if (onOpenChange) onOpenChange(newOpen);

		if (!newOpen) {
			// Reset state when closing
			selectedFile = null;
			selectedFormat = 'json';
			onDuplicate = 'skip';
			importResult = null;
			if (fileInput) fileInput.value = '';
		}
	}
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
	<Dialog.Content class="sm:max-w-[600px]">
		<Dialog.Header>
			<Dialog.Title>Importer des exercices</Dialog.Title>
			<Dialog.Description>
				Importez des exercices depuis un fichier JSON ou Markdown
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-6 py-4">
			<!-- File upload -->
			<div class="space-y-3">
				<Label>Fichier</Label>

				<!-- Drag & drop zone -->
				<div
					class="rounded-lg border-2 border-dashed p-8 text-center transition-colors {dragOver
						? 'border-primary bg-primary/5'
						: 'border-border'}"
					ondragover={handleDragOver}
					ondragleave={handleDragLeave}
					ondrop={handleDrop}
				>
					{#if selectedFile}
						<div class="space-y-2">
							<svg
								class="mx-auto h-12 w-12 text-green-500"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
							<p class="font-medium">{selectedFile.name}</p>
							<p class="text-sm text-muted-foreground">
								{(selectedFile.size / 1024).toFixed(1)} KB
							</p>
							<Button
								variant="outline"
								size="sm"
								onclick={() => {
									selectedFile = null;
									if (fileInput) fileInput.value = '';
								}}
							>
								Changer de fichier
							</Button>
						</div>
					{:else}
						<svg
							class="mx-auto h-12 w-12 text-muted-foreground"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
							/>
						</svg>
						<p class="mt-2 text-sm font-medium">Glissez-déposez un fichier ici</p>
						<p class="text-xs text-muted-foreground">ou</p>
						<Button variant="outline" size="sm" class="mt-2" onclick={() => fileInput?.click()}>
							Parcourir les fichiers
						</Button>
						<input
							type="file"
							bind:this={fileInput}
							onchange={handleFileChange}
							accept=".json,.md,.markdown"
							class="hidden"
						/>
					{/if}
				</div>
			</div>

			<!-- Format selection -->
			<div class="space-y-3">
				<Label>Format du fichier</Label>
				<div class="flex gap-4">
					<label class="flex cursor-pointer items-center gap-2">
						<input
							type="radio"
							name="format"
							value="json"
							bind:group={selectedFormat}
							class="h-4 w-4"
						/>
						<span class="text-sm">JSON</span>
					</label>

					<label class="flex cursor-pointer items-center gap-2">
						<input
							type="radio"
							name="format"
							value="markdown"
							bind:group={selectedFormat}
							class="h-4 w-4"
						/>
						<span class="text-sm">Markdown</span>
					</label>
				</div>
			</div>

			<!-- Duplicate handling -->
			<div class="space-y-3">
				<Label>En cas de doublon</Label>
				<select
					bind:value={onDuplicate}
					class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
				>
					<option value="skip">Ignorer (recommandé)</option>
					<option value="create-copy">Créer une copie</option>
					<option value="replace">Remplacer l'existant</option>
				</select>
			</div>

			<!-- Import result -->
			{#if importResult}
				<div class="space-y-2 rounded-lg border p-4">
					<h4 class="font-medium">Résultat de l'import</h4>
					<div class="space-y-1 text-sm">
						<p class="text-green-600 dark:text-green-400">
							✓ {importResult.imported} importé{importResult.imported > 1 ? 's' : ''}
						</p>
						{#if importResult.skipped > 0}
							<p class="text-yellow-600 dark:text-yellow-400">
								⊘ {importResult.skipped} ignoré{importResult.skipped > 1 ? 's' : ''}
							</p>
						{/if}
						{#if importResult.failed > 0}
							<p class="text-red-600 dark:text-red-400">
								✗ {importResult.failed} échoué{importResult.failed > 1 ? 's' : ''}
							</p>
						{/if}
					</div>

					{#if importResult.errors.length > 0}
						<div class="mt-3 space-y-1">
							<p class="text-sm font-medium">Erreurs :</p>
							{#each importResult.errors as error (error.index)}
								<p class="text-xs text-red-600 dark:text-red-400">
									{error.title ? `${error.title}: ` : ''}{error.error}
								</p>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<Dialog.Footer>
			<Button
				variant="outline"
				onclick={() => {
					open = false;
					if (onOpenChange) onOpenChange(false);
				}}
			>
				{importResult?.imported ? 'Fermer' : 'Annuler'}
			</Button>
			<Button onclick={handleImport} disabled={!selectedFile || importing}>
				{importing ? 'Import en cours...' : 'Importer'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

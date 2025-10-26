<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Label } from '$lib/components/ui/label';
	import { toaster } from '$lib/stores/toaster.svelte';

	interface Props {
		exerciseIds: string[];
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
	}

	let { exerciseIds, open = $bindable(false), onOpenChange }: Props = $props();

	// Export state
	let selectedFormat = $state<'json' | 'markdown'>('json');
	let prettyPrint = $state(true);
	let exporting = $state(false);

	/**
	 * Download a file with given content
	 */
	function downloadFile(filename: string, content: string, mimeType: string) {
		const blob = new Blob([content], { type: mimeType });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	/**
	 * Handle export
	 */
	async function handleExport() {
		if (exerciseIds.length === 0) {
			toaster.error('Aucun exercice sélectionné');
			return;
		}

		exporting = true;

		try {
			const response = await fetch('/api/exercises/export', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					exercise_ids: exerciseIds,
					format: selectedFormat,
					pretty_print: prettyPrint
				})
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || "Erreur lors de l'export");
			}

			const result = await response.json();

			// Handle different response types
			if (result.files) {
				// Multiple markdown files - download each one
				for (const file of result.files) {
					downloadFile(file.filename, file.content, 'text/markdown');
				}
				toaster.success(`${result.files.length} fichiers exportés`);
			} else {
				// Single file
				downloadFile(result.filename, result.content, result.mime_type);
				toaster.success('Exercice(s) exporté(s) avec succès');
			}

			// Close dialog
			open = false;
			if (onOpenChange) onOpenChange(false);
		} catch (error) {
			console.error('Export error:', error);
			toaster.error(error instanceof Error ? error.message : "Erreur lors de l'export");
		} finally {
			exporting = false;
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
			selectedFormat = 'json';
			prettyPrint = true;
		}
	}
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
	<Dialog.Content class="sm:max-w-[500px]">
		<Dialog.Header>
			<Dialog.Title>Exporter des exercices</Dialog.Title>
			<Dialog.Description>
				{#if exerciseIds.length === 1}
					Exporter 1 exercice
				{:else}
					Exporter {exerciseIds.length} exercices
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-6 py-4">
			<!-- Format selection -->
			<div class="space-y-3">
				<Label>Format d'export</Label>
				<div class="space-y-2">
					<label class="flex cursor-pointer items-center gap-2">
						<input
							type="radio"
							name="format"
							value="json"
							bind:group={selectedFormat}
							class="h-4 w-4"
						/>
						<div class="flex-1">
							<div class="font-medium">JSON</div>
							<div class="text-sm text-muted-foreground">Format structuré, facile à réimporter</div>
						</div>
					</label>

					<label class="flex cursor-pointer items-center gap-2">
						<input
							type="radio"
							name="format"
							value="markdown"
							bind:group={selectedFormat}
							class="h-4 w-4"
						/>
						<div class="flex-1">
							<div class="font-medium">Markdown</div>
							<div class="text-sm text-muted-foreground">Format lisible, avec frontmatter YAML</div>
						</div>
					</label>
				</div>
			</div>

			<!-- JSON options -->
			{#if selectedFormat === 'json'}
				<div class="space-y-2">
					<label class="flex cursor-pointer items-center gap-2">
						<input type="checkbox" bind:checked={prettyPrint} class="h-4 w-4" />
						<span class="text-sm">Formater le JSON (plus lisible)</span>
					</label>
				</div>
			{/if}

			<!-- Info message -->
			<div
				class="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950"
			>
				<p class="text-sm text-blue-900 dark:text-blue-100">
					{#if exerciseIds.length === 1}
						L'exercice sera téléchargé au format {selectedFormat.toUpperCase()}.
					{:else if selectedFormat === 'json'}
						Les exercices seront combinés dans un seul fichier JSON.
					{:else}
						Chaque exercice sera téléchargé dans un fichier Markdown séparé.
					{/if}
				</p>
			</div>
		</div>

		<Dialog.Footer>
			<Button
				variant="outline"
				onclick={() => {
					open = false;
					if (onOpenChange) onOpenChange(false);
				}}
			>
				Annuler
			</Button>
			<Button onclick={handleExport} disabled={exporting}>
				{exporting ? 'Export en cours...' : 'Exporter'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<script lang="ts">
	/**
	 * ExportDialog - Export options dialog
	 *
	 * Allows selecting format, resolution, and pages to export.
	 */

	import { whiteboardStore } from '../stores/whiteboard.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import MySelect from '$lib/components/MySelect.svelte';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import {
		EXPORT_FORMATS,
		PNG_RESOLUTIONS,
		DEFAULT_PNG_RESOLUTION,
		exportDocument,
		downloadExportResult,
		shouldShowProgressIndicator,
		getPagesToExport,
		type ExportFormat,
		type PngResolution,
		type ExportOptions
	} from '../core/pdf-export';
	import { Download, FileImage, FileCode, FileText, Loader2 } from 'lucide-svelte';
	import { toaster } from '$lib/stores/toaster.svelte';

	// ==========================================================================
	// Props
	// ==========================================================================

	interface Props {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
	}

	let { open = $bindable(false), onOpenChange }: Props = $props();

	// ==========================================================================
	// State
	// ==========================================================================

	let selectedFormat = $state<ExportFormat>('png');
	let selectedResolution = $state<PngResolution>(DEFAULT_PNG_RESOLUTION);
	let selectedPages = $state<'current' | 'all' | 'custom'>('current');
	let customPageIndices = $state<string>('');
	let includeInstruments = $state(true);
	let includeAnnotations = $state(true);
	let isExporting = $state(false);
	let exportProgress = $state(0);

	// ==========================================================================
	// Derived
	// ==========================================================================

	const document = $derived(whiteboardStore.document);
	const pageCount = $derived(whiteboardStore.pageCount);
	const currentPageIndex = $derived(whiteboardStore.currentPageIndex);

	const resolutionItems = $derived(
		PNG_RESOLUTIONS.map((r) => ({
			value: String(r),
			label: `${r}x (${r === 1 ? 'Normal' : r === 2 ? 'Haute' : 'Très haute'} résolution)`
		}))
	);

	const pageItems = $derived([
		{ value: 'current', label: `Page courante (${currentPageIndex + 1})` },
		{ value: 'all', label: `Toutes les pages (${pageCount})` },
		{ value: 'custom', label: 'Pages spécifiques...' }
	]);

	const showResolutionOption = $derived(selectedFormat === 'png');
	const showPagesOption = $derived(selectedFormat === 'pdf' || selectedFormat === 'png');
	const showCustomPages = $derived(selectedPages === 'custom');

	// ==========================================================================
	// Handlers
	// ==========================================================================

	function handleFormatChange(value: string | undefined) {
		if (value && EXPORT_FORMATS.includes(value as ExportFormat)) {
			selectedFormat = value as ExportFormat;

			// Reset pages selection based on format
			if (selectedFormat === 'pdf') {
				selectedPages = 'all';
			} else {
				selectedPages = 'current';
			}
		}
	}

	function handleResolutionChange(value: string | undefined) {
		if (value) {
			const num = parseInt(value, 10);
			if (PNG_RESOLUTIONS.includes(num as PngResolution)) {
				selectedResolution = num as PngResolution;
			}
		}
	}

	function handlePagesChange(value: string | undefined) {
		if (value && ['current', 'all', 'custom'].includes(value)) {
			selectedPages = value as 'current' | 'all' | 'custom';
		}
	}

	function parseCustomPages(): number[] | null {
		if (!customPageIndices.trim()) return null;

		const indices: number[] = [];
		const parts = customPageIndices.split(',');

		for (const part of parts) {
			const trimmed = part.trim();

			// Handle ranges (e.g., "1-5")
			if (trimmed.includes('-')) {
				const [start, end] = trimmed.split('-').map((s) => parseInt(s.trim(), 10));
				if (isNaN(start) || isNaN(end) || start < 1 || end < start) {
					return null;
				}
				for (let i = start; i <= end; i++) {
					indices.push(i - 1); // Convert to 0-based
				}
			} else {
				const num = parseInt(trimmed, 10);
				if (isNaN(num) || num < 1) {
					return null;
				}
				indices.push(num - 1); // Convert to 0-based
			}
		}

		// Remove duplicates and sort
		return [...new Set(indices)].sort((a, b) => a - b);
	}

	async function handleExport() {
		if (!document) return;

		// Build export options
		const options: ExportOptions = {
			format: selectedFormat,
			includeInstruments,
			includeAnnotations
		};

		if (selectedFormat === 'png') {
			options.resolution = selectedResolution;
		}

		// Determine pages
		if (selectedPages === 'current') {
			options.pages = 'current';
		} else if (selectedPages === 'all') {
			options.pages = 'all';
		} else {
			const parsed = parseCustomPages();
			if (!parsed || parsed.length === 0) {
				toaster.error('Format de pages invalide. Utilisez: 1, 3, 5-10');
				return;
			}

			// Validate bounds
			const maxPage = pageCount;
			if (parsed.some((i) => i >= maxPage)) {
				toaster.error(`Pages invalides. Le document contient ${maxPage} page(s).`);
				return;
			}

			options.pages = parsed;
		}

		// Check if progress indicator needed
		const { indices } = getPagesToExport(document, options.pages);
		const showProgress = shouldShowProgressIndicator(document, indices);

		if (showProgress) {
			options.onProgress = (progress) => {
				exportProgress = progress;
			};
		}

		isExporting = true;
		exportProgress = 0;

		try {
			const result = await exportDocument(document, options);

			if (result.success) {
				downloadExportResult(result);
				toaster.success(`Export ${selectedFormat.toUpperCase()} réussi`);
				open = false;
				onOpenChange?.(false);
			} else {
				toaster.error(result.error || "Erreur lors de l'export");
			}
		} catch (error) {
			console.error('Export error:', error);
			toaster.error("Erreur inattendue lors de l'export");
		} finally {
			isExporting = false;
			exportProgress = 0;
		}
	}

	function getFormatIcon(format: ExportFormat) {
		switch (format) {
			case 'png':
				return FileImage;
			case 'svg':
				return FileCode;
			case 'pdf':
				return FileText;
		}
	}
</script>

<Dialog.Root bind:open {onOpenChange}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<Download class="h-5 w-5" />
				Exporter
			</Dialog.Title>
			<Dialog.Description>Choisissez le format et les options d'export.</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-4">
			<!-- Format Selection -->
			<div class="space-y-2">
				<Label>Format</Label>
				<div class="flex gap-2">
					{#each EXPORT_FORMATS as format (format)}
						{@const Icon = getFormatIcon(format)}
						<Button
							type="button"
							variant={selectedFormat === format ? 'secondary' : 'outline'}
							class="flex-1 gap-2"
							onclick={() => handleFormatChange(format)}
						>
							<Icon class="h-4 w-4" />
							{format.toUpperCase()}
						</Button>
					{/each}
				</div>
			</div>

			<!-- Resolution (PNG only) -->
			{#if showResolutionOption}
				<div class="space-y-2">
					<Label for="resolution">Résolution</Label>
					<MySelect
						type="single"
						value={String(selectedResolution)}
						items={resolutionItems}
						onValueChange={handleResolutionChange}
						placeholder="Choisir la résolution"
					/>
				</div>
			{/if}

			<!-- Pages Selection -->
			{#if showPagesOption}
				<div class="space-y-2">
					<Label for="pages">Pages</Label>
					<MySelect
						type="single"
						value={selectedPages}
						items={pageItems}
						onValueChange={handlePagesChange}
						placeholder="Choisir les pages"
					/>

					{#if showCustomPages}
						<input
							type="text"
							bind:value={customPageIndices}
							placeholder="Ex: 1, 3, 5-10"
							aria-label="Numéros de pages personnalisés"
							aria-describedby="custom-pages-help"
							class="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
						/>
						<p id="custom-pages-help" class="text-xs text-muted-foreground">
							Entrez les numéros de pages séparés par des virgules, ou des plages (ex: 1-5)
						</p>
					{/if}
				</div>
			{/if}

			<!-- Include Instruments -->
			<div class="flex items-center gap-2">
				<MyCheckbox
					bind:checked={includeInstruments}
					label="Inclure les instruments (règle, rapporteur...)"
				/>
			</div>

			<!-- Include Annotations -->
			<div class="flex items-center gap-2">
				<MyCheckbox bind:checked={includeAnnotations} label="Inclure les annotations" />
			</div>

			<!-- Progress Indicator -->
			{#if isExporting && exportProgress > 0}
				<div class="space-y-2">
					<div class="flex justify-between text-sm">
						<span>Export en cours...</span>
						<span>{exportProgress}%</span>
					</div>
					<div class="h-2 overflow-hidden rounded-full bg-muted">
						<div
							class="h-full bg-primary transition-all duration-300"
							style="width: {exportProgress}%"
						></div>
					</div>
				</div>
			{/if}
		</div>

		<Dialog.Footer>
			<Button type="button" variant="outline" onclick={() => (open = false)} disabled={isExporting}>
				Annuler
			</Button>
			<Button
				type="button"
				onclick={handleExport}
				disabled={isExporting || !document}
				class="gap-2"
			>
				{#if isExporting}
					<Loader2 class="h-4 w-4 animate-spin" />
					Export en cours...
				{:else}
					<Download class="h-4 w-4" />
					Exporter
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

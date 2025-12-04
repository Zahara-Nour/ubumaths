<!--
	Spreadsheet Import/Export Component
	====================================

	Provides CSV import and export functionality for the spreadsheet.

	Features:
	- Export to CSV with options (delimiter, formulas vs values)
	- Import from CSV with auto-detection and preview
	- French Excel compatibility (semicolon delimiter, UTF-8 BOM)

	USAGE:
	<SpreadsheetImportExport />
-->

<script lang="ts">
	import { spreadsheetStore } from '$lib/spreadsheet/store.svelte';
	import {
		downloadCsv,
		readCsvFile,
		parseCsv,
		type CsvDelimiter,
		type CsvDelimiterOrAuto
	} from '$lib/spreadsheet/csv';
	import type { SpreadsheetData } from '$lib/spreadsheet/types';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Download, Upload, FileSpreadsheet } from 'lucide-svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import MySelect from '$lib/components/MySelect.svelte';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';

	// =============================================================================
	// Export State
	// =============================================================================

	let exportDelimiter = $state<CsvDelimiter>(',');
	let exportFormulas = $state(false);

	// =============================================================================
	// Import State
	// =============================================================================

	let importDialogOpen = $state(false);
	let importFile = $state<File | null>(null);
	let importDelimiter = $state<CsvDelimiterOrAuto>('auto');
	let importHasHeaders = $state(false);
	let importPreview = $state<string[][] | null>(null);
	let isImporting = $state(false);

	// =============================================================================
	// Export Functions
	// =============================================================================

	function handleExport() {
		// Build computed values map from store
		const computedValues = new Map<string, import('$lib/spreadsheet/types').ComputedValue>();

		for (let row = 1; row <= spreadsheetStore.rows; row++) {
			for (let col = 0; col < spreadsheetStore.cols; col++) {
				const ref = String.fromCharCode(65 + col) + row;
				const computed = spreadsheetStore.getComputedValue(ref);
				if (computed.type !== 'empty') {
					computedValues.set(ref, computed);
				}
			}
		}

		const filename = `${spreadsheetStore.name || 'spreadsheet'}.csv`;
		downloadCsv(spreadsheetStore.exportData(), computedValues, filename, {
			delimiter: exportDelimiter,
			exportFormulas,
			encoding: 'utf-8-bom' // For Excel compatibility
		});

		toaster.success('Fichier CSV exporté');
	}

	// =============================================================================
	// Import Functions
	// =============================================================================

	function generatePreview(data: SpreadsheetData, maxRows: number): string[][] {
		const preview: string[][] = [];
		const maxCols = 5;

		for (let row = 1; row <= Math.min(maxRows, 20); row++) {
			const rowData: string[] = [];
			let hasData = false;

			for (let col = 0; col < maxCols; col++) {
				const ref = String.fromCharCode(65 + col) + row;
				const value = data.cells[ref]?.value || '';
				rowData.push(value);
				if (value) hasData = true;
			}

			if (hasData || preview.length > 0) {
				preview.push(rowData);
			}
		}

		return preview.length > 0 ? preview : [['(Aucune donnée)']];
	}

	async function updatePreview() {
		if (!importFile) {
			importPreview = null;
			return;
		}

		try {
			const content = await readCsvFile(importFile);
			const result = parseCsv(content, {
				delimiter: importDelimiter,
				hasHeaders: importHasHeaders
			});

			if (result.success && result.data) {
				importPreview = generatePreview(result.data, 5);
			} else {
				importPreview = null;
			}
		} catch {
			importPreview = null;
		}
	}

	async function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		importFile = file;

		// Generate preview
		try {
			const content = await readCsvFile(file);
			const result = parseCsv(content, {
				delimiter: importDelimiter,
				hasHeaders: importHasHeaders
			});

			if (result.success && result.data) {
				importPreview = generatePreview(result.data, 5);
			} else {
				importPreview = null;
				toaster.error(result.error || 'Erreur lors de la lecture du fichier');
			}
		} catch {
			importPreview = null;
			toaster.error('Erreur lors de la lecture du fichier');
		}
	}

	async function handleImport() {
		if (!importFile) return;

		isImporting = true;

		try {
			const content = await readCsvFile(importFile);
			const result = parseCsv(content, {
				delimiter: importDelimiter,
				hasHeaders: importHasHeaders
			});

			if (result.success && result.data) {
				spreadsheetStore.importData(result.data);
				toaster.success(`Import réussi : ${result.rowCount} lignes, ${result.colCount} colonnes`);
				closeImportDialog();
			} else {
				toaster.error(result.error || "Erreur lors de l'import");
			}
		} catch {
			toaster.error("Erreur lors de l'import");
		} finally {
			isImporting = false;
		}
	}

	function closeImportDialog() {
		importDialogOpen = false;
		importFile = null;
		importPreview = null;
	}

	function openImportDialog() {
		importDialogOpen = true;
	}

	function handleDelimiterChange(value: string | undefined) {
		if (value) {
			importDelimiter = value as CsvDelimiterOrAuto;
			updatePreview();
		}
	}

	function handleHeadersChange(checked: boolean | 'indeterminate') {
		if (checked !== 'indeterminate') {
			importHasHeaders = checked;
			updatePreview();
		}
	}
</script>

<!-- Export Dropdown -->
<DropdownMenu.Root>
	<DropdownMenu.Trigger asChild let:builder>
		<Button builders={[builder]} variant="ghost" size="sm" class="gap-1">
			<Download class="h-4 w-4" />
			<span class="hidden sm:inline">Exporter</span>
		</Button>
	</DropdownMenu.Trigger>
	<DropdownMenu.Content class="w-56">
		<DropdownMenu.Label>Options d'export CSV</DropdownMenu.Label>
		<DropdownMenu.Separator />

		<div class="space-y-3 px-2 py-2">
			<div>
				<span class="mb-1 block text-xs text-muted-foreground" id="export-delimiter-label"
					>Séparateur</span
				>
				<MySelect
					type="single"
					bind:value={exportDelimiter}
					items={[
						{ value: ',', label: 'Virgule (,)' },
						{ value: ';', label: 'Point-virgule (;)' },
						{ value: '\t', label: 'Tabulation' }
					]}
				/>
			</div>

			<MyCheckbox bind:checked={exportFormulas} label="Exporter les formules" />
		</div>

		<DropdownMenu.Separator />
		<DropdownMenu.Item onclick={handleExport} class="cursor-pointer">
			<FileSpreadsheet class="mr-2 h-4 w-4" />
			Télécharger CSV
		</DropdownMenu.Item>
	</DropdownMenu.Content>
</DropdownMenu.Root>

<!-- Import Button -->
<Button variant="ghost" size="sm" class="gap-1" onclick={openImportDialog}>
	<Upload class="h-4 w-4" />
	<span class="hidden sm:inline">Importer</span>
</Button>

<!-- Import Dialog -->
<Dialog.Root bind:open={importDialogOpen}>
	<Dialog.Content class="sm:max-w-[500px]">
		<Dialog.Header>
			<Dialog.Title>Importer un fichier CSV</Dialog.Title>
			<Dialog.Description>
				Sélectionnez un fichier CSV à importer. Les données seront limitées à 20x20 cellules.
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-4">
			<!-- File Input -->
			<div>
				<label for="csv-file-input" class="mb-2 block text-sm font-medium">Fichier</label>
				<input
					id="csv-file-input"
					type="file"
					accept=".csv,.txt"
					onchange={handleFileSelect}
					class="block w-full text-sm file:mr-4 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground hover:file:bg-primary/90"
				/>
			</div>

			<!-- Options -->
			<div class="grid grid-cols-2 gap-4">
				<div>
					<span class="mb-2 block text-sm font-medium" id="import-delimiter-label">Séparateur</span>
					<MySelect
						type="single"
						value={importDelimiter}
						onValueChange={handleDelimiterChange}
						items={[
							{ value: 'auto', label: 'Auto-détection' },
							{ value: ',', label: 'Virgule (,)' },
							{ value: ';', label: 'Point-virgule (;)' },
							{ value: '\t', label: 'Tabulation' }
						]}
					/>
				</div>
				<div class="flex items-end pb-1">
					<MyCheckbox
						checked={importHasHeaders}
						onCheckedChange={handleHeadersChange}
						label="Ignorer la 1ère ligne"
					/>
				</div>
			</div>

			<!-- Preview -->
			{#if importPreview && importPreview.length > 0}
				<div>
					<span class="mb-2 block text-sm font-medium">Aperçu (5 premières lignes)</span>
					<div class="max-h-40 overflow-auto rounded-md border bg-muted/30">
						<table class="w-full text-xs">
							<tbody>
								{#each importPreview as row, rowIndex (rowIndex)}
									<tr class="border-b last:border-b-0">
										{#each row as cell, colIndex (`${rowIndex}-${colIndex}`)}
											<td
												class="max-w-[100px] truncate border-r px-2 py-1 last:border-r-0"
												title={cell}
											>
												{cell || '-'}
											</td>
										{/each}
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{/if}
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={closeImportDialog}>Annuler</Button>
			<Button onclick={handleImport} disabled={!importFile || isImporting}>
				{#if isImporting}
					Import en cours...
				{:else}
					Importer
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

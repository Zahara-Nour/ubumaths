<!--
	Spreadsheet Toolbar Component
	==============================

	Formatting toolbar for the spreadsheet with controls for:
	- Text formatting (bold, italic)
	- Alignment (left, center, right)
	- Colors (text and background)
	- Number formats (normal, percent, currency)
	- Clear formatting and content actions

	KEYBOARD SHORTCUTS:
	- Ctrl/Cmd+B: Toggle bold
	- Ctrl/Cmd+I: Toggle italic

	USAGE:
	<SpreadsheetToolbar />
-->

<script lang="ts">
	import { spreadsheetStore } from '$lib/spreadsheet/store.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import {
		Bold,
		Italic,
		AlignLeft,
		AlignCenter,
		AlignRight,
		Paintbrush,
		Palette,
		Hash,
		Trash2,
		Eraser
	} from 'lucide-svelte';
	import type { TextAlignment, NumberFormat } from '$lib/spreadsheet/types';

	// =============================================================================
	// Color Palettes
	// =============================================================================

	const TEXT_COLORS = [
		{ label: 'Noir', value: '#000000' },
		{ label: 'Rouge', value: '#dc2626' },
		{ label: 'Orange', value: '#ea580c' },
		{ label: 'Jaune', value: '#ca8a04' },
		{ label: 'Vert', value: '#16a34a' },
		{ label: 'Bleu', value: '#2563eb' },
		{ label: 'Violet', value: '#9333ea' },
		{ label: 'Gris', value: '#6b7280' }
	];

	const BG_COLORS = [
		{ label: 'Aucun', value: '' },
		{ label: 'Rouge clair', value: '#fee2e2' },
		{ label: 'Orange clair', value: '#ffedd5' },
		{ label: 'Jaune clair', value: '#fef9c3' },
		{ label: 'Vert clair', value: '#dcfce7' },
		{ label: 'Bleu clair', value: '#dbeafe' },
		{ label: 'Violet clair', value: '#f3e8ff' },
		{ label: 'Gris clair', value: '#f3f4f6' }
	];

	// =============================================================================
	// Derived State
	// =============================================================================

	// Get current format of selected cell
	const currentFormat = $derived(
		spreadsheetStore.selectedCell
			? spreadsheetStore.getCellFormat(spreadsheetStore.selectedCell)
			: undefined
	);

	const isBold = $derived(currentFormat?.bold ?? false);
	const isItalic = $derived(currentFormat?.italic ?? false);
	const currentAlign = $derived(currentFormat?.align ?? 'left');
	const currentTextColor = $derived(currentFormat?.textColor ?? '#000000');
	const currentBgColor = $derived(currentFormat?.bgColor ?? '');
	const currentNumberFormat = $derived(currentFormat?.numberFormat ?? 'number');

	// =============================================================================
	// Format Actions
	// =============================================================================

	/**
	 * Toggle bold formatting
	 */
	function toggleBold() {
		if (!spreadsheetStore.selectedCell) return;
		spreadsheetStore.setCellFormat(spreadsheetStore.selectedCell, {
			bold: !isBold
		});
	}

	/**
	 * Toggle italic formatting
	 */
	function toggleItalic() {
		if (!spreadsheetStore.selectedCell) return;
		spreadsheetStore.setCellFormat(spreadsheetStore.selectedCell, {
			italic: !isItalic
		});
	}

	/**
	 * Set text alignment
	 */
	function setAlignment(align: TextAlignment) {
		if (!spreadsheetStore.selectedCell) return;
		spreadsheetStore.setCellFormat(spreadsheetStore.selectedCell, {
			align
		});
	}

	/**
	 * Set text color
	 */
	function setTextColor(color: string) {
		if (!spreadsheetStore.selectedCell) return;
		spreadsheetStore.setCellFormat(spreadsheetStore.selectedCell, {
			textColor: color
		});
	}

	/**
	 * Set background color
	 */
	function setBgColor(color: string) {
		if (!spreadsheetStore.selectedCell) return;
		spreadsheetStore.setCellFormat(spreadsheetStore.selectedCell, {
			bgColor: color || undefined
		});
	}

	/**
	 * Set number format
	 */
	function setNumberFormat(format: NumberFormat) {
		if (!spreadsheetStore.selectedCell) return;
		spreadsheetStore.setCellFormat(spreadsheetStore.selectedCell, {
			numberFormat: format
		});
	}

	/**
	 * Clear all formatting from selected cell
	 */
	function clearFormat() {
		if (!spreadsheetStore.selectedCell) return;
		const currentCell = spreadsheetStore.getCellValue(spreadsheetStore.selectedCell);
		if (!currentCell) return;

		// Reset cell with empty format
		spreadsheetStore.setCellFormat(spreadsheetStore.selectedCell, {
			bold: undefined,
			italic: undefined,
			textColor: undefined,
			bgColor: undefined,
			align: undefined,
			numberFormat: undefined
		});
	}

	/**
	 * Clear cell content (value)
	 */
	function clearContent() {
		if (!spreadsheetStore.selectedCell) return;
		spreadsheetStore.clearCell(spreadsheetStore.selectedCell);
	}
</script>

<Tooltip.Provider>
	<div
		class="flex flex-wrap items-center gap-1 bg-muted/30 p-2"
		role="toolbar"
		aria-label="Barre d'outils de formatage"
	>
		<!-- Groupe Formatage texte -->
		<div class="flex items-center gap-0.5 border-r border-border pr-2">
			<Tooltip.Root>
				<Tooltip.Trigger>
					<Button
						variant={isBold ? 'secondary' : 'ghost'}
						size="icon"
						class="h-8 w-8"
						onclick={toggleBold}
						aria-label="Gras"
						aria-pressed={isBold}
					>
						<Bold class="h-4 w-4" />
					</Button>
				</Tooltip.Trigger>
				<Tooltip.Content>Gras (Ctrl+B)</Tooltip.Content>
			</Tooltip.Root>

			<Tooltip.Root>
				<Tooltip.Trigger>
					<Button
						variant={isItalic ? 'secondary' : 'ghost'}
						size="icon"
						class="h-8 w-8"
						onclick={toggleItalic}
						aria-label="Italique"
						aria-pressed={isItalic}
					>
						<Italic class="h-4 w-4" />
					</Button>
				</Tooltip.Trigger>
				<Tooltip.Content>Italique (Ctrl+I)</Tooltip.Content>
			</Tooltip.Root>
		</div>

		<!-- Groupe Alignement -->
		<div class="flex items-center gap-0.5 border-r border-border pr-2">
			<Tooltip.Root>
				<Tooltip.Trigger>
					<Button
						variant={currentAlign === 'left' ? 'secondary' : 'ghost'}
						size="icon"
						class="h-8 w-8"
						onclick={() => setAlignment('left')}
						aria-label="Aligner à gauche"
					>
						<AlignLeft class="h-4 w-4" />
					</Button>
				</Tooltip.Trigger>
				<Tooltip.Content>Aligner à gauche</Tooltip.Content>
			</Tooltip.Root>

			<Tooltip.Root>
				<Tooltip.Trigger>
					<Button
						variant={currentAlign === 'center' ? 'secondary' : 'ghost'}
						size="icon"
						class="h-8 w-8"
						onclick={() => setAlignment('center')}
						aria-label="Centrer"
					>
						<AlignCenter class="h-4 w-4" />
					</Button>
				</Tooltip.Trigger>
				<Tooltip.Content>Centrer</Tooltip.Content>
			</Tooltip.Root>

			<Tooltip.Root>
				<Tooltip.Trigger>
					<Button
						variant={currentAlign === 'right' ? 'secondary' : 'ghost'}
						size="icon"
						class="h-8 w-8"
						onclick={() => setAlignment('right')}
						aria-label="Aligner à droite"
					>
						<AlignRight class="h-4 w-4" />
					</Button>
				</Tooltip.Trigger>
				<Tooltip.Content>Aligner à droite</Tooltip.Content>
			</Tooltip.Root>
		</div>

		<!-- Groupe Couleurs -->
		<div class="flex items-center gap-0.5 border-r border-border pr-2">
			<!-- Text Color -->
			<Tooltip.Root>
				<Tooltip.Trigger>
					<DropdownMenu.Root>
						<DropdownMenu.Trigger asChild let:builder>
							<Button
								builders={[builder]}
								variant="ghost"
								size="icon"
								class="relative h-8 w-8"
								aria-label="Couleur du texte"
							>
								<Paintbrush class="h-4 w-4" />
								<div
									class="absolute bottom-0.5 left-1/2 h-0.5 w-4 -translate-x-1/2"
									style="background-color: {currentTextColor}"
								></div>
							</Button>
						</DropdownMenu.Trigger>
						<DropdownMenu.Content class="w-48">
							<DropdownMenu.Label>Couleur du texte</DropdownMenu.Label>
							<DropdownMenu.Separator />
							<div class="grid grid-cols-4 gap-1 p-2">
								{#each TEXT_COLORS as color (color.value)}
									<button
										class="h-8 w-8 rounded border border-border transition-colors hover:border-foreground"
										style="background-color: {color.value}"
										onclick={() => setTextColor(color.value)}
										aria-label={color.label}
										title={color.label}
									>
										{#if currentTextColor === color.value}
											<div class="flex items-center justify-center">
												<div class="h-2 w-2 rounded-full bg-background"></div>
											</div>
										{/if}
									</button>
								{/each}
							</div>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</Tooltip.Trigger>
				<Tooltip.Content>Couleur du texte</Tooltip.Content>
			</Tooltip.Root>

			<!-- Background Color -->
			<Tooltip.Root>
				<Tooltip.Trigger>
					<DropdownMenu.Root>
						<DropdownMenu.Trigger asChild let:builder>
							<Button
								builders={[builder]}
								variant="ghost"
								size="icon"
								class="relative h-8 w-8"
								aria-label="Couleur de fond"
							>
								<Palette class="h-4 w-4" />
								{#if currentBgColor}
									<div
										class="absolute bottom-0.5 left-1/2 h-0.5 w-4 -translate-x-1/2"
										style="background-color: {currentBgColor}"
									></div>
								{/if}
							</Button>
						</DropdownMenu.Trigger>
						<DropdownMenu.Content class="w-48">
							<DropdownMenu.Label>Couleur de fond</DropdownMenu.Label>
							<DropdownMenu.Separator />
							<div class="grid grid-cols-4 gap-1 p-2">
								{#each BG_COLORS as color (color.label)}
									<button
										class="h-8 w-8 rounded border border-border transition-colors hover:border-foreground"
										style="background-color: {color.value || 'transparent'}"
										onclick={() => setBgColor(color.value)}
										aria-label={color.label}
										title={color.label}
									>
										{#if currentBgColor === color.value}
											<div class="flex items-center justify-center">
												<div
													class="h-2 w-2 rounded-full"
													style="background-color: {color.value ? '#000' : '#999'}"
												></div>
											</div>
										{/if}
									</button>
								{/each}
							</div>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</Tooltip.Trigger>
				<Tooltip.Content>Couleur de fond</Tooltip.Content>
			</Tooltip.Root>
		</div>

		<!-- Groupe Format nombre -->
		<div class="flex items-center gap-0.5 border-r border-border pr-2">
			<Tooltip.Root>
				<Tooltip.Trigger>
					<DropdownMenu.Root>
						<DropdownMenu.Trigger asChild let:builder>
							<Button
								builders={[builder]}
								variant="ghost"
								size="icon"
								class="h-8 w-8"
								aria-label="Format nombre"
							>
								<Hash class="h-4 w-4" />
							</Button>
						</DropdownMenu.Trigger>
						<DropdownMenu.Content class="w-40">
							<DropdownMenu.Label>Format nombre</DropdownMenu.Label>
							<DropdownMenu.Separator />
							<DropdownMenu.RadioGroup value={currentNumberFormat}>
								<DropdownMenu.RadioItem value="number" onclick={() => setNumberFormat('number')}>
									Nombre
								</DropdownMenu.RadioItem>
								<DropdownMenu.RadioItem value="percent" onclick={() => setNumberFormat('percent')}>
									Pourcentage (%)
								</DropdownMenu.RadioItem>
								<DropdownMenu.RadioItem
									value="currency"
									onclick={() => setNumberFormat('currency')}
								>
									Monnaie (€)
								</DropdownMenu.RadioItem>
							</DropdownMenu.RadioGroup>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</Tooltip.Trigger>
				<Tooltip.Content>Format nombre</Tooltip.Content>
			</Tooltip.Root>
		</div>

		<!-- Actions -->
		<div class="flex items-center gap-0.5">
			<Tooltip.Root>
				<Tooltip.Trigger>
					<Button
						variant="ghost"
						size="icon"
						class="h-8 w-8"
						onclick={clearFormat}
						aria-label="Effacer le formatage"
					>
						<Eraser class="h-4 w-4" />
					</Button>
				</Tooltip.Trigger>
				<Tooltip.Content>Effacer le formatage</Tooltip.Content>
			</Tooltip.Root>

			<Tooltip.Root>
				<Tooltip.Trigger>
					<Button
						variant="ghost"
						size="icon"
						class="h-8 w-8"
						onclick={clearContent}
						aria-label="Effacer le contenu"
					>
						<Trash2 class="h-4 w-4" />
					</Button>
				</Tooltip.Trigger>
				<Tooltip.Content>Effacer le contenu</Tooltip.Content>
			</Tooltip.Root>
		</div>
	</div>
</Tooltip.Provider>

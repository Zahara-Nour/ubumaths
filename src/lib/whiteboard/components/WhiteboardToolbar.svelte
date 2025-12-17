<script lang="ts">
	/**
	 * WhiteboardToolbar - Horizontal bottom toolbar
	 *
	 * Sections dépliables avec animation:
	 * - Drawing: pen, highlighter, eraser
	 * - Shapes: line, rectangle, circle, arrow
	 * - Actions: undo, redo, clear
	 * - Color picker + stroke width slider
	 */

	import { whiteboardStore } from '../stores/whiteboard.svelte';
	import type { Tool } from '../stores/whiteboard.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Popover from '$lib/components/ui/popover';
	import { Slider } from '$lib/components/ui/slider';
	import {
		Pen,
		Highlighter,
		Eraser,
		Minus,
		Square,
		Circle,
		MoveRight,
		Undo2,
		Redo2,
		Trash2,
		ChevronUp,
		ChevronDown,
		Palette,
		Ruler,
		Compass,
		Triangle
	} from 'lucide-svelte';
	import { INSTRUMENT_LABELS, type InstrumentType } from '../types/document';

	// ==========================================================================
	// Constants
	// ==========================================================================

	/** Color presets for tools */
	const COLOR_PRESETS = [
		{ name: 'Noir', value: '#000000' },
		{ name: 'Bleu', value: '#2563eb' },
		{ name: 'Rouge', value: '#dc2626' },
		{ name: 'Vert', value: '#16a34a' },
		{ name: 'Orange', value: '#ea580c' },
		{ name: 'Violet', value: '#9333ea' }
	] as const;

	/** Stroke width constraints */
	const STROKE_WIDTH_MIN = 1;
	const STROKE_WIDTH_MAX = 20;

	/** Tool definitions with icons and shortcuts */
	const DRAWING_TOOLS: { id: Tool; icon: typeof Pen; shortcut: string; label: string }[] = [
		{ id: 'pen', icon: Pen, shortcut: 'P', label: 'Stylo' },
		{ id: 'highlighter', icon: Highlighter, shortcut: 'H', label: 'Surligneur' },
		{ id: 'eraser', icon: Eraser, shortcut: 'E', label: 'Gomme' }
	];

	const SHAPE_TOOLS: { id: Tool; icon: typeof Minus; shortcut: string; label: string }[] = [
		{ id: 'line', icon: Minus, shortcut: 'L', label: 'Ligne' },
		{ id: 'rectangle', icon: Square, shortcut: 'R', label: 'Rectangle' },
		{ id: 'circle', icon: Circle, shortcut: 'C', label: 'Cercle' },
		{ id: 'arrow', icon: MoveRight, shortcut: 'A', label: 'Flèche' }
	];

	/** Instrument definitions with icons */
	const INSTRUMENT_TOOLS: { id: InstrumentType; icon: typeof Ruler; label: string }[] = [
		{ id: 'ruler', icon: Ruler, label: INSTRUMENT_LABELS.ruler },
		{ id: 'protractor', icon: Compass, label: INSTRUMENT_LABELS.protractor },
		{ id: 'setSquare', icon: Triangle, label: INSTRUMENT_LABELS.setSquare }
	];

	// ==========================================================================
	// State
	// ==========================================================================

	/** Section visibility state */
	let drawingSectionOpen = $state(true);
	let shapesSectionOpen = $state(false);
	let instrumentsSectionOpen = $state(false);

	/** Color picker open state */
	let colorPickerOpen = $state(false);

	// ==========================================================================
	// Derived State
	// ==========================================================================

	let toolState = $derived(whiteboardStore.toolState);
	let canUndo = $derived(whiteboardStore.canUndo);
	let canRedo = $derived(whiteboardStore.canRedo);
	let currentColor = $derived(toolState.color);
	let currentStrokeWidth = $derived(toolState.strokeWidth);
	let instruments = $derived(whiteboardStore.instruments);

	// ==========================================================================
	// Handlers
	// ==========================================================================

	function handleToolSelect(tool: Tool) {
		whiteboardStore.setTool(tool);
	}

	function handleColorSelect(color: string) {
		whiteboardStore.setColor(color);
		colorPickerOpen = false;
	}

	function handleStrokeWidthChange(value: number[]) {
		if (value.length > 0) {
			whiteboardStore.setStrokeWidth(value[0]);
		}
	}

	function handleUndo() {
		whiteboardStore.undo();
	}

	function handleRedo() {
		whiteboardStore.redo();
	}

	function handleClear() {
		const page = whiteboardStore.currentPage;
		if (page && page.elements.length > 0) {
			// Confirmation before destructive action
			if (confirm('Voulez-vous vraiment effacer tous les éléments de cette page ?')) {
				whiteboardStore.clearPage();
			}
		}
	}

	function toggleDrawingSection() {
		drawingSectionOpen = !drawingSectionOpen;
	}

	function toggleShapesSection() {
		shapesSectionOpen = !shapesSectionOpen;
	}

	function toggleInstrumentsSection() {
		instrumentsSectionOpen = !instrumentsSectionOpen;
	}

	function handleInstrumentToggle(type: InstrumentType) {
		whiteboardStore.toggleInstrument(type);
	}
</script>

<div class="whiteboard-toolbar border-t border-border bg-muted/50">
	<!-- Main Row: Section toggles + Actions -->
	<div class="flex items-center justify-between gap-2 px-3 py-2">
		<!-- Left: Section toggles -->
		<div class="flex items-center gap-1">
			<!-- Drawing Section Toggle -->
			<Button
				type="button"
				variant={drawingSectionOpen ? 'secondary' : 'ghost'}
				size="sm"
				onclick={toggleDrawingSection}
				class="gap-1"
				aria-expanded={drawingSectionOpen}
			>
				<Pen class="h-4 w-4" />
				<span class="hidden sm:inline">Dessin</span>
				{#if drawingSectionOpen}
					<ChevronUp class="h-3 w-3" />
				{:else}
					<ChevronDown class="h-3 w-3" />
				{/if}
			</Button>

			<!-- Shapes Section Toggle -->
			<Button
				type="button"
				variant={shapesSectionOpen ? 'secondary' : 'ghost'}
				size="sm"
				onclick={toggleShapesSection}
				class="gap-1"
				aria-expanded={shapesSectionOpen}
			>
				<Square class="h-4 w-4" />
				<span class="hidden sm:inline">Formes</span>
				{#if shapesSectionOpen}
					<ChevronUp class="h-3 w-3" />
				{:else}
					<ChevronDown class="h-3 w-3" />
				{/if}
			</Button>

			<!-- Instruments Section Toggle -->
			<Button
				type="button"
				variant={instrumentsSectionOpen ? 'secondary' : 'ghost'}
				size="sm"
				onclick={toggleInstrumentsSection}
				class="gap-1"
				aria-expanded={instrumentsSectionOpen}
			>
				<Ruler class="h-4 w-4" />
				<span class="hidden sm:inline">Instruments</span>
				{#if instrumentsSectionOpen}
					<ChevronUp class="h-3 w-3" />
				{:else}
					<ChevronDown class="h-3 w-3" />
				{/if}
			</Button>

			<!-- Separator -->
			<div class="mx-2 h-6 w-px bg-border"></div>

			<!-- Color Picker -->
			<Popover.Root bind:open={colorPickerOpen}>
				<Popover.Trigger>
					{#snippet child({ props })}
						<button
							{...props}
							type="button"
							class="flex h-9 items-center gap-2 rounded-md px-3 text-sm transition-colors hover:bg-accent"
							aria-label="Choisir une couleur"
						>
							<div
								class="h-5 w-5 rounded border border-border"
								style="background-color: {currentColor}"
							></div>
							<Palette class="h-4 w-4 text-muted-foreground" />
						</button>
					{/snippet}
				</Popover.Trigger>
				<Popover.Content class="w-auto p-3" side="top">
					<div class="grid grid-cols-6 gap-2" role="group" aria-label="Couleurs prédéfinies">
						{#each COLOR_PRESETS as color (color.value)}
							<button
								type="button"
								onclick={() => handleColorSelect(color.value)}
								class="h-8 w-8 rounded-md border-2 transition-transform hover:scale-110 {currentColor ===
								color.value
									? 'border-primary ring-2 ring-primary ring-offset-2'
									: 'border-border'}"
								style="background-color: {color.value}"
								title={color.name}
								aria-label="{color.name}{currentColor === color.value ? ' (sélectionné)' : ''}"
								aria-pressed={currentColor === color.value}
							></button>
						{/each}
					</div>
					<!-- Custom color input -->
					<div class="mt-3 flex items-center gap-2">
						<input
							type="color"
							value={currentColor}
							onchange={(e) => handleColorSelect(e.currentTarget.value)}
							class="h-8 w-8 cursor-pointer rounded border-0 p-0"
							aria-label="Couleur personnalisée"
						/>
						<span class="text-xs text-muted-foreground">Personnalisé</span>
					</div>
				</Popover.Content>
			</Popover.Root>

			<!-- Stroke Width Slider -->
			<div class="flex items-center gap-2 px-2">
				<span class="text-xs text-muted-foreground" aria-hidden="true">{currentStrokeWidth}px</span>
				<Slider
					value={[currentStrokeWidth]}
					onValueChange={handleStrokeWidthChange}
					min={STROKE_WIDTH_MIN}
					max={STROKE_WIDTH_MAX}
					step={1}
					class="w-24"
					aria-label="Épaisseur du trait: {currentStrokeWidth} pixels"
				/>
				<!-- Stroke preview -->
				<div class="flex h-6 w-6 items-center justify-center" aria-hidden="true">
					<div
						class="rounded-full"
						style="width: {Math.min(currentStrokeWidth, STROKE_WIDTH_MAX)}px; height: {Math.min(
							currentStrokeWidth,
							STROKE_WIDTH_MAX
						)}px; background-color: {currentColor}"
					></div>
				</div>
			</div>
		</div>

		<!-- Right: Actions -->
		<div class="flex items-center gap-1">
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onclick={handleUndo}
				disabled={!canUndo}
				title="Annuler (Ctrl+Z)"
				aria-label="Annuler"
			>
				<Undo2 class="h-4 w-4" />
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onclick={handleRedo}
				disabled={!canRedo}
				title="Rétablir (Ctrl+Shift+Z)"
				aria-label="Rétablir"
			>
				<Redo2 class="h-4 w-4" />
			</Button>
			<div class="mx-1 h-6 w-px bg-border"></div>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onclick={handleClear}
				title="Effacer tout"
				aria-label="Effacer tout"
				class="text-destructive hover:bg-destructive/10 hover:text-destructive"
			>
				<Trash2 class="h-4 w-4" />
			</Button>
		</div>
	</div>

	<!-- Drawing Section (Collapsible with animation) -->
	<div
		class="drawing-section overflow-hidden border-t border-border/50 transition-all duration-200 ease-in-out"
		class:max-h-0={!drawingSectionOpen}
		class:max-h-20={drawingSectionOpen}
		class:opacity-0={!drawingSectionOpen}
		class:opacity-100={drawingSectionOpen}
	>
		<div class="flex items-center gap-1 px-3 py-2">
			{#each DRAWING_TOOLS as tool (tool.id)}
				<Button
					type="button"
					variant={toolState.toolType === tool.id ? 'secondary' : 'ghost'}
					size="sm"
					onclick={() => handleToolSelect(tool.id)}
					title="{tool.label} ({tool.shortcut})"
					aria-label={tool.label}
					class="gap-1"
				>
					<tool.icon class="h-4 w-4" />
					<span class="hidden sm:inline">{tool.label}</span>
					<kbd class="ml-1 hidden rounded bg-muted px-1 text-xs sm:inline">{tool.shortcut}</kbd>
				</Button>
			{/each}
		</div>
	</div>

	<!-- Shapes Section (Collapsible with animation) -->
	<div
		class="shapes-section overflow-hidden border-t border-border/50 transition-all duration-200 ease-in-out"
		class:max-h-0={!shapesSectionOpen}
		class:max-h-20={shapesSectionOpen}
		class:opacity-0={!shapesSectionOpen}
		class:opacity-100={shapesSectionOpen}
	>
		<div class="flex items-center gap-1 px-3 py-2">
			{#each SHAPE_TOOLS as tool (tool.id)}
				<Button
					type="button"
					variant={toolState.toolType === tool.id ? 'secondary' : 'ghost'}
					size="sm"
					onclick={() => handleToolSelect(tool.id)}
					title="{tool.label} ({tool.shortcut})"
					aria-label={tool.label}
					class="gap-1"
				>
					<tool.icon class="h-4 w-4" />
					<span class="hidden sm:inline">{tool.label}</span>
					<kbd class="ml-1 hidden rounded bg-muted px-1 text-xs sm:inline">{tool.shortcut}</kbd>
				</Button>
			{/each}
		</div>
	</div>

	<!-- Instruments Section (Collapsible with animation) -->
	<div
		class="instruments-section overflow-hidden border-t border-border/50 transition-all duration-200 ease-in-out"
		class:max-h-0={!instrumentsSectionOpen}
		class:max-h-20={instrumentsSectionOpen}
		class:opacity-0={!instrumentsSectionOpen}
		class:opacity-100={instrumentsSectionOpen}
	>
		<div class="flex items-center gap-1 px-3 py-2">
			{#if instruments}
				{#each INSTRUMENT_TOOLS as tool (tool.id)}
					<Button
						type="button"
						variant={instruments[tool.id].visible ? 'secondary' : 'ghost'}
						size="sm"
						onclick={() => handleInstrumentToggle(tool.id)}
						title="{tool.label} - cliquer pour {instruments[tool.id].visible
							? 'masquer'
							: 'afficher'}"
						aria-label="{tool.label} ({instruments[tool.id].visible ? 'visible' : 'masqué'})"
						aria-pressed={instruments[tool.id].visible}
						class="gap-1"
					>
						<tool.icon class="h-4 w-4" />
						<span class="hidden sm:inline">{tool.label}</span>
						{#if instruments[tool.id].visible}
							<span class="ml-1 h-2 w-2 rounded-full bg-primary" aria-hidden="true"></span>
						{/if}
					</Button>
				{/each}
			{/if}
		</div>
	</div>
</div>

<style>
	.whiteboard-toolbar {
		user-select: none;
	}
</style>

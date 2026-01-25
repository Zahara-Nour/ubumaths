<script lang="ts">
	/**
	 * FloatingToolbar - Floating bottom toolbar with drawing tools
	 *
	 * Centered at the bottom of the canvas area, contains:
	 * - Action tools: select, pan, laser
	 * - Drawing tools: pen, marker, highlighter
	 * - Edit tools: eraser, text
	 * - Shapes popover
	 * - Instruments popover
	 * - Page settings popover
	 * - Sloppiness presets (for shapes)
	 */

	import { whiteboardStore } from '../stores/whiteboard.svelte';
	import type { Tool } from '../stores/whiteboard.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Popover from '$lib/components/ui/popover';
	import { Slider } from '$lib/components/ui/slider';
	import ToolButton from './toolbar/ToolButton.svelte';
	import {
		Pen,
		Pencil,
		Highlighter,
		Eraser,
		Type,
		Minus,
		Square,
		Circle,
		MoveRight,
		Ruler,
		Compass,
		Triangle,
		MousePointer2,
		Hand,
		Pentagon,
		Hexagon,
		Star,
		Grid3x3,
		Crosshair,
		Sparkles,
		Undo2,
		Redo2,
		GripVertical,
		Palette
	} from 'lucide-svelte';
	import {
		INSTRUMENT_LABELS,
		SLOPPINESS_PRESETS,
		getSloppinessPreset,
		PAGE_FORMATS,
		type InstrumentType,
		type BackgroundStyle,
		type PageFormatKey,
		type SloppinessPreset
	} from '../types/document';

	// ==========================================================================
	// Constants
	// ==========================================================================

	const SHAPE_TOOLS: { id: Tool; icon: typeof Minus; shortcut: string; label: string }[] = [
		{ id: 'line', icon: Minus, shortcut: 'L', label: 'Ligne' },
		{ id: 'rectangle', icon: Square, shortcut: 'R', label: 'Rectangle' },
		{ id: 'circle', icon: Circle, shortcut: 'C', label: 'Cercle' },
		{ id: 'arrow', icon: MoveRight, shortcut: 'A', label: 'Fleche' },
		{ id: 'pentagon', icon: Pentagon, shortcut: '', label: 'Pentagone' },
		{ id: 'hexagon', icon: Hexagon, shortcut: '', label: 'Hexagone' },
		{ id: 'star', icon: Star, shortcut: '', label: 'Etoile' }
	];

	const INSTRUMENT_TOOLS: { id: InstrumentType; icon: typeof Ruler; label: string }[] = [
		{ id: 'ruler', icon: Ruler, label: INSTRUMENT_LABELS.ruler },
		{ id: 'protractor', icon: Compass, label: INSTRUMENT_LABELS.protractor },
		{ id: 'setSquare', icon: Triangle, label: INSTRUMENT_LABELS.setSquare }
	];

	const BACKGROUND_STYLE_LABELS: Record<BackgroundStyle, string> = {
		plain: 'Vierge',
		grid: 'Quadrille',
		ruled: 'Ligne',
		dotted: 'Pointille',
		triangular: 'Triangulaire',
		'triangular-dotted': 'Triangulaire pointille',
		hexagonal: 'Hexagonal',
		'hexagonal-dotted': 'Hexagonal pointille'
	};

	/** Quick access colors for the toolbar */
	const QUICK_COLORS = [
		{ color: '#000000', label: 'Noir' },
		{ color: '#22c55e', label: 'Vert' },
		{ color: '#ef4444', label: 'Rouge' }
	] as const;

	// ==========================================================================
	// Props
	// ==========================================================================

	interface Props {
		class?: string;
	}

	let { class: className = '' }: Props = $props();

	// ==========================================================================
	// State
	// ==========================================================================

	let shapesPopoverOpen = $state(false);
	let instrumentsPopoverOpen = $state(false);
	let pagePopoverOpen = $state(false);

	/** Drag state */
	let toolbarPosition = $state({ x: 0, y: 0 });
	let isDragging = $state(false);
	let dragStart = $state({ x: 0, y: 0 });
	let hasCustomPosition = $state(false);

	/** Style panel state */
	let stylePanelOpen = $derived(whiteboardStore.stylePanelOpen);

	// ==========================================================================
	// Derived State
	// ==========================================================================

	let toolState = $derived(whiteboardStore.toolState);
	let canUndo = $derived(whiteboardStore.canUndo);
	let canRedo = $derived(whiteboardStore.canRedo);
	let instruments = $derived(whiteboardStore.instruments);
	let currentRoughness = $derived(toolState.roughness);
	let currentSloppinessPreset = $derived(getSloppinessPreset(currentRoughness));

	let currentShapeTool = $derived(
		SHAPE_TOOLS.find((t) => t.id === toolState.toolType) || SHAPE_TOOLS[0]
	);

	let isShapeToolActive = $derived(SHAPE_TOOLS.some((t) => t.id === toolState.toolType));

	const STROKE_TOOLS = ['pen', 'marker', 'highlighter', 'eraser'] as const;
	let isStrokeToolActive = $derived(STROKE_TOOLS.some((t) => t === toolState.toolType));

	let hasSelectedShape = $derived(
		whiteboardStore.selectedElements.some((el) => el.type === 'shape')
	);

	let showSloppinessControl = $derived(
		(isShapeToolActive || hasSelectedShape) && !isStrokeToolActive
	);

	let isLaserTool = $derived(toolState.toolType === 'laser');
	let laserMode = $derived(whiteboardStore.laserMode);
	let currentColor = $derived(toolState.color);

	let currentBackgroundStyle = $derived.by(() => {
		const page = whiteboardStore.currentPage;
		if (!page || page.background.type !== 'plain') return 'plain';
		return page.background.style;
	});

	let currentGridSpacing = $derived.by(() => {
		const page = whiteboardStore.currentPage;
		if (!page || page.background.type !== 'plain') return 20;
		return page.background.gridSpacing ?? 20;
	});

	let currentGridOpacity = $derived.by(() => {
		const page = whiteboardStore.currentPage;
		if (!page || page.background.type !== 'plain') return 0.3;
		return page.background.gridOpacity ?? 0.3;
	});

	let showGridControls = $derived(currentBackgroundStyle !== 'plain');

	let currentPageFormat = $derived.by(() => {
		const page = whiteboardStore.currentPage;
		if (!page) return 'A4';
		for (const [key, value] of Object.entries(PAGE_FORMATS)) {
			if (value.width === page.width && value.height === page.height) {
				return key as PageFormatKey;
			}
		}
		return null;
	});

	let currentPageDimensions = $derived.by(() => {
		const page = whiteboardStore.currentPage;
		if (!page) return { width: 794, height: 1123 };
		return { width: page.width, height: page.height };
	});

	// ==========================================================================
	// Handlers
	// ==========================================================================

	function handleToolSelect(tool: Tool) {
		whiteboardStore.setTool(tool);
		shapesPopoverOpen = false;
	}

	function handleInstrumentToggle(type: InstrumentType) {
		whiteboardStore.toggleInstrument(type);
	}

	function handleSloppinessPresetChange(preset: SloppinessPreset) {
		const { roughness } = SLOPPINESS_PRESETS[preset];
		whiteboardStore.setRoughness(roughness);
		if (whiteboardStore.hasSelection) {
			whiteboardStore.updateSelectedStyles({ roughness });
		}
	}

	function handleQuickColorChange(color: string) {
		whiteboardStore.setColor(color);
		if (whiteboardStore.hasSelection) {
			whiteboardStore.updateSelectedStyles({ color });
		}
	}

	function handleBackgroundStyleChange(style: BackgroundStyle) {
		const page = whiteboardStore.currentPage;
		const existingGridSpacing =
			page?.background.type === 'plain' ? page.background.gridSpacing : undefined;
		const existingGridOpacity =
			page?.background.type === 'plain' ? page.background.gridOpacity : undefined;

		whiteboardStore.setPageBackground({
			type: 'plain',
			style,
			color: '#ffffff',
			gridSpacing: existingGridSpacing,
			gridOpacity: existingGridOpacity
		});
	}

	function handleGridSpacingChange(value: number[] | number) {
		const spacing = Array.isArray(value) ? value[0] : value;
		if (spacing === undefined) return;

		const page = whiteboardStore.currentPage;
		if (!page || page.background.type !== 'plain') return;

		whiteboardStore.setPageBackground({
			...page.background,
			gridSpacing: spacing
		});
	}

	function handleGridOpacityChange(value: number[] | number) {
		const opacity = Array.isArray(value) ? value[0] : value;
		if (opacity === undefined) return;

		const page = whiteboardStore.currentPage;
		if (!page || page.background.type !== 'plain') return;

		whiteboardStore.setPageBackground({
			...page.background,
			gridOpacity: opacity
		});
	}

	function handlePageFormatChange(format: PageFormatKey) {
		whiteboardStore.setPageFormat(format);
		pagePopoverOpen = false;
	}

	// ==========================================================================
	// Undo/Redo Handlers
	// ==========================================================================

	function handleUndo() {
		whiteboardStore.undo();
	}

	function handleRedo() {
		whiteboardStore.redo();
	}

	// ==========================================================================
	// Style Panel Handler
	// ==========================================================================

	function toggleStylePanel() {
		whiteboardStore.toggleStylePanel();
	}

	// ==========================================================================
	// Drag Handlers
	// ==========================================================================

	function handleDragStart(e: PointerEvent) {
		e.preventDefault();
		isDragging = true;
		dragStart = {
			x: e.clientX - toolbarPosition.x,
			y: e.clientY - toolbarPosition.y
		};
		// Attach move and end handlers to window for reliable tracking
		window.addEventListener('pointermove', handleDragMove);
		window.addEventListener('pointerup', handleDragEnd);
	}

	function handleDragMove(e: PointerEvent) {
		if (!isDragging) return;

		toolbarPosition = {
			x: e.clientX - dragStart.x,
			y: e.clientY - dragStart.y
		};
		hasCustomPosition = true;
	}

	function handleDragEnd() {
		if (isDragging) {
			isDragging = false;
			// Remove window listeners
			window.removeEventListener('pointermove', handleDragMove);
			window.removeEventListener('pointerup', handleDragEnd);
			// Save position to localStorage
			if (hasCustomPosition) {
				localStorage.setItem('whiteboard-toolbar-position', JSON.stringify(toolbarPosition));
			}
		}
	}

	function handleDragDoubleClick() {
		// Reset to default position
		toolbarPosition = { x: 0, y: 0 };
		hasCustomPosition = false;
		localStorage.removeItem('whiteboard-toolbar-position');
	}

	// Load saved position on mount and cleanup on destroy
	$effect(() => {
		const saved = localStorage.getItem('whiteboard-toolbar-position');
		if (saved) {
			try {
				const pos = JSON.parse(saved);
				if (typeof pos.x === 'number' && typeof pos.y === 'number') {
					toolbarPosition = pos;
					hasCustomPosition = true;
				}
			} catch {
				// Ignore parse errors
			}
		}

		// Cleanup on destroy
		return () => {
			if (isDragging) {
				window.removeEventListener('pointermove', handleDragMove);
				window.removeEventListener('pointerup', handleDragEnd);
			}
		};
	});
</script>

<div
	class="floating-toolbar absolute z-50 flex items-center gap-1 rounded-xl border border-border bg-background/95 px-2 py-1.5 shadow-lg backdrop-blur-sm {className}"
	style="bottom: 16px; left: 50%; transform: translate(calc(-50% + {toolbarPosition.x}px), {toolbarPosition.y}px); {isDragging
		? ''
		: 'transition: transform 0.1s ease-out;'}"
>
	<!-- Drag handle -->
	<div
		class="drag-handle flex cursor-grab items-center justify-center rounded p-1 transition-colors hover:bg-accent active:cursor-grabbing"
		onpointerdown={handleDragStart}
		ondblclick={handleDragDoubleClick}
		title="Glisser pour deplacer (double-clic pour reinitialiser)"
		aria-label="Deplacer la barre d'outils"
	>
		<GripVertical class="h-4 w-4 text-muted-foreground" />
	</div>

	<!-- Undo/Redo -->
	<div class="flex items-center gap-0.5">
		<ToolButton
			icon={Undo2}
			disabled={!canUndo}
			label="Annuler"
			shortcut="Ctrl+Z"
			onclick={handleUndo}
		/>
		<ToolButton
			icon={Redo2}
			disabled={!canRedo}
			label="Rétablir"
			shortcut="Ctrl+Y"
			onclick={handleRedo}
		/>
	</div>

	<div class="h-6 w-px bg-border"></div>

	<!-- Group 1: Action tools -->
	<div class="flex items-center gap-0.5">
		<ToolButton
			icon={MousePointer2}
			active={toolState.toolType === 'select'}
			label="Selection"
			shortcut="V"
			onclick={() => handleToolSelect('select')}
		/>
		<ToolButton
			icon={Hand}
			active={toolState.toolType === 'pan'}
			label="Deplacer la vue"
			shortcut="Espace"
			onclick={() => handleToolSelect('pan')}
		/>

		<!-- Laser pointer (fixed point) -->
		<ToolButton
			icon={Crosshair}
			active={isLaserTool && laserMode === 'pointer'}
			label="Laser pointeur"
			shortcut="Z"
			onclick={() => {
				whiteboardStore.setLaserMode('pointer');
				handleToolSelect('laser');
			}}
		/>

		<!-- Laser trail -->
		<ToolButton
			icon={Sparkles}
			active={isLaserTool && laserMode === 'trail'}
			label="Laser trainee"
			shortcut=""
			onclick={() => {
				whiteboardStore.setLaserMode('trail');
				handleToolSelect('laser');
			}}
		/>
	</div>

	<div class="h-6 w-px bg-border"></div>

	<!-- Group 2: Drawing tools (eraser first, then drawing tools) -->
	<div class="flex items-center gap-0.5">
		<ToolButton
			icon={Eraser}
			active={toolState.toolType === 'eraser'}
			label="Gomme"
			shortcut="E"
			onclick={() => handleToolSelect('eraser')}
		/>
		<ToolButton
			icon={Pen}
			active={toolState.toolType === 'pen'}
			label="Stylo"
			shortcut="P"
			onclick={() => handleToolSelect('pen')}
		/>
		<ToolButton
			icon={Pencil}
			active={toolState.toolType === 'marker'}
			label="Feutre"
			shortcut="M"
			onclick={() => handleToolSelect('marker')}
		/>
		<ToolButton
			icon={Highlighter}
			active={toolState.toolType === 'highlighter'}
			label="Surligneur"
			shortcut="H"
			onclick={() => handleToolSelect('highlighter')}
		/>
		<ToolButton
			icon={Type}
			active={toolState.toolType === 'text'}
			label="Texte"
			shortcut="T"
			onclick={() => handleToolSelect('text')}
		/>
	</div>

	<div class="h-6 w-px bg-border"></div>

	<!-- Group 3: Quick colors -->
	<div class="flex items-center gap-0.5">
		{#each QUICK_COLORS as { color, label } (color)}
			<button
				type="button"
				class="flex h-7 w-7 items-center justify-center rounded-md border-2 transition-all {currentColor ===
				color
					? 'border-primary ring-2 ring-primary ring-offset-1'
					: 'border-transparent hover:border-border'}"
				style="background-color: {color};"
				title={label}
				aria-label={label}
				onclick={() => handleQuickColorChange(color)}
			>
				{#if color === '#ffffff'}
					<span class="h-4 w-4 rounded-sm border border-gray-300"></span>
				{/if}
			</button>
		{/each}
	</div>

	<div class="h-6 w-px bg-border"></div>

	<!-- Group 4: Shapes, Instruments, Page Settings -->
	<div class="flex items-center gap-0.5">
		<!-- Shapes Popover -->
		<Popover.Root bind:open={shapesPopoverOpen}>
			<Popover.Trigger>
				{#snippet child({ props })}
					<button
						{...props}
						type="button"
						class="flex h-9 w-9 items-center justify-center rounded-md transition-colors {isShapeToolActive
							? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-1'
							: 'hover:bg-accent'}"
						aria-label="Formes"
						title="Formes"
					>
						<currentShapeTool.icon class="h-4 w-4" />
					</button>
				{/snippet}
			</Popover.Trigger>
			<Popover.Content class="w-auto p-2" side="top" align="start">
				<div class="flex gap-1">
					{#each SHAPE_TOOLS as tool (tool.id)}
						<Button
							type="button"
							variant={toolState.toolType === tool.id ? 'secondary' : 'ghost'}
							size="icon"
							onclick={() => handleToolSelect(tool.id)}
							title={tool.label}
						>
							<tool.icon class="h-4 w-4" />
						</Button>
					{/each}
				</div>
			</Popover.Content>
		</Popover.Root>

		<!-- Instruments Popover -->
		<Popover.Root bind:open={instrumentsPopoverOpen}>
			<Popover.Trigger>
				{#snippet child({ props })}
					<button
						{...props}
						type="button"
						class="flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-accent"
						aria-label="Instruments"
						title="Instruments"
					>
						<Ruler class="h-4 w-4" />
					</button>
				{/snippet}
			</Popover.Trigger>
			<Popover.Content class="w-auto p-2" side="top" align="start">
				<div class="flex flex-col gap-1">
					{#if instruments}
						{#each INSTRUMENT_TOOLS as tool (tool.id)}
							<Button
								type="button"
								variant={instruments[tool.id].visible ? 'secondary' : 'ghost'}
								size="sm"
								onclick={() => handleInstrumentToggle(tool.id)}
								class="justify-start gap-2"
							>
								<tool.icon class="h-4 w-4" />
								<span>{tool.label}</span>
								{#if instruments[tool.id].visible}
									<span class="ml-auto h-2 w-2 rounded-full bg-primary"></span>
								{/if}
							</Button>
						{/each}
					{/if}
				</div>
			</Popover.Content>
		</Popover.Root>

		<!-- Page Settings Popover -->
		<Popover.Root bind:open={pagePopoverOpen}>
			<Popover.Trigger>
				{#snippet child({ props })}
					<button
						{...props}
						type="button"
						class="flex h-9 items-center gap-1.5 rounded-md px-2 text-sm transition-colors hover:bg-accent"
						aria-label="Parametres de page"
						title="Page"
					>
						<Grid3x3 class="h-4 w-4" />
						<span class="text-xs text-muted-foreground">
							{currentPageFormat
								? PAGE_FORMATS[currentPageFormat].label
								: `${currentPageDimensions.width}x${currentPageDimensions.height}`}
						</span>
					</button>
				{/snippet}
			</Popover.Trigger>
			<Popover.Content class="w-64 p-3" side="top" align="start">
				<div class="flex flex-col gap-4">
					<!-- Format section -->
					<div>
						<span class="mb-2 block text-xs font-medium text-muted-foreground">Format</span>
						<div class="grid grid-cols-2 gap-1">
							{#each Object.entries(PAGE_FORMATS) as [key, format] (key)}
								<Button
									type="button"
									variant={currentPageFormat === key ? 'secondary' : 'ghost'}
									size="sm"
									onclick={() => handlePageFormatChange(key as PageFormatKey)}
									class="h-7 justify-start px-2 text-xs"
								>
									{format.label}
								</Button>
							{/each}
						</div>
					</div>

					<div class="h-px bg-border"></div>

					<!-- Background section -->
					<div>
						<span class="mb-2 block text-xs font-medium text-muted-foreground">Fond</span>
						<div class="grid grid-cols-4 gap-1">
							{#each Object.entries(BACKGROUND_STYLE_LABELS) as [style, label] (style)}
								<button
									type="button"
									onclick={() => handleBackgroundStyleChange(style as BackgroundStyle)}
									class="flex h-9 w-9 items-center justify-center rounded-md border transition-colors {currentBackgroundStyle ===
									style
										? 'border-primary bg-secondary'
										: 'border-border hover:bg-accent'}"
									title={label}
									aria-label={label}
								>
									<svg class="h-5 w-5" viewBox="0 0 20 20">
										<rect
											x="1"
											y="1"
											width="18"
											height="18"
											rx="2"
											fill="white"
											stroke="currentColor"
											stroke-width="1"
										/>
										{#if style === 'grid'}
											<line x1="7" y1="1" x2="7" y2="19" stroke="#ddd" stroke-width="0.5" />
											<line x1="13" y1="1" x2="13" y2="19" stroke="#ddd" stroke-width="0.5" />
											<line x1="1" y1="7" x2="19" y2="7" stroke="#ddd" stroke-width="0.5" />
											<line x1="1" y1="13" x2="19" y2="13" stroke="#ddd" stroke-width="0.5" />
										{:else if style === 'ruled'}
											<line x1="1" y1="5" x2="19" y2="5" stroke="#ddd" stroke-width="0.5" />
											<line x1="1" y1="10" x2="19" y2="10" stroke="#ddd" stroke-width="0.5" />
											<line x1="1" y1="15" x2="19" y2="15" stroke="#ddd" stroke-width="0.5" />
										{:else if style === 'dotted'}
											<circle cx="5" cy="5" r="0.8" fill="#ccc" />
											<circle cx="10" cy="5" r="0.8" fill="#ccc" />
											<circle cx="15" cy="5" r="0.8" fill="#ccc" />
											<circle cx="5" cy="10" r="0.8" fill="#ccc" />
											<circle cx="10" cy="10" r="0.8" fill="#ccc" />
											<circle cx="15" cy="10" r="0.8" fill="#ccc" />
											<circle cx="5" cy="15" r="0.8" fill="#ccc" />
											<circle cx="10" cy="15" r="0.8" fill="#ccc" />
											<circle cx="15" cy="15" r="0.8" fill="#ccc" />
										{:else if style === 'triangular'}
											<path
												d="M 4 15 L 10 4 L 16 15 Z"
												fill="none"
												stroke="#ddd"
												stroke-width="0.5"
											/>
										{:else if style === 'triangular-dotted'}
											<circle cx="10" cy="4" r="1" fill="#ccc" />
											<circle cx="4" cy="15" r="1" fill="#ccc" />
											<circle cx="16" cy="15" r="1" fill="#ccc" />
										{:else if style === 'hexagonal'}
											<path
												d="M 6 4 L 14 4 L 17 10 L 14 16 L 6 16 L 3 10 Z"
												fill="none"
												stroke="#ddd"
												stroke-width="0.5"
											/>
										{:else if style === 'hexagonal-dotted'}
											<circle cx="6" cy="4" r="1" fill="#ccc" />
											<circle cx="14" cy="4" r="1" fill="#ccc" />
											<circle cx="17" cy="10" r="1" fill="#ccc" />
											<circle cx="14" cy="16" r="1" fill="#ccc" />
											<circle cx="6" cy="16" r="1" fill="#ccc" />
											<circle cx="3" cy="10" r="1" fill="#ccc" />
										{/if}
									</svg>
								</button>
							{/each}
						</div>
					</div>

					{#if showGridControls}
						<div class="flex flex-col gap-2">
							<div class="flex items-center gap-2">
								<span class="w-20 text-xs text-muted-foreground">Espacement</span>
								<Slider
									type="single"
									value={[currentGridSpacing]}
									onValueChange={handleGridSpacingChange}
									min={5}
									max={100}
									step={1}
									class="flex-1"
									aria-label="Espacement: {currentGridSpacing}px"
								/>
								<span class="w-10 text-right text-xs text-muted-foreground"
									>{currentGridSpacing}px</span
								>
							</div>
							<div class="flex items-center gap-2">
								<span class="w-20 text-xs text-muted-foreground">Intensite</span>
								<Slider
									type="single"
									value={[currentGridOpacity]}
									onValueChange={handleGridOpacityChange}
									min={0.1}
									max={1}
									step={0.05}
									class="flex-1"
									aria-label="Intensite: {Math.round(currentGridOpacity * 100)}%"
								/>
								<span class="w-10 text-right text-xs text-muted-foreground"
									>{Math.round(currentGridOpacity * 100)}%</span
								>
							</div>
						</div>
					{/if}
				</div>
			</Popover.Content>
		</Popover.Root>
	</div>

	<!-- Sloppiness presets (conditional) -->
	{#if showSloppinessControl}
		<div class="h-6 w-px bg-border"></div>

		<div class="flex items-center gap-0.5 rounded-md border border-border p-0.5">
			{#each Object.entries(SLOPPINESS_PRESETS) as [preset, config] (preset)}
				<Button
					type="button"
					variant={currentSloppinessPreset === preset ? 'secondary' : 'ghost'}
					size="sm"
					onclick={() => handleSloppinessPresetChange(preset as SloppinessPreset)}
					title={config.label}
					aria-label={config.label}
					class="h-7 px-2 text-xs"
				>
					{config.label.charAt(0)}
				</Button>
			{/each}
		</div>
	{/if}

	<div class="h-6 w-px bg-border"></div>

	<!-- Style Panel toggle -->
	<ToolButton
		icon={Palette}
		active={stylePanelOpen}
		label="Styles"
		shortcut="Ctrl+P"
		onclick={toggleStylePanel}
	/>
</div>

<style>
	.floating-toolbar {
		user-select: none;
	}

	/* Tablet: larger touch targets */
	@media (max-width: 1023px) {
		.floating-toolbar {
			padding: 8px 12px;
		}

		.floating-toolbar :global(button) {
			min-width: 44px;
			min-height: 44px;
		}
	}

	/* Mobile: compact toolbar with fewer visible items */
	@media (max-width: 767px) {
		.floating-toolbar {
			bottom: 8px;
			max-width: calc(100vw - 16px);
			overflow-x: auto;
			padding: 6px 8px;
		}
	}
</style>

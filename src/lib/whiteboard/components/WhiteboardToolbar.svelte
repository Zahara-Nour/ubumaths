<script lang="ts">
	/**
	 * WhiteboardToolbar - Horizontal bottom toolbar with popup menus
	 *
	 * Sections:
	 * - Action tools: select, pan
	 * - Drawing tools: pen, marker, highlighter, eraser, text
	 * - Shapes: line, rectangle, circle, arrow, pentagon, hexagon, star
	 * - Instruments: ruler, protractor, set square
	 * - Import: image, PDF
	 * - Background/Format page settings
	 * - Stroke/Fill properties panels
	 * - Zoom controls
	 *
	 * Note: File operations (save, open, export) are now in FileDrawer component.
	 */

	import { whiteboardStore } from '../stores/whiteboard.svelte';
	import type { Tool } from '../stores/whiteboard.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Popover from '$lib/components/ui/popover';
	import { Slider } from '$lib/components/ui/slider';
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
		ZoomIn,
		ZoomOut,
		Pentagon,
		Hexagon,
		Star,
		Grid3x3,
		Maximize2,
		Minimize2,
		Palette
	} from 'lucide-svelte';
	import {
		INSTRUMENT_LABELS,
		STROKE_STYLE_LABELS,
		FILL_MODE_LABELS,
		ELBOW_DIRECTION_LABELS,
		ARROW_TYPE_LABELS,
		SLOPPINESS_PRESETS,
		getSloppinessPreset,
		PAGE_FORMATS,
		type InstrumentType,
		type StrokeStyle,
		type FillMode,
		type BackgroundStyle,
		type PageFormatKey,
		type ElbowDirection,
		type ArrowType,
		type SloppinessPreset
	} from '../types/document';

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

	const SHAPE_TOOLS: { id: Tool; icon: typeof Minus; shortcut: string; label: string }[] = [
		{ id: 'line', icon: Minus, shortcut: 'L', label: 'Ligne' },
		{ id: 'rectangle', icon: Square, shortcut: 'R', label: 'Rectangle' },
		{ id: 'circle', icon: Circle, shortcut: 'C', label: 'Cercle' },
		{ id: 'arrow', icon: MoveRight, shortcut: 'A', label: 'Flèche' },
		{ id: 'pentagon', icon: Pentagon, shortcut: '', label: 'Pentagone' },
		{ id: 'hexagon', icon: Hexagon, shortcut: '', label: 'Hexagone' },
		{ id: 'star', icon: Star, shortcut: '', label: 'Étoile' }
	];

	/** Instrument definitions with icons */
	const INSTRUMENT_TOOLS: { id: InstrumentType; icon: typeof Ruler; label: string }[] = [
		{ id: 'ruler', icon: Ruler, label: INSTRUMENT_LABELS.ruler },
		{ id: 'protractor', icon: Compass, label: INSTRUMENT_LABELS.protractor },
		{ id: 'setSquare', icon: Triangle, label: INSTRUMENT_LABELS.setSquare }
	];

	/** Background style labels */
	const BACKGROUND_STYLE_LABELS: Record<BackgroundStyle, string> = {
		plain: 'Vierge',
		grid: 'Quadrillé',
		ruled: 'Ligné',
		dotted: 'Pointillé',
		triangular: 'Triangulaire',
		'triangular-dotted': 'Triangulaire pointillé',
		hexagonal: 'Hexagonal',
		'hexagonal-dotted': 'Hexagonal pointillé'
	};

	// ==========================================================================
	// Props
	// ==========================================================================

	interface Props {
		/** Current zoom level (1 = 100%) */
		zoomLevel?: number;
		/** Current zoom percentage for display */
		zoomPercent?: number;
		/** Callback to zoom in */
		onZoomIn?: () => void;
		/** Callback to zoom out */
		onZoomOut?: () => void;
		/** Callback to reset zoom to fit */
		onZoomToFit?: () => void;
		/** Whether fullscreen mode is active */
		isFullscreen?: boolean;
		/** Callback to toggle fullscreen */
		onToggleFullscreen?: () => void;
	}

	let {
		zoomLevel: _zoomLevel = 1,
		zoomPercent = 100,
		onZoomIn,
		onZoomOut,
		onZoomToFit,
		isFullscreen = false,
		onToggleFullscreen
	}: Props = $props();

	// ==========================================================================
	// State
	// ==========================================================================

	/** Popover open states */
	let shapesPopoverOpen = $state(false);
	let instrumentsPopoverOpen = $state(false);
	let pagePopoverOpen = $state(false);

	/** Responsive state - style section collapsed on tablet */
	let styleExpanded = $state(true);

	// ==========================================================================
	// Derived State
	// ==========================================================================

	let toolState = $derived(whiteboardStore.toolState);
	let currentColor = $derived(toolState.color);
	let currentStrokeWidth = $derived(toolState.strokeWidth);
	let currentOpacity = $derived(toolState.opacity);
	let currentStrokeStyle = $derived(toolState.strokeStyle);
	let currentCornerRadius = $derived(toolState.cornerRadius);
	let currentFillMode = $derived(toolState.fillMode);
	let currentFillColor = $derived(toolState.fillColor);
	let currentFillOpacity = $derived(toolState.fillOpacity);
	let currentRenderStyle = $derived(toolState.renderStyle);
	let currentRoughness = $derived(toolState.roughness);
	let currentSloppinessPreset = $derived(getSloppinessPreset(currentRenderStyle, currentRoughness));
	let instruments = $derived(whiteboardStore.instruments);

	/** Current shape tool icon for the button */
	let currentShapeTool = $derived(
		SHAPE_TOOLS.find((t) => t.id === toolState.toolType) || SHAPE_TOOLS[0]
	);

	/** Check if current tool is a shape tool */
	let isShapeToolActive = $derived(SHAPE_TOOLS.some((t) => t.id === toolState.toolType));

	/** Stroke tools (freehand drawing - always use perfect-freehand, no sketch mode) */
	const STROKE_TOOLS = ['pen', 'marker', 'highlighter', 'eraser'] as const;

	/** Check if current tool is a stroke tool (pen, marker, highlighter, eraser) */
	let isStrokeToolActive = $derived(STROKE_TOOLS.some((t) => t === toolState.toolType));

	/** Check if any shape is selected */
	let hasSelectedShape = $derived(
		whiteboardStore.selectedElements.some((el) => el.type === 'shape')
	);

	/** Show render style toggle only when relevant (shape tool active OR shape selected, NOT for stroke tools) */
	let showRenderStyleToggle = $derived(
		(isShapeToolActive || hasSelectedShape) && !isStrokeToolActive
	);

	/** Shape tools that support corner radius */
	const SHAPES_WITH_CORNERS = ['rectangle', 'pentagon', 'hexagon', 'star'] as const;

	/** Check if current shape tool supports corner radius */
	let isCornerRadiusToolActive = $derived(
		SHAPES_WITH_CORNERS.some((s) => s === toolState.toolType)
	);

	/** Check if selected shape supports corner radius */
	let hasSelectedShapeWithCorners = $derived(
		whiteboardStore.selectedElements.some(
			(el) =>
				el.type === 'shape' &&
				SHAPES_WITH_CORNERS.includes(el.shapeType as (typeof SHAPES_WITH_CORNERS)[number])
		)
	);

	/** Show corner radius slider when applicable shape tool active OR shape with corners is selected */
	let showCornerRadiusSlider = $derived(isCornerRadiusToolActive || hasSelectedShapeWithCorners);

	/** Shape tools that support fill (exclude line and arrow) */
	const SHAPES_WITH_FILL = ['rectangle', 'circle', 'pentagon', 'hexagon', 'star'] as const;

	/** Check if current shape tool supports fill */
	let isFillableToolActive = $derived(SHAPES_WITH_FILL.some((s) => s === toolState.toolType));

	/** Check if selected shape supports fill */
	let hasSelectedFillableShape = $derived(
		whiteboardStore.selectedElements.some(
			(el) =>
				el.type === 'shape' &&
				SHAPES_WITH_FILL.includes(el.shapeType as (typeof SHAPES_WITH_FILL)[number])
		)
	);

	/** Show fill selector when fillable shape tool active OR fillable shape is selected */
	let showFillSelector = $derived(isFillableToolActive || hasSelectedFillableShape);

	/** Check if arrow tool is active */
	let isArrowToolActive = $derived(toolState.toolType === 'arrow');

	/** Check if an arrow is selected */
	let hasSelectedArrow = $derived(
		whiteboardStore.selectedElements.some((el) => el.type === 'shape' && el.shapeType === 'arrow')
	);

	/** Show arrow type controls when arrow tool active OR arrow is selected */
	let showArrowTypeControls = $derived(isArrowToolActive || hasSelectedArrow);

	/** Current arrow type from toolbar/selection */
	let currentArrowType = $derived(toolState.arrowType);
	let currentElbowDirection = $derived(toolState.elbowDirection);

	/** Current page background style */
	let currentBackgroundStyle = $derived.by(() => {
		const page = whiteboardStore.currentPage;
		if (!page || page.background.type !== 'plain') return 'plain';
		return page.background.style;
	});

	/** Current page grid spacing */
	let currentGridSpacing = $derived.by(() => {
		const page = whiteboardStore.currentPage;
		if (!page || page.background.type !== 'plain') return 20;
		return page.background.gridSpacing ?? 20;
	});

	/** Current page grid opacity */
	let currentGridOpacity = $derived.by(() => {
		const page = whiteboardStore.currentPage;
		if (!page || page.background.type !== 'plain') return 0.3;
		return page.background.gridOpacity ?? 0.3;
	});

	/** Whether grid controls should be shown (not for plain style) */
	let showGridControls = $derived(currentBackgroundStyle !== 'plain');

	/** Current page format */
	let currentPageFormat = $derived.by(() => {
		const page = whiteboardStore.currentPage;
		if (!page) return 'A4';
		// Find matching format
		for (const [key, value] of Object.entries(PAGE_FORMATS)) {
			if (value.width === page.width && value.height === page.height) {
				return key as PageFormatKey;
			}
		}
		return null; // Custom dimensions
	});

	/** Current page dimensions for display */
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
		// Close the shape popover if open
		shapesPopoverOpen = false;
	}

	// Helper to extract value from Bits UI slider (handles both single and array)
	function getSliderValue(value: number[] | number): number | undefined {
		return Array.isArray(value) ? value[0] : value;
	}

	// Commit handler for all slider changes - pushes to history when drag ends
	function handleSliderCommit() {
		if (whiteboardStore.hasSelection) {
			whiteboardStore.commitLiveChanges();
		}
	}

	function handleStrokeWidthChange(value: number[] | number) {
		const actualValue = getSliderValue(value);
		if (actualValue === undefined) return;

		whiteboardStore.setStrokeWidth(actualValue);
		// Apply to selected elements (live mode for smooth preview)
		if (whiteboardStore.hasSelection) {
			whiteboardStore.updateSelectedStyles({ strokeWidth: actualValue }, true);
		}
	}

	function handleOpacityChange(value: number[] | number) {
		const actualValue = getSliderValue(value);
		if (actualValue === undefined) return;

		whiteboardStore.setOpacity(actualValue);
		// Apply to selected elements (live mode for smooth preview)
		if (whiteboardStore.hasSelection) {
			whiteboardStore.updateSelectedStyles({ opacity: actualValue }, true);
		}
	}

	function handleStrokeStyleChange(style: StrokeStyle) {
		whiteboardStore.setStrokeStyle(style);
		// Apply to selected shapes (not a slider, commit immediately)
		if (whiteboardStore.hasSelection) {
			whiteboardStore.updateSelectedStyles({ strokeStyle: style });
		}
	}

	function handleCornerRadiusChange(value: number[] | number) {
		const actualValue = getSliderValue(value);
		if (actualValue === undefined) return;

		whiteboardStore.setCornerRadius(actualValue);
		// Apply to selected shapes (live mode for smooth preview)
		if (whiteboardStore.hasSelection) {
			whiteboardStore.updateSelectedStyles({ cornerRadius: actualValue }, true);
		}
	}

	function handleFillModeChange(mode: FillMode) {
		whiteboardStore.setFillMode(mode);
		// Apply to selected shapes (not a slider, commit immediately)
		if (whiteboardStore.hasSelection) {
			whiteboardStore.updateSelectedStyles({ fillMode: mode });
		}
	}

	function handleFillOpacityChange(value: number[] | number) {
		const actualValue = getSliderValue(value);
		if (actualValue === undefined) return;

		whiteboardStore.setFillOpacity(actualValue);
		// Apply to selected shapes (live mode for smooth preview)
		if (whiteboardStore.hasSelection) {
			whiteboardStore.updateSelectedStyles({ fillOpacity: actualValue }, true);
		}
	}

	function handleFillColorChange(color: string) {
		whiteboardStore.setFillColor(color);
		// Apply to selected shapes if any
		if (whiteboardStore.hasSelection) {
			whiteboardStore.updateSelectedStyles({ fill: color });
		}
	}

	function handleArrowTypeChange(arrowType: ArrowType) {
		whiteboardStore.setArrowType(arrowType);
		// Apply to selected arrows if any
		if (whiteboardStore.hasSelection) {
			// Also sync elbowed for backwards compatibility
			const elbowed = arrowType === 'elbow';
			whiteboardStore.updateSelectedStyles({ arrowType, elbowed });
		}
	}

	function handleElbowDirectionChange(direction: ElbowDirection) {
		whiteboardStore.setElbowDirection(direction);
		// Apply to selected arrows if any
		if (whiteboardStore.hasSelection) {
			whiteboardStore.updateSelectedStyles({ elbowDirection: direction });
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
		// Only close popover for plain style, keep open for grids to allow adjustments
		if (style === 'plain') {
			backgroundPopoverOpen = false;
		}
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
		pageFormatPopoverOpen = false;
	}

	function handleInstrumentToggle(type: InstrumentType) {
		whiteboardStore.toggleInstrument(type);
	}

	function handleSloppinessPresetChange(preset: SloppinessPreset) {
		const { renderStyle, roughness } = SLOPPINESS_PRESETS[preset];
		whiteboardStore.setRenderStyle(renderStyle);
		whiteboardStore.setRoughness(roughness);
	}
</script>

<div class="whiteboard-toolbar border-t border-border bg-muted/95 backdrop-blur-sm">
	<div class="flex items-center justify-between gap-2 px-3 py-2">
		<!-- Left: Tool menus -->
		<div class="flex items-center gap-1">
			<!-- Select Tool -->
			<Button
				type="button"
				variant={toolState.toolType === 'select' ? 'default' : 'ghost'}
				size="sm"
				onclick={() => handleToolSelect('select')}
				title="Sélection (V)"
				aria-label="Outil de sélection"
				class={toolState.toolType === 'select' ? 'ring-2 ring-primary ring-offset-1' : ''}
			>
				<MousePointer2 class="h-4 w-4" />
			</Button>

			<!-- Pan Tool -->
			<Button
				type="button"
				variant={toolState.toolType === 'pan' ? 'default' : 'ghost'}
				size="sm"
				onclick={() => handleToolSelect('pan')}
				title="Déplacer la vue (Espace)"
				aria-label="Déplacer la vue"
				class={toolState.toolType === 'pan' ? 'ring-2 ring-primary ring-offset-1' : ''}
			>
				<Hand class="h-4 w-4" />
			</Button>

			<!-- Separator -->
			<div class="mx-1 h-6 w-px bg-border"></div>

			<!-- Pen Tool -->
			<Button
				type="button"
				variant={toolState.toolType === 'pen' ? 'default' : 'ghost'}
				size="sm"
				onclick={() => handleToolSelect('pen')}
				title="Stylo (P)"
				aria-label="Stylo"
				class={toolState.toolType === 'pen' ? 'ring-2 ring-primary ring-offset-1' : ''}
			>
				<Pen class="h-4 w-4" />
			</Button>

			<!-- Marker Tool -->
			<Button
				type="button"
				variant={toolState.toolType === 'marker' ? 'default' : 'ghost'}
				size="sm"
				onclick={() => handleToolSelect('marker')}
				title="Feutre (M)"
				aria-label="Feutre"
				class={toolState.toolType === 'marker' ? 'ring-2 ring-primary ring-offset-1' : ''}
			>
				<Pencil class="h-4 w-4" />
			</Button>

			<!-- Highlighter Tool -->
			<Button
				type="button"
				variant={toolState.toolType === 'highlighter' ? 'default' : 'ghost'}
				size="sm"
				onclick={() => handleToolSelect('highlighter')}
				title="Surligneur (H)"
				aria-label="Surligneur"
				class={toolState.toolType === 'highlighter' ? 'ring-2 ring-primary ring-offset-1' : ''}
			>
				<Highlighter class="h-4 w-4" />
			</Button>

			<!-- Separator -->
			<div class="mx-1 h-6 w-px bg-border"></div>

			<!-- Eraser Tool -->
			<Button
				type="button"
				variant={toolState.toolType === 'eraser' ? 'default' : 'ghost'}
				size="sm"
				onclick={() => handleToolSelect('eraser')}
				title="Gomme (E)"
				aria-label="Gomme"
				class={toolState.toolType === 'eraser' ? 'ring-2 ring-primary ring-offset-1' : ''}
			>
				<Eraser class="h-4 w-4" />
			</Button>

			<!-- Text Tool -->
			<Button
				type="button"
				variant={toolState.toolType === 'text' ? 'default' : 'ghost'}
				size="sm"
				onclick={() => handleToolSelect('text')}
				title="Texte (T)"
				aria-label="Texte"
				class={toolState.toolType === 'text' ? 'ring-2 ring-primary ring-offset-1' : ''}
			>
				<Type class="h-4 w-4" />
			</Button>

			<!-- Separator -->
			<div class="mx-1 h-6 w-px bg-border"></div>

			<!-- Shape Tools Popover -->
			<Popover.Root bind:open={shapesPopoverOpen}>
				<Popover.Trigger>
					{#snippet child({ props })}
						<button
							{...props}
							type="button"
							class="flex h-9 items-center gap-1.5 rounded-md px-2 text-sm transition-colors {isShapeToolActive
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
							class="flex h-9 items-center gap-1.5 rounded-md px-2 text-sm transition-colors hover:bg-accent"
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

			<!-- Page Settings Popover (Background + Format) -->
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
									: `${currentPageDimensions.width}×${currentPageDimensions.height}`}
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

			<!-- Sloppiness presets for shapes (Architect/Artist/Cartoonist) -->
			{#if showRenderStyleToggle}
				<div class="mx-2 h-6 w-px bg-border"></div>

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

			<!-- Separator before style section -->
			<div class="mx-2 h-6 w-px bg-border"></div>

			<!-- Style toggle button (visible on tablet only) -->
			<button
				type="button"
				onclick={() => (styleExpanded = !styleExpanded)}
				class="flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-accent md:hidden"
				class:bg-secondary={styleExpanded}
				title={styleExpanded ? 'Masquer les styles' : 'Afficher les styles'}
				aria-label={styleExpanded ? 'Masquer les styles' : 'Afficher les styles'}
				aria-expanded={styleExpanded}
			>
				<Palette class="h-4 w-4" />
			</button>

			<!-- Inline Style Section (hidden on tablet when collapsed, always visible on desktop) -->
			<div
				class="items-center gap-2 {styleExpanded ? 'flex' : 'hidden'} md:flex"
				role="group"
				aria-label="Styles de dessin"
			>
				<!-- Color swatches -->
				<div class="flex items-center gap-0.5">
					{#each COLOR_PRESETS as color (color.value)}
						<button
							type="button"
							onclick={() => {
								whiteboardStore.setColor(color.value);
								if (whiteboardStore.hasSelection) {
									whiteboardStore.updateSelectedStyles({ color: color.value });
								}
							}}
							class="h-6 w-6 rounded-sm border transition-transform hover:scale-110 {currentColor ===
							color.value
								? 'border-primary ring-1 ring-primary'
								: 'border-border'}"
							style="background-color: {color.value}"
							title={color.name}
							aria-label="{color.name}{currentColor === color.value ? ' (actif)' : ''}"
						></button>
					{/each}
					<input
						type="color"
						value={currentColor}
						oninput={(e) => {
							whiteboardStore.setColor(e.currentTarget.value);
							if (whiteboardStore.hasSelection) {
								whiteboardStore.updateSelectedStyles({ color: e.currentTarget.value });
							}
						}}
						class="ml-0.5 h-6 w-6 cursor-pointer rounded-sm border-0 p-0"
						title="Couleur personnalisee"
						aria-label="Couleur personnalisee"
					/>
				</div>

				<div class="h-6 w-px bg-border"></div>

				<!-- Stroke width slider -->
				<div class="flex w-24 items-center gap-1">
					<Slider
						type="single"
						value={[currentStrokeWidth]}
						onValueChange={handleStrokeWidthChange}
						onValueCommit={handleSliderCommit}
						min={STROKE_WIDTH_MIN}
						max={STROKE_WIDTH_MAX}
						step={1}
						class="flex-1"
						aria-label="Epaisseur: {currentStrokeWidth}px"
					/>
					<span class="w-6 text-right text-[10px] text-muted-foreground">{currentStrokeWidth}</span>
				</div>

				<!-- Stroke style toggles (only for shapes) -->
				{#if showRenderStyleToggle}
					<div class="flex items-center gap-0.5">
						{#each Object.entries(STROKE_STYLE_LABELS) as [style, _label] (style)}
							<button
								type="button"
								onclick={() => handleStrokeStyleChange(style as StrokeStyle)}
								class="flex h-7 w-7 items-center justify-center rounded-sm transition-colors {currentStrokeStyle ===
								style
									? 'bg-secondary'
									: 'hover:bg-accent'}"
								title={_label}
								aria-label={_label}
							>
								<svg class="h-5 w-5" viewBox="0 0 20 10">
									<line
										x1="2"
										y1="5"
										x2="18"
										y2="5"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-dasharray={style === 'solid'
											? undefined
											: style === 'dashed'
												? '4 2'
												: '1 2'}
									/>
								</svg>
							</button>
						{/each}
					</div>
				{/if}

				<!-- Opacity (compact) -->
				<div class="flex w-16 items-center gap-1">
					<Slider
						type="single"
						value={[currentOpacity]}
						onValueChange={handleOpacityChange}
						onValueCommit={handleSliderCommit}
						min={0.1}
						max={1}
						step={0.1}
						class="flex-1"
						aria-label="Opacite: {Math.round(currentOpacity * 100)}%"
					/>
					<span class="w-6 text-right text-[10px] text-muted-foreground"
						>{Math.round(currentOpacity * 100)}%</span
					>
				</div>

				<!-- Fill popover (conditional) -->
				{#if showFillSelector}
					<Popover.Root>
						<Popover.Trigger>
							{#snippet child({ props })}
								<button
									{...props}
									type="button"
									class="flex h-7 w-7 items-center justify-center rounded-sm border border-border transition-colors hover:bg-accent"
									title="Remplissage"
									aria-label="Remplissage"
								>
									<svg class="h-4 w-4" viewBox="0 0 16 16">
										{#if currentFillMode === 'none'}
											<rect
												x="2"
												y="2"
												width="12"
												height="12"
												rx="1"
												fill="none"
												stroke="currentColor"
												stroke-width="1.5"
											/>
										{:else if currentFillMode === 'solid'}
											<rect
												x="2"
												y="2"
												width="12"
												height="12"
												rx="1"
												fill={currentFillColor}
												stroke="currentColor"
												stroke-width="1"
												opacity={currentFillOpacity}
											/>
										{:else}
											<defs>
												<pattern
													id="inline-hatch"
													patternUnits="userSpaceOnUse"
													width="3"
													height="3"
													patternTransform="rotate(45)"
												>
													<line
														x1="0"
														y1="0"
														x2="0"
														y2="3"
														stroke={currentFillColor}
														stroke-width="1"
													/>
												</pattern>
											</defs>
											<rect
												x="2"
												y="2"
												width="12"
												height="12"
												rx="1"
												fill="url(#inline-hatch)"
												stroke="currentColor"
												stroke-width="1"
												opacity={currentFillOpacity}
											/>
										{/if}
									</svg>
								</button>
							{/snippet}
						</Popover.Trigger>
						<Popover.Content class="w-48 p-3" side="top" align="start">
							<div class="flex flex-col gap-3">
								<div>
									<span class="mb-1.5 block text-xs font-medium text-muted-foreground">Mode</span>
									<div class="flex gap-1">
										{#each Object.entries(FILL_MODE_LABELS) as [mode, label] (mode)}
											<button
												type="button"
												onclick={() => handleFillModeChange(mode as FillMode)}
												class="flex h-8 flex-1 items-center justify-center rounded-md border text-xs transition-colors {currentFillMode ===
												mode
													? 'border-primary bg-secondary'
													: 'border-border hover:bg-accent'}"
												title={label}
											>
												{label}
											</button>
										{/each}
									</div>
								</div>
								{#if currentFillMode !== 'none'}
									<div>
										<span class="mb-1.5 block text-xs font-medium text-muted-foreground"
											>Couleur</span
										>
										<div class="flex items-center gap-1">
											{#each COLOR_PRESETS as color (color.value)}
												<button
													type="button"
													onclick={() => handleFillColorChange(color.value)}
													class="h-5 w-5 rounded-sm border transition-transform hover:scale-110 {currentFillColor ===
													color.value
														? 'border-primary ring-1 ring-primary'
														: 'border-border'}"
													style="background-color: {color.value}"
													title={color.name}
												></button>
											{/each}
										</div>
									</div>
									<div>
										<span class="mb-1.5 block text-xs font-medium text-muted-foreground"
											>Opacite</span
										>
										<div class="flex items-center gap-2">
											<Slider
												type="single"
												value={[currentFillOpacity]}
												onValueChange={handleFillOpacityChange}
												onValueCommit={handleSliderCommit}
												min={0.1}
												max={1}
												step={0.1}
												class="flex-1"
											/>
											<span class="w-8 text-right text-xs text-muted-foreground"
												>{Math.round(currentFillOpacity * 100)}%</span
											>
										</div>
									</div>
								{/if}
							</div>
						</Popover.Content>
					</Popover.Root>
				{/if}

				<!-- Corner radius toggle (for shapes with corners) -->
				{#if showCornerRadiusSlider}
					<div class="flex items-center gap-0.5 rounded-md border border-border p-0.5">
						<button
							type="button"
							onclick={() => handleCornerRadiusChange(0)}
							class="flex h-7 w-7 items-center justify-center rounded-sm transition-colors {currentCornerRadius ===
							0
								? 'bg-secondary'
								: 'hover:bg-accent'}"
							title="Angles vifs"
							aria-label="Angles vifs"
						>
							<svg class="h-4 w-4" viewBox="0 0 16 16">
								<rect
									x="2"
									y="2"
									width="12"
									height="12"
									fill="none"
									stroke="currentColor"
									stroke-width="1.5"
								/>
							</svg>
						</button>
						<button
							type="button"
							onclick={() => handleCornerRadiusChange(16)}
							class="flex h-7 w-7 items-center justify-center rounded-sm transition-colors {currentCornerRadius >
							0
								? 'bg-secondary'
								: 'hover:bg-accent'}"
							title="Angles arrondis"
							aria-label="Angles arrondis"
						>
							<svg class="h-4 w-4" viewBox="0 0 16 16">
								<rect
									x="2"
									y="2"
									width="12"
									height="12"
									rx="3"
									fill="none"
									stroke="currentColor"
									stroke-width="1.5"
								/>
							</svg>
						</button>
					</div>
				{/if}

				<!-- Arrow Type Controls (conditional) -->
				{#if showArrowTypeControls}
					<div class="flex items-center gap-2 border-l border-border pl-2">
						<span class="text-xs text-muted-foreground">Type:</span>
						<select
							value={currentArrowType}
							onchange={(e) =>
								handleArrowTypeChange((e.target as HTMLSelectElement).value as ArrowType)}
							class="h-7 rounded-md border border-border bg-background px-1.5 text-xs"
						>
							{#each Object.entries(ARROW_TYPE_LABELS) as [value, label] (value)}
								<option {value}>{label}</option>
							{/each}
						</select>
						{#if currentArrowType === 'elbow'}
							<select
								value={currentElbowDirection}
								onchange={(e) =>
									handleElbowDirectionChange(
										(e.target as HTMLSelectElement).value as ElbowDirection
									)}
								class="h-7 rounded-md border border-border bg-background px-1.5 text-xs"
							>
								{#each Object.entries(ELBOW_DIRECTION_LABELS) as [value, label] (value)}
									<option {value}>{label}</option>
								{/each}
							</select>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Separator before actions -->
			<div class="mx-2 h-6 w-px bg-border"></div>

			<!-- Zoom Controls -->
			<div class="flex items-center gap-1">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onclick={onZoomOut}
					title="Zoom arrière (Ctrl+-)"
					aria-label="Zoom arrière"
				>
					<ZoomOut class="h-4 w-4" />
				</Button>
				<button
					type="button"
					onclick={onZoomToFit}
					class="min-w-[3.5rem] rounded-md px-2 py-1 text-xs font-medium hover:bg-accent"
					title="Ajuster à la fenêtre (Ctrl+0)"
					aria-label="Zoom: {zoomPercent}%"
				>
					{zoomPercent}%
				</button>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onclick={onZoomIn}
					title="Zoom avant (Ctrl++)"
					aria-label="Zoom avant"
				>
					<ZoomIn class="h-4 w-4" />
				</Button>
			</div>
		</div>

		<!-- Right: Actions -->
		<div class="flex items-center gap-1">
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onclick={onToggleFullscreen}
				title={isFullscreen ? 'Quitter le plein écran (Echap)' : 'Plein écran'}
				aria-label={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
			>
				{#if isFullscreen}
					<Minimize2 class="h-4 w-4" />
				{:else}
					<Maximize2 class="h-4 w-4" />
				{/if}
			</Button>
		</div>
	</div>
</div>

<style>
	.whiteboard-toolbar {
		user-select: none;
	}
</style>

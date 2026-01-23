<script lang="ts">
	/**
	 * StylePanel - Collapsible side panel with style controls
	 *
	 * Positioned on the left side of the canvas, contains:
	 * - Color picker (stroke color)
	 * - Stroke width slider
	 * - Stroke style (solid/dashed/dotted) for shapes
	 * - Opacity slider
	 * - Fill options (mode, color, opacity) for fillable shapes
	 * - Corner radius for rectangles/polygons
	 * - Arrow options (type, direction, arrowheads)
	 *
	 * Responsive behavior:
	 * - Desktop (>=1024px): Panel open by default
	 * - Tablet (<1024px): Panel closed by default
	 */

	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { whiteboardStore } from '../stores/whiteboard.svelte';
	import { Slider } from '$lib/components/ui/slider';
	import ColorPicker from './toolbar/ColorPicker.svelte';
	import StyleSection from './toolbar/StyleSection.svelte';
	import { ChevronLeft, ChevronRight } from 'lucide-svelte';
	import {
		STROKE_STYLE_LABELS,
		FILL_MODE_LABELS,
		ELBOW_DIRECTION_LABELS,
		ARROW_TYPE_LABELS,
		ARROWHEAD_LABELS,
		type StrokeStyle,
		type FillMode,
		type ElbowDirection,
		type ArrowType,
		type Arrowhead
	} from '../types/document';

	// ==========================================================================
	// Constants
	// ==========================================================================

	const STROKE_WIDTH_MIN = 1;
	const STROKE_WIDTH_MAX = 20;

	const STROKE_TOOLS = ['pen', 'marker', 'highlighter', 'eraser'] as const;
	const SHAPES_WITH_CORNERS = ['rectangle', 'pentagon', 'hexagon', 'star'] as const;
	const SHAPES_WITH_FILL = ['rectangle', 'circle', 'pentagon', 'hexagon', 'star'] as const;
	const SHAPE_TOOLS = [
		'line',
		'rectangle',
		'circle',
		'arrow',
		'pentagon',
		'hexagon',
		'star'
	] as const;

	// ==========================================================================
	// Props
	// ==========================================================================

	interface Props {
		class?: string;
	}

	let { class: className = '' }: Props = $props();

	// ==========================================================================
	// Constants
	// ==========================================================================

	const TABLET_BREAKPOINT = 1024;

	// ==========================================================================
	// State
	// ==========================================================================

	// Default to true, will be updated on mount based on screen size
	let isOpen = $state(true);

	// ==========================================================================
	// Lifecycle
	// ==========================================================================

	onMount(() => {
		if (browser) {
			// Close panel by default on tablet/mobile
			isOpen = window.innerWidth >= TABLET_BREAKPOINT;
		}
	});

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
	let currentArrowType = $derived(toolState.arrowType);
	let currentElbowDirection = $derived(toolState.elbowDirection);
	let currentStartArrowhead = $derived(toolState.startArrowhead);
	let currentEndArrowhead = $derived(toolState.endArrowhead);

	let isShapeToolActive = $derived(SHAPE_TOOLS.some((t) => t === toolState.toolType));
	let isStrokeToolActive = $derived(STROKE_TOOLS.some((t) => t === toolState.toolType));

	let hasSelectedShape = $derived(
		whiteboardStore.selectedElements.some((el) => el.type === 'shape')
	);

	// Show stroke style controls only for shapes (not freehand strokes)
	let showStrokeStyleControls = $derived(
		(isShapeToolActive || hasSelectedShape) && !isStrokeToolActive
	);

	// Corner radius
	let isCornerRadiusToolActive = $derived(
		SHAPES_WITH_CORNERS.some((s) => s === toolState.toolType)
	);
	let hasSelectedShapeWithCorners = $derived(
		whiteboardStore.selectedElements.some(
			(el) =>
				el.type === 'shape' &&
				SHAPES_WITH_CORNERS.includes(el.shapeType as (typeof SHAPES_WITH_CORNERS)[number])
		)
	);
	let showCornerRadiusControls = $derived(isCornerRadiusToolActive || hasSelectedShapeWithCorners);

	// Fill options
	let isFillableToolActive = $derived(SHAPES_WITH_FILL.some((s) => s === toolState.toolType));
	let hasSelectedFillableShape = $derived(
		whiteboardStore.selectedElements.some(
			(el) =>
				el.type === 'shape' &&
				SHAPES_WITH_FILL.includes(el.shapeType as (typeof SHAPES_WITH_FILL)[number])
		)
	);
	let showFillControls = $derived(isFillableToolActive || hasSelectedFillableShape);

	// Arrow options
	let isArrowToolActive = $derived(toolState.toolType === 'arrow');
	let hasSelectedArrow = $derived(
		whiteboardStore.selectedElements.some((el) => el.type === 'shape' && el.shapeType === 'arrow')
	);
	let showArrowControls = $derived(isArrowToolActive || hasSelectedArrow);

	// ==========================================================================
	// Handlers
	// ==========================================================================

	function getSliderValue(value: number[] | number): number | undefined {
		return Array.isArray(value) ? value[0] : value;
	}

	function handleSliderCommit() {
		if (whiteboardStore.hasSelection) {
			whiteboardStore.commitLiveChanges();
		}
	}

	function handleColorChange(color: string) {
		whiteboardStore.setColor(color);
		if (whiteboardStore.hasSelection) {
			whiteboardStore.updateSelectedStyles({ color });
		}
	}

	function handleStrokeWidthChange(value: number[] | number) {
		const actualValue = getSliderValue(value);
		if (actualValue === undefined) return;

		whiteboardStore.setStrokeWidth(actualValue);
		if (whiteboardStore.hasSelection) {
			whiteboardStore.updateSelectedStyles({ strokeWidth: actualValue }, true);
		}
	}

	function handleOpacityChange(value: number[] | number) {
		const actualValue = getSliderValue(value);
		if (actualValue === undefined) return;

		whiteboardStore.setOpacity(actualValue);
		if (whiteboardStore.hasSelection) {
			whiteboardStore.updateSelectedStyles({ opacity: actualValue }, true);
		}
	}

	function handleStrokeStyleChange(style: StrokeStyle) {
		whiteboardStore.setStrokeStyle(style);
		if (whiteboardStore.hasSelection) {
			whiteboardStore.updateSelectedStyles({ strokeStyle: style });
		}
	}

	function handleCornerRadiusChange(value: number) {
		whiteboardStore.setCornerRadius(value);
		if (whiteboardStore.hasSelection) {
			whiteboardStore.updateSelectedStyles({ cornerRadius: value });
		}
	}

	function handleFillModeChange(mode: FillMode) {
		whiteboardStore.setFillMode(mode);
		if (whiteboardStore.hasSelection) {
			whiteboardStore.updateSelectedStyles({ fillMode: mode });
		}
	}

	function handleFillColorChange(color: string) {
		whiteboardStore.setFillColor(color);
		if (whiteboardStore.hasSelection) {
			whiteboardStore.updateSelectedStyles({ fill: color });
		}
	}

	function handleFillOpacityChange(value: number[] | number) {
		const actualValue = getSliderValue(value);
		if (actualValue === undefined) return;

		whiteboardStore.setFillOpacity(actualValue);
		if (whiteboardStore.hasSelection) {
			whiteboardStore.updateSelectedStyles({ fillOpacity: actualValue }, true);
		}
	}

	function handleArrowTypeChange(arrowType: ArrowType) {
		whiteboardStore.setArrowType(arrowType);
		if (whiteboardStore.hasSelection) {
			const elbowed = arrowType === 'elbow';
			whiteboardStore.updateSelectedStyles({ arrowType, elbowed });
		}
	}

	function handleElbowDirectionChange(direction: ElbowDirection) {
		whiteboardStore.setElbowDirection(direction);
		if (whiteboardStore.hasSelection) {
			whiteboardStore.updateSelectedStyles({ elbowDirection: direction });
		}
	}

	function handleStartArrowheadChange(arrowhead: Arrowhead | null) {
		whiteboardStore.setStartArrowhead(arrowhead);
		if (whiteboardStore.hasSelection) {
			whiteboardStore.updateSelectedStyles({ startArrowhead: arrowhead });
		}
	}

	function handleEndArrowheadChange(arrowhead: Arrowhead) {
		whiteboardStore.setEndArrowhead(arrowhead);
		if (whiteboardStore.hasSelection) {
			whiteboardStore.updateSelectedStyles({ endArrowhead: arrowhead });
		}
	}

	function toggle() {
		isOpen = !isOpen;
	}
</script>

<aside
	class="style-panel absolute top-14 left-14 z-40 rounded-xl border border-border bg-background/95 shadow-lg backdrop-blur-sm transition-all duration-200 {className}"
	class:w-52={isOpen}
	class:w-10={!isOpen}
>
	<!-- Toggle button -->
	<button
		type="button"
		onclick={toggle}
		class="absolute top-3 -right-3 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background shadow-sm transition-colors hover:bg-accent"
		aria-label={isOpen ? 'Replier le panneau' : 'Deployer le panneau'}
		aria-expanded={isOpen}
	>
		{#if isOpen}
			<ChevronLeft class="h-3.5 w-3.5" />
		{:else}
			<ChevronRight class="h-3.5 w-3.5" />
		{/if}
	</button>

	{#if isOpen}
		<div class="max-h-[calc(100vh-200px)] overflow-y-auto p-3">
			<!-- Color Section -->
			<StyleSection title="Couleur" defaultOpen collapsible={false}>
				<ColorPicker value={currentColor} onchange={handleColorChange} />
			</StyleSection>

			<!-- Stroke Width Section -->
			<StyleSection title="Epaisseur" defaultOpen>
				<div class="flex items-center gap-2">
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
					<span class="w-8 text-right text-xs text-muted-foreground">{currentStrokeWidth}px</span>
				</div>
			</StyleSection>

			<!-- Stroke Style Section (shapes only) -->
			{#if showStrokeStyleControls}
				<StyleSection title="Style trait" defaultOpen>
					<div class="flex items-center gap-1">
						{#each Object.entries(STROKE_STYLE_LABELS) as [style, label] (style)}
							<button
								type="button"
								onclick={() => handleStrokeStyleChange(style as StrokeStyle)}
								class="flex h-8 flex-1 items-center justify-center rounded-md border transition-colors {currentStrokeStyle ===
								style
									? 'border-primary bg-secondary'
									: 'border-border hover:bg-accent'}"
								title={label}
								aria-label={label}
							>
								<svg class="h-5 w-10" viewBox="0 0 40 10">
									<line
										x1="4"
										y1="5"
										x2="36"
										y2="5"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-dasharray={style === 'solid'
											? undefined
											: style === 'dashed'
												? '6 3'
												: '2 3'}
									/>
								</svg>
							</button>
						{/each}
					</div>
				</StyleSection>
			{/if}

			<!-- Opacity Section -->
			<StyleSection title="Opacite" defaultOpen>
				<div class="flex items-center gap-2">
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
					<span class="w-8 text-right text-xs text-muted-foreground"
						>{Math.round(currentOpacity * 100)}%</span
					>
				</div>
			</StyleSection>

			<!-- Fill Section (fillable shapes only) -->
			{#if showFillControls}
				<StyleSection title="Remplissage">
					<div class="flex flex-col gap-3">
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
						{#if currentFillMode !== 'none'}
							<div>
								<span class="mb-1.5 block text-xs text-muted-foreground">Couleur</span>
								<ColorPicker value={currentFillColor} onchange={handleFillColorChange} size="sm" />
							</div>
							<div>
								<span class="mb-1.5 block text-xs text-muted-foreground">Opacite</span>
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
				</StyleSection>
			{/if}

			<!-- Corner Radius Section (shapes with corners only) -->
			{#if showCornerRadiusControls}
				<StyleSection title="Coins">
					<div class="flex items-center gap-1">
						<button
							type="button"
							onclick={() => handleCornerRadiusChange(0)}
							class="flex h-8 flex-1 items-center justify-center rounded-md border transition-colors {currentCornerRadius ===
							0
								? 'border-primary bg-secondary'
								: 'border-border hover:bg-accent'}"
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
							onclick={() => handleCornerRadiusChange(32)}
							class="flex h-8 flex-1 items-center justify-center rounded-md border transition-colors {currentCornerRadius >
							0
								? 'border-primary bg-secondary'
								: 'border-border hover:bg-accent'}"
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
				</StyleSection>
			{/if}

			<!-- Arrow Options Section (arrows only) -->
			{#if showArrowControls}
				<StyleSection title="Fleche">
					<div class="flex flex-col gap-3">
						<!-- Arrow type -->
						<div>
							<span class="mb-1.5 block text-xs text-muted-foreground">Type</span>
							<select
								value={currentArrowType}
								onchange={(e) =>
									handleArrowTypeChange((e.target as HTMLSelectElement).value as ArrowType)}
								class="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
							>
								{#each Object.entries(ARROW_TYPE_LABELS) as [value, label] (value)}
									<option {value}>{label}</option>
								{/each}
							</select>
						</div>

						<!-- Elbow direction (only for elbow type) -->
						{#if currentArrowType === 'elbow'}
							<div>
								<span class="mb-1.5 block text-xs text-muted-foreground">Direction coude</span>
								<select
									value={currentElbowDirection}
									onchange={(e) =>
										handleElbowDirectionChange(
											(e.target as HTMLSelectElement).value as ElbowDirection
										)}
									class="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
								>
									{#each Object.entries(ELBOW_DIRECTION_LABELS) as [value, label] (value)}
										<option {value}>{label}</option>
									{/each}
								</select>
							</div>
						{/if}

						<!-- Arrowheads -->
						<div>
							<span class="mb-1.5 block text-xs text-muted-foreground">Pointes</span>
							<div class="flex items-center gap-2">
								<select
									value={currentStartArrowhead ?? 'none'}
									onchange={(e) => {
										const value = (e.target as HTMLSelectElement).value;
										handleStartArrowheadChange(value === 'none' ? null : (value as Arrowhead));
									}}
									class="h-8 flex-1 rounded-md border border-border bg-background px-2 text-xs"
									title="Pointe debut"
								>
									{#each Object.entries(ARROWHEAD_LABELS) as [value, label] (value)}
										<option {value}>{label}</option>
									{/each}
								</select>
								<span class="text-xs text-muted-foreground">→</span>
								<select
									value={currentEndArrowhead ?? 'arrow'}
									onchange={(e) =>
										handleEndArrowheadChange((e.target as HTMLSelectElement).value as Arrowhead)}
									class="h-8 flex-1 rounded-md border border-border bg-background px-2 text-xs"
									title="Pointe fin"
								>
									{#each Object.entries(ARROWHEAD_LABELS) as [value, label] (value)}
										<option {value}>{label}</option>
									{/each}
								</select>
							</div>
						</div>
					</div>
				</StyleSection>
			{/if}
		</div>
	{/if}
</aside>

<style>
	.style-panel {
		user-select: none;
	}

	/* Tablet: larger touch targets */
	@media (max-width: 1023px) {
		.style-panel :global(button) {
			min-height: 44px;
		}

		.style-panel :global(select) {
			min-height: 44px;
		}
	}

	/* Mobile: hide panel completely (use bottom sheet instead - future) */
	@media (max-width: 767px) {
		.style-panel {
			display: none;
		}
	}
</style>

<script lang="ts">
	/**
	 * AnnotationToolbar - Floating toolbar for annotation tools
	 *
	 * Provides tool selection, color picker, stroke width, and stamp palette
	 * for the annotation layer.
	 */

	import { whiteboardStore } from '../stores/whiteboard.svelte';
	import { Button } from '$lib/components/ui/button';
	import {
		Pen,
		Highlighter,
		Eraser,
		Minus,
		Square,
		Circle,
		ArrowRight,
		Stamp,
		X,
		Eye,
		EyeOff,
		Trash2,
		MousePointer2,
		Undo2,
		Redo2,
		Paintbrush
	} from 'lucide-svelte';
	import type { FillMode, StrokeStyle } from '../types/document';
	import type { AnnotationToolType, StampType } from '../types/document';
	import { STAMP_CATEGORIES, STAMP_CATEGORY_LABELS } from '../types/document';

	// ==========================================================================
	// Constants
	// ==========================================================================

	const COLORS = [
		'#ef4444', // Red
		'#f97316', // Orange
		'#eab308', // Yellow
		'#22c55e', // Green
		'#3b82f6', // Blue
		'#8b5cf6', // Purple
		'#ec4899', // Pink
		'#000000', // Black
		'#6b7280', // Gray
		'#ffffff' // White
	];

	const STROKE_WIDTHS = [
		{ label: 'Fin', value: 2 },
		{ label: 'Moyen', value: 4 },
		{ label: 'Épais', value: 8 }
	];

	const STROKE_STYLES: { label: string; value: StrokeStyle }[] = [
		{ label: 'Continu', value: 'solid' },
		{ label: 'Tirets', value: 'dashed' }
	];

	const FILL_COLORS = [
		{ label: 'Aucun', value: null },
		'#fecaca', // Red light
		'#fed7aa', // Orange light
		'#fef08a', // Yellow light
		'#bbf7d0', // Green light
		'#bfdbfe', // Blue light
		'#ddd6fe', // Purple light
		'#fbcfe8', // Pink light
		'#ffffff' // White
	];

	// ==========================================================================
	// State
	// ==========================================================================

	let showStampPalette = $state(false);
	let showColorPicker = $state(false);
	let showFillPicker = $state(false);

	// ==========================================================================
	// Derived State
	// ==========================================================================

	let isAnnotationMode = $derived(whiteboardStore.isAnnotationMode);
	let currentTool = $derived(whiteboardStore.annotationTool);
	let annotationStyle = $derived(whiteboardStore.annotationStyle);
	let annotationsVisible = $derived(whiteboardStore.document?.annotationsVisible ?? true);
	let canUndo = $derived(whiteboardStore.canUndoAnnotation);
	let canRedo = $derived(whiteboardStore.canRedoAnnotation);

	// ==========================================================================
	// Handlers
	// ==========================================================================

	function selectTool(tool: AnnotationToolType) {
		whiteboardStore.setAnnotationTool(tool);
		showStampPalette = false;
		showColorPicker = false;
	}

	function selectColor(color: string) {
		whiteboardStore.setAnnotationStyleProperty('color', color);
		showColorPicker = false;
	}

	function selectStrokeWidth(width: number) {
		whiteboardStore.setAnnotationStyleProperty('strokeWidth', width);
	}

	function selectStrokeStyle(style: StrokeStyle) {
		whiteboardStore.setAnnotationStyleProperty('strokeStyle', style);
	}

	function selectFillColor(color: string | null) {
		if (color === null) {
			whiteboardStore.setAnnotationStyleProperty('fillMode', 'none' as FillMode);
		} else {
			whiteboardStore.setAnnotationStyleProperty('fillMode', 'solid' as FillMode);
			whiteboardStore.setAnnotationStyleProperty('fill', color);
		}
		showFillPicker = false;
	}

	function handleUndo() {
		whiteboardStore.undoAnnotation();
	}

	function handleRedo() {
		whiteboardStore.redoAnnotation();
	}

	function selectStamp(stamp: StampType) {
		whiteboardStore.setAnnotationStyleProperty('stampType', stamp);
		whiteboardStore.setAnnotationTool('annotation-stamp');
		showStampPalette = false;
	}

	function toggleVisibility() {
		whiteboardStore.toggleAnnotationsVisible();
	}

	function clearAllAnnotations() {
		if (confirm('Effacer toutes les annotations de cette page ?')) {
			whiteboardStore.clearAnnotations();
		}
	}

	function exitAnnotationMode() {
		whiteboardStore.exitAnnotationMode();
	}

	function isToolActive(tool: AnnotationToolType): boolean {
		return currentTool === tool;
	}
</script>

{#if isAnnotationMode}
	<div class="annotation-toolbar">
		<!-- Tool buttons -->
		<div class="toolbar-section">
			<Button
				variant={isToolActive('annotation-select') ? 'default' : 'ghost'}
				size="sm"
				class="toolbar-btn"
				onclick={() => selectTool('annotation-select')}
				title="Sélection (V)"
			>
				<MousePointer2 class="h-4 w-4" />
			</Button>

			<div class="separator"></div>

			<Button
				variant={isToolActive('annotation-pen') ? 'default' : 'ghost'}
				size="sm"
				class="toolbar-btn"
				onclick={() => selectTool('annotation-pen')}
				title="Stylo (P)"
			>
				<Pen class="h-4 w-4" />
			</Button>

			<Button
				variant={isToolActive('annotation-marker') ? 'default' : 'ghost'}
				size="sm"
				class="toolbar-btn"
				onclick={() => selectTool('annotation-marker')}
				title="Marqueur (M)"
			>
				<svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
					<path
						d="M3 17v4h4l11-11-4-4L3 17zm18.7-11.3l-2.4-2.4c-.4-.4-1-.4-1.4 0L16 5.2l4 4 1.9-1.9c.4-.4.4-1 0-1.4z"
					/>
				</svg>
			</Button>

			<Button
				variant={isToolActive('annotation-highlighter') ? 'default' : 'ghost'}
				size="sm"
				class="toolbar-btn"
				onclick={() => selectTool('annotation-highlighter')}
				title="Surligneur (H)"
			>
				<Highlighter class="h-4 w-4" />
			</Button>

			<Button
				variant={isToolActive('annotation-eraser') ? 'default' : 'ghost'}
				size="sm"
				class="toolbar-btn"
				onclick={() => selectTool('annotation-eraser')}
				title="Gomme (E)"
			>
				<Eraser class="h-4 w-4" />
			</Button>

			<div class="separator"></div>

			<Button
				variant={isToolActive('annotation-line') ? 'default' : 'ghost'}
				size="sm"
				class="toolbar-btn"
				onclick={() => selectTool('annotation-line')}
				title="Ligne (L)"
			>
				<Minus class="h-4 w-4" />
			</Button>

			<Button
				variant={isToolActive('annotation-rectangle') ? 'default' : 'ghost'}
				size="sm"
				class="toolbar-btn"
				onclick={() => selectTool('annotation-rectangle')}
				title="Rectangle (R)"
			>
				<Square class="h-4 w-4" />
			</Button>

			<Button
				variant={isToolActive('annotation-circle') ? 'default' : 'ghost'}
				size="sm"
				class="toolbar-btn"
				onclick={() => selectTool('annotation-circle')}
				title="Cercle (C)"
			>
				<Circle class="h-4 w-4" />
			</Button>

			<Button
				variant={isToolActive('annotation-arrow') ? 'default' : 'ghost'}
				size="sm"
				class="toolbar-btn"
				onclick={() => selectTool('annotation-arrow')}
				title="Flèche (A)"
			>
				<ArrowRight class="h-4 w-4" />
			</Button>

			<div class="separator"></div>

			<!-- Stamp button with palette -->
			<div class="relative">
				<Button
					variant={isToolActive('annotation-stamp') ? 'default' : 'ghost'}
					size="sm"
					class="toolbar-btn"
					onclick={() => {
						showStampPalette = !showStampPalette;
						showColorPicker = false;
					}}
					title="Tampons (T)"
				>
					<Stamp class="h-4 w-4" />
				</Button>

				{#if showStampPalette}
					<div class="stamp-palette">
						{#each Object.entries(STAMP_CATEGORIES) as [category, stamps] (category)}
							<div class="stamp-category">
								<span class="stamp-category-label"
									>{STAMP_CATEGORY_LABELS[category as keyof typeof STAMP_CATEGORY_LABELS]}</span
								>
								<div class="stamp-grid">
									{#each stamps as stamp (stamp)}
										<button
											type="button"
											class="stamp-btn"
											class:selected={annotationStyle.stampType === stamp}
											onclick={() => selectStamp(stamp)}
										>
											{stamp}
										</button>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<!-- Color picker -->
		<div class="toolbar-section">
			<!-- Stroke color -->
			<div class="relative">
				<button
					type="button"
					class="color-button"
					style="background-color: {annotationStyle.color}"
					onclick={() => {
						showColorPicker = !showColorPicker;
						showStampPalette = false;
						showFillPicker = false;
					}}
					title="Couleur du trait"
				></button>

				{#if showColorPicker}
					<div class="color-palette">
						{#each COLORS as color (color)}
							<button
								type="button"
								class="color-swatch"
								class:selected={annotationStyle.color === color}
								style="background-color: {color}"
								onclick={() => selectColor(color)}
							></button>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Fill color (for shapes) -->
			<div class="relative">
				<button
					type="button"
					class="fill-button"
					class:has-fill={annotationStyle.fillMode !== 'none'}
					style="background-color: {annotationStyle.fillMode !== 'none'
						? annotationStyle.fill
						: 'transparent'}"
					onclick={() => {
						showFillPicker = !showFillPicker;
						showColorPicker = false;
						showStampPalette = false;
					}}
					title="Couleur de remplissage"
				>
					<Paintbrush class="fill-icon h-3 w-3" />
				</button>

				{#if showFillPicker}
					<div class="color-palette fill-palette">
						{#each FILL_COLORS as item, i (i)}
							{@const color = typeof item === 'string' ? item : null}
							{@const label = typeof item === 'object' && item !== null ? item.label : null}
							<button
								type="button"
								class="color-swatch"
								class:selected={(color === null && annotationStyle.fillMode === 'none') ||
									(color !== null &&
										annotationStyle.fillMode !== 'none' &&
										annotationStyle.fill === color)}
								class:no-fill={color === null}
								style={color ? `background-color: ${color}` : ''}
								onclick={() => selectFillColor(color)}
								title={label ?? color ?? 'Aucun'}
							>
								{#if color === null}
									<span class="no-fill-icon">∅</span>
								{/if}
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Stroke width -->
			<div class="stroke-width-selector">
				{#each STROKE_WIDTHS as { label, value } (value)}
					<button
						type="button"
						class="stroke-width-btn"
						class:selected={annotationStyle.strokeWidth === value}
						onclick={() => selectStrokeWidth(value)}
						title={label}
					>
						<div class="stroke-preview" style="height: {Math.min(value, 6)}px"></div>
					</button>
				{/each}
			</div>

			<!-- Stroke style (solid/dashed) -->
			<div class="stroke-style-selector">
				{#each STROKE_STYLES as { label, value } (value)}
					<button
						type="button"
						class="stroke-style-btn"
						class:selected={annotationStyle.strokeStyle === value}
						onclick={() => selectStrokeStyle(value)}
						title={label}
					>
						<div class="stroke-style-preview" class:dashed={value === 'dashed'}></div>
					</button>
				{/each}
			</div>
		</div>

		<!-- Undo/Redo -->
		<div class="toolbar-section">
			<Button
				variant="ghost"
				size="sm"
				class="toolbar-btn"
				onclick={handleUndo}
				disabled={!canUndo}
				title="Annuler (Ctrl+Z)"
			>
				<Undo2 class="h-4 w-4" />
			</Button>

			<Button
				variant="ghost"
				size="sm"
				class="toolbar-btn"
				onclick={handleRedo}
				disabled={!canRedo}
				title="Rétablir (Ctrl+Y)"
			>
				<Redo2 class="h-4 w-4" />
			</Button>
		</div>

		<!-- Actions -->
		<div class="toolbar-section">
			<Button
				variant="ghost"
				size="sm"
				class="toolbar-btn"
				onclick={toggleVisibility}
				title={annotationsVisible ? 'Masquer les annotations' : 'Afficher les annotations'}
			>
				{#if annotationsVisible}
					<Eye class="h-4 w-4" />
				{:else}
					<EyeOff class="h-4 w-4" />
				{/if}
			</Button>

			<Button
				variant="ghost"
				size="sm"
				class="toolbar-btn text-destructive"
				onclick={clearAllAnnotations}
				title="Effacer toutes les annotations"
			>
				<Trash2 class="h-4 w-4" />
			</Button>

			<div class="separator"></div>

			<Button
				variant="ghost"
				size="sm"
				class="toolbar-btn"
				onclick={exitAnnotationMode}
				title="Quitter le mode annotation (Escape)"
			>
				<X class="h-4 w-4" />
			</Button>
		</div>
	</div>
{/if}

<style>
	.annotation-toolbar {
		position: absolute;
		bottom: 16px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 250;
		display: flex;
		gap: 8px;
		padding: 8px;
		background: hsl(var(--background));
		border: 1px solid hsl(var(--border));
		border-radius: 12px;
		box-shadow:
			0 4px 6px -1px rgb(0 0 0 / 0.1),
			0 2px 4px -2px rgb(0 0 0 / 0.1);
	}

	.toolbar-section {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.separator {
		width: 1px;
		height: 24px;
		background: hsl(var(--border));
		margin: 0 4px;
	}

	:global(.toolbar-btn) {
		width: 36px;
		height: 36px;
		padding: 0;
	}

	.color-button {
		width: 28px;
		height: 28px;
		border-radius: 6px;
		border: 2px solid hsl(var(--border));
		cursor: pointer;
		transition: transform 0.1s;
	}

	.color-button:hover {
		transform: scale(1.1);
	}

	.color-palette {
		position: absolute;
		bottom: 100%;
		left: 50%;
		transform: translateX(-50%);
		margin-bottom: 8px;
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 4px;
		padding: 8px;
		background: hsl(var(--background));
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
	}

	.color-swatch {
		width: 24px;
		height: 24px;
		border-radius: 4px;
		border: 2px solid transparent;
		cursor: pointer;
		transition: transform 0.1s;
	}

	.color-swatch:hover {
		transform: scale(1.1);
	}

	.color-swatch.selected {
		border-color: hsl(var(--primary));
	}

	.stroke-width-selector {
		display: flex;
		gap: 2px;
	}

	.stroke-width-btn {
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		border: 1px solid transparent;
		background: transparent;
		cursor: pointer;
		transition: background 0.1s;
	}

	.stroke-width-btn:hover {
		background: hsl(var(--accent));
	}

	.stroke-width-btn.selected {
		background: hsl(var(--accent));
		border-color: hsl(var(--primary));
	}

	.stroke-preview {
		width: 16px;
		background: currentColor;
		border-radius: 2px;
	}

	.stroke-style-selector {
		display: flex;
		gap: 2px;
	}

	.stroke-style-btn {
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		border: 1px solid transparent;
		background: transparent;
		cursor: pointer;
		transition: background 0.1s;
	}

	.stroke-style-btn:hover {
		background: hsl(var(--accent));
	}

	.stroke-style-btn.selected {
		background: hsl(var(--accent));
		border-color: hsl(var(--primary));
	}

	.stroke-style-preview {
		width: 16px;
		height: 2px;
		background: currentColor;
		border-radius: 1px;
	}

	.stroke-style-preview.dashed {
		background: repeating-linear-gradient(
			90deg,
			currentColor 0px,
			currentColor 3px,
			transparent 3px,
			transparent 6px
		);
	}

	.fill-button {
		width: 28px;
		height: 28px;
		border-radius: 6px;
		border: 2px solid hsl(var(--border));
		cursor: pointer;
		transition: transform 0.1s;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
	}

	.fill-button:hover {
		transform: scale(1.1);
	}

	.fill-button:not(.has-fill) {
		background: linear-gradient(
			45deg,
			transparent 45%,
			hsl(var(--destructive)) 45%,
			hsl(var(--destructive)) 55%,
			transparent 55%
		);
	}

	.fill-button .fill-icon {
		opacity: 0.6;
	}

	.fill-button.has-fill .fill-icon {
		color: hsl(var(--background));
		opacity: 1;
	}

	.fill-palette {
		grid-template-columns: repeat(3, 1fr);
	}

	.color-swatch.no-fill {
		background: hsl(var(--muted));
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.no-fill-icon {
		font-size: 14px;
		color: hsl(var(--muted-foreground));
	}

	.stamp-palette {
		position: absolute;
		bottom: 100%;
		left: 50%;
		transform: translateX(-50%);
		margin-bottom: 8px;
		padding: 12px;
		background: hsl(var(--background));
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
		min-width: 200px;
	}

	.stamp-category {
		margin-bottom: 8px;
	}

	.stamp-category:last-child {
		margin-bottom: 0;
	}

	.stamp-category-label {
		display: block;
		font-size: 10px;
		font-weight: 500;
		color: hsl(var(--muted-foreground));
		margin-bottom: 4px;
		text-transform: uppercase;
	}

	.stamp-grid {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 4px;
	}

	.stamp-btn {
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 16px;
		border-radius: 4px;
		border: 1px solid transparent;
		background: hsl(var(--accent) / 0.5);
		cursor: pointer;
		transition: all 0.1s;
	}

	.stamp-btn:hover {
		background: hsl(var(--accent));
		transform: scale(1.1);
	}

	.stamp-btn.selected {
		background: hsl(var(--primary) / 0.2);
		border-color: hsl(var(--primary));
	}

	.relative {
		position: relative;
	}
</style>

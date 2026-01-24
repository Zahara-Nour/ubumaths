<script lang="ts">
	/**
	 * SlideAnnotationToolbar - Floating toolbar for slide annotations
	 *
	 * Matches the look and feel of the whiteboard AnnotationToolbar.
	 * Positioned fixed at the bottom of the viewport, outside reveal.js transforms.
	 *
	 * @module slides/components/SlideAnnotationToolbar
	 */

	import { Button } from '$lib/components/ui/button';
	import {
		Pen,
		Highlighter,
		Eraser,
		Minus,
		Square,
		Circle,
		ArrowRight,
		Trash2,
		Undo2,
		Redo2,
		Pencil,
		PencilOff
	} from 'lucide-svelte';
	import type { SlideAnnotationToolType, AnnotationStyle } from './SlideAnnotationLayer.svelte';

	// ==========================================================================
	// Props
	// ==========================================================================

	interface Props {
		/** Current tool */
		tool: SlideAnnotationToolType;
		/** Current style */
		style: AnnotationStyle;
		/** Whether annotation mode is enabled */
		enabled: boolean;
		/** Can undo */
		canUndo?: boolean;
		/** Can redo */
		canRedo?: boolean;
		/** Tool change callback */
		ontoolchange?: (tool: SlideAnnotationToolType) => void;
		/** Style change callback */
		onstylechange?: (style: AnnotationStyle) => void;
		/** Enable/disable toggle callback */
		ontoggle?: (enabled: boolean) => void;
		/** Clear all callback */
		onclear?: () => void;
		/** Undo callback */
		onundo?: () => void;
		/** Redo callback */
		onredo?: () => void;
		/** Additional CSS class */
		class?: string;
	}

	let {
		tool = 'pen',
		style = { color: '#ff0000', strokeWidth: 3, opacity: 1 },
		enabled = false,
		canUndo = false,
		canRedo = false,
		ontoolchange,
		onstylechange,
		ontoggle,
		onclear,
		onundo,
		onredo,
		class: className = ''
	}: Props = $props();

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
		'#000000', // Black
		'#ffffff' // White
	];

	const STROKE_WIDTHS = [
		{ label: 'Fin', value: 2 },
		{ label: 'Moyen', value: 4 },
		{ label: 'Épais', value: 8 }
	];

	// ==========================================================================
	// Local State
	// ==========================================================================

	let showColorPicker = $state(false);

	// ==========================================================================
	// Handlers
	// ==========================================================================

	function handleToggle() {
		ontoggle?.(!enabled);
	}

	function handleToolChange(newTool: SlideAnnotationToolType) {
		ontoolchange?.(newTool);
		showColorPicker = false;
	}

	function handleColorChange(color: string) {
		onstylechange?.({ ...style, color });
		showColorPicker = false;
	}

	function handleWidthChange(strokeWidth: number) {
		onstylechange?.({ ...style, strokeWidth });
	}

	function handleClear() {
		if (confirm('Effacer toutes les annotations ?')) {
			onclear?.();
		}
	}

	function handleUndo() {
		onundo?.();
	}

	function handleRedo() {
		onredo?.();
	}

	function closeDropdowns() {
		showColorPicker = false;
	}

	function toggleColorPicker(e: MouseEvent) {
		e.stopPropagation();
		showColorPicker = !showColorPicker;
	}

	function stopPropagation(e: MouseEvent) {
		e.stopPropagation();
	}

	function isToolActive(t: SlideAnnotationToolType): boolean {
		return tool === t;
	}
</script>

<svelte:window onclick={closeDropdowns} />

<div class="slide-annotation-toolbar {className}" class:enabled>
	<!-- Toggle annotation mode -->
	<Button
		variant={enabled ? 'default' : 'ghost'}
		size="sm"
		class="toolbar-btn"
		onclick={handleToggle}
		title={enabled ? 'Désactiver annotations' : 'Activer annotations'}
	>
		{#if enabled}
			<Pencil class="h-4 w-4" />
		{:else}
			<PencilOff class="h-4 w-4" />
		{/if}
	</Button>

	{#if enabled}
		<div class="separator"></div>

		<!-- Undo/Redo -->
		<Button
			variant="ghost"
			size="sm"
			class="toolbar-btn"
			onclick={handleUndo}
			disabled={!canUndo}
			title="Annuler"
		>
			<Undo2 class="h-4 w-4" />
		</Button>

		<Button
			variant="ghost"
			size="sm"
			class="toolbar-btn"
			onclick={handleRedo}
			disabled={!canRedo}
			title="Rétablir"
		>
			<Redo2 class="h-4 w-4" />
		</Button>

		<div class="separator"></div>

		<!-- Tool buttons -->
		<Button
			variant={isToolActive('pen') ? 'default' : 'ghost'}
			size="sm"
			class="toolbar-btn"
			onclick={() => handleToolChange('pen')}
			title="Stylo"
		>
			<Pen class="h-4 w-4" />
		</Button>

		<Button
			variant={isToolActive('marker') ? 'default' : 'ghost'}
			size="sm"
			class="toolbar-btn"
			onclick={() => handleToolChange('marker')}
			title="Marqueur"
		>
			<svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
				<path
					d="M3 17v4h4l11-11-4-4L3 17zm18.7-11.3l-2.4-2.4c-.4-.4-1-.4-1.4 0L16 5.2l4 4 1.9-1.9c.4-.4.4-1 0-1.4z"
				/>
			</svg>
		</Button>

		<Button
			variant={isToolActive('highlighter') ? 'default' : 'ghost'}
			size="sm"
			class="toolbar-btn"
			onclick={() => handleToolChange('highlighter')}
			title="Surligneur"
		>
			<Highlighter class="h-4 w-4" />
		</Button>

		<Button
			variant={isToolActive('eraser') ? 'default' : 'ghost'}
			size="sm"
			class="toolbar-btn"
			onclick={() => handleToolChange('eraser')}
			title="Gomme"
		>
			<Eraser class="h-4 w-4" />
		</Button>

		<div class="separator"></div>

		<Button
			variant={isToolActive('line') ? 'default' : 'ghost'}
			size="sm"
			class="toolbar-btn"
			onclick={() => handleToolChange('line')}
			title="Ligne"
		>
			<Minus class="h-4 w-4" />
		</Button>

		<Button
			variant={isToolActive('rectangle') ? 'default' : 'ghost'}
			size="sm"
			class="toolbar-btn"
			onclick={() => handleToolChange('rectangle')}
			title="Rectangle"
		>
			<Square class="h-4 w-4" />
		</Button>

		<Button
			variant={isToolActive('circle') ? 'default' : 'ghost'}
			size="sm"
			class="toolbar-btn"
			onclick={() => handleToolChange('circle')}
			title="Cercle"
		>
			<Circle class="h-4 w-4" />
		</Button>

		<Button
			variant={isToolActive('arrow') ? 'default' : 'ghost'}
			size="sm"
			class="toolbar-btn"
			onclick={() => handleToolChange('arrow')}
			title="Flèche"
		>
			<ArrowRight class="h-4 w-4" />
		</Button>

		<div class="separator"></div>

		<!-- Color picker -->
		<div class="relative">
			<button
				type="button"
				class="color-button"
				style="background-color: {style.color}"
				onclick={toggleColorPicker}
				title="Couleur"
			></button>

			{#if showColorPicker}
				<div class="color-palette" onclick={stopPropagation}>
					{#each COLORS as color (color)}
						<button
							type="button"
							class="color-swatch"
							class:selected={style.color === color}
							style="background-color: {color}"
							onclick={() => handleColorChange(color)}
						></button>
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
					class:selected={style.strokeWidth === value}
					onclick={() => handleWidthChange(value)}
					title={label}
				>
					<div class="stroke-preview" style="height: {Math.min(value, 6)}px"></div>
				</button>
			{/each}
		</div>

		<div class="separator"></div>

		<!-- Clear all -->
		<Button
			variant="ghost"
			size="sm"
			class="toolbar-btn text-destructive"
			onclick={handleClear}
			title="Tout effacer"
		>
			<Trash2 class="h-4 w-4" />
		</Button>
	{/if}
</div>

<style>
	.slide-annotation-toolbar {
		position: fixed;
		bottom: 16px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 1000;
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 6px 8px;
		background: hsl(var(--background) / 0.95);
		backdrop-filter: blur(8px);
		border: 1px solid hsl(var(--border));
		border-radius: 12px;
		box-shadow:
			0 4px 6px -1px rgb(0 0 0 / 0.1),
			0 2px 4px -2px rgb(0 0 0 / 0.1);
		user-select: none;
		/* Reset font-size to prevent reveal.js scaling effects */
		font-size: 14px;
	}

	.slide-annotation-toolbar:not(.enabled) {
		opacity: 0.7;
	}

	.slide-annotation-toolbar:not(.enabled):hover {
		opacity: 1;
	}

	.separator {
		width: 1px;
		height: 24px;
		background: hsl(var(--border));
		margin: 0 4px;
	}

	:global(.slide-annotation-toolbar .toolbar-btn) {
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
		grid-template-columns: repeat(4, 1fr);
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

	.relative {
		position: relative;
	}
</style>

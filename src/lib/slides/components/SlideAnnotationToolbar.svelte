<script lang="ts">
	/**
	 * SlideAnnotationToolbar - Minimalist floating toolbar for slide annotations
	 *
	 * Provides tools for drawing annotations during slide presentations.
	 *
	 * @module slides/components/SlideAnnotationToolbar
	 */

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

	const TOOLS: { type: SlideAnnotationToolType; label: string; icon: string }[] = [
		{ type: 'pen', label: 'Stylo', icon: '✏️' },
		{ type: 'marker', label: 'Marqueur', icon: '🖊️' },
		{ type: 'highlighter', label: 'Surligneur', icon: '🌟' },
		{ type: 'line', label: 'Ligne', icon: '📏' },
		{ type: 'rectangle', label: 'Rectangle', icon: '⬜' },
		{ type: 'circle', label: 'Cercle', icon: '⭕' },
		{ type: 'arrow', label: 'Fleche', icon: '➡️' },
		{ type: 'eraser', label: 'Gomme', icon: '🧹' }
	];

	const COLORS = [
		{ value: '#ff0000', label: 'Rouge' },
		{ value: '#0066ff', label: 'Bleu' },
		{ value: '#00cc00', label: 'Vert' },
		{ value: '#000000', label: 'Noir' },
		{ value: '#ffffff', label: 'Blanc' },
		{ value: '#ffcc00', label: 'Jaune' }
	];

	const STROKE_WIDTHS = [
		{ value: 2, label: 'Fin' },
		{ value: 4, label: 'Moyen' },
		{ value: 8, label: 'Epais' }
	];

	// ==========================================================================
	// Local State
	// ==========================================================================

	let showColorPicker = $state(false);
	let showWidthPicker = $state(false);

	// ==========================================================================
	// Handlers
	// ==========================================================================

	function handleToggle() {
		ontoggle?.(!enabled);
	}

	function handleToolChange(newTool: SlideAnnotationToolType) {
		ontoolchange?.(newTool);
	}

	function handleColorChange(color: string) {
		onstylechange?.({ ...style, color });
		showColorPicker = false;
	}

	function handleWidthChange(strokeWidth: number) {
		onstylechange?.({ ...style, strokeWidth });
		showWidthPicker = false;
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
		showWidthPicker = false;
	}

	function toggleColorPicker(e: MouseEvent) {
		e.stopPropagation();
		showColorPicker = !showColorPicker;
		showWidthPicker = false;
	}

	function toggleWidthPicker(e: MouseEvent) {
		e.stopPropagation();
		showWidthPicker = !showWidthPicker;
		showColorPicker = false;
	}

	function stopPropagation(e: MouseEvent) {
		e.stopPropagation();
	}
</script>

<svelte:window onclick={closeDropdowns} />

<div class="slide-annotation-toolbar {className}" class:enabled>
	<!-- Toggle annotation mode -->
	<button
		type="button"
		class="toolbar-btn toggle-btn"
		class:active={enabled}
		onclick={handleToggle}
		title={enabled ? 'Desactiver annotations' : 'Activer annotations'}
	>
		{enabled ? '🖌️' : '👁️'}
	</button>

	{#if enabled}
		<div class="toolbar-divider"></div>

		<!-- Tool buttons -->
		<div class="tool-group">
			{#each TOOLS as t (t.type)}
				<button
					type="button"
					class="toolbar-btn tool-btn"
					class:active={tool === t.type}
					onclick={() => handleToolChange(t.type)}
					title={t.label}
				>
					{t.icon}
				</button>
			{/each}
		</div>

		<div class="toolbar-divider"></div>

		<!-- Color picker -->
		<div class="dropdown-container">
			<button
				type="button"
				class="toolbar-btn color-btn"
				onclick={toggleColorPicker}
				title="Couleur"
			>
				<span class="color-swatch" style="background-color: {style.color};"></span>
			</button>
			{#if showColorPicker}
				<div class="dropdown color-dropdown" onclick={stopPropagation}>
					{#each COLORS as c (c.value)}
						<button
							type="button"
							class="color-option"
							class:active={style.color === c.value}
							onclick={() => handleColorChange(c.value)}
							title={c.label}
							style="background-color: {c.value};"
						></button>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Stroke width picker -->
		<div class="dropdown-container">
			<button
				type="button"
				class="toolbar-btn width-btn"
				onclick={toggleWidthPicker}
				title="Epaisseur"
			>
				<span class="width-indicator" style="height: {style.strokeWidth}px;"></span>
			</button>
			{#if showWidthPicker}
				<div class="dropdown width-dropdown" onclick={stopPropagation}>
					{#each STROKE_WIDTHS as w (w.value)}
						<button
							type="button"
							class="width-option"
							class:active={style.strokeWidth === w.value}
							onclick={() => handleWidthChange(w.value)}
							title={w.label}
						>
							<span class="width-preview" style="height: {w.value}px;"></span>
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<div class="toolbar-divider"></div>

		<!-- Undo/Redo -->
		<button
			type="button"
			class="toolbar-btn action-btn"
			disabled={!canUndo}
			onclick={handleUndo}
			title="Annuler"
		>
			↩️
		</button>
		<button
			type="button"
			class="toolbar-btn action-btn"
			disabled={!canRedo}
			onclick={handleRedo}
			title="Retablir"
		>
			↪️
		</button>

		<!-- Clear all -->
		<button
			type="button"
			class="toolbar-btn action-btn clear-btn"
			onclick={handleClear}
			title="Tout effacer"
		>
			🗑️
		</button>
	{/if}
</div>

<style>
	.slide-annotation-toolbar {
		position: fixed;
		bottom: 20px;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 8px 12px;
		background: rgba(0, 0, 0, 0.85);
		border-radius: 12px;
		backdrop-filter: blur(8px);
		z-index: 1000;
		transition: opacity 0.2s;
		/* Ensure toolbar is not affected by reveal.js transforms */
		font-size: 16px;
	}

	.slide-annotation-toolbar:not(.enabled) {
		opacity: 0.6;
	}

	.slide-annotation-toolbar:not(.enabled):hover {
		opacity: 1;
	}

	.toolbar-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border: none;
		border-radius: 8px;
		background: transparent;
		color: white;
		font-size: 18px;
		cursor: pointer;
		transition:
			background-color 0.15s,
			transform 0.1s;
	}

	.toolbar-btn:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.15);
	}

	.toolbar-btn:active:not(:disabled) {
		transform: scale(0.95);
	}

	.toolbar-btn.active {
		background: rgba(255, 255, 255, 0.25);
	}

	.toolbar-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.toggle-btn.active {
		background: rgba(59, 130, 246, 0.5);
	}

	.toolbar-divider {
		width: 1px;
		height: 24px;
		background: rgba(255, 255, 255, 0.3);
		margin: 0 4px;
	}

	.tool-group {
		display: flex;
		gap: 2px;
	}

	.dropdown-container {
		position: relative;
	}

	.dropdown {
		position: absolute;
		bottom: 100%;
		left: 50%;
		transform: translateX(-50%);
		margin-bottom: 8px;
		padding: 8px;
		background: rgba(0, 0, 0, 0.9);
		border-radius: 8px;
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
		min-width: 120px;
		justify-content: center;
	}

	.color-swatch {
		width: 20px;
		height: 20px;
		border-radius: 4px;
		border: 2px solid rgba(255, 255, 255, 0.5);
	}

	.color-option {
		width: 28px;
		height: 28px;
		border: 2px solid transparent;
		border-radius: 6px;
		cursor: pointer;
		transition:
			border-color 0.15s,
			transform 0.1s;
	}

	.color-option:hover {
		transform: scale(1.1);
	}

	.color-option.active {
		border-color: white;
	}

	.width-indicator {
		width: 20px;
		background: white;
		border-radius: 2px;
		min-height: 2px;
	}

	.width-option {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border: none;
		border-radius: 6px;
		background: transparent;
		cursor: pointer;
		transition: background-color 0.15s;
	}

	.width-option:hover {
		background: rgba(255, 255, 255, 0.15);
	}

	.width-option.active {
		background: rgba(255, 255, 255, 0.25);
	}

	.width-preview {
		width: 20px;
		background: white;
		border-radius: 2px;
		min-height: 2px;
	}

	.clear-btn {
		margin-left: 4px;
	}
</style>
